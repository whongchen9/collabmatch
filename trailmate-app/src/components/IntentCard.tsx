import { useState, useEffect } from 'react';
import { MapPin, Users, Heart, Mountain, Flag, Flame, Calendar } from 'lucide-react';
import type { Intent } from '@/types';

interface IntentCardProps {
  intent: Intent;
  /** 是否已有关联队伍（传入 groupId 表示已组队） */
  groupId?: string;
  /** 点击卡片跳转 */
  onClick: () => void;
  /** 编辑意图 */
  onEdit?: () => void;
  /** 匹配是否开启（仅展示） */
  matchingEnabled?: boolean;
  /** 队伍状态（hiking/completed/undefined） */
  hikeStatus?: string;
  /** 热度标记 */
  hot?: boolean;
  /** 点赞数 */
  likes?: number;
  /** 当前成员数 */
  memberCount?: number;
  /** 最大成员数 */
  maxMembers?: number;
  /** 相册图片 */
  photos?: string[];
  /** 日期 */
  date?: string;
}

export default function IntentCard({
  intent, groupId, onClick, onEdit,
  matchingEnabled, hikeStatus, hot, likes, memberCount, maxMembers, photos, date,
}: IntentCardProps) {
  const [photoIdx, setPhotoIdx] = useState(0);

  const title = intent.rawInput || '未命名意图';
  const location = intent.essentials?.location;
  const prompts = intent.prompts || [];
  const needPeople = (maxMembers || 6) - (memberCount || 0);
  const urgency = needPeople >= 3 ? 'high' : needPeople >= 2 ? 'mid' : 'low';
  const hasPhotos = photos && photos.length > 0;

  useEffect(() => {
    if (!hasPhotos || photos!.length <= 1) return;
    const t = setInterval(() => setPhotoIdx(i => (i + 1) % photos!.length), 3000);
    return () => clearInterval(t);
  }, [hasPhotos, photos?.length]);

  return (
    <div
      className="shrink-0 w-[calc(33.333%-4px)] aspect-square rounded-xl shadow-sm dark:shadow-gray-900/50 border-2 border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col relative cursor-pointer"
    >
      {/* ── 主体图片区 ── */}
      <div onClick={onClick} className="flex-1 relative overflow-hidden">
        {hasPhotos ? (
          <img src={photos![photoIdx]} alt={title} className="w-full h-full object-cover transition-opacity duration-700" />
        ) : (
          <div className={`w-full h-full ${hot ? 'bg-gradient-to-br from-orange-50 to-amber-100 dark:from-orange-900/20 dark:to-amber-900/20' : 'bg-gradient-to-b from-sky-200 to-emerald-200 dark:from-slate-700 dark:to-emerald-900/30'}`} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

        {/* 状态标签 */}
        {hikeStatus === 'hiking' && (
          <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-green-500/90 rounded-md text-[7px] text-white font-extrabold flex items-center gap-0.5">
            <Mountain className="w-2 h-2" />征途
          </div>
        )}
        {hikeStatus === 'completed' && (
          <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-amber-500/90 rounded-md text-[7px] text-white font-extrabold flex items-center gap-0.5">
            <Flag className="w-2 h-2" />凯旋
          </div>
        )}
        {!hikeStatus && hot && (
          <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-orange-500/90 rounded-md text-[7px] text-white font-extrabold flex items-center gap-0.5">
            <Flame className="w-2 h-2" />热
          </div>
        )}
        {!hikeStatus && matchingEnabled === false && (
          <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-gray-500/80 rounded-md text-[7px] text-white font-extrabold flex items-center gap-0.5">
            匹配已关闭
          </div>
        )}

        {/* 标题 */}
        <h4 className="absolute bottom-1.5 left-2 right-2 text-[10px] font-bold text-white truncate drop-shadow-md">
          {title}
        </h4>
      </div>

      {/* ── 底部信息条 ── */}
      <div onClick={onClick} className="px-2 py-1.5 bg-white dark:bg-gray-800">
        <div className="flex items-center gap-1.5">
          {(location || date) ? (
            <>
              {location && (
                <span className="flex items-center gap-0.5 text-[8px] text-gray-400 dark:text-gray-500 truncate">
                  <MapPin className="w-2 h-2 text-gray-300 dark:text-gray-600 shrink-0" />{location}
                </span>
              )}
              {date && (
                <span className="flex items-center gap-0.5 text-[8px] text-gray-400 dark:text-gray-500 truncate">
                  <Calendar className="w-2 h-2 text-gray-300 dark:text-gray-600 shrink-0" />{date}
                </span>
              )}
            </>
          ) : (
            <span className="text-[8px] text-gray-300 dark:text-gray-600">待补充信息</span>
          )}
          {(memberCount ?? 0) > 0 && (
            <span className={`ml-auto flex items-center gap-0.5 text-[8px] font-bold ${
              urgency === 'high' ? 'text-red-500' : urgency === 'mid' ? 'text-amber-500' : 'text-green-600'
            }`}>
              <Users className="w-2.5 h-2.5" />
              {memberCount}/{maxMembers || 6}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          {prompts.slice(0, 2).map((p, i) => (
            <span key={i} className="px-1 py-0 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded text-[7px] font-medium truncate max-w-[60px]">
              {p}
            </span>
          ))}
          {prompts.length > 2 && (
            <span className="text-[7px] text-gray-300 dark:text-gray-600">+{prompts.length - 2}</span>
          )}
          {prompts.length === 0 && (
            <span className="text-[7px] text-gray-300 dark:text-gray-600">暂无标签</span>
          )}
        </div>
      </div>

      {/* ── 点赞数 ── */}
      {(likes ?? 0) > 0 && (
        <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 bg-black/25 rounded-full px-1.5 py-0.5">
          <Heart className="w-2 h-2 text-white/80" />
          <span className="text-[7px] text-white/80">{likes}</span>
        </div>
      )}
    </div>
  );
}
