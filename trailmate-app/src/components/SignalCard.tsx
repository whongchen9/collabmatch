import { HeartHandshake, Siren } from 'lucide-react';
import type { Signal } from '@/types';

interface SignalCardProps {
  signal: Signal;
  onClick: () => void;
  userLat?: number;
  userLng?: number;
}

/** Haversine distance in km */
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Format distance for display */
function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
}

/** Format remaining time before signal expiry */
function formatRemaining(expiresAt: number): string {
  const ms = expiresAt - Date.now();
  if (ms <= 0) return '已过期';
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}分钟后过期`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}小时${mins % 60}分钟后过期`;
}

export default function SignalCard({ signal, onClick, userLat, userLng }: SignalCardProps) {
  const isSOS = signal.type === 'sos';
  const distance = userLat != null && userLng != null
    ? haversineDistance(userLat, userLng, signal.lat, signal.lng)
    : null;

  return (
    <button
      onClick={onClick}
      className={`w-40 shrink-0 rounded-xl p-3 border text-left transition-all active:scale-95 ${
        isSOS
          ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
      }`}
    >
      <div className="flex items-center gap-1.5 mb-1">
        {isSOS ? (
          <Siren className="w-4 h-4 text-red-500" />
        ) : (
          <HeartHandshake className="w-4 h-4 text-amber-500" />
        )}
        <span className={`text-[10px] font-bold ${isSOS ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
          {isSOS ? '求救' : '求助'}
        </span>
      </div>

      <p className="text-xs font-bold text-gray-800 dark:text-gray-100 truncate">
        {signal.userName}
      </p>

      <div className="flex items-center gap-2 mt-1">
        {distance != null && (
          <span className="text-[9px] text-gray-400 dark:text-gray-500">
            {formatDistance(distance)}
          </span>
        )}
        <span className="text-[9px] text-gray-400 dark:text-gray-500">
          {formatRemaining(signal.expiresAt)}
        </span>
      </div>
    </button>
  );
}
