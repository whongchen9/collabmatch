import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, RefreshCw, MapPin, Clock, Mountain, Flag, CalendarCheck, ChevronDown } from 'lucide-react';
import { useStore } from '@/store';
import Empty from '@/components/Empty';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useLanguage } from '@/i18n';
import type { Group } from '@/types';

/** 按活跃度排序：有消息的按最新消息时间，无消息的按 updatedAt */
function sortByActivity(list: Group[]): Group[] {
  return [...list].sort((a, b) => {
    const aTime = a.messages?.length ? new Date((a.messages[a.messages.length - 1] as any).createdAt || 0).getTime() : new Date(a.updatedAt || 0).getTime();
    const bTime = b.messages?.length ? new Date((b.messages[b.messages.length - 1] as any).createdAt || 0).getTime() : new Date(b.updatedAt || 0).getTime();
    return bTime - aTime;
  });
}

export default function Teams() {
  const { groups, loadGroups } = useStore();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const language = useLanguage();

  const handleRefresh = async () => { await loadGroups(); };
  const { refreshing, pullDistance, containerRef, onTouchStart, onTouchMove, onTouchEnd } = usePullToRefresh(handleRefresh);

  useEffect(() => { loadGroups(); }, [loadGroups]);

  const { hiking, ready, completed } = useMemo(() => ({
    hiking: sortByActivity(groups.filter(g => g.hikeStatus === 'hiking')),
    ready: sortByActivity(groups.filter(g => g.hikeStatus !== 'hiking' && g.hikeStatus !== 'completed')),
    completed: sortByActivity(groups.filter(g => g.hikeStatus === 'completed')),
  }), [groups]);

  const sections = [
    { key: 'hiking', label: language === 'en' ? 'On Trail' : '征途中', icon: Mountain, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-l-green-400', list: hiking },
    { key: 'ready', label: language === 'en' ? 'Ready' : '已就绪', icon: CalendarCheck, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-l-blue-400', list: ready },
    { key: 'completed', label: language === 'en' ? 'Completed' : '凯旋', icon: Flag, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-l-amber-400', list: completed },
  ];

  const toggleSection = (key: string) => setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div ref={containerRef} className="min-h-screen bg-[#faf7f2] dark:bg-gray-950 pb-24"
      onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      {/* Pull indicator */}
      {(pullDistance > 0 || refreshing) && (
        <div className="flex items-center justify-center py-2 transition-all" style={{ height: refreshing ? 40 : pullDistance }}>
          <RefreshCw className={`w-5 h-5 text-green-500 ${refreshing ? 'animate-spin' : ''}`} />
          <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">{refreshing ? (language === 'en' ? 'Refreshing...' : '刷新中...') : pullDistance > 50 ? (language === 'en' ? 'Release to refresh' : '松开刷新') : (language === 'en' ? 'Pull to refresh' : '下拉刷新')}</span>
        </div>
      )}

      {/* Header — sticky */}
      <div className="sticky top-0 z-10 bg-[#faf7f2] dark:bg-gray-950 px-5 pt-6 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black text-gray-800 dark:text-gray-200">{language === 'en' ? 'My Teams' : '我的队伍'}</h1>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{groups.length} {language === 'en' ? 'teams' : '个队伍'}</p>
        </div>
        <button onClick={handleRefresh} className="w-8 h-8 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center justify-center">
          <RefreshCw className="w-3.5 h-3.5 text-gray-400" />
        </button>
      </div>

      {/* Empty state */}
      {groups.length === 0 && (
        <div className="px-5">
          <Empty icon={Users} title={language === 'en' ? "Haven't joined any teams yet" : '还没有加入任何队伍'} description={language === 'en' ? 'Go to home to match with like-minded hiking buddies in one sentence' : '去首页一句话匹配，找到志同道合的徒步伙伴'}
            action={{ label: language === 'en' ? 'Find teammates' : '去匹配队友', onClick: () => navigate('/') }} />
        </div>
      )}

      {/* Sections — all visible, clickable to collapse */}
      {sections.map(section => {
        const isOpen = !collapsed[section.key];
        return (
          <div key={section.key} className="mb-1">
            {/* Section header — clickable */}
            <button onClick={() => toggleSection(section.key)}
              className={`flex items-center gap-2 px-5 py-3 border-l-[3px] ${section.border} mx-3 my-3 rounded-r-xl ${section.bg} w-full text-left active:scale-[0.99] transition-transform`}>
              <section.icon className={`w-4 h-4 ${section.color}`} />
              <span className="text-xs font-black text-gray-700 dark:text-gray-300">{section.label}</span>
              <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 ml-auto">{section.list.length}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-gray-400 dark:text-gray-500 transition-transform ${isOpen ? '' : '-rotate-90'}`} />
            </button>

            {/* Cards — collapsible */}
            {isOpen && (
              <div className="px-3 space-y-2">
                {section.list.length === 0 ? (
                  <p className="text-xs text-gray-300 dark:text-gray-600 text-center py-4">{language === 'en' ? `No ${section.label} teams` : `暂无${section.label}的队伍`}</p>
                ) : (
                  section.list.map(group => {
                    const loc = group.essentials?.location || group.confirmedDetails?.location || '';
                    const date = group.essentials?.date || group.confirmedDetails?.date || '';
                    const lastMsg = group.messages?.[group.messages.length - 1];
                    const members = group.members || [];
                    const showMembers = members.slice(0, 4);
                    return (
                      <button key={group.id}
                        onClick={() => navigate(`/team/${group.id}`)}
                        className="w-full rounded-2xl p-4 text-left active:scale-[0.98] transition-transform shadow-sm dark:shadow-gray-900/50 border border-gray-100 dark:border-gray-800 relative overflow-hidden bg-white dark:bg-gray-900"
                      >
                        {/* 默认背景图 — 底层水印 */}
                        <div className="absolute inset-0 bg-cover bg-[center_20%] opacity-[0.12] dark:opacity-[0.08]" style={{ backgroundImage: 'url(/assets/team-card-bg.jpg)' }} />
                        {/* Top row: avatar cluster + name + status */}
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-11 h-11 shrink-0 rounded-xl overflow-hidden flex flex-wrap bg-gray-100 dark:bg-gray-800">
                            {showMembers.map((m, i) => (
                              <div key={i}
                                className={`flex items-center justify-center text-[8px] font-extrabold text-white border-[0.5px] border-white/30 dark:border-gray-900/30 ${members.length <= 2 ? 'w-full h-full' : 'w-1/2 h-1/2'}`}
                                style={{ background: (m && typeof m === 'object' ? m.avatarColor : undefined) || `hsl(${(i + 2) * 72}, 55%, 50%)` }}>
                                {(m && typeof m === 'object' && typeof m.name === 'string') ? m.name[0] : '?'}
                              </div>
                            ))}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-extrabold text-sm text-gray-800 dark:text-gray-200 truncate">{group.name}</h3>
                            <div className="flex items-center gap-2 mt-0.5">
                              {loc && <span className="flex items-center gap-0.5 text-[10px] text-gray-400 dark:text-gray-500"><MapPin className="w-2.5 h-2.5" />{loc}</span>}
                              {date && <span className="flex items-center gap-0.5 text-[10px] text-gray-400 dark:text-gray-500"><Clock className="w-2.5 h-2.5" />{date}</span>}
                            </div>
                          </div>
                          <span className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-extrabold ${
                            group.hikeStatus === 'hiking' ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400' :
                            group.hikeStatus === 'completed' ? 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400' :
                            'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                          }`}>
                            {group.hikeStatus === 'hiking' ? (language === 'en' ? 'Hiking' : '征途') : group.hikeStatus === 'completed' ? (language === 'en' ? 'Done' : '凯旋') : (language === 'en' ? 'Ready' : '就绪')}
                          </span>
                        </div>
                        {lastMsg && (
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate leading-relaxed">
                            {lastMsg.type === 'system' ? '📢 ' : lastMsg.type === 'image' ? '📷 ' : ''}{lastMsg.content}
                          </p>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
