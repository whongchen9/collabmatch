import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mountain, Sparkles, Users, X, Send, RefreshCw, MapPin, Clock, Heart, Flame, ChevronRight, UserPlus, Swords, DoorOpen, Flag } from 'lucide-react';
import { useStore } from '@/store';
import { intentApi, groupsApi, lobbyApi } from '@/api';
import IntentCard from '@/components/IntentCard';
import type { MatchedUser, Intent } from '@/types';

interface ChatMsg {
  role: 'ai' | 'user';
  content: string;
  prompts?: string[];
  timestamp: number;
}

/* ── 队友卡片 ── */
function MatchedCard({ mu, onInvite }: { mu: MatchedUser; onInvite: () => void }) {
  const PERSONALITY_MAP: Record<string, { emoji: string; name: string; color: string }> = {
    navigator: { emoji: '\uD83E\uDD85', name: '领航者', color: '#3b82f6' },
    enjoyer: { emoji: '\uD83D\uDC22', name: '享受者', color: '#10b981' },
    socializer: { emoji: '\uD83E\uDD8A', name: '社交者', color: '#f59e0b' },
    challenger: { emoji: '\uD83D\uDC3A', name: '挑战者', color: '#ef4444' },
  };
  const personality = PERSONALITY_MAP[(mu.user as any)?.personality || ''];
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-50 dark:border-gray-800/50 last:border-b-0">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0"
        style={{ background: mu.user?.avatarColor || `hsl(${mu.matchPct * 1.2}, 55%, 45%)` }}>{mu.user.name?.[0] || '?'}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-extrabold text-gray-700 dark:text-gray-300">{mu.user.name}</span>
          <span className="text-[9px] font-extrabold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0 rounded-full">{mu.matchPct}%</span>
          {personality && (
            <span className="text-[8px] font-bold px-1.5 py-0 rounded-full"
              style={{ background: personality.color + '18', color: personality.color }}>
              {personality.emoji} {personality.name}
            </span>
          )}
        </div>
        <p className="text-[9px] text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-1">{mu.reason}</p>
      </div>
      <button onClick={onInvite}
        className="px-3 py-1.5 bg-green-600 text-white rounded-full text-[10px] font-extrabold active:scale-95 flex items-center gap-1 shadow-sm shrink-0 hover:bg-green-700 transition-colors">
        <UserPlus className="w-3 h-3" />邀请组队
      </button>
    </div>
  );
}

/* ── 正方形队伍卡片 ── */
function SquareCard({ team, onClick, hikeStatus }: { team: any; onClick: () => void; hikeStatus?: string }) {
  const needPeople = (team.maxMembers || 6) - (team.members || 0);
  const urgency = needPeople >= 3 ? 'high' : needPeople >= 2 ? 'mid' : 'low';

  return (
    <div onClick={onClick} className="shrink-0 w-[calc(33.333%-4px)] aspect-square rounded-xl shadow-sm dark:shadow-gray-900/50 border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col relative cursor-pointer">
      {/* ── 主体图片区 ── */}
      <div className="flex-1 relative overflow-hidden">
        <div className="w-full h-full bg-gradient-to-b from-sky-200 to-emerald-200 dark:from-slate-700 dark:to-emerald-900/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

        {/* 状态标签 */}
        {hikeStatus === 'hiking' && (
          <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-green-500/90 rounded-md text-[7px] text-white font-extrabold flex items-center gap-0.5">
            <Mountain className="w-2 h-2" />征途
          </div>
        )}
        {hikeStatus === 'completed' && (
          <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-amber-500/90 rounded-md text-[7px] text-white font-extrabold flex items-center gap-0.5">
            <Flag className="w-2 h-2" />凯旋
          </div>
        )}
        {!hikeStatus && team.hot && (
          <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-orange-500/90 rounded-md text-[7px] text-white font-extrabold flex items-center gap-0.5">
            <Flame className="w-2 h-2" />热
          </div>
        )}

        {/* 标题 */}
        <h4 className="absolute bottom-1.5 left-2 right-2 text-[10px] font-bold text-white truncate drop-shadow-md">{team.title}</h4>
      </div>

      {/* ── 底部信息条 ── */}
      <div className="px-2 py-1.5 bg-white dark:bg-gray-800">
        <div className="flex items-center gap-1">
          <MapPin className="w-2 h-2 text-gray-300 dark:text-gray-600 shrink-0" />
          <span className="text-[8px] text-gray-400 dark:text-gray-500 truncate">{team.location}</span>
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          {(team.tags || []).slice(0, 2).map((t: string, i: number) => (
            <span key={i} className="px-1 py-0 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded text-[7px] font-medium truncate max-w-[60px]">{t}</span>
          ))}
        </div>
      </div>

      {/* ── 成员数 badge ── */}
      <div className={`absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md text-[8px] font-bold flex items-center gap-0.5 ${
        urgency === 'high' ? 'bg-red-500/90 text-white' : urgency === 'mid' ? 'bg-amber-500/90 text-white' : 'bg-green-500/90 text-white'
      }`}>
        <Users className="w-2.5 h-2.5" />
        <span>{team.members || 0}/{team.maxMembers || 6}</span>
      </div>

      {/* ── 点赞数 ── */}
      {(team.likes ?? 0) > 0 && (
        <div className="absolute top-9 right-1.5 flex items-center gap-0.5 bg-black/25 rounded-full px-1.5 py-0.5">
          <Heart className="w-2 h-2 text-white/80" />
          <span className="text-[7px] text-white/80">{team.likes || 0}</span>
        </div>
      )}
    </div>
  );
}

/* ── 横滑行 ── */
function ScrollRow({ title, icon, teams, onTeamClick, hasMore, onLoadMore, loadingMore, borderColor }: {
  title: string;
  icon: React.ReactNode;
  teams: any[];
  onTeamClick: (id: string) => void;
  hasMore?: boolean;
  onLoadMore?: () => void;
  loadingMore?: boolean;
  borderColor?: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-sm dark:shadow-gray-900/50 mb-4">
      <div className={`flex items-center justify-between px-4 py-3 border-l-[3px] ${borderColor || 'border-l-green-400'}`}>
        <span className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">{icon}{title}</span>
        {hasMore && onLoadMore && (
          <button onClick={onLoadMore} disabled={loadingMore}
            className="text-[9px] text-gray-400 dark:text-gray-500 font-bold flex items-center gap-0.5 disabled:opacity-50">
            {loadingMore ? <RefreshCw className="w-3 h-3 animate-spin" /> : <>更多<ChevronRight className="w-3 h-3" /></>}
          </button>
        )}
      </div>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-3 px-4">
        {teams.length > 0 ? (
          teams.map((team: any) => <SquareCard key={team.id} team={team} onClick={() => onTeamClick(team.id)} />)
        ) : (
          <div className="w-full py-4 text-center"><span className="text-[10px] text-gray-300 dark:text-gray-600">暂无数据</span></div>
        )}
      </div>
    </div>
  );
}

/* ── 主页 ── */
export default function Home() {
  const { user, setMatching, resetMatching, showToast, intents, loadIntents, groups, loadGroups } = useStore();
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [intent, setIntent] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [allPrompts, setAllPrompts] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [matching, setMatchingState] = useState(false);
  const [autoJoinThreshold, setAutoJoinThreshold] = useState(0);
  const [createTeamMode, setCreateTeamMode] = useState(false);
  const isGuest = !!localStorage.getItem('trailmate_guest');

  useEffect(() => {
    const saved = localStorage.getItem('trailmate_auto_join');
    if (saved) {
      try { const { enabled, threshold } = JSON.parse(saved); if (enabled) setAutoJoinThreshold(threshold || 90); } catch {}
    }
  }, []);

  const [matchedUsers, setMatchedUsers] = useState<MatchedUser[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [shareTeams, setShareTeams] = useState<any[]>([]);
  const [latestTeams, setLatestTeams] = useState<any[]>([]);
  const [hotTeams, setHotTeams] = useState<any[]>([]);
  const [squareLoading, setSquareLoading] = useState(false);
  const [sharePage, setSharePage] = useState(1);
  const [latestPage, setLatestPage] = useState(1);
  const [hotPage, setHotPage] = useState(1);
  const [shareHasMore, setShareHasMore] = useState(true);
  const [latestHasMore, setLatestHasMore] = useState(true);
  const [hotHasMore, setHotHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState<string | null>(null);

  const mapItem = useCallback((item: any) => ({
    id: item.id, title: item.name || item.title || '未命名',
    location: item.essentials?.location || item.desc || '', date: item.createdAt || '',
    members: item.members?.length || 0, maxMembers: item.essentials?.groupSize || 6,
    likes: item.likes || 0, hot: item.hot || false,
    tags: item.prompts?.slice(0, 3) || [], photos: item.photos || [],
  }), []);

  const loadSquareData = useCallback(async () => {
    setSquareLoading(true); setSharePage(1); setLatestPage(1); setHotPage(1);
    setShareHasMore(true); setLatestHasMore(true); setHotHasMore(true);
    try {
      const [shareRes, latestRes, hotRes] = await Promise.all([
        groupsApi.publicGroups('share', 1).catch(() => ({ items: [], hasMore: false })),
        groupsApi.publicGroups('latest', 1).catch(() => ({ items: [], hasMore: false })),
        groupsApi.publicGroups('hot', 1).catch(() => ({ items: [], hasMore: false })),
      ]);
      setShareTeams((shareRes.items || []).map(mapItem));
      setLatestTeams((latestRes.items || []).map(mapItem));
      setHotTeams((hotRes.items || []).map(mapItem));
      if (shareRes.hasMore === false) setShareHasMore(false);
      if (latestRes.hasMore === false) setLatestHasMore(false);
      if (hotRes.hasMore === false) setHotHasMore(false);
    } catch {} finally { setSquareLoading(false); }
  }, [mapItem]);

  const loadMore = useCallback(async (type: 'share' | 'latest' | 'hot') => {
    setLoadingMore(type);
    try {
      let newPage: number;
      if (type === 'share') { newPage = sharePage + 1; setSharePage(newPage); const res = await groupsApi.publicGroups('share', newPage).catch(() => ({ items: [], hasMore: false })); setShareTeams(prev => [...prev, ...(res.items || []).map(mapItem)]); if (res.hasMore === false) setShareHasMore(false); }
      else if (type === 'latest') { newPage = latestPage + 1; setLatestPage(newPage); const res = await groupsApi.publicGroups('latest', newPage).catch(() => ({ items: [], hasMore: false })); setLatestTeams(prev => [...prev, ...(res.items || []).map(mapItem)]); if (res.hasMore === false) setLatestHasMore(false); }
      else { newPage = hotPage + 1; setHotPage(newPage); const res = await groupsApi.publicGroups('hot', newPage).catch(() => ({ items: [], hasMore: false })); setHotTeams(prev => [...prev, ...(res.items || []).map(mapItem)]); if (res.hasMore === false) setHotHasMore(false); }
    } catch {} finally { setLoadingMore(null); }
  }, [sharePage, latestPage, hotPage, mapItem]);

  useEffect(() => {
    if (user && !isGuest) { loadSquareData(); loadIntents(); loadGroups(); }
  }, [user, isGuest, loadSquareData, loadIntents, loadGroups]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleChatSend = async () => {
    if (!input.trim() || sending) return; const userMsg = input.trim(); setInput(''); setSending(true);
    setMessages(prev => [...prev, { role: 'user', content: userMsg, timestamp: Date.now() }]);
    try {
      const result = await intentApi.extract(userMsg); const newPrompts = [...new Set([...allPrompts, ...result.prompts])];
      setAllPrompts(newPrompts);
      setMessages(prev => [...prev, { role: 'ai', content: result.reply, prompts: result.prompts.length > 0 ? result.prompts : undefined, timestamp: Date.now() }]);
      if (/帮我匹配|开始匹配|找队友|找人|匹配一下|帮我找|开始找/.test(userMsg)) await startMatch(userMsg, newPrompts);
    } catch { setMessages(prev => [...prev, { role: 'ai', content: '抱歉，我暂时无法理解，请再试一次。', timestamp: Date.now() }]); }
    setSending(false);
  };

  const startMatch = async (rawInput: string, prompts: string[]) => {
    const fullInput = messages.filter(m => m.role === 'user').map(m => m.content).join('，') + '，' + rawInput;
    setMatchingState(true); setMatching({ status: 'matching', prompts, rawInput: fullInput });
    try {
      const intentResult = await intentApi.create(fullInput); setIntent(intentResult);
      const matchResult = await lobbyApi.quickMatch({ location: intentResult.essentials?.location || '', date: intentResult.essentials?.date || '', difficulty: intentResult.essentials?.difficulty || '', prompts: intentResult.prompts || prompts, rawInput: fullInput, autoCreateTeam: createTeamMode });
      setMatching({ status: 'done', prompts: intentResult.prompts || prompts, intent: intentResult, rawInput: fullInput });
      const users = intentResult.matchedUsers || [];
      if (autoJoinThreshold > 0 && users.length > 0) {
        const autoJoinUsers = users.filter((mu: MatchedUser) => mu.matchPct >= autoJoinThreshold);
        const needInviteUsers = users.filter((mu: MatchedUser) => mu.matchPct < autoJoinThreshold);
        if (autoJoinUsers.length > 0) { try { await intentApi.confirmTeam(intentResult.id, autoJoinUsers.map((mu: MatchedUser) => mu.user.id)); showToast(`${autoJoinUsers.length} 位队友已自动进队`); loadGroups(); } catch {} setMatchedUsers(needInviteUsers); }
        else setMatchedUsers(users);
      } else setMatchedUsers(users);
      if (createTeamMode && matchResult.autoRoom) { showToast(`已创建队伍「${matchResult.autoRoom.name}」`); loadGroups(); }
      const total = users.length + (matchResult.rooms?.length || 0) + (matchResult.soloPlayers?.length || 0);
      if (total > 0) { let msg = `找到了 ${users.length} 位匹配队友`; if ((matchResult.rooms?.length || 0) > 0) msg += `、${matchResult.rooms?.length} 支推荐队伍`; if ((matchResult.soloPlayers?.length || 0) > 0) msg += `、${matchResult.soloPlayers?.length} 位散人队友`; setMessages(prev => [...prev, { role: 'ai', content: msg + '，查看下方邀请组队吧！', timestamp: Date.now() }]); }
      else if (createTeamMode) setMessages(prev => [...prev, { role: 'ai', content: '暂无匹配队友，已为你创建队伍等待加入', timestamp: Date.now() }]);
    } catch (err: any) { setMessages(prev => [...prev, { role: 'ai', content: `匹配失败：${err.message || '请稍后重试'}`, timestamp: Date.now() }]); resetMatching(); }
    setMatchingState(false);
  };

  const handleQuickMatch = async () => {
    if (!input.trim()) return; const fullInput = input.trim(); setInput(''); setMatchingState(true);
    setMatching({ status: 'matching', prompts: [], rawInput: fullInput });
    try {
      const intentResult = await intentApi.create(fullInput); setIntent(intentResult); setAllPrompts(intentResult.prompts || []);
      const matchResult = await lobbyApi.quickMatch({ location: intentResult.essentials?.location || '', date: intentResult.essentials?.date || '', difficulty: intentResult.essentials?.difficulty || '', prompts: intentResult.prompts || [], rawInput: fullInput, autoCreateTeam: createTeamMode });
      setMatchedUsers(intentResult.matchedUsers || []); setMatching({ status: 'done', prompts: intentResult.prompts || [], intent: intentResult, rawInput: fullInput });
      if (createTeamMode && matchResult.autoRoom) { showToast(`已创建队伍「${matchResult.autoRoom.name}」`); loadGroups(); }
    } catch (err: any) { showToast(err.message || '匹配失败'); resetMatching(); }
    setMatchingState(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (allPrompts.length > 0 || messages.length > 0) handleChatSend(); else handleQuickMatch(); } };
  const handleInviteUser = async (uid: string) => { if (!intent) return; try { await intentApi.confirmTeam(intent.id, [uid]); showToast('邀请已发送！'); setMatchedUsers(prev => prev.filter(mu => mu.user.id !== uid)); setSelectedIds(new Set()); loadGroups(); } catch (err: any) { showToast(err.message || '邀请失败'); } };
  const handleConfirmTeam = async () => { if (!intent || selectedIds.size === 0) return; try { await intentApi.confirmTeam(intent.id, Array.from(selectedIds)); showToast('组队成功！'); setMatchedUsers(prev => prev.filter(mu => !selectedIds.has(mu.user.id))); setSelectedIds(new Set()); loadGroups(); } catch (err: any) { showToast(err.message || '组队失败'); } };
  const handleReset = () => { setIntent(null); setSelectedIds(new Set()); setMatchedUsers([]); setMessages([]); setAllPrompts([]); setInput(''); resetMatching(); };
  const removePrompt = (idx: number) => { setAllPrompts(prev => prev.filter((_, i) => i !== idx)); };
  const handleTeamClick = (id: string) => { navigate(`/team/${id}`); };
  const findGroupByIntentId = (intentId: string) => groups.find((g: any) => g.intentId === intentId);
  const handleIntentClick = (intentItem: Intent) => {
    const g = findGroupByIntentId(intentItem.id);
    if (g) navigate(`/team/${g.id}`);
  };
  const handleIntentToggleMatch = async (intentItem: Intent, enabled: boolean) => {
    try { await intentApi.update(intentItem.id, { status: enabled ? 'matching' : 'expired' }); loadIntents(); }
    catch (err: any) { showToast(err.message || '操作失败'); }
  };
  const hasChat = messages.length > 0;
  const hasMatchResults = matchedUsers.length > 0;
  const hikingTeam = groups.find((g: any) => g.hikeStatus === 'hiking');

  return (
    <div className="pb-16 min-h-screen flex flex-col bg-[#faf7f2] dark:bg-gray-950">

      {/* ═══ 征途中提示条 ═══ */}
      {hikingTeam && (
        <div className="shrink-0 mx-4 mt-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl px-3 py-3 flex items-center justify-between gap-2">
          <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold flex-1 flex items-center gap-1.5">
            <Mountain className="w-3.5 h-3.5" />你正在「{hikingTeam.name}」征途中
          </span>
          <button onClick={() => navigate(`/team/${hikingTeam.id}`)}
            className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[10px] font-extrabold hover:bg-emerald-700 transition-colors shrink-0">
            回到队伍
          </button>
        </div>
      )}

      {/* ═══ 匹配输入卡 ═══ */}
      <div className="shrink-0 mx-4 mt-3 bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-sm dark:shadow-gray-900/50">
        {isGuest && (
          <div className="px-4 pt-3 pb-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-900/30">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-amber-100 dark:bg-amber-800/30 flex items-center justify-center shrink-0">
                <Mountain className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-extrabold text-amber-700 dark:text-amber-300">访客模式 · 功能受限</p>
                <p className="text-[9px] text-amber-600/80 dark:text-amber-400/80 mt-0.5">登录后可发起匹配、创建队伍</p>
              </div>
              <button onClick={() => navigate('/login')}
                className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-[10px] font-extrabold active:scale-95 shrink-0 hover:bg-amber-600 transition-colors">
                去登录
              </button>
            </div>
          </div>
        )}
        <div className="px-4 pt-4 pb-2">
          {!hasChat ? (
            <div className="text-center">
              <h1 className="text-base font-black text-gray-800 dark:text-gray-100">
                一句话<span className="text-green-600">匹配队友</span>
              </h1>
              <p className="text-gray-400 dark:text-gray-500 text-[10px] mt-1">告诉我想去哪里、想找什么样的人</p>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg flex items-center justify-center">
                <Mountain className="w-3 h-3 text-emerald-500" />
              </div>
              <span className="text-xs font-extrabold text-gray-700 dark:text-gray-300">AI 匹配助手</span>
            </div>
          )}
        </div>

        {allPrompts.length > 0 && (
          <div className="px-4 pb-2">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Sparkles className="w-3 h-3 text-emerald-500" />
              <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500">匹配条件 · {allPrompts.length}</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <div className="flex flex-wrap gap-1 flex-1">
                {allPrompts.map((p, i) => (
                  <span key={i} className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-full text-[9px] font-bold border border-emerald-100 dark:border-emerald-900/30">
                    {p}<button onClick={() => removePrompt(i)} className="hover:text-red-500 ml-0.5"><X className="w-2.5 h-2.5" /></button>
                  </span>
                ))}
              </div>
              {!matching && !hasMatchResults && (
                <button onClick={() => startMatch(allPrompts.join('，'), allPrompts)}
                  className="px-3 py-1.5 bg-green-600 text-white rounded-full text-[10px] font-extrabold active:scale-95 flex items-center gap-1 shadow-sm shrink-0 hover:bg-green-700 transition-colors">
                  <Sparkles className="w-2.5 h-2.5" />匹配
                </button>
              )}
            </div>
          </div>
        )}

        {hasChat && (
          <div className="px-4 pb-2 max-h-28 overflow-y-auto space-y-1.5">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[80%]">
                  <div className={`px-2.5 py-1.5 text-[11px] leading-relaxed ${msg.role === 'user' ? 'bg-green-600 text-white rounded-xl rounded-br-sm' : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl rounded-bl-sm'}`}>
                    {msg.content}
                  </div>
                  {msg.role === 'ai' && msg.prompts && msg.prompts.length > 0 && (
                    <div className="mt-0.5 flex flex-wrap gap-0.5">
                      {msg.prompts.map((p, j) => <span key={j} className="px-1.5 py-0 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-full text-[8px] font-bold">+{p}</span>)}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        )}

        {!hasChat && (
          <div className="px-4 pb-3 flex flex-wrap gap-1.5 justify-center">
            {['周末梧桐山日归', '不喜欢抽烟', '轻松', '3天长线挑战'].map(s => (
              <button key={s} onClick={() => !isGuest && setInput(s)}
                className={`px-2.5 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-full text-[10px] font-bold transition-all ${isGuest ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' : 'text-gray-400 dark:text-gray-500 hover:text-green-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'}`}>{s}</button>
            ))}
          </div>
        )}

        <div className="px-3 pb-3.5 flex items-center gap-2">
          <button onClick={() => setCreateTeamMode(v => !v)} disabled={isGuest}
            className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90 ${
              createTeamMode ? 'bg-blue-600 shadow-md shadow-blue-200 dark:shadow-blue-900/30' : 'bg-gray-100 dark:bg-gray-800'
            } ${isGuest ? 'opacity-40' : ''}`}
            title={isGuest ? '请先登录' : (createTeamMode ? '开房模式：匹配后自动创建队伍' : '排位模式：只匹配不开房')}>
            {createTeamMode ? <DoorOpen className="w-4 h-4 text-white" /> : <Swords className="w-4 h-4 text-gray-400 dark:text-gray-500" />}
          </button>
          <input ref={inputRef} type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
            placeholder={isGuest ? '请先登录以使用匹配功能…' : (createTeamMode ? '开房组队：说一句话自动创建队伍...' : '排位匹配：说一句话找队友...')}
            className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-full text-sm outline-none focus:ring-1 focus:ring-green-400 placeholder:text-gray-300 dark:placeholder:text-gray-600 dark:text-gray-200"
            disabled={sending || matching || isGuest} />
          <button onClick={hasChat || allPrompts.length > 0 ? handleChatSend : handleQuickMatch}
            disabled={!input.trim() || sending || matching || isGuest}
            className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center disabled:opacity-30 shadow-md shadow-green-200 dark:shadow-green-900/30 shrink-0 active:scale-90 transition-all">
            {sending || matching ? <RefreshCw className="w-4 h-4 text-white animate-spin" /> : hasChat || allPrompts.length > 0 ? <Send className="w-4 h-4 text-white" /> : <Sparkles className="w-4 h-4 text-white" />}
          </button>
        </div>
      </div>

      {/* ═══ 下半区 ═══ */}
      <div className="flex-1 px-4 pt-3 overflow-y-auto space-y-0">

        {/* 匹配结果 */}
        {hasMatchResults && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-sm dark:shadow-gray-900/50 mb-3">
            <div className="flex items-center justify-between px-4 py-3 border-l-[3px] border-l-purple-400">
              <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-500" />匹配队友
              </h4>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-purple-500 bg-purple-50 dark:bg-purple-900/20 px-2 py-0.5 rounded-full">{matchedUsers.length}人</span>
                {selectedIds.size > 0 && (
                  <button onClick={handleConfirmTeam}
                    className="px-2.5 py-1.5 bg-purple-600 text-white rounded-full text-[10px] font-extrabold active:scale-95 flex items-center gap-1 shadow-sm hover:bg-purple-700 transition-colors">
                    <Users className="w-2.5 h-2.5" />确认组队({selectedIds.size})
                  </button>
                )}
              </div>
            </div>
            <div className="px-4 pb-2">
              {matchedUsers.map((mu: MatchedUser) => (
                <MatchedCard key={mu.user.id} mu={mu} onInvite={() => handleInviteUser(mu.user.id)} />
              ))}
            </div>
          </div>
        )}
        {/* 广场加载 */}
        {squareLoading && (
          <div className="flex items-center justify-center py-6">
            <RefreshCw className="w-5 h-5 text-gray-300 dark:text-gray-600 animate-spin" />
          </div>
        )}

        {/* 我的意图 */}
        {intents.length > 0 && (
          <div className="mb-3 bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-sm dark:shadow-gray-900/50">
            <div className="flex items-center justify-between px-4 py-3 border-l-[3px] border-l-purple-400">
              <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-500" />我的意图
              </h4>
              <span className="text-[10px] font-bold text-purple-500 bg-purple-50 dark:bg-purple-900/20 px-2 py-0.5 rounded-full">{intents.length}</span>
            </div>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-3 px-4">
              {intents.map((intent: Intent) => {
                const g = findGroupByIntentId(intent.id);
                return (
                  <IntentCard
                    key={intent.id}
                    intent={intent}
                    groupId={g?.id}
                    memberCount={g?.members?.length}
                    maxMembers={g?.maxMembers}
                    hikeStatus={g?.hikeStatus}
                    matchingEnabled={intent.status === 'matching'}
                    onClick={() => handleIntentClick(intent)}
                    onToggleMatch={(enabled) => handleIntentToggleMatch(intent, enabled)}
                    onEdit={() => {
                      setIntent(intent);
                      setMatchedUsers(intent.matchedUsers || []);
                      setAllPrompts(intent.prompts || []);
                      setSelectedIds(new Set());
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}

        <ScrollRow title="完成分享" icon={<Flag className="w-3.5 h-3.5 text-green-500" />} teams={shareTeams} onTeamClick={handleTeamClick} hasMore={shareHasMore} onLoadMore={() => loadMore('share')} loadingMore={loadingMore === 'share'} borderColor="border-l-green-400" />
        <ScrollRow title="最新" icon={<Clock className="w-3.5 h-3.5 text-blue-500" />} teams={latestTeams} onTeamClick={handleTeamClick} hasMore={latestHasMore} onLoadMore={() => loadMore('latest')} loadingMore={loadingMore === 'latest'} borderColor="border-l-blue-400" />
        <ScrollRow title="最热" icon={<Flame className="w-3.5 h-3.5 text-amber-500" />} teams={hotTeams} onTeamClick={handleTeamClick} hasMore={hotHasMore} onLoadMore={() => loadMore('hot')} loadingMore={loadingMore === 'hot'} borderColor="border-l-amber-400" />

      </div>

    </div>
  );
}
