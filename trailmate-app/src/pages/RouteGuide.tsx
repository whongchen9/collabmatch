import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Clock, TrendingUp, ChevronDown, ChevronUp, Star, UtensilsCrossed, Landmark, Gift, Trophy, Footprints } from 'lucide-react';
import { routesApi } from '@/api';
import type { ClassicRoute } from '@/types';

const difficultyLabels: Record<number, string> = { 1: '入门', 2: '简单', 3: '中等', 4: '挑战', 5: '专家' };
const difficultyColors: Record<number, string> = {
  1: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  2: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  3: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  4: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  5: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const tierColors: Record<string, string> = {
  bronze: 'from-amber-700 to-yellow-600',
  silver: 'from-gray-400 to-gray-300',
  gold: 'from-yellow-500 to-yellow-300',
  hidden: 'from-purple-600 to-pink-500',
};

const tierLabels: Record<string, string> = {
  bronze: '青铜',
  silver: '白银',
  gold: '黄金',
  hidden: '隐藏',
};

export default function RouteGuide() {
  const navigate = useNavigate();
  const [routes, setRoutes] = useState<ClassicRoute[]>([]);
  const [selectedProvince, setSelectedProvince] = useState<string>('全部');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Record<string, string>>({});

  useEffect(() => {
    routesApi.list().then(setRoutes);
  }, []);

  const provinces = ['全部', ...Array.from(new Set(routes.map(r => r.province)))];
  const filtered = selectedProvince === '全部' ? routes : routes.filter(r => r.province === selectedProvince);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
    if (expandedId !== id) {
      setActiveTab(prev => ({ ...prev, [id]: 'checkpoints' }));
    }
  };

  const setTab = (routeId: string, tab: string) => {
    setActiveTab(prev => ({ ...prev, [routeId]: tab }));
  };

  const getTab = (routeId: string) => activeTab[routeId] || 'checkpoints';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-800/50 pb-24">
      {/* 头部 */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="p-1.5 -ml-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-800 dark:text-gray-200">路线图鉴</h1>
            <p className="text-xs text-gray-400 dark:text-gray-500">探索经典路线，解锁专属称号</p>
          </div>
        </div>

        {/* 省份筛选 */}
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
          {provinces.map(p => (
            <button
              key={p}
              onClick={() => { setSelectedProvince(p); setExpandedId(null); }}
              className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                selectedProvince === p
                  ? 'bg-green-500 text-white shadow-md shadow-green-500/25'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* 路线列表 */}
      <div className="px-4 pt-4 space-y-4">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400 dark:text-gray-500">
            <Footprints className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">该省份暂无路线数据</p>
          </div>
        )}
        {filtered.map(route => {
          const isExpanded = expandedId === route.id;
          const currentTab = getTab(route.id);

          return (
            <div key={route.id} className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm dark:shadow-gray-900/50 overflow-hidden">
              {/* 封面区 */}
              <div className={`relative h-40 bg-gradient-to-br ${route.coverGradient} flex items-end p-4`}>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="relative z-10 w-full">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white/80 text-xs mb-1">{route.province} · {route.theme}</p>
                      <h2 className="text-white text-xl font-bold">{route.name}</h2>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${difficultyColors[route.difficulty]}`}>
                      {difficultyLabels[route.difficulty]}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-white/80 text-xs">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{route.distance}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{route.duration}</span>
                    <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" />{route.elevation}</span>
                  </div>
                </div>
              </div>

              {/* 标签 */}
              <div className="px-4 pt-3 flex flex-wrap gap-1.5">
                {route.tags.map((tag, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-[10px] text-gray-500 dark:text-gray-400">
                    {tag}
                  </span>
                ))}
              </div>

              {/* 展开/收起按钮 */}
              <button
                onClick={() => toggleExpand(route.id)}
                className="w-full px-4 py-2 flex items-center justify-center gap-1 text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
              >
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                <span>{isExpanded ? '收起详情' : '查看详情'}</span>
              </button>

              {/* 展开详情 */}
              {isExpanded && (
                <div className="px-4 pb-4">
                  {/* Tab 切换 */}
                  <div className="flex gap-1 mb-3 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
                    {[
                      { key: 'checkpoints', icon: MapPin, label: '打卡点' },
                      { key: 'story', icon: Landmark, label: '背景故事' },
                      { key: 'food', icon: UtensilsCrossed, label: '美食' },
                      { key: 'customs', icon: Gift, label: '习俗' },
                      { key: 'titles', icon: Trophy, label: '称号' },
                    ].map(tab => (
                      <button
                        key={tab.key}
                        onClick={() => setTab(route.id, tab.key)}
                        className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium transition-all ${
                          currentTab === tab.key
                            ? 'bg-white dark:bg-gray-700 text-green-600 dark:text-green-400 shadow-sm'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                      >
                        <tab.icon className="w-3.5 h-3.5" />
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* 打卡点 */}
                  {currentTab === 'checkpoints' && (
                    <div className="space-y-2">
                      {route.checkpoints.map((cp, i) => (
                        <div key={i} className="flex gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                          <div className="w-7 h-7 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0 mt-0.5">
                            <span className="text-xs font-bold text-green-600 dark:text-green-400">{cp.order}</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{cp.label}</p>
                            {cp.tip && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{cp.tip}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 背景故事 */}
                  {currentTab === 'story' && (
                    <div className="space-y-3">
                      <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{route.story}</p>
                      </div>
                      {route.storyQuote && (
                        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border-l-2 border-amber-400">
                          <p className="text-xs text-amber-700 dark:text-amber-300 italic">{route.storyQuote}</p>
                        </div>
                      )}
                      <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                        <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">攻略指南</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed whitespace-pre-line">{route.guide}</p>
                      </div>
                    </div>
                  )}

                  {/* 美食 */}
                  {currentTab === 'food' && (
                    <div className="space-y-3">
                      <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-900/20">
                        <p className="text-xs text-orange-600 dark:text-orange-400 font-medium mb-2 flex items-center gap-1">
                          <UtensilsCrossed className="w-3.5 h-3.5" />当地特色美食
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {(route.localFood || []).map((food, i) => (
                            <span key={i} className="px-2.5 py-1 rounded-full bg-white dark:bg-gray-800 text-xs text-gray-700 dark:text-gray-300 shadow-sm">
                              {food}
                            </span>
                          ))}
                        </div>
                      </div>
                      {route.specialties && route.specialties.length > 0 && (
                        <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20">
                          <p className="text-xs text-purple-600 dark:text-purple-400 font-medium mb-2 flex items-center gap-1">
                            <Gift className="w-3.5 h-3.5" />地方特产
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {route.specialties.map((s, i) => (
                              <span key={i} className="px-2.5 py-1 rounded-full bg-white dark:bg-gray-800 text-xs text-gray-700 dark:text-gray-300 shadow-sm">
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 习俗 */}
                  {currentTab === 'customs' && (
                    <div className="space-y-2">
                      {(route.customs || []).length === 0 ? (
                        <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">暂无习俗数据</p>
                      ) : (
                        (route.customs || []).map((c, i) => (
                          <div key={i} className="flex gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                            <div className="w-7 h-7 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                              <Landmark className="w-3.5 h-3.5 text-red-500" />
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300">{c}</p>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* 称号 */}
                  {currentTab === 'titles' && (
                    <div className="space-y-2">
                      {route.titles.map((title, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tierColors[title.tier]} flex items-center justify-center shrink-0`}>
                            <span className="text-lg">{title.icon || '🏆'}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{title.name}</p>
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium bg-gradient-to-r ${tierColors[title.tier]} text-white`}>
                                {tierLabels[title.tier]}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{title.condition}</p>
                          </div>
                          <Star className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}