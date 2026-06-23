import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mountain, Sparkles, Users, X, Bell, Send, RefreshCw, MapPin, Clock, Heart, Flame, ChevronRight, Swords, DoorOpen, Flag, Calendar } from 'lucide-react';
import { useStore } from '@/store';
import { intentApi, groupsApi, lobbyApi } from '@/api';
import IntentCard from '@/components/IntentCard';
import { useT, useLanguage } from '@/i18n';
import type { MatchedUser, Intent, Group } from '@/types';

const SCROLL_KEY = 'trailmate_home_scroll';

interface ChatMsg {
  role: 'ai' | 'user';
  content: string;
  prompts?: string[];
  timestamp: number;
}

interface SquareTeam {
  id: string;
  title: string;
  location: string;
  date: string;
  members: number;
  maxMembers: number;
  likes: number;
  hot: boolean;
  tags: string[];
  photos: string[];
  hikeStatus?: string;
}

/* ── 正方形队伍卡片 ── */
function SquareCard({ team, onClick, hikeStatus }: { team: SquareTeam; onClick: () => void; hikeStatus?: string }) {
  const language = useLanguage();
  const [photoIdx, setPhotoIdx] = useState(0);
  const hasPhotos = team.photos && team.photos.length > 0;

  useEffect(() => {
    if (!hasPhotos || team.photos.length <= 1) return;
    const t = setInterval(() => setPhotoIdx(i => (i + 1) % team.photos.length), 3000);
    return () => clearInterval(t);
  }, [hasPhotos, team.photos?.length]);

  const needPeople = (team.maxMembers || 6) - (team.members || 0);
  const urgency = needPeople >= 3 ? 'high' : needPeople >= 2 ? 'mid' : 'low';

  return (
    <div onClick={onClick} className="shrink-0 w-[calc(33.333%-4px)] aspect-square rounded-xl shadow-sm dark:shadow-gray-900/50 border-2 border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col relative cursor-pointer">
      <div className="flex-1 relative overflow-hidden">
        {hasPhotos ? (
          <img src={team.photos[photoIdx]} alt={team.title} className="w-full h-full object-cover transition-opacity duration-700" />
        ) : (
          <div className={`w-full h-full ${team.hot ? 'bg-gradient-to-br from-orange-50 to-amber-100 dark:from-orange-900/20 dark:to-amber-900/20' : 'bg-gradient-to-b from-sky-200 to-emerald-200 dark:from-slate-700 dark:to-emerald-900/30'}`} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        <h4 className="absolute bottom-1.5 left-2 right-2 text-[10px] font-bold text-white truncate drop-shadow-md">{team.title}</h4>
        {hikeStatus === 'hiking' && (
          <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-green-500/90 rounded-md text-[7px] text-white font-extrabold flex items-center gap-0.5">
            <Mountain className="w-2 h-2" />{language === 'en' ? 'Hiking' : '征途'}
          </div>
        )}
        {hikeStatus === 'completed' && (
          <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-amber-500/90 rounded-md text-[7px] text-white font-extrabold flex items-center gap-0.5">
            <Flag className="w-2 h-2" />{language === 'en' ? 'Done' : '凯旋'}
          </div>
        )}
        {!hikeStatus && team.hot && (
          <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-orange-500/90 rounded-md text-[7px] text-white font-extrabold flex items-center gap-0.5">
            <Flame className="w-2 h-2" />{language === 'en' ? 'Hot' : '热'}
          </div>
        )}
      </div>
      <div className="px-2 py-1.5 bg-white dark:bg-gray-800">
        <div className="flex items-center gap-1.5">
          {(team.location || team.date) ? (
            <>
              {team.location && (
                <span className="flex items-center gap-0.5 text-[8px] text-gray-400 dark:text-gray-500 truncate">
                  <MapPin className="w-2 h-2 text-gray-300 dark:text-gray-600 shrink-0" />{team.location}
                </span>
              )}
              {team.date && (
                <span className="flex items-center gap-0.5 text-[8px] text-gray-400 dark:text-gray-500 truncate">
                  <Calendar className="w-2 h-2 text-gray-300 dark:text-gray-600 shrink-0" />{team.date}
                </span>
              )}
            </>
          ) : (
            <span className="text-[8px] text-gray-300 dark:text-gray-600">{language === 'en' ? 'Info needed' : '待补充信息'}</span>
          )}
          <span className={`ml-auto flex items-center gap-0.5 text-[8px] font-bold ${
            urgency === 'high' ? 'text-red-500' : urgency === 'mid' ? 'text-amber-500' : 'text-green-600'
          }`}>
            <Users className="w-2.5 h-2.5" />
            {team.members || 0}/{team.maxMembers || 6}
          </span>
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          {(team.tags || []).slice(0, 2).map((t: string, i: number) => (
            <span key={i} className="px-1 py-0 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded text-[7px] font-medium">{t}</span>
          ))}
          {(team.tags || []).length === 0 && (
            <span className="text-[7px] text-gray-300 dark:text-gray-600">{language === 'en' ? 'No tags' : '暂无标签'}</span>
          )}
        </div>
      </div>
      <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 bg-black/25 rounded-full px-1.5 py-0.5">
        <Heart className="w-2 h-2 text-white/80" />
        <span className="text-[7px] text-white/80">{team.likes || 0}</span>
      </div>
    </div>
  );
}

/* ── 横滑行 ── */
function ScrollRow({ title, icon, teams, onTeamClick, hasMore, onLoadMore, loadingMore, borderColor }: {
  title: string;
  icon: React.ReactNode;
  teams: SquareTeam[];
  onTeamClick: (id: string) => void;
  hasMore: boolean;
  onLoadMore: () => void;
  loadingMore: boolean;
  borderColor: string;
}) {
  const t = useT();
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-sm dark:shadow-gray-900/50 mb-3">
      <div className={`flex items-center justify-between px-4 py-3 border-l-[3px] ${borderColor}`}>
        <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">{icon}{title}</h4>
        {hasMore && (
          <button onClick={onLoadMore} className="text-[10px] text-gray-400 dark:text-gray-500 font-bold flex items-center gap-0.5">
            {loadingMore ? <RefreshCw className="w-3 h-3 animate-spin" /> : <>{t('common.more')}<ChevronRight className="w-3 h-3" /></>}
          </button>
        )}
      </div>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-3 px-4">
        {teams.length === 0 ? (
          <p className="text-xs text-gray-300 dark:text-gray-600 py-4 text-center w-full">{t('common.empty')}</p>
        ) : (
          teams.map(team => (
            <SquareCard key={team.id} team={team} onClick={() => onTeamClick(team.id)} />
          ))
        )}
      </div>
    </div>
  );
}

/* ── 主页 ── */
export default function Home() {
  const { user, setMatching, resetMatching, showToast, intents, loadIntents, groups, loadGroups } = useStore();
  const navigate = useNavigate();
  const language = useLanguage();
  const [input, setInput] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [matching, setMatchingLocal] = useState(false);
  const [, setIntent] = useState<Intent | null>(null);
  const [, setSelectedIds] = useState<Set<string>>(new Set());
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [sending, setSending] = useState(false);
  const [allPrompts, setAllPrompts] = useState<string[]>([]);
  const [, setMatchedUsers] = useState<MatchedUser[]>([]);
  const [createTeamMode, setCreateTeamMode] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [latestTeams, setLatestTeams] = useState<SquareTeam[]>([]);
  const [hotTeams, setHotTeams] = useState<SquareTeam[]>([]);
  const [intentsLoading, setIntentsLoading] = useState(true);
  const [squareLoading, setSquareLoading] = useState(false);
  const [latestPage, setLatestPage] = useState(1);
  const [hotPage, setHotPage] = useState(1);
  const [latestHasMore, setLatestHasMore] = useState(true);
  const [hotHasMore, setHotHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState<string | null>(null);

  const formatDate = (ts: number | string | undefined): string => {
    if (!ts) return '';
    const n = typeof ts === 'string' ? parseInt(ts, 10) : ts;
    if (!n || Number.isNaN(n)) return String(ts);
    const d = new Date(n);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 0) return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (diff < 60000) return language === 'en' ? 'just now' : '刚刚';
    if (diff < 3600000) return language === 'en' ? `${Math.floor(diff / 60000)} min ago` : `${Math.floor(diff / 60000)} 分钟前`;
    if (diff < 86400000) return language === 'en' ? `${Math.floor(diff / 3600000)}h ago` : `${Math.floor(diff / 3600000)} 小时前`;
    if (diff < 2592000000) return language === 'en' ? `${Math.floor(diff / 86400000)}d ago` : `${Math.floor(diff / 86400000)} 天前`;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const mapItem = useCallback((item: Group): SquareTeam => ({
    id: item.id, title: item.name || (language === 'en' ? 'Untitled' : '未命名'),
    location: item.essentials?.location || item.desc || '', date: formatDate(item.createdAt),
    members: item.members?.length || 0, maxMembers: item.essentials?.groupSize || 6,
    likes: item.likes || 0, hot: item.hot || false,
    tags: item.prompts?.slice(0, 3) || [], photos: item.photos || [],
    hikeStatus: item.hikeStatus,
  }), [language]);

  const loadSquareData = useCallback(async () => {
    setSquareLoading(true);
    setLatestPage(1); setHotPage(1);
    setLatestHasMore(true); setHotHasMore(true);
    try {
      const [latestRes, hotRes] = await Promise.all([
        groupsApi.publicGroups('latest'),
        groupsApi.publicGroups('hot'),
      ]);
      setLatestTeams((latestRes.items || []).map(mapItem).slice(0, 6));
      setHotTeams((hotRes.items || []).map(mapItem).slice(0, 6));
      setLatestHasMore((latestRes.items || []).length > 6);
      setHotHasMore((hotRes.items || []).length > 6);
    } catch {
      // ignore
    }
    setSquareLoading(false);
  }, [mapItem]);

  const loadMore = useCallback(async (type: string) => {
    setLoadingMore(type);
    try {
      if (type === 'latest') { const res = await groupsApi.publicGroups('latest', latestPage + 1); setLatestTeams(prev => [...prev, ...(res.items || []).map(mapItem)]); setLatestPage(p => p + 1); setLatestHasMore((res.items || []).length > 0); }
      else if (type === 'hot') { const res = await groupsApi.publicGroups('hot', hotPage + 1); setHotTeams(prev => [...prev, ...(res.items || []).map(mapItem)]); setHotPage(p => p + 1); setHotHasMore((res.items || []).length > 0); }
    } catch {
      // ignore
    }
    setLoadingMore(null);
  }, [latestPage, hotPage, mapItem]);

  useEffect(() => { if (user) { intentApi.unreadCount().then(r => setUnreadCount(r.count)).catch(() => {}); loadSquareData(); loadIntents().finally(() => setIntentsLoading(false)); loadGroups(); } }, [user, loadSquareData, loadIntents, loadGroups]);

  // 滚动位置恢复
  useEffect(() => {
    const saved = sessionStorage.getItem(SCROLL_KEY);
    if (saved) requestAnimationFrame(() => window.scrollTo(0, parseInt(saved, 10)));
    return () => { sessionStorage.setItem(SCROLL_KEY, String(window.scrollY)); };
  }, []);

  const goToTeam = useCallback((id: string) => {
    sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));
    navigate(`/team/${id}`);
  }, [navigate]);

  const startMatch = async (rawInput: string, prompts: string[]) => {
    const fullInput = messages.filter(m => m.role === 'user').map(m => m.content).join('，') + '，' + rawInput;
    setMatchingLocal(true);
    setMatching({ status: 'matching', prompts, rawInput: fullInput });
    try {
      const result = await intentApi.create(fullInput); setIntent(result);
      await lobbyApi.quickMatch({ location: result.essentials?.location || '', prompts: result.prompts || prompts, rawInput: fullInput, autoCreateTeam: createTeamMode });
      setMatching({ status: 'done', prompts: result.prompts || prompts, intent: result, rawInput: fullInput });
      await loadIntents(); await loadGroups();
      // 从 store 读取最新值，避免闭包过期导致找不到队伍
      const g = useStore.getState().groups.find((g: Group) => g.intentId === result.id);
      if (g) { showToast(language === 'en' ? 'Matched! Entering team…' : '匹配成功！正在进入队伍…'); navigate(`/team/${g.id}`); }
      else showToast(language === 'en' ? 'Match complete, please check teams' : '匹配完成，请查看队伍');
    } catch (err: unknown) {
      setMessages(prev => [...prev, { role: 'ai', content: language === 'en' ? `Match failed: ${(err as Error).message || 'please try again later'}` : `匹配失败：${(err as Error).message || '请稍后重试'}`, timestamp: Date.now() }]);
      resetMatching();
    }
    setMatchingLocal(false);
  };

  const handleQuickMatch = async () => {
    if (!input.trim()) return;
    const fullInput = input.trim(); setInput('');
    setMatchingLocal(true);
    setMatching({ status: 'matching', prompts: [], rawInput: fullInput });
    try {
      const result = await intentApi.create(fullInput); setIntent(result); setAllPrompts(result.prompts || []);
      await lobbyApi.quickMatch({ location: result.essentials?.location || '', prompts: result.prompts || [], rawInput: fullInput, autoCreateTeam: createTeamMode });
      await loadIntents(); await loadGroups();
      // 从 store 读取最新值，避免闭包过期导致找不到队伍
      const g = useStore.getState().groups.find((g: Group) => g.intentId === result.id);
      if (g) { showToast(language === 'en' ? 'Matched! Entering team…' : '匹配成功！正在进入队伍…'); navigate(`/team/${g.id}`); }
      else showToast(language === 'en' ? 'Match complete, please check teams' : '匹配完成，请查看队伍');
    } catch (err: unknown) { alert((err as Error).message || (language === 'en' ? 'Match failed' : '匹配失败')); resetMatching(); }
    setMatchingLocal(false);
  };

  const handleChatSend = async () => {
    if (!input.trim()) return; const userMsg = input.trim(); if (userMsg.length > 200) { showToast(language === 'en' ? 'Please enter within 200 characters' : '请输入 200 字以内'); return; }
    setInput(''); setSending(true);
    setMessages(prev => [...prev, { role: 'user', content: userMsg, timestamp: Date.now() }]);
    try {
      const result = await intentApi.extract(userMsg);
      const newPrompts = [...new Set([...allPrompts, ...result.prompts])];
      setAllPrompts(newPrompts);
      setMessages(prev => [...prev, { role: 'ai', content: result.reply, prompts: result.prompts.length > 0 ? result.prompts : undefined, timestamp: Date.now() }]);
      if (/帮我匹配|开始匹配|找队友|找人|匹配一下|帮我找|开始找/.test(userMsg)) await startMatch(userMsg, newPrompts);
    } catch {
      setMessages(prev => [...prev, { role: 'ai', content: language === 'en' ? 'Sorry, I cannot understand for now. Please try again.' : '抱歉，我暂时无法理解，请再试一次。', timestamp: Date.now() }]);
    }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (allPrompts.length > 0 || messages.length > 0) handleChatSend(); else handleQuickMatch(); } };
  const removePrompt = (idx: number) => { setAllPrompts(prev => prev.filter((_, i) => i !== idx)); };
  const handleTeamClick = (id: string) => { goToTeam(id); };
  const findGroupByIntentId = (intentId: string) => groups.find((g: Group) => g.intentId === intentId);
  const handleIntentClick = (intentItem: Intent) => { const g = findGroupByIntentId(intentItem.id); if (g) goToTeam(g.id); };
  const hasChat = messages.length > 0;

  return (
    <div className="pb-16 min-h-screen flex flex-col bg-[#faf7f2] dark:bg-gray-950">

      {/* ── Header ── */}
      <div className="shrink-0 px-5 pt-5 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mountain className="w-5 h-5 text-green-600" />
          <span className="text-base font-bold text-gray-800 dark:text-gray-100">TrailMate</span>
        </div>
        <button onClick={() => navigate('/notices')} className="relative text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">{unreadCount}</span>}
        </button>
      </div>

      {/* ═══ 上半区：一句话匹配卡片 ═══ */}
      <div className="shrink-0 px-4 flex items-center justify-center">
        <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-lg dark:shadow-gray-900/50 border border-gray-100 dark:border-gray-800 overflow-hidden">

          {/* 标题 */}
          <div className="px-4 pt-4 pb-2">
            {!hasChat ? (
              <div className="text-center">
                <h1 className="text-xl font-black text-gray-800 dark:text-gray-100">{language === 'en' ? <>Match <span className="text-green-600">teammates</span> in one sentence</> : <>一句话<span className="text-green-600">匹配队友</span></>}</h1>
                <p className="text-gray-400 dark:text-gray-500 text-[11px] mt-1">{language === 'en' ? 'Tell me where you want to go and who you want to find' : '告诉我想去哪里、想找什么样的人'}</p>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-green-50 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                  <Mountain className="w-3 h-3 text-green-500" />
                </div>
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{language === 'en' ? 'AI Match Assistant' : 'AI 匹配助手'}</span>
              </div>
            )}
          </div>

          {/* 提示词 + 匹配按钮 */}
          {allPrompts.length > 0 && (
            <div className="px-4 pb-2">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Sparkles className="w-3 h-3 text-green-500" />
                <span className="text-[10px] font-bold text-gray-500 dark:text-gray-300">{language === 'en' ? 'Match conditions' : '匹配条件'} · {allPrompts.length}</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <div className="flex flex-wrap gap-1 flex-1">
                  {allPrompts.map((p, i) => (
                    <span key={i} className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-full text-[10px] font-medium border border-green-100 dark:border-green-900/30">
                      {p}<button onClick={() => removePrompt(i)} className="hover:text-red-500"><X className="w-2.5 h-2.5" /></button>
                    </span>
                  ))}
                </div>
                {!matching && (
                  <button onClick={() => startMatch(allPrompts.join('，'), allPrompts)}
                    className="px-3 py-1 bg-green-600 text-white rounded-full text-[10px] font-bold active:scale-95 flex items-center gap-0.5 shadow-sm shrink-0">
                    <Sparkles className="w-2.5 h-2.5" />{language === 'en' ? 'Match' : '匹配'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* AI 对话 */}
          {hasChat && (
            <div className="px-4 pb-2 max-h-28 overflow-y-auto space-y-1.5">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-[80%]">
                    <div className={`px-2.5 py-1.5 text-xs leading-relaxed ${msg.role === 'user' ? 'bg-green-600 text-white rounded-xl rounded-br-sm' : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl rounded-bl-sm'}`}>
                      {msg.content}
                    </div>
                    {msg.role === 'ai' && msg.prompts && msg.prompts.length > 0 && (
                      <div className="mt-0.5 flex flex-wrap gap-0.5">
                        {msg.prompts.map((p, j) => <span key={j} className="px-1.5 py-0 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-full text-[9px] font-medium">+{p}</span>)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          )}

          {/* 快捷建议 */}
          {!hasChat && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5 justify-center">
              {(language === 'en' ? ['Weekend Wutong day hike', 'No smoking', 'Easy pace', '3-day long trail challenge'] : ['周末梧桐山日归', '不喜欢抽烟', '轻松', '3天长线挑战']).map(s => (
                <button key={s} onClick={() => setInput(s)}
                  className="px-2 py-1 bg-gray-50 dark:bg-gray-700 rounded-full text-[10px] text-gray-400 dark:text-gray-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all">{s}</button>
              ))}
            </div>
          )}

          {/* 输入框 */}
          <div className="px-3 pb-3 flex items-center gap-2">
            {!hasChat && (
              <div className="shrink-0 flex flex-col items-center gap-0.5">
                <button onClick={() => setCreateTeamMode(!createTeamMode)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold transition-all active:scale-90 ${
                    createTeamMode ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                  }`}
                  title={createTeamMode ? (language === 'en' ? 'Recruit team mode' : '建队招募模式') : (language === 'en' ? 'Solo queue mode' : '单人排位模式')}>
                  {createTeamMode ? <DoorOpen className="w-3.5 h-3.5" /> : <Swords className="w-3.5 h-3.5" />}
                </button>
                <span className={`text-[8px] leading-none whitespace-nowrap ${createTeamMode ? 'text-amber-500 dark:text-amber-400 font-bold' : 'text-gray-400 dark:text-gray-500'}`}>
                  {createTeamMode ? (language === 'en' ? 'Recruit' : '招募') : (language === 'en' ? 'Solo' : '排位')}
                </span>
              </div>
            )}
            <input ref={inputRef} type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
              placeholder={language === 'en' ? 'I want to hike Wutong this weekend, no smoking...' : '我想周末去梧桐山，不喜欢有人抽烟...'}
              className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-full text-sm outline-none focus:ring-1 focus:ring-green-300 placeholder:text-gray-300 dark:placeholder:text-gray-600 dark:text-gray-200"
              disabled={sending || matching} />
            <button onClick={hasChat || allPrompts.length > 0 ? handleChatSend : handleQuickMatch}
              disabled={!input.trim() || sending || matching}
              className="w-9 h-9 bg-green-600 rounded-full flex items-center justify-center disabled:opacity-30 shadow-md shadow-green-200 dark:shadow-green-900/30 shrink-0 active:scale-90">
              {sending || matching ? <RefreshCw className="w-4 h-4 text-white animate-spin" /> : hasChat || allPrompts.length > 0 ? <Send className="w-4 h-4 text-white" /> : <Sparkles className="w-4 h-4 text-white" />}
            </button>
          </div>
        </div>
      </div>

      {/* ═══ 下半区 ═══ */}
      <div className="flex-1 px-4 pt-3 overflow-y-auto">
        {/* 我的匹配 — 方形卡片横滑 */}
        {(() => {
          const activeIntents = intents;
          return (
            <div className="mb-3 bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-sm dark:shadow-gray-900/50">
              <div className="flex items-center justify-between px-4 py-3 border-l-[3px] border-l-purple-400">
                <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-500" />{language === 'en' ? 'My Matches' : '我的匹配'}
                </h4>
                <span className="text-[10px] font-bold text-purple-500 bg-purple-50 dark:bg-purple-900/20 px-2 py-0.5 rounded-full">{activeIntents.length}</span>
              </div>
              {activeIntents.length > 0 ? (
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-3 px-4">
                  {activeIntents.map((intent: Intent) => {
                    const g = findGroupByIntentId(intent.id);
                    return (
                      <IntentCard
                        key={intent.id}
                        intent={intent}
                        groupId={g?.id}
                        memberCount={g?.members?.length}
                        maxMembers={g?.maxMembers}
                        hikeStatus={g?.hikeStatus}
                        photos={g?.photos}
                        date={intent.essentials?.date || g?.essentials?.date}
                        hot={g?.hot}
                        likes={g?.likes}
                        matchingEnabled={g?.matchingEnabled !== undefined ? g.matchingEnabled : intent.status === 'matching'}
                        onClick={() => handleIntentClick(intent)}
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
              ) : intentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-5 h-5 text-gray-300 dark:text-gray-600 animate-spin" />
                </div>
              ) : (
                <div className="px-4 pb-4">
                  <button
                    onClick={() => inputRef.current?.focus()}
                    className="w-full py-3 rounded-xl border-2 border-dashed border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/10 flex flex-col items-center gap-1.5 hover:border-purple-400 dark:hover:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all"
                  >
                    <Sparkles className="w-5 h-5 text-purple-400" />
                    <span className="text-xs font-bold text-purple-500 dark:text-purple-400">{language === 'en' ? 'Start a match to find hiking buddies' : '发起一次匹配，找到徒步伙伴'}</span>
                    <span className="text-[10px] text-purple-300 dark:text-purple-500">{language === 'en' ? 'Click the input above and describe your needs in one sentence' : '点击上方输入框，一句话描述你的需求'}</span>
                  </button>
                </div>
              )}
            </div>
          );
        })()}

        {/* 广场加载 */}
        {squareLoading && (
          <div className="flex items-center justify-center py-6">
            <RefreshCw className="w-5 h-5 text-gray-300 dark:text-gray-600 animate-spin" />
          </div>
        )}

        <ScrollRow title={language === 'en' ? 'Latest' : '最新'} icon={<Clock className="w-3.5 h-3.5 text-blue-500" />} teams={latestTeams} onTeamClick={handleTeamClick} hasMore={latestHasMore} onLoadMore={() => loadMore('latest')} loadingMore={loadingMore === 'latest'} borderColor="border-l-blue-400" />
        <ScrollRow title={language === 'en' ? 'Hot' : '最热'} icon={<Flame className="w-3.5 h-3.5 text-amber-500" />} teams={hotTeams} onTeamClick={handleTeamClick} hasMore={hotHasMore} onLoadMore={() => loadMore('hot')} loadingMore={loadingMore === 'hot'} borderColor="border-l-amber-400" />

      </div>

      <style>{`.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; } .scrollbar-hide::-webkit-scrollbar { display: none; }`}</style>
    </div>
  );
}
