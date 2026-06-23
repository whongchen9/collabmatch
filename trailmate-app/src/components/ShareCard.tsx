import { MapPin, Users, Clock, Heart } from 'lucide-react';

interface ShareCardProps {
  name: string;
  location?: string;
  date?: string;
  members: number;
  photos?: string[];
  likes?: number;
  distance?: number;
  onClick: () => void;
}

export default function ShareCard({ name, location, date, members, photos, likes, distance, onClick }: ShareCardProps) {
  const coverPhoto = photos?.[0] || '';
  const hasCover = !!coverPhoto;

  return (
    <div
      onClick={onClick}
      className="rounded-2xl overflow-hidden bg-white dark:bg-gray-900 shadow-sm dark:shadow-gray-900/50 border border-gray-100 dark:border-gray-800 cursor-pointer active:scale-[0.98] transition-transform"
    >
      {/* Cover Image */}
      <div className="relative w-full aspect-[4/3] overflow-hidden">
        {hasCover ? (
          <img src={coverPhoto} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-green-100 to-emerald-200 dark:from-green-900/20 dark:to-emerald-900/30 flex items-center justify-center">
            <span className="text-3xl">🏔️</span>
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        {/* Photo count badge */}
        {photos && photos.length > 1 && (
          <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-black/40 text-white rounded-md text-[9px] font-bold">
            {photos.length}张
          </span>
        )}
        {/* Title at bottom */}
        <h3 className="absolute bottom-2.5 left-3 right-3 text-xs font-extrabold text-white drop-shadow-md leading-tight line-clamp-2">
          {name}
        </h3>
      </div>

      {/* Info Bar */}
      <div className="px-3 py-2.5 flex items-center gap-3 text-[10px] text-gray-400 dark:text-gray-500">
        {location && (
          <span className="flex items-center gap-1 truncate">
            <MapPin className="w-3 h-3 shrink-0" />{location}
          </span>
        )}
        {distance && distance > 0 && (
          <span className="flex items-center gap-1 shrink-0">
            {distance.toFixed(1)}km
          </span>
        )}
        <span className="flex items-center gap-1 shrink-0">
          <Users className="w-3 h-3" />{members}
        </span>
        {date && (
          <span className="flex items-center gap-1 shrink-0">
            <Clock className="w-3 h-3" />{date.slice(5)}
          </span>
        )}
        {(likes ?? 0) > 0 && (
          <span className="flex items-center gap-1 shrink-0 ml-auto">
            <Heart className="w-3 h-3 text-red-400" />{likes}
          </span>
        )}
      </div>
    </div>
  );
}
