import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, Star, MapPin, Clock, Mountain, Users, MessageCircle, Zap, ChevronRight, Loader2 } from 'lucide-react';
import { useStore } from '@/store';
import { routesApi, intentApi, lobbyApi } from '@/api';
import type { ClassicRoute, RouteComment } from '@/types';

export default function RouteDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, groups, loadGroups, showToast } = useStore();
  const [route, setRoute] = useState<ClassicRoute | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookmarked, setBookmarked] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentSending, setCommentSending] = useState(false);
  const [matching, setMatching] = useState(false);
  const isGuest = !!localStorage.getItem('trailmate_guest');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    routesApi.get(id).then(r => { setRoute(r || null); setLoading(false); });
  }, [id]);

  const relatedGroups = useMemo(() => {
    if (!route || !groups.length) return [];
    // 匹配同省份、同主题或名称相关的队伍
    return groups.filter((g: any) => {
      const loc = g.essentials?.location || '';
      const name = g.name || '';
      return loc.includes(route.province) || 
             loc.includes(route.name.slice(0, 2)) ||
             name.includes(route.name.slice(0, 2));
    }).slice(0, 6);
  }, [route, groups]);

  const handleBack = () => navigate(-1);

  const handleMatch = async () => {
    if (!route || matching) return;
    setMatching(true);
    try {
      const rawInput = `${route.name} · ${route.theme} · ${route.province}`;
      const intent = await intentApi.create(rawInput);
      const prompts = route.tags.map(t => t.replace(/[^\u4e00-\u9fa5]/g, ''));
      await lobbyApi.quickMatch({
        location: route.province,
        difficulty: route.difficulty <= 2 ? 'casual' : route.difficulty <= 4 ? 'advanced' : 'challenge',
        prompts,
        rawInput,
        autoCreateTeam: true,
      });
      await loadGroups();
      // 找到刚创建的队伍（使用 getState 获取最新值，避免闭包过期）
      const latestGroups = useStore.getState().groups;
      const g = latestGroups.find((g: any) => g.intentId === intent.id);
      if (g) {
        showToast('匹配成功！正在进入队伍…');
        navigate(`/team/${g.id}`);
      } else {
        showToast('队伍已创建，正在跳转…');
        setTimeout(() => navigate('/'), 500);
      }
    } catch (err: any) {
      showToast(err.message || '匹配失败，请稍后重试');
    } finally {
      setMatching(false);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || !route || !user) return;
    setCommentSending(true);
    try {
      const cmt = await routesApi.addComment(route.id, {
        userId: user.id,
        userName: user.name,
        avatarColor: user.avatarColor,
        content: commentText.trim(),
      });
      if (route) setRoute({ ...route, comments: [cmt, ...(route.comments || [])] });
      setCommentText('');
      showToast('评论发布成功');
    } catch { showToast('评论失败'); }
    setCommentSending(false);
  };

  if (loading) return (
    <div className="min-h-screen bg-[#faf7f2] dark:bg-gray-950 flex items-center justify-center">
      <p className="text-gray-400 dark:text-gray-500">加载中...</p>
    </div>
  );

  if (!route) return (
    <div className="min-h-screen bg-[#faf7f2] dark:bg-gray-950 flex flex-col items-center justify-center gap-3">
      <p className="text-gray-400 dark:text-gray-500">路线不存在</p>
      <button onClick={() => navigate('/')} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm">返回首页</button>
    </div>
  );

  const difficultyStars = '★★★★★☆☆☆☆☆'.slice(5 - route.difficulty, 10 - route.difficulty);
  const difficultyLabel = ['', '新手', '入门', '进阶', '挑战', '极限'][route.difficulty];
  const titleTierColors: Record<string, string> = {
    bronze: 'bg-gradient-to-br from-amber-100 to-yellow-200 dark:from-amber-900/30 dark:to-yellow-900/30',
    silver: 'bg-gradient-to-br from-gray-100 to-slate-200 dark:from-gray-800 dark:to-slate-800',
    gold: 'bg-gradient-to-br from-amber-200 to-orange-300 dark:from-amber-900/30 dark:to-orange-900/30',
    hidden: 'bg-gradient-to-br from-violet-100 to-purple-200 dark:from-violet-900/30 dark:to-purple-900/30',
  };
  const tierLabels: Record<string, string> = { bronze: '铜', silver: '银', gold: '金', hidden: '隐藏' };
  const tierBadgeColors: Record<string, string> = {
    bronze: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600',
    silver: 'bg-gray-100 dark:bg-gray-800 text-gray-500',
    gold: 'bg-amber-50 dark:bg-amber-900/20 text-orange-600',
    hidden: 'bg-purple-50 dark:bg-purple-900/20 text-purple-500',
  };

  return (
    <div className="min-h-screen bg-[#faf7f2] dark:bg-gray-950 flex flex-col">
      {/* ═══ 简洁 Header ═══ */}
      <div className="shrink-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2 px-4 pt-4 pb-3">
          <button onClick={handleBack}
            className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold text-gray-400 dark:text-gray-500">{route.province} · {route.theme}</span>
              <span className="text-yellow-500 text-[10px]">{difficultyStars}</span>
            </div>
            <h1 className="text-[18px] font-black text-gray-800 dark:text-gray-200">{route.name}</h1>
          </div>
          <button onClick={() => setBookmarked(!bookmarked)}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
              bookmarked ? 'bg-red-50 dark:bg-red-900/20 text-red-500' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
            }`}>
            <Heart className={`w-4 h-4 ${bookmarked ? 'fill-current' : ''}`} />
          </button>
        </div>
      </div>

      {/* ═══ 滚动区 ═══ */}
      <div className="flex-1 overflow-y-auto">
        {/* 统计条 */}
        <div className="flex justify-around mx-3 mt-3 relative z-10 bg-white dark:bg-gray-900 rounded-2xl py-3 shadow-sm dark:shadow-gray-900/50">
          {[
            { val: route.checkpoints.length, label: '打卡点' },
            { val: route.distance, label: '全长' },
            { val: route.duration, label: '预计耗时' },
            { val: route.elevation, label: '海拔' },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <div className="text-[15px] font-black text-gray-800 dark:text-gray-200">{s.val}</div>
              <div className="text-[9px] text-gray-400 dark:text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ═══ 背景故事 ═══ */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-sm dark:shadow-gray-900/50 mx-3 mt-3">
          <div className="flex items-center px-4 py-3 border-l-[3px] border-l-emerald-400">
            <h3 className="text-xs font-extrabold text-gray-700 dark:text-gray-300">📖 背景故事</h3>
          </div>
          <p className="px-4 pb-2 text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">{route.story}</p>
          {route.storyQuote && (
            <div className="mx-4 mb-3 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 text-emerald-700 dark:text-emerald-400 text-[10px] italic leading-relaxed">
              {route.storyQuote}
            </div>
          )}
          <div className="flex gap-1.5 flex-wrap px-4 pb-3">
            {route.tags.map((t, i) => (
              <span key={i} className="px-2 py-0.5 rounded-full bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-[9px] font-bold">
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* ═══ 打卡点时间轴 ═══ */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-sm dark:shadow-gray-900/50 mx-3 mt-3">
          <div className="flex items-center justify-between px-4 py-3 border-l-[3px] border-l-blue-400">
            <h3 className="text-xs font-extrabold text-gray-700 dark:text-gray-300">📍 打卡路线</h3>
            <span className="text-[10px] font-extrabold text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full">
              {route.checkpoints.length}站
            </span>
          </div>
          <div className="px-4 pb-3">
            {route.checkpoints.map((cp, i) => {
              const isFirst = i === 0;
              const isLast = i === route.checkpoints.length - 1;
              return (
                <div key={i} className="flex gap-3 relative">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black text-white shrink-0 relative z-10 ${
                    isFirst ? 'bg-blue-500 shadow-[0_0_0_4px_rgba(59,130,246,.15)]' : 'bg-gray-300 dark:bg-gray-600 text-gray-400 dark:text-gray-500'
                  }`}>
                    {isFirst ? '1' : i + 1}
                  </div>
                  {!isLast && (
                    <div className="absolute left-[13px] top-7 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
                  )}
                  <div className="flex-1 min-w-0 pb-3">
                    <div className="text-[12px] font-extrabold text-gray-800 dark:text-gray-200">{cp.label}</div>
                    {cp.tip && (
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 leading-relaxed">{cp.tip}</p>
                    )}
                    {isFirst && (
                      <span className="inline-block mt-1 px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[8px] font-extrabold">
                        📌 起点
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══ 官方攻略 ═══ */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-sm dark:shadow-gray-900/50 mx-3 mt-3">
          <div className="flex items-center px-4 py-3 border-l-[3px] border-l-amber-400">
            <h3 className="text-xs font-extrabold text-gray-700 dark:text-gray-300">📋 官方攻略</h3>
          </div>
          <div className="px-4 pb-4 text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed whitespace-pre-line">
            {route.guide}
          </div>
        </div>

        {/* ═══ 可解锁称号 ═══ */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-sm dark:shadow-gray-900/50 mx-3 mt-3">
          <div className="flex items-center justify-between px-4 py-3 border-l-[3px] border-l-amber-400">
            <h3 className="text-xs font-extrabold text-gray-700 dark:text-gray-300">🏅 可解锁称号</h3>
            <span className="text-[10px] font-extrabold text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
              {route.titles.length}个
            </span>
          </div>
          <div>
            {route.titles.map((t, i) => (
              <div key={i}
                className={`flex items-center gap-3 px-4 py-2.5 ${i < route.titles.length - 1 ? 'border-b border-gray-50 dark:border-gray-800/50' : ''}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${titleTierColors[t.tier]}`}>
                  {t.icon || { bronze: '🥉', silver: '🥈', gold: '🥇', hidden: '👑' }[t.tier]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-extrabold text-gray-800 dark:text-gray-200">{t.name}</div>
                  <div className="text-[9px] text-gray-400 dark:text-gray-500">{t.condition}</div>
                </div>
                <span className={`text-[8px] font-extrabold px-2 py-0.5 rounded-full ${tierBadgeColors[t.tier]}`}>
                  {tierLabels[t.tier]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ 关联队伍 ═══ */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-sm dark:shadow-gray-900/50 mx-3 mt-3">
          <div className="flex items-center justify-between px-4 py-3 border-l-[3px] border-l-purple-400">
            <h3 className="text-xs font-extrabold text-gray-700 dark:text-gray-300">🚩 活跃队伍</h3>
            <span className="text-[10px] font-extrabold text-purple-500 bg-purple-50 dark:bg-purple-900/20 px-2 py-0.5 rounded-full">
              {relatedGroups.length}队
            </span>
          </div>
          {relatedGroups.length > 0 ? (
            <div className="flex gap-2.5 overflow-x-auto scrollbar-hide px-4 pb-4">
              {relatedGroups.map((g: any) => {
                const progress = g.hikeStatus === 'hiking' ? Math.round(Math.random() * 80 + 10) : 0;
                const statusColor = g.hikeStatus === 'hiking' ? 'bg-gradient-to-br from-green-500 to-emerald-600' :
                                    g.hikeStatus === 'completed' ? 'bg-gradient-to-br from-amber-500 to-orange-600' :
                                    'bg-gradient-to-br from-blue-500 to-indigo-600';
                const statusEmoji = g.hikeStatus === 'hiking' ? '⛰️' : g.hikeStatus === 'completed' ? '🏁' : '📋';
                const statusLabel = g.hikeStatus === 'hiking' ? '征途中' : g.hikeStatus === 'completed' ? '已完成' : '组队中';
                return (
                  <div key={g.id}
                    onClick={() => navigate(`/team/${g.id}`)}
                    className="w-[130px] shrink-0 rounded-2xl overflow-hidden bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700/50 cursor-pointer hover:-translate-y-0.5 transition-transform"
                  >
                    <div className={`h-[72px] flex items-center justify-center text-2xl relative ${statusColor}`}>
                      {statusEmoji}
                      {g.hikeStatus === 'hiking' && (
                        <div className="absolute bottom-1.5 left-1.5 right-1.5 h-1 rounded-full bg-white/30 overflow-hidden">
                          <div className="h-full bg-white rounded-full" style={{ width: `${progress}%` }} />
                        </div>
                      )}
                    </div>
                    <div className="p-2">
                      <div className="text-[10px] font-extrabold text-gray-700 dark:text-gray-300 truncate">{g.name}</div>
                      <div className="text-[8px] text-gray-400 dark:text-gray-500 mt-0.5">{statusLabel}</div>
                      <div className="flex items-center mt-1.5">
                        {(g.members || []).slice(0, 3).map((m: any, mi: number) => (
                          <div key={mi}
                            className="w-[18px] h-[18px] rounded-full flex items-center justify-center text-[7px] font-extrabold text-white border-1.5 border-white dark:border-gray-800 -ml-1 first:ml-0"
                            style={{ background: m.avatarColor || `hsl(${(mi + 2) * 72}, 55%, 45%)` }}
                          >
                            {(m.name || '?')[0]}
                          </div>
                        ))}
                        {(g.members || []).length > 3 && (
                          <span className="text-[8px] text-gray-400 dark:text-gray-500 ml-1">+{(g.members || []).length - 3}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-4 pb-5 text-center">
              <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center mx-auto mb-2">
                <Users className="w-5 h-5 text-gray-300 dark:text-gray-600" />
              </div>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">暂无活跃队伍</p>
              {isGuest ? (
                <button onClick={() => navigate('/login')}
                  className="mt-2 text-[10px] text-amber-600 font-extrabold flex items-center gap-1 mx-auto hover:underline">
                  <Zap className="w-3 h-3" />登录后发起匹配
                </button>
              ) : (
                <button onClick={handleMatch}
                  className="mt-2 text-[10px] text-purple-600 font-extrabold flex items-center gap-1 mx-auto hover:underline">
                  <Zap className="w-3 h-3" />发起匹配，成为第一队
                </button>
              )}
            </div>
          )}
        </div>

        {/* ═══ 评论区 ═══ */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-sm dark:shadow-gray-900/50 mx-3 mt-3 mb-3">
          <div className="flex items-center justify-between px-4 py-3 border-l-[3px] border-l-rose-400">
            <h3 className="text-xs font-extrabold text-gray-700 dark:text-gray-300">💬 驴友评论</h3>
            <span className="text-[10px] font-extrabold text-rose-500 bg-rose-50 dark:bg-rose-900/20 px-2 py-0.5 rounded-full">
              {(route.comments || []).length}条
            </span>
          </div>
          {(route.comments || []).length > 0 ? (
            <div>
              {(route.comments || []).map((c: RouteComment) => (
                <div key={c.id} className="flex gap-2.5 px-4 py-3 border-b border-gray-50 dark:border-gray-800/50 last:border-b-0">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-extrabold text-white shrink-0"
                    style={{ background: c.avatarColor || '#9ca3af' }}>
                    {c.userName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-extrabold text-gray-700 dark:text-gray-300">{c.userName}</span>
                      {c.titleBadge && (
                        <span className="text-[7px] font-extrabold px-1.5 py-0 rounded bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400">
                          {c.titleBadge}
                        </span>
                      )}
                      <span className="text-[8px] text-gray-300 dark:text-gray-600">{c.time}</span>
                    </div>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{c.content}</p>
                    <div className="flex items-center gap-1 mt-1.5 text-[9px] text-gray-400 dark:text-gray-500 cursor-pointer hover:text-rose-400 transition-colors">
                      <Heart className="w-3 h-3" />{c.likes}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-4 pb-5 text-center">
              <p className="text-[11px] text-gray-400 dark:text-gray-500">暂无评论，来分享你的经验吧</p>
            </div>
          )}
          <div className="flex gap-2 px-4 py-3 border-t border-gray-50 dark:border-gray-800/50">
            <input
              type="text"
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddComment(); }}
              placeholder={isGuest ? '请先登录再评论…' : '分享你的徒步经验…'}
              disabled={isGuest}
              className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-[11px] text-gray-700 dark:text-gray-300 outline-none focus:border-green-500 placeholder:text-gray-300 dark:placeholder:text-gray-600 disabled:opacity-50"
            />
            <button onClick={handleAddComment} disabled={commentSending || !commentText.trim() || isGuest}
              className="px-4 py-2 rounded-xl bg-green-600 text-white text-[10px] font-extrabold disabled:opacity-40 hover:bg-green-700 transition-colors">
              发布
            </button>
          </div>
        </div>

        <div className="h-24" />
      </div>

      {/* ═══ 底部 CTA ═══ */}
      <div className="shrink-0 px-3 py-3 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-t border-gray-100 dark:border-gray-800">
        {isGuest ? (
          <button onClick={() => navigate('/login')}
            className="w-full py-3.5 rounded-2xl bg-amber-500 text-white text-[14px] font-black shadow-lg shadow-amber-200/30 hover:bg-amber-600 transition-all flex items-center justify-center gap-2">
            <Zap className="w-4 h-4" />登录后即可一键匹配
          </button>
        ) : (
          <button onClick={handleMatch} disabled={matching}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 text-white text-[14px] font-black shadow-lg shadow-green-200/30 dark:shadow-green-900/20 hover:shadow-xl hover:shadow-green-200/40 transition-all flex items-center justify-center gap-2 disabled:opacity-70">
            {matching ? (
              <><Loader2 className="w-4 h-4 animate-spin" />正在匹配…</>
            ) : (
              <><Zap className="w-4 h-4" />一键匹配，即刻出发</>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
