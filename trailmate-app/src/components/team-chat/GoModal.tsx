import { Play, Flag } from 'lucide-react';

interface GoModalProps {
  checkpoints: any[];
  members: any[];
  countdown: number | null;
  hikingActionLoading: boolean;
  isLeader: boolean;
  onStartCountdown: () => void;
  onCancelCountdown: () => void;
  onClose: () => void;
}

export default function GoModal({
  checkpoints, members, countdown, hikingActionLoading, isLeader,
  onStartCountdown, onCancelCountdown, onClose,
}: GoModalProps) {
  const meetingCp = checkpoints.find((cp: any) => cp.type === 'meeting') || checkpoints[0];
  const meetingCheckins = meetingCp?.checkins || [];
  const notCheckedIn = members.length - meetingCheckins.length;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-5">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm p-5">
        <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-2">出发确认</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">即将开始征途，共 {checkpoints.length} 个打卡点：</p>
        <div className="space-y-1 mb-4 max-h-32 overflow-y-auto">
          {checkpoints.map((cp, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 px-3 py-1.5 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <span className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-[10px] font-bold">{i + 1}</span>
              <span>{cp.label || `打卡点 ${i + 1}`}</span>
            </div>
          ))}
        </div>
        {notCheckedIn > 0 && (
          <p className="text-xs text-red-500 mb-3 text-center">+{notCheckedIn} 人尚未签到集合点</p>
        )}
        {countdown !== null ? (
          <div className="relative flex items-center justify-center py-8">
            <div className="flex flex-col items-center gap-2">
              <span className="text-7xl font-black text-green-600 animate-countdown-bounce" key={countdown}>
                {countdown > 0 ? countdown : '出发!'}
              </span>
              {countdown > 0 && (
                <span className="text-xs text-gray-400 dark:text-gray-500">征途即将开始</span>
              )}
            </div>
            <button onClick={onCancelCountdown}
              className="absolute bottom-0 right-0 w-6 h-6 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 text-xs"
              title="取消倒计时">
              ✕
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button onClick={onClose}
              className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-xl text-sm font-bold">
              还没准备好
            </button>
            <button onClick={onStartCountdown} disabled={hikingActionLoading || !isLeader}
              className="flex-1 py-3 bg-green-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">
              <Play className="w-4 h-4" />{isLeader ? '开始征途' : '仅队长可出发'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
