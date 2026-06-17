import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { groupsApi, intentApi, usersApi, traillogsApi } from '@/api';
import { useStore } from '@/store';
import { useConfirm } from '@/components/ConfirmDialog';
import type { Group, GroupMessage } from '@/types';
import { haversineDistance } from '@/lib/utils';

/** 简单 HTML 清理 */
export function sanitizeHTML(html: string): string {
  if (!html) return '';
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<script[\s\S]*?\/>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[\s\S]*?>/gi, '')
    .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\son\w+\s*=\s*[^\s>]*/gi, '');
}

export function isHTML(str: string): boolean {
  return /<[a-z][\s\S]*>/i.test(str);
}

/** 格式化消息时间 */
export function formatMsgTime(time: string | number): string {
  const date = new Date(time);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const timeStr = `${hh}:${mm}`;
  if (msgDate.getTime() === today.getTime()) return timeStr;
  if (msgDate.getTime() === yesterday.getTime()) return `昨天 ${timeStr}`;
  const MM = String(date.getMonth() + 1).padStart(2, '0');
  const DD = String(date.getDate()).padStart(2, '0');
  return `${MM}/${DD} ${timeStr}`;
}

export function useTeamChat(id?: string) {
  const navigate = useNavigate();
  const { user, showToast, track, clearTrack, loadGroups } = useStore();
  const { confirm: confirmDialog, ConfirmDialog } = useConfirm();

  // ── 基础数据 ──
  const [group, setGroup] = useState<Group | null>(null);
  const [loadError, setLoadError] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  const [matchingEnabled, setMatchingEnabled] = useState(true);

  // ── 消息 ──
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<number>(0);

  // ── 匹配 ──
  const [matchTab, setMatchTab] = useState<'members' | 'teams'>('members');
  const [matchedUsers, setMatchedUsers] = useState<any[]>([]);
  const [matchTeams, setMatchTeams] = useState<any[]>([]);

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
  const planEditorRef = useRef<HTMLDivElement>(null);

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
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [completeTrackStats, setCompleteTrackStats] = useState<{ dist: number; dur: number; pace: number } | null>(null);

  // ── 打卡点引导 ──
  const [showCheckpointGuide, setShowCheckpointGuide] = useState(() => {
    try { return localStorage.getItem('trailmate_guide_checkpoints') !== 'dismissed'; } catch { return true; }
  });

  // ── 合并 ──
  const [merging, setMerging] = useState(false);
  const [mergeConfirmTeam, setMergeConfirmTeam] = useState<any>(null);
  const [myLeaderTeams, setMyLeaderTeams] = useState<any[]>([]);
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
    } catch (e: any) {
      console.error('[TeamChat] Failed to load group:', e);
      setLoadError(e.message || '加载失败');
    } finally {
      loadingRef.current = false;
    }
  }, [id]);

  // ── 初始化 ──
  useEffect(() => {
    loadGroup();
    pollRef.current = window.setInterval(loadGroup, 3000);
    return () => clearInterval(pollRef.current);
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
      const el = planEditorRef.current;
      el.innerHTML = group.plan || '';
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [editingPlan, group]);

  // ── 侧边栏收起时关闭面板 ──
  useEffect(() => {
    if (!sidebarExpanded && sidebarPanel) {
      setSidebarPanel(null);
    }
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
        setMatchTeams(intent.matchedTeams.map((t: any) => ({
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
        const tags = t.tags || t.prompts || [];
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
          await groupsApi.update(id, { hikeStatus: 'hiking' as any });
          try { await groupsApi.update(id, { matchingEnabled: false }); } catch {}
          setMatchingEnabled(false);
          setShowGoModal(false);
          try { await traillogsApi.generateFromGroup(id); } catch {}
          showToast('征途开始！🏔');
          await loadGroup();
        } catch (err: any) {
          showToast(err.message || '出发失败');
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
  }, [msg, id, sending, loadGroup]);

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
      } catch {}
      await groupsApi.sos(id, location);
      showToast(location ? 'SOS 已发送！(含位置)' : 'SOS 已发送！');
    } catch (err: any) { showToast(err.message || 'SOS 发送失败'); }
  }, [id, showToast]);

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
  }, [group?.checkpoints, closeAllModals]);

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
    }, 800);
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
      const dist = track.slice(1).reduce((sum, pt, i) => sum + haversineDistance(track[i].lat, track[i].lng, pt.lat, pt.lng), 0);
      const dur = (track[track.length - 1].timestamp - track[0].timestamp) / 1000;
      const pace = dist > 0 ? dur / (dist / 1000) : 0;
      setCompleteTrackStats({ dist: Math.round(dist), dur: Math.round(dur), pace: Math.round(pace) });
    } else {
      setCompleteTrackStats(null);
    }
    setShowCompleteModal(true);
  }, [track, closeAllModals]);

  const doComplete = useCallback(async () => {
    if (!id || !group || !user) return;
    const isLeader = (group.members || []).some((m: any) => (m.id || m) === user.id && m.role === 'leader');
    setHikingActionLoading(true);
    try {
      const trackDist = track.length > 1
        ? track.slice(1).reduce((sum, pt, i) => sum + haversineDistance(track[i].lat, track[i].lng, pt.lat, pt.lng), 0)
        : 0;
      const trackDuration = track.length > 1
        ? (track[track.length - 1].timestamp - track[0].timestamp) / 1000
        : 0;
      const trackPace = trackDist > 0 && trackDuration > 0 ? trackDuration / (trackDist / 1000) : 0;

      // 仅队长更新队伍状态为已完成
      if (isLeader) {
        await groupsApi.update(id, { hikeStatus: 'completed' as any });
      }
      // 为当前用户生成日志（使用自己的轨迹数据）
      try {
        const cps = group.checkpoints || [];
        const startCp = cps.find((cp: any) => cp.type === 'start');
        const endCp = cps.find((cp: any) => cp.type === 'end');
        let distance = 0;
        if (startCp && endCp) {
          distance = Math.round(haversineDistance(startCp.lat, startCp.lng, endCp.lat, endCp.lng)) / 1000;
        }
        const startCheckin = startCp?.checkins?.find((ci: any) => ci.userId === user.id);
        const endCheckin = endCp?.checkins?.find((ci: any) => ci.userId === user.id);
        let duration = 0;
        if (startCheckin?.checkedInAt && endCheckin?.checkedInAt) {
          duration = Math.round((endCheckin.checkedInAt - startCheckin.checkedInAt) / 60000);
        }
        const checkpointRecords = cps
          .filter((cp: any) => cp.checkins?.some((ci: any) => ci.userId === user.id))
          .map((cp: any) => {
            const ci = cp.checkins.find((c: any) => c.userId === user.id);
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
      } catch {}
      clearTrack();
      setShowCompleteModal(false);
      showToast(isLeader ? '凯旋而归！日志已生成' : '征途完成！日志已生成');
      await loadGroup();
    } catch (err: any) {
      showToast(err.message || '操作失败');
    } finally {
      setHikingActionLoading(false);
    }
  }, [id, group, user, track, clearTrack, loadGroup, showToast]);

  // ── 退出 ──
  const doLeave = useCallback(async () => {
    if (!id) return;
    try {
      await groupsApi.leave(id);
      showToast('已退出队伍');
      await loadGroups();
      navigate('/teams');
    } catch (err: any) {
      showToast(err.message || '退出失败');
    }
  }, [id, showToast, navigate, loadGroups]);

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
      const isModifyIntent = /修改|更新|更改|换.*地点|换.*时间|换.*日期|改.*目的地|改.*时间|重新匹配|再匹配/.test(question);
      if (isModifyIntent && group.intentId) {
        const extracted = await intentApi.extract(question);
        const newEssentials = extracted.essentials || {};
        const newPrompts = extracted.prompts || [];
        const currentEssentials = group.essentials || {};
        const currentPrompts = group.prompts || [];
        const mergedEssentials = { ...currentEssentials, ...newEssentials };
        const mergedPrompts = [...new Set([...currentPrompts, ...newPrompts])];

        await intentApi.modifyIntent(group.intentId, { essentials: mergedEssentials, prompts: mergedPrompts });
        await groupsApi.sendMessage(id, `🤖 AI助手：已更新意图！地点：${mergedEssentials.location || '未定'}，日期：${mergedEssentials.date || '未定'}，已重新发起匹配`, 'system');
        await loadGroup();
        setAiAssistantLoading(false);
        setSending(false);
        return;
      }

      const chatMsgs = (group.messages || [])
        .filter((m: any) => m.type !== 'system' && m.user?.name)
        .map((m: any) => ({ content: m.content, userName: m.user?.name || '未知' }));
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
    } catch (err: any) {
      showToast(err.message || 'AI 助手回复失败');
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
    } catch (err: any) {
      showToast(err.message || '更新失败');
    }
  }, [id, pendingBulletin, loadGroup, showToast]);

  // ── 合并队伍 ──
  const handleMergeTeam = useCallback(async (targetTeam: any) => {
    closeAllModals();
    if (!id || !group || !user?.id) return;
    const teamId = typeof targetTeam === 'string' ? targetTeam : targetTeam?.id || targetTeam;
    const teamObj = typeof targetTeam === 'object' ? targetTeam : null;
    setMergeConfirmTeam(teamObj || { id: teamId, name: '目标队伍', essentials: {} });
    try {
      const allTeams = await groupsApi.list();
      const leaderTeams = allTeams.filter((t: any) => {
        const members = t.members || [];
        return members.some((m: any) => String(m.id || m) === String(user.id) && m.role === 'leader') || String(t.creatorId || '') === String(user.id);
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
    } catch (err: any) {
      showToast(err.message || '申请失败');
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
    } catch (err: any) {
      showToast(err.message || '评论失败');
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
    } catch (err: any) {
      showToast(err.message || '图片发送失败');
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
      const photos = group?.photos || [];
      const newPhotos = [...photos, url];
      await groupsApi.update(id, { photos: newPhotos });
      await loadGroup();
    } catch (err: any) {
      showToast(err.message || '上传失败');
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  }, [id, group?.photos, loadGroup, showToast]);

  // ── 提示词保存 ──
  const handleSavePrompts = useCallback(async () => {
    setShowPromptsConfirm(false);
    const newPrompts = editPromptsText.split(/[、,，]/).map(s => s.trim()).filter(Boolean);
    try {
      await groupsApi.update(id!, { prompts: newPrompts });
      if (group?.intentId) {
        const updated = await intentApi.update(group.intentId, { prompts: newPrompts });
        setMatchedUsers(updated.matchedUsers || []);
      }
      setEditingPrompts(false);
      showToast('提示词已更新，匹配已刷新');
      await loadGroup();
    } catch (err: any) { showToast(err.message || '保存失败'); }
  }, [id, editPromptsText, group?.intentId, loadGroup, showToast]);

  // ── 计划保存 ──
  const handleSavePlan = useCallback(async () => {
    if (!id) return;
    const rawHtml = planEditorRef.current?.innerHTML || '';
    try {
      await groupsApi.update(id, { plan: rawHtml, photos: group?.photos || [] });
      setEditingPlan(false);
      showToast('行动计划已保存');
      await loadGroup();
    } catch (err: any) { showToast(err.message || '保存失败'); }
  }, [id, group?.photos, loadGroup, showToast]);

  // ── 队长变更 ──
  const handleTransferLeader = useCallback(async (member: any) => {
    if (!id || !member?.id) return;
    try {
      await groupsApi.transferLeader(id, member.id);
      showToast(`已将队长移交给 ${member.name || '该成员'}`);
      setShowMemberModal(false);
      setSelectedMember(null);
      await loadGroup();
    } catch (err: any) { showToast(err.message || '移交失败'); }
  }, [id, loadGroup, showToast]);

  // ── 派生数据 ──
  const members = group?.members || [];
  const photos = group?.photos || [];
  const hikeStatus = group?.hikeStatus || 'idle';
  const checkpoints = group?.checkpoints || [];
  const checkedInCount = checkpoints.filter(cp => (cp.checkins || []).some(ci => ci.userId === user?.id)).length;
  const isLeader = members.some((m: any) => (m.id || m) === user?.id && m.role === 'leader');
  const isMember = members.some((m: any) => (m.id || m) === user?.id);
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
    handleTransferLeader,
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
