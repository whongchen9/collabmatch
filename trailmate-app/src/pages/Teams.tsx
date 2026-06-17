import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, MessageCircle, RefreshCw, Mountain } from 'lucide-react';
import { useStore } from '@/store';
import Empty from '@/components/Empty';

export default function Teams() {
  const { groups, loadGroups } = useStore();
  const navigate = useNavigate();

  // 下拉刷新
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadGroups(); }, [loadGroups]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadGroups();
    setRefreshing(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const diff = e.touches[0].clientY - touchStartY.current;
    if (diff > 0 && (containerRef.current?.scrollTop || 0) <= 0) {
      setPullDistance(Math.min(diff * 0.5, 80));
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance > 50) {
      await handleRefresh();
    }
    setPullDistance(0);
  };

  return (
    <div
      ref={containerRef}
      className="pb-24 min-h-screen bg-[#faf7f2] dark:bg-gray-950"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* 下拉刷新指示器 */}
      {(pullDistance > 0 || refreshing) && (
        <div className="flex items-center justify-center py-2 transition-all" style={{ height: refreshing ? 40 : pullDistance }}>
          <RefreshCw className={`w-5 h-5 text-green-500 ${refreshing ? 'animate-spin' : ''}`} />
          <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">{refreshing ? '刷新中...' : pullDistance > 50 ? '松开刷新' : '下拉刷新'}</span>
        </div>
      )}

      <div className="px-5 pt-6 pb-4 bg-white dark:bg-gray-900 sticky top-0 z-10 shadow-sm dark:shadow-gray-900/50">
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-200">我的队伍</h1>
      </div>

      <div className="px-5 mt-4 space-y-3">
        {groups.length === 0 ? (
          <Empty
            icon={Users}
            title="还没有加入任何队伍"
            description="去首页一句话匹配，找到志同道合的徒步伙伴"
            action={{ label: '去匹配队友', onClick: () => navigate('/') }}
          />
        ) : (
          groups.map(group => {
            const lastMsg = group.messages?.[group.messages.length - 1];
            return (
              <button
                key={group.id}
                onClick={() => navigate(`/team/${group.id}`)}
                className="w-full bg-white dark:bg-gray-900 rounded-2xl shadow-sm dark:shadow-gray-900/50 p-4 flex items-center gap-3 text-left hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: group.avatarColor || 'linear-gradient(135deg, #4ade80, #16a34a)' }}>
                  {group.emoji || '🥾'}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm truncate">{group.name}</h3>
                  {lastMsg && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
                      {lastMsg.type === 'system' ? '📢 ' : ''}{lastMsg.content}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                    <Users className="w-3 h-3" />{group.members?.length || 0}
                  </div>
                  {group.hikeStatus === 'hiking' && (
                    <span className="text-xs text-green-600 mt-0.5 block">🏔 征途中</span>
                  )}
                  {group.hikeStatus === 'completed' && (
                    <span className="text-xs text-orange-500 mt-0.5 block">🏁 凯旋</span>
                  )}
                  {!group.hikeStatus && group.status && (
                    <span className="text-xs text-green-600 mt-0.5 block">
                      {group.status === 'forming' ? '组队中' : group.status === 'ready' ? '已就绪' : group.status === 'ongoing' ? '进行中' : '已完成'}
                    </span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
