import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Compass, Navigation, MapPin, Clock, ChevronDown } from 'lucide-react';
import classicRoutes from '@/data/routes';
import routesExtra from '@/data/routes-extra';
import { getRouteCover } from '@/data/routeImages';
import type { ClassicRoute } from '@/types';

const ALL_ROUTES = [...classicRoutes, ...routesExtra];
const SCROLL_KEY = 'trailmate_lobby_scroll';

const ALL_PROVINCES = [...new Set(ALL_ROUTES.map(r => r.province))].sort();

export default function Lobby() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [activeProvince, setActiveProvince] = useState<string>('');
  const [activeDifficulty, setActiveDifficulty] = useState<number | null>(null);
  const [showProvinceDropdown, setShowProvinceDropdown] = useState(false);

  // 恢复滚动位置
  useEffect(() => {
    const saved = sessionStorage.getItem(SCROLL_KEY);
    if (saved) {
      requestAnimationFrame(() => {
        window.scrollTo(0, parseInt(saved, 10));
      });
    }
    return () => {
      sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));
    };
  }, []);

  // 点击路线前保存滚动位置
  const goToRoute = useCallback((id: string) => {
    sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));
    navigate(`/route/${id}`);
  }, [navigate]);

  const filtered = useMemo(() => {
    let list = ALL_ROUTES;
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.province.toLowerCase().includes(q) ||
        r.theme.toLowerCase().includes(q) ||
        r.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    if (activeProvince) list = list.filter(r => r.province === activeProvince);
    if (activeDifficulty) list = list.filter(r => r.difficulty === activeDifficulty);
    return list;
  }, [search, activeProvince, activeDifficulty]);

  const heroRoute = ALL_ROUTES[0];

  const difficultyLabel = (d: number) => {
    const labels = ['', '休闲', '初级', '中级', '挑战', '极限'];
    return labels[d] || `难度${d}`;
  };

  const difficultyDots = (d: number) => (
    <span className="flex gap-[2px]">
      {[1,2,3,4,5].map(n => (
        <span key={n} className={`w-[5px] h-[5px] rounded-full ${n <= d ? 'bg-white shadow-[0_0_4px_rgba(255,255,255,.4)]' : 'bg-white/30'}`} />
      ))}
    </span>
  );

  return (
    <div className="pb-24 min-h-screen bg-[#faf7f2] dark:bg-gray-950">
      {/* Header + Search + Filters — sticky */}
      <div className="sticky top-0 z-10 bg-[#faf7f2] dark:bg-gray-950">
        {/* Header */}
        <div className="px-5 pt-5 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-md shadow-green-200/20">
              <Compass className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-bold text-gray-800 dark:text-gray-100">路线<em className="text-green-600 not-italic">图鉴</em></span>
          </div>
          <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">{ALL_ROUTES.length} 条路线</span>
        </div>

        {/* Search */}
        <div className="relative mx-4 mt-1 mb-3">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 dark:text-gray-600" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="搜索路线、山峰、地区…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-[13px] text-gray-800 dark:text-gray-200 outline-none focus:border-green-400 placeholder:text-gray-300 dark:placeholder:text-gray-600"
          />
        </div>

        {/* Filters: 省份下拉 + 难度标签 */}
        <div className="flex items-center gap-1.5 px-4 pb-3">
          {/* 省份下拉 */}
          <div className="relative">
            <button
              onClick={() => setShowProvinceDropdown(!showProvinceDropdown)}
              onBlur={() => setTimeout(() => setShowProvinceDropdown(false), 200)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ${
                activeProvince ? 'bg-green-600 text-white' : 'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-gray-800'
              }`}
            >
              {activeProvince || '全部地区'}
              <ChevronDown className={`w-3 h-3 transition-transform ${showProvinceDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showProvinceDropdown && (
              <div className="absolute top-full left-0 mt-1 w-32 max-h-[200px] overflow-y-auto rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-lg shadow-gray-200/50 dark:shadow-gray-900/50 z-20 py-1">
                <button
                  onClick={() => { setActiveProvince(''); setActiveDifficulty(null); }}
                  className={`w-full text-left px-3 py-1.5 text-[10px] font-bold transition-colors ${
                    !activeProvince ? 'bg-green-50 dark:bg-green-900/20 text-green-600' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >全部地区</button>
                {ALL_PROVINCES.map(p => (
                  <button
                    key={p}
                    onClick={() => { setActiveProvince(p); setActiveDifficulty(null); }}
                    className={`w-full text-left px-3 py-1.5 text-[10px] font-bold transition-colors ${
                      activeProvince === p ? 'bg-green-50 dark:bg-green-900/20 text-green-600' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >{p}</button>
                ))}
              </div>
            )}
          </div>

          {/* 分隔线 */}
          <span className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1" />

          {/* 难度筛选 */}
          <button
            onClick={() => { setActiveDifficulty(null); setActiveProvince(''); }}
            className={`shrink-0 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ${
              !activeDifficulty ? 'bg-green-600 text-white' : 'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-gray-800'
            }`}
          >全部难度</button>
          {[1,2,3,4,5].map(d => (
            <button
              key={d}
              onClick={() => { setActiveDifficulty(activeDifficulty === d ? null : d); setActiveProvince(''); }}
              className={`shrink-0 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ${
                activeDifficulty === d ? 'bg-green-600 text-white' : 'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-gray-800'
              }`}
            >{difficultyLabel(d)}</button>
          ))}
        </div>
      </div>{/* end sticky */}

      {/* Hero */}
      {!search && !activeProvince && !activeDifficulty && (
        <div onClick={() => goToRoute(heroRoute.id)}
          className="mx-4 mb-4 rounded-2xl overflow-hidden h-[120px] relative cursor-pointer active:scale-[0.99] transition-transform">
          {(() => {
            const cover = getRouteCover({ id: heroRoute.id, coverImage: heroRoute.coverImage, coverImageAuthor: heroRoute.coverImageAuthor, coverGradient: heroRoute.coverGradient });
            return (
              <>
                {cover.hasImage ? (
                  <img src={cover.imageUrl} alt={heroRoute.name} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 bg-cover bg-center" style={cover.gradientBackground} />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                {cover.hasImage && cover.author && (
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/hike-log/${cover.author!.id}`); }}
                    className="absolute top-2 right-3 px-2 py-0.5 rounded bg-black/30 backdrop-blur-sm text-[8px] text-white/80 hover:bg-black/50 hover:text-white transition-colors"
                  >
                    来自{cover.author.name}的分享
                  </button>
                )}
              </>
            );
          })()}
          <div className="absolute left-5 top-1/2 -translate-y-1/2 text-white">
            <span className="inline-block px-2 py-0.5 rounded-md bg-white/20 backdrop-blur-sm text-[9px] font-bold mb-2">本月推荐</span>
            <h2 className="text-base font-black mb-0.5">{heroRoute.name}</h2>
            <p className="text-[10px] text-white/70">{heroRoute.province} · {heroRoute.distance} · {heroRoute.duration} · 难度 {heroRoute.difficulty}/5</p>
          </div>
        </div>
      )}

      {/* Route Cards — 2列网格 */}
      <div className="px-4">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <Compass className="w-10 h-10 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
            <p className="text-[13px] font-bold text-gray-400 dark:text-gray-500">没有找到匹配的路线</p>
            <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-1">试试其他关键词</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {filtered.map((route: ClassicRoute) => {
              const cover = getRouteCover({ id: route.id, coverImage: route.coverImage, coverImageAuthor: route.coverImageAuthor, coverGradient: route.coverGradient });
              return (
                <div key={route.id}
                  onClick={() => goToRoute(route.id)}
                  className="rounded-xl overflow-hidden bg-white dark:bg-gray-900 shadow-sm dark:shadow-gray-900/50 border border-gray-100 dark:border-gray-800 cursor-pointer active:scale-[0.98] transition-transform"
                >
                  {/* Cover —— 优先用户图片+水印，无则用渐变+SVG剪影 */}
                  <div className="relative aspect-[4/3] overflow-hidden">
                    {cover.hasImage ? (
                      <img src={cover.imageUrl} alt={route.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 bg-cover bg-center" style={cover.gradientBackground} />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                    <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-white/15 backdrop-blur-sm text-[8px] font-bold text-white">{route.theme}</span>
                    <span className="absolute top-2 right-2">{difficultyDots(route.difficulty)}</span>
                    {cover.hasImage && cover.author && (
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/hike-log/${cover.author!.id}`); }}
                        className="absolute bottom-8 left-2 px-1.5 py-0.5 rounded bg-black/30 backdrop-blur-sm text-[8px] text-white/75 hover:bg-black/50 hover:text-white transition-colors"
                      >
                        来自{cover.author.name}的分享
                      </button>
                    )}
                    <div className="absolute bottom-2 left-2 right-2">
                      <h3 className="text-[11px] font-extrabold text-white drop-shadow-md leading-tight">{route.name}</h3>
                      <p className="text-[9px] text-white/60 mt-0.5">{route.province}</p>
                    </div>
                  </div>
                  {/* Stats */}
                  <div className="flex items-center gap-1.5 px-2 py-2">
                    <span className="flex items-center gap-0.5 text-[9px] font-bold text-gray-400 dark:text-gray-500">
                      <Navigation className="w-2.5 h-2.5 text-gray-300 dark:text-gray-600" />{route.elevation}
                    </span>
                    <span className="flex items-center gap-0.5 text-[9px] font-bold text-gray-400 dark:text-gray-500">
                      <Clock className="w-2.5 h-2.5 text-gray-300 dark:text-gray-600" />{route.duration}
                    </span>
                    <span className="flex items-center gap-0.5 text-[9px] font-bold text-gray-400 dark:text-gray-500">
                      <MapPin className="w-2.5 h-2.5 text-gray-300 dark:text-gray-600" />{route.distance}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}