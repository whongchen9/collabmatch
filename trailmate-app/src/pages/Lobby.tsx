import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Mountain, Clock, Star, TrendingUp, Compass, ChevronRight, Zap } from 'lucide-react';
import { routesApi } from '@/api';
import type { ClassicRoute } from '@/types';

const PROVINCES = [
  { key: '', label: '全部', emoji: '🗺️' },
  { key: '广东', label: '广东', emoji: '🌴' },
  { key: '云南', label: '云南', emoji: '🏔️' },
  { key: '四川', label: '四川', emoji: '🐼' },
  { key: '西藏', label: '西藏', emoji: '⛰️' },
  { key: '浙江', label: '浙江', emoji: '🌊' },
];
const DIFFICULTIES = [
  { value: 0, label: '不限', color: 'bg-gray-100 dark:bg-gray-800 text-gray-500' },
  { value: 1, label: '新手', color: 'bg-green-50 dark:bg-green-900/20 text-green-600' },
  { value: 2, label: '入门', color: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' },
  { value: 3, label: '进阶', color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600' },
  { value: 4, label: '挑战', color: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600' },
  { value: 5, label: '极限', color: 'bg-red-50 dark:bg-red-900/20 text-red-600' },
];

const DIFF_EMOJI = ['', '🟢', '🟢', '🟡', '🟠', '🔴'];
const DIFF_NAME = ['', '新手', '入门', '进阶', '挑战', '极限'];

function RouteCard({ route, onClick }: { route: ClassicRoute; onClick: () => void }) {
  return (
    <div onClick={onClick}
      className="rounded-[18px] overflow-hidden shadow-sm dark:shadow-gray-900/50 border border-gray-100/80 dark:border-gray-800/80 cursor-pointer active:scale-[0.98] transition-all hover:shadow-md hover:border-gray-200 dark:hover:border-gray-700 bg-white dark:bg-gray-900">
      {/* 标题区 */}
      <div className="px-3 pt-3 pb-1">
        <div className="flex items-center justify-between mb-0.5">
          <p className="text-[9px] font-bold text-gray-400 dark:text-gray-500 tracking-wide uppercase">{route.province} · {route.theme}</p>
          <span className="text-sm">{DIFF_EMOJI[route.difficulty]}</span>
        </div>
        <h3 className="text-[15px] font-black text-gray-800 dark:text-gray-200 truncate">{route.name}</h3>
      </div>
      {/* 统计条 */}
      <div className="flex divide-x divide-gray-100 dark:divide-gray-800 border-t border-gray-50 dark:border-gray-800/50">
        <div className="flex-1 py-2.5 text-center">
          <div className="text-[12px] font-black text-gray-700 dark:text-gray-300">{route.distance}</div>
          <div className="text-[8px] text-gray-400 dark:text-gray-500">全长</div>
        </div>
        <div className="flex-1 py-2.5 text-center">
          <div className="text-[12px] font-black text-gray-700 dark:text-gray-300">{route.duration}</div>
          <div className="text-[8px] text-gray-400 dark:text-gray-500">耗时</div>
        </div>
        <div className="flex-1 py-2.5 text-center">
          <div className="text-[12px] font-black text-gray-700 dark:text-gray-300">{route.elevation}</div>
          <div className="text-[8px] text-gray-400 dark:text-gray-500">海拔</div>
        </div>
      </div>
      {/* 标签行 */}
      <div className="px-3 pb-3 flex items-center justify-between">
        <div className="flex gap-1 flex-wrap">
          {route.tags.slice(0, 2).map((t, i) => (
            <span key={i} className="px-2 py-0.5 rounded-full bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-[8px] font-bold">
              {t}
            </span>
          ))}
          {route.checkpoints.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-500 dark:text-blue-400 text-[8px] font-bold">
              {route.checkpoints.length}站
            </span>
          )}
        </div>
        <span className={`px-2 py-0.5 rounded-full text-[8px] font-extrabold ${DIFFICULTIES[route.difficulty].color}`}>
          {DIFF_NAME[route.difficulty]}
        </span>
      </div>
    </div>
  );
}

/* ── 精选路线大卡片 ── */
function FeaturedCard({ route, onClick }: { route: ClassicRoute; onClick: () => void }) {
  return (
    <div onClick={onClick}
      className="rounded-[20px] overflow-hidden shadow-sm dark:shadow-gray-900/50 border border-green-200 dark:border-green-900/30 cursor-pointer active:scale-[0.99] transition-all bg-white dark:bg-gray-900">
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-[9px] font-extrabold flex items-center gap-1">
            <Zap className="w-3 h-3" />精选路线
          </span>
        </div>
        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 mb-1">{route.province} · {route.theme}</p>
        <h2 className="text-[20px] font-black text-gray-800 dark:text-gray-200 mb-3">{route.name}</h2>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />{route.distance}
          </span>
          <span className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />{route.duration}
          </span>
          <span className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />{route.elevation}
          </span>
          <span className="ml-auto px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400">
            {DIFF_NAME[route.difficulty]} · {route.checkpoints.length}站
          </span>
        </div>
      </div>
    </div>
  );
}

export default function Lobby() {
  const navigate = useNavigate();
  const [routes, setRoutes] = useState<ClassicRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [province, setProvince] = useState('');
  const [difficulty, setDifficulty] = useState(0);

  useEffect(() => {
    routesApi.list().then(r => { setRoutes(r); setLoading(false); });
  }, []);

  const filtered = useMemo(() => {
    return routes.filter(r => {
      if (province && r.province !== province) return false;
      if (difficulty > 0 && r.difficulty !== difficulty) return false;
      return true;
    });
  }, [routes, province, difficulty]);

  const featured = routes[0];
  const others = province || difficulty > 0 ? filtered : routes.slice(1);
  const totalCheckpoints = routes.reduce((s, r) => s + r.checkpoints.length, 0);
  const totalComments = routes.reduce((s, r) => s + (r.comments || []).length, 0);

  return (
    <div className="min-h-screen bg-[#faf7f2] dark:bg-gray-950">
      {/* ═══ Header ═══ */}
      <div className="pt-5 pb-2 px-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center shadow-md shadow-green-200/30">
              <Compass className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-[17px] font-black text-gray-800 dark:text-gray-100">山志图鉴</h1>
              <p className="text-[10px] text-gray-400 dark:text-gray-500">发现经典路线 · 解锁专属称号</p>
            </div>
          </div>
          {/* 统计 pills */}
          <div className="flex gap-2">
            <div className="text-center px-3 py-1.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
              <div className="text-[13px] font-black text-green-600">{routes.length}</div>
              <div className="text-[8px] text-gray-400">路线</div>
            </div>
            <div className="text-center px-3 py-1.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
              <div className="text-[13px] font-black text-blue-600">{totalCheckpoints}</div>
              <div className="text-[8px] text-gray-400">打卡</div>
            </div>
          </div>
        </div>

        {/* 省份筛选 */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {PROVINCES.map(p => (
            <button key={p.key} onClick={() => setProvince(p.key)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-extrabold transition-all ${
                province === p.key
                  ? 'bg-green-600 text-white shadow-md shadow-green-200/20'
                  : 'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-gray-800 hover:border-green-200 dark:hover:border-green-800'
              }`}>
              <span className="text-sm">{p.emoji}</span>
              {p.label}
            </button>
          ))}
        </div>

        {/* 难度筛选 */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide mt-2">
          {DIFFICULTIES.map(d => (
            <button key={d.value} onClick={() => setDifficulty(d.value)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-[10px] font-extrabold transition-all ${
                difficulty === d.value
                  ? 'bg-gray-800 dark:bg-white text-white dark:text-gray-900 shadow-sm'
                  : d.color + ' hover:opacity-80'
              }`}>
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ 内容区 ═══ */}
      <div className="px-4 pt-2 pb-24">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Compass className="w-6 h-6 text-green-400 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
              <Mountain className="w-8 h-8 text-gray-300 dark:text-gray-600" />
            </div>
            <p className="text-sm font-bold text-gray-400 dark:text-gray-500">没有找到匹配的路线</p>
            <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">试试调整筛选条件</p>
          </div>
        ) : (
          <>
            {/* 精选大卡片 */}
            {!province && difficulty === 0 && featured && (
              <div className="mb-4">
                <p className="text-[10px] font-extrabold text-gray-400 dark:text-gray-500 mb-2 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-500" />精选推荐
                </p>
                <FeaturedCard route={featured} onClick={() => navigate(`/route/${featured.id}`)} />
              </div>
            )}

            {/* 路线列表标题 */}
            <p className="text-[10px] font-extrabold text-gray-400 dark:text-gray-500 mb-2">
              {province || difficulty > 0 ? `筛选结果 · ${filtered.length} 条` : `全部路线 · ${others.length} 条`}
            </p>

            {/* 路线卡片网格 */}
            <div className="grid grid-cols-2 gap-3">
              {(province || difficulty > 0 ? filtered : others).map(route => (
                <RouteCard key={route.id} route={route} onClick={() => navigate(`/route/${route.id}`)} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
