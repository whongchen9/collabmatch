import { MapPin, Navigation, Flag, CheckCircle, Map } from 'lucide-react';
import MapPanel from '@/components/MapPanel';
import { haversineDistance } from '@/lib/utils';

interface LocationPanelProps {
  checkpoints: any[];
  members: any[];
  userPos: { lat: number; lng: number } | null;
  hikeStatus: string;
  user: { id: string } | null;
  isMember: boolean;
  onOpenFullMap: () => void;
}

const statusLabels: Record<string, string> = { idle: '等待出发', hiking: '征途中', completed: '已完成' };

export default function LocationPanel({
  checkpoints, members, userPos, hikeStatus, user, isMember, onOpenFullMap,
}: LocationPanelProps) {

  const statusLabel = statusLabels[hikeStatus] || hikeStatus;
  const isHiking = hikeStatus === 'hiking';
  const isCompleted = hikeStatus === 'completed';

  // 已签到人数
  const checkedInMemberCount = members.filter((m: any) => {
    const memberId = typeof m === 'string' ? m : m.id;
    return checkpoints.some((cp: any) => (cp.checkins || []).some((c: any) => c.userId === memberId));
  }).length;

  // 排序打卡点：先算距离，保留原始索引用于比较
  const sortedCheckpoints = [...checkpoints].map((cp, origIdx) => ({
    ...cp,
    _origIdx: origIdx,
    distance: userPos ? haversineDistance(userPos.lat, userPos.lng, cp.lat, cp.lng) : null,
  })).sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));

  // 下一个未签到的打卡点
  const nextCp = (() => {
    if (!userPos) return null;
    const userId = user?.id;
    // 先找最近的一个未签到的
    for (const cp of sortedCheckpoints) {
      const checkedIn = (cp.checkins || []).some((c: any) => c.userId === userId);
      if (!checkedIn) return cp;
    }
    return null; // 全部签到了
  })();

  // 平均签到进度：总签到次数 / (成员数 × 打卡点数)
  const totalCheckins = members.reduce((sum: number, m: any) => {
    const memberId = typeof m === 'string' ? m : m.id;
    const count = checkpoints.filter((cp: any) =>
      (cp.checkins || []).some((c: any) => c.userId === memberId)
    ).length;
    return sum + count;
  }, 0);
  const avgProgress = members.length > 0 && checkpoints.length > 0
    ? Math.round((totalCheckins / (members.length * checkpoints.length)) * 100)
    : 0;

  return (
    <div className="flex flex-col h-full">

      {/* ═══ 状态指示 ═══ */}
      <div className="shrink-0 mx-4 mt-3 flex items-center justify-between bg-white dark:bg-gray-900 rounded-xl px-4 py-2.5 shadow-sm dark:shadow-gray-900/50 border border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${
            isHiking ? 'bg-green-500 animate-pulse' : isCompleted ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
          }`} />
          <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{statusLabel}</span>
        </div>
        {isHiking && (
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400">
            {checkedInMemberCount}/{members.length}人签到
          </span>
        )}
      </div>

      {/* ═══ 可滚动内容区 ═══ */}
      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-2 space-y-3">

        {/* ── 队伍地图 ── */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-sm dark:shadow-gray-900/50">
          <div className="flex items-center justify-between px-4 py-3 border-l-[3px] border-l-green-400">
            <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <Map className="w-3.5 h-3.5 text-green-500" />队伍地图
            </h4>
          </div>
          <div className="px-4 pb-3">
            <MapPanel checkpoints={checkpoints} visible={true} />
          </div>
          {isMember && (
            <div className="px-4 pb-4">
              <button onClick={onOpenFullMap}
                className="w-full py-2.5 bg-green-600 text-white rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 hover:bg-green-700 active:scale-[0.98] transition-all">
                <Map className="w-3.5 h-3.5" />打开完整地图
              </button>
            </div>
          )}
          {!isMember && (
            <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center pb-4">加入队伍后可使用完整地图</p>
          )}
        </div>

        {/* ── 打卡点 ── */}
        {checkpoints.length > 0 && hikeStatus !== 'idle' && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-sm dark:shadow-gray-900/50">
            <div className="flex items-center justify-between px-4 py-3 border-l-[3px] border-l-blue-400">
              <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <Flag className="w-3.5 h-3.5 text-blue-500" />打卡点
              </h4>
              <span className="text-[10px] font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full">{checkpoints.length}个</span>
            </div>

            {/* 下一个打卡点（高亮） */}
            {nextCp && nextCp.distance != null && (
              <div className="mx-3 mb-1 bg-blue-50 dark:bg-blue-900/10 rounded-xl px-3 py-2.5 flex items-center gap-3 border border-blue-100 dark:border-blue-900/30">
                <div className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center text-[11px] font-extrabold shrink-0">
                  <Navigation className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-extrabold text-blue-700 dark:text-blue-300 truncate">
                    {nextCp.label || `打卡点 ${nextCp._origIdx + 1}`}
                  </p>
                  <p className="text-[9px] text-blue-400 dark:text-blue-500">
                    {(nextCp.checkins || []).length}人已签到
                  </p>
                </div>
                <span className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-900 px-2 py-1 rounded-lg shrink-0">
                  {nextCp.distance >= 1000 ? `${(nextCp.distance / 1000).toFixed(1)}km` : `${Math.round(nextCp.distance)}m`}
                </span>
              </div>
            )}

            {/* 其余打卡点 */}
            <div>
              {sortedCheckpoints.map((cp: any) => {
                const idx = cp._origIdx;
                const userId = user?.id;
                const myCheckedIn = (cp.checkins || []).some((c: any) => c.userId === userId);
                const isNext = nextCp && cp._origIdx === nextCp._origIdx;
                if (isNext && nextCp?.distance != null) return null; // 已在上面显示

                return (
                  <div key={idx} className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-50 dark:border-gray-800/50 last:border-b-0 hover:bg-gray-50/30 dark:hover:bg-gray-800/20 transition-colors">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-extrabold shrink-0 ${
                      myCheckedIn ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
                    }`}>
                      {myCheckedIn ? <CheckCircle className="w-3.5 h-3.5" /> : (idx + 1)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-gray-700 dark:text-gray-300 truncate">{cp.label || `打卡点 ${idx + 1}`}</p>
                      <p className="text-[9px] text-gray-400 dark:text-gray-500">{(cp.checkins || []).length}人已签到</p>
                    </div>
                    {myCheckedIn ? (
                      <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full shrink-0">已签到</span>
                    ) : cp.distance != null ? (
                      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 shrink-0">
                        {cp.distance >= 1000 ? `${(cp.distance / 1000).toFixed(1)}km` : `${Math.round(cp.distance)}m`}
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── 签到进度 ── */}
        {members.length > 0 && checkpoints.length > 0 && hikeStatus !== 'idle' && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-sm dark:shadow-gray-900/50">
            <div className="flex items-center justify-between px-4 py-3 border-l-[3px] border-l-amber-400">
              <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-amber-500" />签到进度
              </h4>
              <span className="text-[10px] text-gray-400 dark:text-gray-500">{avgProgress}%</span>
            </div>

            <div>
              {members.map((m: any) => {
                const memberId = typeof m === 'string' ? m : m.id;
                const memberName = typeof m === 'string' ? '未知' : (m.name || '未知');
                const avatarColor = m.avatarColor || '#10b981';
                const checkedCount = checkpoints.filter((cp: any) =>
                  (cp.checkins || []).some((c: any) => c.userId === memberId)
                ).length;
                const pct = checkpoints.length > 0 ? (checkedCount / checkpoints.length) * 100 : 0;

                return (
                  <div key={memberId} className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-50 dark:border-gray-800/50 last:border-b-0">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-extrabold text-white shrink-0"
                      style={{ background: avatarColor }}>
                      {memberName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-gray-700 dark:text-gray-300 truncate">{memberName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="flex-1 h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[9px] text-gray-400 dark:text-gray-500 shrink-0">{checkedCount}/{checkpoints.length}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 空态：无打卡点 + 等待出发 */}
        {checkpoints.length === 0 && hikeStatus === 'idle' && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-sm dark:shadow-gray-900/50">
            <div className="flex items-center px-4 py-3 border-l-[3px] border-l-blue-400">
              <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <Flag className="w-3.5 h-3.5 text-blue-500" />打卡点
              </h4>
            </div>
            <div className="px-4 pb-5 text-center">
              <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center mx-auto mb-2">
                <Flag className="w-5 h-5 text-gray-300 dark:text-gray-600" />
              </div>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">暂无打卡点</p>
              <p className="text-[9px] text-gray-300 dark:text-gray-600 mt-1">出发后队长在地图上设置打卡点</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
