import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, Zap, Loader2, Share2, RefreshCw } from 'lucide-react';
import { useStore } from '@/store';
import { routesApi, intentApi, lobbyApi } from '@/api';
import { getRouteCover } from '@/data/routeImages';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import type { ClassicRoute, RouteComment, Group } from '@/types';

export default function RouteDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, groups, loadGroups, showToast, isGuest } = useStore();
  const [route, setRoute] = useState<ClassicRoute | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookmarked, setBookmarked] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentSending, setCommentSending] = useState(false);
  const [matching, setMatching] = useState(false);
  const [tab, setTab] = useState<'route' | 'teams' | 'comments'>('route');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    routesApi.get(id).then(r => {
      if (r) {
        const localComments = routesApi.getLocalComments(id);
        setRoute({ ...r, comments: [...localComments, ...r.comments] });
      } else setRoute(null);
      setLoading(false);
    });
  }, [id]);

  const relatedGroups = useMemo(() => {
    if (!route || !groups.length) return [];
    return groups.filter((g: Group) => {
      const loc = g.essentials?.location || '';
      const name = g.name || '';
      return loc.includes(route.province) || loc.includes(route.name.slice(0, 2)) || name.includes(route.name.slice(0, 2));
    }).slice(0, 8).map(g => ({
      ...g,
      _stableProgress: g.hikeStatus === 'hiking' ? 30 + (Math.abs(g.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % 60) : 0,
    }));
  }, [route, groups]);

  const checkinColors = ['#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6'];

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
      const latestGroups = useStore.getState().groups;
      const g = latestGroups.find((g: Group) => g.intentId === intent.id);
      if (g) { showToast('匹配成功！正在进入队伍…'); navigate(`/team/${g.id}`); }
      else { showToast('队伍已创建，正在跳转…'); setTimeout(() => navigate('/'), 500); }
    } catch (err: unknown) { showToast((err as Error).message || '匹配失败'); }
    setMatching(false);
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || !route || !user) return;
    setCommentSending(true);
    try {
      const cmt = await routesApi.addComment(route.id, {
        userId: user.id, userName: user.name, avatarColor: user.avatarColor, content: commentText.trim(),
      });
      if (route) setRoute({ ...route, comments: [cmt, ...(route.comments || [])] });
      setCommentText(''); showToast('评论发布成功');
    } catch { showToast('评论失败'); }
    setCommentSending(false);
  };

  // 下拉刷新：重新拉取路线详情、队伍、评论
  const handleRefresh = useCallback(async () => {
    if (!id) return;
    try {
      const routeData = await routesApi.get(id);
      if (routeData) setRoute(routeData);
      showToast('已刷新');
    } catch { showToast('刷新失败'); }
  }, [id, showToast]);

  const { containerRef, onTouchStart, onTouchMove, onTouchEnd, pullDistance, refreshing } =
    usePullToRefresh(handleRefresh, { threshold: 60, damping: 0.45, maxDistance: 90 });

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

  return (
    <div className="h-screen flex flex-col bg-[#faf7f2] dark:bg-gray-950 relative overflow-hidden">

      {/* ═══ Hero Cover (固定顶部) ═══ */}
      <div className="shrink-0 relative h-[280px] overflow-hidden">
        {(() => {
          const cover = getRouteCover({ id: id!, coverImage: route.coverImage, coverImageAuthor: route.coverImageAuthor, coverGradient: route.coverGradient });
          return (
            <>
              {cover.hasImage ? (
                <img src={cover.imageUrl} alt={route.name} className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 bg-cover bg-center" style={cover.gradientBackground} />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent" />
              {cover.hasImage && cover.author && (
                <button
                  onClick={() => navigate(`/hike-log/${cover.author!.id}`)}
                  className="absolute bottom-5 right-5 z-10 px-3 py-1 rounded-lg bg-black/30 backdrop-blur-sm text-[10px] text-white/80 hover:bg-black/50 hover:text-white transition-colors"
                >
                  来自{cover.author.name}的分享
                </button>
              )}
            </>
          );
        })()}
        <button onClick={() => navigate(-1)}
          className="absolute top-3.5 left-4 z-10 w-8 h-8 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <button className="absolute top-3.5 right-4 z-10 w-8 h-8 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors">
          <Share2 className="w-4 h-4" />
        </button>
        <div className="absolute bottom-5 left-5 right-5 z-10">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/20 backdrop-blur-sm text-[9px] font-bold text-white mb-2">
            {route.theme}
          </span>
          <h1 className="text-[22px] font-black text-white drop-shadow-lg tracking-tight">{route.name}</h1>
          <p className="text-[10px] text-white/65 mt-1 flex items-center gap-2">
            <span>{route.province}</span><span className="w-1 h-1 rounded-full bg-white/40" />
            <span>{'★'.repeat(route.difficulty)}{'☆'.repeat(5 - route.difficulty)}</span><span className="w-1 h-1 rounded-full bg-white/40" />
            <span>{(route.comments || []).length} 条评论</span>
          </p>
          <div className="flex gap-5 mt-3">
            {[
              { val: route.elevation, label: '海拔' },
              { val: route.distance, label: '距离' },
              { val: route.duration, label: '预计' },
              { val: route.checkpoints.length + '站', label: '打卡点' },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className="text-base font-black text-white">{s.val}</div>
                <div className="text-[8px] text-white/50 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ Tab Bar (sticky 顶部) ═══ */}
      <div className="shrink-0 sticky top-0 z-20 flex bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
        {[
          { key: 'route', label: '路线' },
          { key: 'teams', label: '队伍' },
          { key: 'comments', label: '评论' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
            className={`flex-1 py-3 text-xs font-bold transition-colors relative ${
              tab === t.key ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'
            }`}>
            {t.label}
            {tab === t.key && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-green-600 dark:bg-green-400" />}
          </button>
        ))}
      </div>

      {/* ═══ 可滚动内容区 ═══ */}
      <div
        ref={containerRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="flex-1 overflow-y-auto pb-28"
      >
        {/* ── 下拉刷新指示器 ── */}
        {(pullDistance > 0 || refreshing) && (
          <div
            className="flex items-center justify-center overflow-hidden transition-[height] duration-200"
            style={{ height: pullDistance || (refreshing ? 36 : 0) }}
          >
            <RefreshCw className={`w-4 h-4 text-green-600 dark:text-green-400 ${refreshing ? 'animate-spin' : ''}`} style={{ transform: `rotate(${pullDistance * 4}deg)` }} />
            <span className="ml-2 text-[10px] text-gray-400 dark:text-gray-500">
              {refreshing ? '刷新中…' : pullDistance > 60 ? '释放刷新' : '下拉刷新'}
            </span>
          </div>
        )}

      {/* ═══ Tab: 路线 ═══ */}
      {tab === 'route' && (
        <div>
          {/* Story */}
          <div className="bg-white dark:bg-gray-900 mx-3 mt-3 rounded-2xl p-4 shadow-sm dark:shadow-gray-900/50">
            <h3 className="text-[13px] font-black text-gray-800 dark:text-gray-200 mb-2">📖 路线故事</h3>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">{route.story}</p>
            {route.storyQuote && (
              <p className="mt-2 pl-3 border-l-[3px] border-green-300 text-[10px] text-gray-400 dark:text-gray-500 italic leading-relaxed">{route.storyQuote}</p>
            )}
          </div>

          {/* Checkpoints */}
          <div className="bg-white dark:bg-gray-900 mx-3 mt-3 rounded-2xl p-4 shadow-sm dark:shadow-gray-900/50">
            <h3 className="text-[13px] font-black text-gray-800 dark:text-gray-200 mb-3">📍 打卡点 · {route.checkpoints.length} 站</h3>
            <div className="relative pl-6">
              <div className="absolute left-[9px] top-1.5 bottom-1.5 w-0.5 bg-gray-100 dark:bg-gray-800 rounded" />
              {route.checkpoints.map((cp, i) => (
                <div key={i} className="relative mb-3.5 last:mb-0">
                  <div className="absolute -left-[18px] top-1 w-[10px] h-[10px] rounded-full bg-white border-[2.5px] z-[1]"
                    style={{ borderColor: checkinColors[i % checkinColors.length] }} />
                  <div className="text-[12px] font-bold text-gray-800 dark:text-gray-200">{cp.label}</div>
                  {cp.tip && <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 leading-relaxed">{cp.tip}</p>}
                </div>
              ))}
            </div>
          </div>

          {/* Guide */}
          <div className="bg-white dark:bg-gray-900 mx-3 mt-3 rounded-2xl p-4 shadow-sm dark:shadow-gray-900/50">
            <h3 className="text-[13px] font-black text-gray-800 dark:text-gray-200 mb-2">🎒 徒步指南</h3>
            <div className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed whitespace-pre-line [&>strong]:text-gray-700 [&>strong]:dark:text-gray-300">{route.guide}</div>
          </div>

          {/* Tags */}
          <div className="bg-white dark:bg-gray-900 mx-3 mt-3 rounded-2xl p-4 shadow-sm dark:shadow-gray-900/50">
            <h3 className="text-[13px] font-black text-gray-800 dark:text-gray-200 mb-2">🏷 标签</h3>
            <div className="flex flex-wrap gap-1.5">
              {route.tags.map((t, i) => (
                <span key={i} className="px-2.5 py-1 rounded-full bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-[10px] font-bold border border-green-100 dark:border-green-900/30">{t}</span>
              ))}
            </div>
          </div>

          {/* Titles */}
          <div className="bg-white dark:bg-gray-900 mx-3 mt-3 rounded-2xl p-4 shadow-sm dark:shadow-gray-900/50">
            <h3 className="text-[13px] font-black text-gray-800 dark:text-gray-200 mb-2">🏆 成就称号</h3>
            <div className="grid grid-cols-2 gap-2">
              {route.titles.map((t, i) => {
                const isGold = t.tier === 'gold';
                const isHidden = t.tier === 'hidden';
                return (
                  <div key={i} className={`rounded-xl p-3 text-center border ${isGold ? 'border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20' : isHidden ? 'border-dashed border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20' : 'border-gray-100 dark:border-gray-800'}`}>
                    <div className="text-2xl mb-1">{t.icon || {bronze:'🥉',silver:'🥈',gold:'🥇',hidden:'👑'}[t.tier]}</div>
                    <div className={`text-[10px] font-black ${isHidden ? 'text-purple-600 dark:text-purple-400' : 'text-gray-800 dark:text-gray-200'}`}>{t.name}</div>
                    <div className="text-[8px] text-gray-400 dark:text-gray-500 mt-0.5">{t.condition}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Local */}
          {route.localFood && (
            <div className="bg-white dark:bg-gray-900 mx-3 mt-3 rounded-2xl p-4 shadow-sm dark:shadow-gray-900/50">
              <h3 className="text-[13px] font-black text-gray-800 dark:text-gray-200 mb-2">🍜 当地特色</h3>
              <div className="grid grid-cols-2 gap-2">
                {route.localFood && (
                  <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-3">
                    <div className="text-[9px] font-bold text-gray-400 dark:text-gray-500 mb-1">🍽 美食</div>
                    <div className="text-[10px] text-gray-600 dark:text-gray-400 leading-relaxed">{route.localFood.slice(0,4).join('、')}</div>
                  </div>
                )}
                {route.customs && (
                  <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-3">
                    <div className="text-[9px] font-bold text-gray-400 dark:text-gray-500 mb-1">🎭 习俗</div>
                    <div className="text-[10px] text-gray-600 dark:text-gray-400 leading-relaxed">{route.customs[0].slice(0,30)}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="h-4" />
        </div>
      )}

      {/* ═══ Tab: 队伍 ═══ */}
      {tab === 'teams' && (
        <div>
          {/* Active teams */}
          <div className="bg-white dark:bg-gray-900 mx-3 mt-3 rounded-2xl p-4 shadow-sm dark:shadow-gray-900/50">
            <h3 className="text-[13px] font-black text-gray-800 dark:text-gray-200 mb-3">👥 正在这条路线上的队伍</h3>
            {relatedGroups.filter(g => g.hikeStatus === 'hiking' || g.hikeStatus === 'idle').length > 0 ? (
              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                {relatedGroups.filter(g => g.hikeStatus === 'hiking' || g.hikeStatus === 'idle').map((g: Group & { _stableProgress: number }) => (
                  <div key={g.id} onClick={() => navigate(`/team/${g.id}`)}
                    className="w-[130px] shrink-0 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 cursor-pointer active:scale-[0.98] transition-transform">
                    <div className={`h-[70px] flex items-center justify-center text-2xl ${g.hikeStatus === 'hiking' ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-gradient-to-br from-blue-400 to-indigo-500'}`}>
                      {g.hikeStatus === 'hiking' ? '⛰️' : '📋'}
                    </div>
                    <div className="p-2">
                      <div className="text-[10px] font-bold text-gray-800 dark:text-gray-200 truncate">{g.name}</div>
                      <div className="text-[8px] text-gray-400 dark:text-gray-500">{g.hikeStatus === 'hiking' ? '征途中' : '准备中'} · {(g.members || []).length}人</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center py-6">暂无活跃队伍，来成为第一队吧 👆</p>
            )}
          </div>

          {/* Completed */}
          <div className="bg-white dark:bg-gray-900 mx-3 mt-3 rounded-2xl p-4 shadow-sm dark:shadow-gray-900/50">
            <h3 className="text-[13px] font-black text-gray-800 dark:text-gray-200 mb-3">🏁 已完成的分享</h3>
            {relatedGroups.filter(g => g.hikeStatus === 'completed').length > 0 ? (
              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                {relatedGroups.filter(g => g.hikeStatus === 'completed').map((g: Group) => (
                  <div key={g.id} onClick={() => navigate(`/team/${g.id}`)}
                    className="w-[130px] shrink-0 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 cursor-pointer active:scale-[0.98] transition-transform">
                    <div className="h-[70px] flex items-center justify-center text-2xl bg-gradient-to-br from-amber-500 to-orange-600">🏁</div>
                    <div className="p-2">
                      <div className="text-[10px] font-bold text-gray-800 dark:text-gray-200 truncate">{g.name}</div>
                      <div className="text-[8px] text-gray-400 dark:text-gray-500">凯旋 · {(g.members || []).length}人</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center py-6">还没有队伍完成这条路线</p>
            )}
          </div>
        </div>
      )}

      {/* ═══ Tab: 评论 ═══ */}
      {tab === 'comments' && (
        <div>
          <div className="bg-white dark:bg-gray-900 mx-3 mt-3 rounded-2xl p-4 shadow-sm dark:shadow-gray-900/50">
            <h3 className="text-[13px] font-black text-gray-800 dark:text-gray-200 mb-3">💬 {(route.comments || []).length} 条评论</h3>
            {(route.comments || []).length > 0 ? (
              (route.comments || []).map((c: RouteComment) => (
                <div key={c.id} className="py-3 border-b border-gray-50 dark:border-gray-800/50 last:border-b-0">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white"
                      style={{ background: c.avatarColor || '#9ca3af' }}>{c.userName[0]}</div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-gray-800 dark:text-gray-200">{c.userName}</span>
                        {c.titleBadge && <span className="text-[7px] px-1.5 py-0 rounded bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 font-bold">{c.titleBadge}</span>}
                      </div>
                      <div className="text-[8px] text-gray-400 dark:text-gray-500">{c.time}</div>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed">{c.content}</p>
                  <button className="mt-1.5 text-[9px] text-gray-400 dark:text-gray-500 hover:text-red-400 flex items-center gap-1">
                    <Heart className="w-3 h-3" />{c.likes}
                  </button>
                </div>
              ))
            ) : (
              <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center py-6">暂无评论，来分享你的经验吧</p>
            )}
            <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
              <input value={commentText} onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddComment(); }}
                placeholder={isGuest ? '请先登录再评论…' : '分享你的徒步经验…'}
                disabled={isGuest}
                className="flex-1 px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-[11px] outline-none focus:border-green-400 text-gray-700 dark:text-gray-300 placeholder:text-gray-300 dark:placeholder:text-gray-600"
              />
              <button onClick={handleAddComment} disabled={commentSending || !commentText.trim() || isGuest}
                className="px-4 py-2 rounded-xl bg-green-600 text-white text-[10px] font-bold disabled:opacity-40">
                发布
              </button>
            </div>
          </div>
        </div>
      )}

      </div>{/* end 滚动区 */}

      {/* ═══ Bottom CTA (固定底部) ═══ */}
      <div className="shrink-0 px-3 py-3 z-30 bg-[#faf7f2] dark:bg-gray-950">
        <div className="flex gap-2 p-2 bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg rounded-2xl shadow-lg shadow-black/[0.06] dark:shadow-black/20 border border-gray-100 dark:border-gray-800">
          <button onClick={() => setBookmarked(!bookmarked)}
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
              bookmarked ? 'bg-red-50 dark:bg-red-900/20 text-red-500' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
            }`}>
            <Heart className={`w-5 h-5 ${bookmarked ? 'fill-current' : ''}`} />
          </button>
          {isGuest ? (
            <button onClick={() => navigate('/login')}
              className="flex-1 py-3 rounded-xl bg-amber-500 text-white text-[13px] font-black flex items-center justify-center gap-2">
              <Zap className="w-4 h-4" />登录后即可一键匹配
            </button>
          ) : (
            <button onClick={handleMatch} disabled={matching}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-500 text-white text-[13px] font-black flex items-center justify-center gap-2 shadow-md shadow-green-200/30 disabled:opacity-70 active:scale-[0.98] transition-all">
              {matching ? <><Loader2 className="w-4 h-4 animate-spin" />匹配中…</> : <><Zap className="w-4 h-4" />在这条路线匹配队友</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
