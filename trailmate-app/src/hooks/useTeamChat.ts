import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { groupsApi, intentApi, usersApi, traillogsApi } from '@/api';
import { useStore } from '@/store';
import { useConfirm } from '@/components/ConfirmDialog';
import type { Group, GroupMessage, Intent, MatchedUser, MatchedTeam } from '@/types';
import { haversineDistance, calcTrackStats } from '@/lib/utils';

/** 检测用户消息是否为修改意图的指令（如改地点/时间/重新匹配等） */
const MODIFY_INTENT_PATTERN = /修改|更新|更改|换.*地点|换.*时间|换.*日期|改.*目的地|改.*时间|重新匹配|再匹配/;

type TeamCard = Partial<Group> & { id: string; name: string; matchPct: number; tags?: string[]; reason?: string; location?: string; date?: string };
type MergeTarget = { id: string; name: string; essentials?: Group['essentials'] };
type Member = Group['members'][number];
type Checkpoint = NonNullable<Group['checkpoints']>[number];
type Checkin = NonNullable<Checkpoint['checkins']>[number];

export function useTeamChat(id?: string) {
  const navigate = useNavigate();
  const { user, showToast, track, clearTrack, loadGroups, loadIntents, resetMatching } = useStore();
  const { confirm: confirmDialog, ConfirmDialog } = useConfirm();

  // ── 基础数据 ──
  const [group, setGroup] = useState<Group | null>(null);
  const [loadError, setLoadError] = useState('');
  const [comments, setComments] = useState<Group['comments']>([]);
  const [matchingEnabled, setMatchingEnabled] = useState(true);

  // ── 消息 ──
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<number>(0);

  // ── 匹配 ──
  const [matchTab, setMatchTab] = useState<'members' | 'teams'>('members');
  const [matchedUsers, setMatchedUsers] = useState<MatchedUser[]>([]);
  const [matchTeams, setMatchTeams] = useState<TeamCard[]>([]);

  // ── 侧边栏 ──
  const [sidebarPanel, setSidebarPanel] = useState<'members' | 'plan' | 'match' | 'location' | 'photo' | null>(null);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [intentPrompts, setIntentPrompts] = useState<string[]>([]);
  const [intentRawInput, setIntentRawInput] = useState('');

  // ── 位置 ──
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);

  // ── AI 助手 ──
  const [aiAssistantLoading, setAiAssistantLoading] = useState(false);
  const [pendingBulletin, setPendingBulletin] = useState<string | null>(null);

  // ── 相册 ──
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // ── 计划编辑 ──
  const [editingPlan, setEditingPlan] = useState(false);
  const planEditorRef = useRef<HTMLTextAreaElement>(null);

  // ── 提示词编辑 ──
  const [editingPrompts, setEditingPrompts] = useState(false);
  const [showPromptsConfirm, setShowPromptsConfirm] = useState(false);
  const [editPromptsText, setEditPromptsText] = useState('');

  // ── 评论 ──
  const [newComment, setNewComment] = useState('');

  // ── 出发/完成 ──
  const [showGoModal, setShowGoModal] = useState(false);
  const [showNoCheckpointModal, setShowNoCheckpointModal] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [hikingActionLoading, setHikingActionLoading] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Group['members'][number] | null>(null);
  const [completeTrackStats, setCompleteTrackStats] = useState<{ dist: number; dur: number; pace: number } | null>(null);

  // ── 打卡点引导 ──
  const [showCheckpointGuide, setShowCheckpointGuide] = useState(() => {
    try { return localStorage.getItem('trailmate_guide_checkpoints') !== 'dismissed'; } catch { return true; }
  });

  // ── 合并 ──
  const [merging, setMerging] = useState(false);
  const [mergeConfirmTeam, setMergeConfirmTeam] = useState<MergeTarget | null>(null);
  const [myLeaderTeams, setMyLeaderTeams] = useState<Group[]>([]);
  const [selectedFromTeamId, setSelectedFromTeamId] = useState('');

  // ── 图片上传 ──
  const imageInputRef = useRef<HTMLInputElement>(null);

  // ── Refs ──
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isCountingDown = useRef(false);
  const countdownStarted = useRef(false);
  // ── 模态互斥 ──
  const closeAllModals = useCallback(() => {
    setShowGoModal(false);
    setShowNoCheckpointModal(false);
    setShowCompleteModal(false);
    setShowMemberModal(false);
    setSelectedMember(null);
    setShowPromptsConfirm(false);
    setMergeConfirmTeam(null);
    // 同时关闭侧边栏面板，保持状态一致
    setSidebarPanel(null);
  }, []);

  // ── 加载队伍 ──
  const loadingRef = useRef(false);
  const loadGroup = useCallback(async () => {
    if (!id || loadingRef.current) return;
    loadingRef.current = true;
    try {
      const g = await groupsApi.get(id);
      setGroup(g);
      setComments(g.comments || []);
      if (g.matchingEnabled !== undefined) setMatchingEnabled(g.matchingEnabled);
      setLoadError('');
    } catch (e: unknown) {
      console.error('[TeamChat] Failed to load group:', e);
      setLoadError(e instanceof Error ? e.message : '加载失败');
    } finally {
      loadingRef.current = false;
    }
  }, [id]);

  // ── 初始化 ──
  useEffect(() => {
    loadGroup();
    pollRef.current = window.setInterval(loadGroup, 3000);

    // 页面不可见时暂停轮询，可见时恢复并立即拉取一次
    const handleVisibility = () => {
      if (document.hidden) {
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = 0; }
      } else {
        loadGroup();
        if (!pollRef.current) pollRef.current = window.setInterval(loadGroup, 3000);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(pollRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [id, loadGroup]);

  // ── 清理倒计时定时器 ──
  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, []);

  // ── 计划编辑器填充 ──
  useEffect(() => {
    if (editingPlan && planEditorRef.current && group) {
      // 使用 textContent 而非 innerHTML，避免 XSS 风险
      planEditorRef.current.value = group.plan || '';
      planEditorRef.current.focus();
    }
  }, [editingPlan, group]);

  // ── 侧边栏收起时关闭面板 ──
  useEffect(() => {
    if (!sidebarExpanded && sidebarPanel) {
      setSidebarPanel(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sidebarExpanded]);

  // ── 位置面板打开时获取位置 ──
  useEffect(() => {
    if (sidebarPanel === 'location' && !userPos && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}
      );
    }
  }, [sidebarPanel, userPos]);

  // ── 加载匹配数据 ──
  useEffect(() => {
    if (!group?.intentId) return;
    intentApi.get(group.intentId).then(intent => {
      setIntentPrompts(intent.prompts || []);
      setIntentRawInput(intent.rawInput || '');
      setMatchedUsers(intent.matchedUsers || []);
      // 如果后端返回了 matchedTeams，直接使用
      if (intent.matchedTeams && intent.matchedTeams.length > 0) {
        setMatchTeams(intent.matchedTeams.map((t: MatchedTeam) => ({
          id: t.groupId,
          name: t.groupName || '未命名队伍',
          members: t.groupMembers || [],
          maxMembers: t.maxMembers || 6,
          tags: t.prompts || [],
          location: t.essentials?.location || '',
          date: t.essentials?.date || '',
          matchPct: t.matchPct,
          reason: t.reason,
        })));
      }
    }).catch(() => {});
    // 同时获取公开队伍作为补充
    Promise.all([
      groupsApi.publicGroups('latest').catch(() => ({ items: [] })),
      groupsApi.publicGroups('hot').catch(() => ({ items: [] })),
    ]).then(([latestRes, hotRes]) => {
      const all = [...(latestRes.items || []), ...(hotRes.items || [])]
        .filter((t, i, arr) => arr.findIndex(x => x.id === t.id) === i)
        .filter(t => t.id !== id);
      const prompts = group.prompts || [];
      const scored = all.map(t => {
        const tags = t.prompts || [];
        const overlap = tags.filter((tag: string) => prompts.some(p => tag.includes(p) || p.includes(tag))).length;
        const matchPct = prompts.length > 0 ? Math.min(99, Math.round(50 + (overlap / prompts.length) * 45)) : 0;
        return { ...t, matchPct };
      }).filter(t => t.matchPct > 0).sort((a, b) => b.matchPct - a.matchPct);
      // 合并：如果已有 matchedTeams 的结果，不重复
      setMatchTeams(prev => {
        const existingIds = new Set(prev.map(t => t.id));
        const newTeams = scored.filter(t => !existingIds.has(t.id));
        return [...prev, ...newTeams].sort((a, b) => b.matchPct - a.matchPct);
      });
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group?.intentId, id]);

  // ── 消息滚动 ──
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [group?.messages?.length]);

  // ── 倒计时结束 → 出发 ──
  const goExecutedRef = useRef(false);
  useEffect(() => {
    if (countdown === null && showGoModal && countdownStarted.current && !goExecutedRef.current) {
      goExecutedRef.current = true;
      countdownStarted.current = false;
      const doGo = async () => {
        if (!id) return;
        setHikingActionLoading(true);
        try {
          await groupsApi.update(id, { hikeStatus: 'hiking' });
          try { await groupsApi.update(id, { matchingEnabled: false }); } catch { /* ignore */ }
          setMatchingEnabled(false);
          setShowGoModal(false);
          try { await traillogsApi.generateFromGroup(id); } catch { /* ignore */ }
          showToast('征途开始！🏔');
          await loadGroup();
        } catch (err: unknown) {
          showToast(err instanceof Error ? err.message : '出发失败');
        } finally {
          setHikingActionLoading(false);
        }
      };
      const t = setTimeout(doGo, 600);
      return () => clearTimeout(t);
    }
  }, [countdown, showGoModal, id, loadGroup, showToast]);

  // ── 发送消息 ──
  const handleSend = useCallback(async () => {
    if (!msg.trim() || !id || sending) return;
    setSending(true);
    try {
      await groupsApi.sendMessage(id, msg.trim());
      setMsg('');
      await loadGroup();
    } catch (e) {
      console.error('Failed to send message:', e);
      showToast('消息发送失败，请重试');
    } finally {
      setSending(false);
    }
  }, [msg, id, sending, loadGroup, showToast]);

  // ── SOS ──
  const handleSOS = useCallback(async () => {
    if (!id) return;
    const ok = await confirmDialog({ title: 'SOS 紧急求助', message: '确认发送 SOS 紧急求助？', confirmText: '发送', danger: true });
    if (!ok) return;
    try {
      let location: { lat: number; lng: number } | undefined;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
        );
        location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      } catch { /* ignore */ }
      await groupsApi.sos(id, location);
      showToast(location ? 'SOS 已发送！(含位置)' : 'SOS 已发送！');
    } catch (err: unknown) { showToast(err instanceof Error ? err.message : 'SOS 发送失败'); }
  }, [id, showToast, confirmDialog]);

  // ── 出发 ──
  const handleGo = useCallback(() => {
    if (group?.hikeStatus === 'hiking') return;
    closeAllModals();
    const cps = group?.checkpoints || [];
    if (cps.length === 0) {
      setShowNoCheckpointModal(true);
      return;
    }
    countdownStarted.current = false;
    goExecutedRef.current = false;
    setShowGoModal(true);
  }, [group?.checkpoints, group?.hikeStatus, closeAllModals]);

  const startCountdown = useCallback(() => {
    if (isCountingDown.current) return;
    isCountingDown.current = true;
    countdownStarted.current = true;
    goExecutedRef.current = false;
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    setCountdown(3);
    countdownTimerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          if (countdownTimerRef.current) { clearInterval(countdownTimerRef.current); countdownTimerRef.current = null; }
          isCountingDown.current = false;
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const cancelCountdown = useCallback(() => {
    if (countdownTimerRef.current) { clearInterval(countdownTimerRef.current); countdownTimerRef.current = null; }
    isCountingDown.current = false;
    countdownStarted.current = false;
    setCountdown(null);
  }, []);

  // ── 完成 ──
  const handleComplete = useCallback(() => {
    closeAllModals();
    if (track.length > 1) {
      const { distance, duration, pace } = calcTrackStats(track);
      setCompleteTrackStats({ dist: Math.round(distance), dur: Math.round(duration), pace: Math.round(pace) });
    } else {
      setCompleteTrackStats(null);
    }
    setShowCompleteModal(true);
  }, [track, closeAllModals]);

  const doComplete = useCallback(async () => {
    if (!id || !group || !user) return;
    const isLeader = (group.members || []).some((m: Member) => (m.id || m) === user.id && m.role === 'leader');
    setHikingActionLoading(true);
    try {
      const { distance: trackDist, duration: trackDuration, pace: trackPace } = calcTrackStats(track);

      // 仅队长更新队伍状态为已完成
      if (isLeader) {
        await groupsApi.update(id, { hikeStatus: 'completed' });
      }
      // 为当前用户生成日志（使用自己的轨迹数据）
      try {
        const cps = group.checkpoints || [];
        const startCp = cps.find((cp: Checkpoint) => cp.type === 'start');
        const endCp = cps.find((cp: Checkpoint) => cp.type === 'end');
        let distance = 0;
        if (startCp && endCp) {
          distance = Math.round(haversineDistance(startCp.lat, startCp.lng, endCp.lat, endCp.lng)) / 1000;
        }
        const startCheckin = startCp?.checkins?.find((ci: Checkin) => ci.userId === user.id);
        const endCheckin = endCp?.checkins?.find((ci: Checkin) => ci.userId === user.id);
        let duration = 0;
        if (startCheckin?.checkedInAt && endCheckin?.checkedInAt) {
          duration = Math.round((endCheckin.checkedInAt - startCheckin.checkedInAt) / 60000);
        }
        const checkpointRecords = cps
          .filter((cp: Checkpoint) => cp.checkins?.some((ci: Checkin) => ci.userId === user.id))
          .map((cp: Checkpoint) => {
            const ci = (cp.checkins || []).find((c: Checkin) => c.userId === user.id);
            return { label: cp.label, type: cp.type, checkedInAt: ci?.checkedInAt, notes: ci?.notes, photos: ci?.photos };
          });
        await traillogsApi.generateForUser(id, user.id, {
          distance,
          duration,
          checkpointRecords,
          totalDistance: Math.round(trackDist),
          movingDuration: Math.round(trackDuration),
          avgPace: Math.round(trackPace),
          track: track,
        });
      } catch { /* ignore */ }
      clearTrack();
      setShowCompleteModal(false);
      showToast(isLeader ? '凯旋而归！日志已生成' : '征途完成！日志已生成');
      await loadGroup();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : '操作失败');
    } finally {
      setHikingActionLoading(false);
    }
  }, [id, group, user, track, clearTrack, loadGroup, showToast]);

  // ── 退出 ──
  const doLeave = useCallback(async () => {
    if (!id) return;
    try {
      await groupsApi.leave(id);
      // 取消关联的意图，避免退出后意图卡片仍显示且不可点击
      if (group?.intentId) {
        await intentApi.cancel(group.intentId).catch(() => {});
      }
      showToast('已退出队伍');
      await Promise.all([loadGroups(), loadIntents()]);
      resetMatching();
      navigate('/teams');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : '退出失败');
    }
  }, [id, group, showToast, navigate, loadGroups, loadIntents, resetMatching]);

  const handleLeave = useCallback(async () => {
    const leaveMsg = group?.hikeStatus === 'completed' ? '确认退出？' : '确认退出队伍？';
    const ok = await confirmDialog({ title: '退出队伍', message: leaveMsg, confirmText: '退出', danger: true });
    if (!ok) return;
    doLeave();
  }, [group, confirmDialog, doLeave]);

  // ── AI 助手 ──
  const handleAiAssistant = useCallback(async () => {
    if (!id || !group) return;
    const question = msg.replace(/@AI助手?\s*/i, '').trim();
    if (!question) return;
    setAiAssistantLoading(true);
    setSending(true);
    try {
      await groupsApi.sendMessage(id, `@AI助手 ${question}`);
      setMsg('');
      await loadGroup();

      // 检查是否是修改意图的指令
      const isModifyIntent = MODIFY_INTENT_PATTERN.test(question);
      if (isModifyIntent && group.intentId) {
        const extracted = await intentApi.extract(question);
        const newEssentials = extracted.essentials || {};
        const newPrompts = extracted.prompts || [];
        const currentEssentials = group.essentials || {};
        const currentPrompts = group.prompts || [];
        const mergedEssentials = { ...currentEssentials, ...newEssentials };
        const mergedPrompts = [...new Set([...currentPrompts, ...newPrompts])];

        await intentApi.modifyIntent(group.intentId, { essentials: mergedEssentials as Intent['essentials'], prompts: mergedPrompts });
        await groupsApi.sendMessage(id, `🤖 AI助手：已更新意图！地点：${mergedEssentials.location || '未定'}，日期：${mergedEssentials.date || '未定'}，已重新发起匹配`, 'system');
        await loadGroup();
        setAiAssistantLoading(false);
        setSending(false);
        return;
      }

      const chatMsgs = (group.messages || [])
        .filter((m: GroupMessage) => m.type !== 'system' && m.user?.name)
        .map((m: GroupMessage) => ({ content: m.content, userName: m.user?.name || '未知' }));
      chatMsgs.push({ content: `@AI助手 ${question}`, userName: user?.name || '我' });
      const prompts = group.prompts || [];
      const essentials = group.essentials || {};
      const context = `队伍名称：${group.name}\n地点：${essentials.location || '未定'}\n日期：${essentials.date || '未定'}\n提示词：${prompts.join('、')}\n\n聊天记录：\n${chatMsgs.slice(-20).map(m => `${m.userName}：${m.content}`).join('\n')}`;
      const result = await intentApi.extract(`你是队伍的AI助手，根据队伍信息和聊天记录回答问题。\n\n请在回复末尾单独一行标注：[行动计划] 如果你的回复内容适合作为队伍行动计划上墙展示（如行程计划、集合安排、注意事项等），否则不标注。\n\n${context}\n\n用户问题：${question}`);
      const reply = result.reply || '抱歉，我暂时无法回答这个问题。';
      await groupsApi.sendMessage(id, `🤖 AI助手：${reply}`, 'system');
      if (Math.random() < 0.2) {
        setTimeout(() => {
          groupsApi.sendMessage(id, '💡 提示：你也可以用自己的 AI Agent 连接 TrailMate MCP 获得更多玩法，前往 我的→设置→MCP 开发者 查看', 'system').catch(() => {});
        }, 1500);
      }
      if (reply.includes('[行动计划]')) {
        const bulletinContent = reply.replace('[行动计划]', '').trim();
        setPendingBulletin(bulletinContent);
      }
      await loadGroup();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'AI 助手回复失败');
    } finally {
      setAiAssistantLoading(false);
      setSending(false);
    }
  }, [id, group, msg, user, loadGroup, showToast]);

  // ── 行动计划确认 ──
  const confirmBulletin = useCallback(async () => {
    if (!id || !pendingBulletin) return;
    try {
      await groupsApi.update(id, { plan: pendingBulletin });
      setPendingBulletin(null);
      showToast('行动计划已更新');
      await loadGroup();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : '更新失败');
    }
  }, [id, pendingBulletin, loadGroup, showToast]);

  // ── 合并队伍 ──
  const handleMergeTeam = useCallback(async (targetTeam: string | MergeTarget) => {
    closeAllModals();
    if (!id || !group || !user?.id) return;
    const teamId = typeof targetTeam === 'string' ? targetTeam : targetTeam?.id;
    const teamObj = typeof targetTeam === 'object' ? targetTeam : null;
    setMergeConfirmTeam(teamObj || { id: teamId || '', name: '目标队伍', essentials: {} });
    try {
      const allTeams = await groupsApi.list();
      const leaderTeams = allTeams.filter((t: Group) => {
        const members = t.members || [];
        return members.some((m: Member) => String(m.id || m) === String(user.id) && m.role === 'leader') || String(t.createdBy || '') === String(user.id);
      });
      setMyLeaderTeams(leaderTeams);
      setSelectedFromTeamId(id || '');
    } catch { setMyLeaderTeams([]); setSelectedFromTeamId(id || ''); }
  }, [id, group, user?.id, closeAllModals]);

  const doApplyMerge = useCallback(async () => {
    if (!selectedFromTeamId || !mergeConfirmTeam) return;
    setMerging(true);
    try {
      const result = await groupsApi.applyMerge(selectedFromTeamId, mergeConfirmTeam.id);
      showToast(result.message || '合并申请已发送');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : '申请失败');
    } finally {
      setMerging(false);
      setMergeConfirmTeam(null);
      setMyLeaderTeams([]);
    }
  }, [selectedFromTeamId, mergeConfirmTeam, showToast]);

  // ── 评论 ──
  const handleAddComment = useCallback(async () => {
    if (!id || !newComment.trim() || !user) return;
    const comment = {
      userId: user.id,
      userName: user.name,
      avatarColor: user.avatarColor || '#10b981',
      content: newComment.trim(),
      time: new Date().toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      createdAt: Date.now(),
    };
    try {
      // 重新获取最新数据，减少并发覆盖风险
      const latest = await groupsApi.get(id);
      const latestComments = latest.comments || [];
      const newComments = [...latestComments, comment];
      await groupsApi.update(id, { comments: newComments });
      setNewComment('');
      await loadGroup();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : '评论失败');
    }
  }, [id, newComment, user, loadGroup, showToast]);

  // ── 图片上传（聊天） ──
  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setSending(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      const { url } = await usersApi.uploadImage(base64, file.name);
      await groupsApi.sendMessage(id, url, 'image');
      await loadGroup();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : '图片发送失败');
    } finally {
      setSending(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  }, [id, loadGroup, showToast]);
  const handlePhotoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setUploadingPhoto(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      const { url } = await usersApi.uploadImage(base64, file.name);
      // 重新获取最新数据，避免并发覆盖其他用户刚上传的照片
      const latest = await groupsApi.get(id);
      const latestPhotos = latest.photos || [];
      const newPhotos = [...latestPhotos, url];
      await groupsApi.update(id, { photos: newPhotos });
      await loadGroup();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : '上传失败');
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  }, [id, loadGroup, showToast]);

  // ── 提示词保存 ──
  const handleSavePrompts = useCallback(async () => {
    if (!id) return;
    setShowPromptsConfirm(false);
    const newPrompts = editPromptsText.split(/[、,，]/).map(s => s.trim()).filter(Boolean);
    try {
      await groupsApi.update(id, { prompts: newPrompts });
      if (group?.intentId) {
        const updated = await intentApi.update(group.intentId, { prompts: newPrompts });
        setMatchedUsers(updated.matchedUsers || []);
      }
      setEditingPrompts(false);
      showToast('提示词已更新，匹配已刷新');
      await loadGroup();
    } catch (err: unknown) { showToast(err instanceof Error ? err.message : '保存失败'); }
  }, [id, editPromptsText, group?.intentId, loadGroup, showToast]);

  // ── 计划保存 ──
  const handleSavePlan = useCallback(async () => {
    if (!id) return;
    // 使用 value 而非 innerHTML，避免 XSS
    const planText = planEditorRef.current?.value || '';
    try {
      await groupsApi.update(id, { plan: planText });
      setEditingPlan(false);
      showToast('行动计划已保存');
      await loadGroup();
    } catch (err: unknown) { showToast(err instanceof Error ? err.message : '保存失败'); }
  }, [id, loadGroup, showToast]);

  // ── 队长变更 ──
  const handleTransferLeader = useCallback(async (member: Member) => {
    if (!id || !member?.id) return;
    try {
      await groupsApi.transferLeader(id, member.id);
      showToast(`已将队长移交给 ${member.name || '该成员'}`);
      setShowMemberModal(false);
      setSelectedMember(null);
      await loadGroup();
    } catch (err: unknown) { showToast(err instanceof Error ? err.message : '移交失败'); }
  }, [id, loadGroup, showToast]);

  const handleClaimLeader = useCallback(async () => {
    if (!id) return;
    try {
      await groupsApi.claimLeader(id);
      showToast('你已成为队长！');
      await loadGroup();
    } catch (err: unknown) { showToast(err instanceof Error ? err.message : '认领失败'); }
  }, [id, loadGroup, showToast]);

  // ── 派生数据 ──
  const members = group?.members || [];
  const photos = group?.photos || [];
  const hikeStatus = group?.hikeStatus || 'idle';
  const checkpoints = group?.checkpoints || [];
  const checkedInCount = checkpoints.filter(cp => (cp.checkins || []).some(ci => ci.userId === user?.id)).length;
  const isLeader = members.some((m: Member) => (m.id || m) === user?.id && m.role === 'leader')
    || (group?.leaderId && String(group.leaderId) === user?.id)
    || (!group?.leaderId && members.length > 0 && (members[0]?.id || members[0]) === user?.id);
  const isMember = members.some((m: Member) => (m.id || m) === user?.id);
  const isVisitor = !isMember;
  const groupPrompts = (group?.prompts && group.prompts.length > 0) ? group.prompts : intentPrompts;

  return {
    // 基础
    id, group, loadError, user, navigate,
    // 派生
    members, photos, hikeStatus, checkpoints, checkedInCount,
    isLeader, isMember, isVisitor, groupPrompts, intentRawInput,
    // 消息
    msg, setMsg, handleSend, sending, bottomRef,
    // 匹配
    matchTab, setMatchTab, matchedUsers, matchTeams, matchingEnabled, setMatchingEnabled,
    // 侧边栏
    sidebarPanel, setSidebarPanel, sidebarExpanded, setSidebarExpanded,
    // 位置
    userPos,
    // AI 助手
    handleAiAssistant, aiAssistantLoading, pendingBulletin, setPendingBulletin, confirmBulletin,
    // 相册
    uploadingPhoto, setUploadingPhoto, photoInputRef, handlePhotoUpload,
    // 计划
    editingPlan, setEditingPlan, planEditorRef, handleSavePlan,
    // 提示词
    editingPrompts, setEditingPrompts, editPromptsText, setEditPromptsText,
    showPromptsConfirm, setShowPromptsConfirm, handleSavePrompts,
    // 评论
    comments, newComment, setNewComment, handleAddComment,
    // 出发/完成
    showGoModal, setShowGoModal, showNoCheckpointModal, setShowNoCheckpointModal,
    countdown, handleGo, startCountdown, cancelCountdown,
    showCompleteModal, setShowCompleteModal, handleComplete, doComplete,
    completeTrackStats, hikingActionLoading,
    // 成员弹窗
    showMemberModal, setShowMemberModal, selectedMember, setSelectedMember,
    handleTransferLeader, handleClaimLeader,
    // SOS / 退出
    handleSOS, handleLeave,
    // 合并
    merging, mergeConfirmTeam, setMergeConfirmTeam,
    myLeaderTeams, selectedFromTeamId, setSelectedFromTeamId,
    handleMergeTeam, doApplyMerge,
    // 图片上传
    imageInputRef, handleImageUpload,
    // 引导
    showCheckpointGuide, setShowCheckpointGuide,
    // 弹窗互斥
    closeAllModals,
    // 加载
    loadGroup,
    // 工具
    showToast,
    // 确认弹窗
    ConfirmDialog,
    confirmDialog,
  };
}
