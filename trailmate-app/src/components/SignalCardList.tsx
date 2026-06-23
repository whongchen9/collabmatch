import type { Signal } from '@/types';
import SignalCard from './SignalCard';

interface SignalCardListProps {
  signals: Signal[];
  onClickSignal: (signal: Signal) => void;
  userLat?: number;
  userLng?: number;
}

/** SOS 信号优先排序 */
function sortSignals(signals: Signal[]): Signal[] {
  return [...signals].sort((a, b) => {
    if (a.type === 'sos' && b.type !== 'sos') return -1;
    if (a.type !== 'sos' && b.type === 'sos') return 1;
    return b.createdAt - a.createdAt;
  });
}

export default function SignalCardList({ signals, onClickSignal, userLat, userLng }: SignalCardListProps) {
  if (signals.length === 0) {
    return (
      <div className="absolute bottom-4 left-3 right-3 z-[999] flex justify-center">
        <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-xl px-4 py-2 shadow-lg">
          <p className="text-[10px] text-gray-400 dark:text-gray-500">暂无附近求助信号</p>
        </div>
      </div>
    );
  }

  const sorted = sortSignals(signals);

  return (
    <div className="absolute bottom-4 left-3 right-3 z-[999]">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {sorted.map((signal) => (
          <SignalCard
            key={signal.id}
            signal={signal}
            onClick={() => onClickSignal(signal)}
            userLat={userLat}
            userLng={userLng}
          />
        ))}
      </div>
    </div>
  );
}
