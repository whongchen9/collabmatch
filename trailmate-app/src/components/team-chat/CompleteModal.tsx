import { Flag, Navigation } from 'lucide-react';
import type { Group } from '@/types';

interface CompleteModalProps {
  checkpoints: NonNullable<Group['checkpoints']>;
  photos: string[];
  completeTrackStats: { dist: number; dur: number; pace: number } | null;
  hikingActionLoading: boolean;
  isLeader: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function CompleteModal({
  checkpoints, photos, completeTrackStats, hikingActionLoading, isLeader,
  onConfirm, onClose,
}: CompleteModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-5">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm p-5 relative">
        <button onClick={onClose}
          className="absolute top-3 right-3 w-6 h-6 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-400 dark:text-gray-500 text-xs">
          ✕
        </button>
        <div className="flex items-center gap-2 mb-3">
          <Flag className="w-5 h-5 text-amber-500" />
          <h3 className="font-bold text-gray-800 dark:text-gray-200">凯旋而归</h3>
        </div>
        {/* 征途摘要 */}
        <div className="bg-amber-50 rounded-xl p-3 mb-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-xl font-bold text-amber-600">{checkpoints.length}</p>
              <p className="text-[10px] text-amber-400">打卡点</p>
            </div>
            <div>
              <p className="text-xl font-bold text-amber-600">{checkpoints.filter(cp => (cp.checkins || []).length > 0).length}</p>
              <p className="text-[10px] text-amber-400">已签到</p>
            </div>
            <div>
              <p className="text-xl font-bold text-amber-600">{photos.length}</p>
              <p className="text-[10px] text-amber-400">照片</p>
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 text-center">完成后将自动为每个队员生成活动日志</p>
        {/* 轨迹统计 */}
        {completeTrackStats && (
          <div className="bg-blue-50 rounded-xl p-3 mb-4">
            <p className="text-[10px] font-bold text-blue-600 mb-2 flex items-center gap-1">
              <Navigation className="w-3 h-3" />GPS 轨迹统计
            </p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-lg font-bold text-blue-600">{(completeTrackStats.dist / 1000).toFixed(2)}</p>
                <p className="text-[10px] text-blue-400">总里程 km</p>
              </div>
              <div>
                <p className="text-lg font-bold text-blue-600">{Math.floor(completeTrackStats.dur / 60)}</p>
                <p className="text-[10px] text-blue-400">运动时长 min</p>
              </div>
              <div>
                <p className="text-lg font-bold text-blue-600">
                  {completeTrackStats.pace > 0
                    ? `${Math.floor(completeTrackStats.pace / 60)}'${String(Math.floor(completeTrackStats.pace % 60)).padStart(2, '0')}"`
                    : '-'}
                </p>
                <p className="text-[10px] text-blue-400">平均配速</p>
              </div>
            </div>
          </div>
        )}
        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-xl text-sm font-bold">继续征途</button>
          <button onClick={onConfirm} disabled={hikingActionLoading || !isLeader}
            className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-bold disabled:opacity-50">
            {!isLeader ? '仅队长可完成' : hikingActionLoading ? '处理中...' : '确定完成'}
          </button>
        </div>
      </div>
    </div>
  );
}
