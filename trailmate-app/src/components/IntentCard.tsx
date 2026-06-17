import { useState } from 'react';
import { MapPin, Users, Heart, Mountain, Flag, Flame, Pencil, ChevronDown, ChevronUp, ToggleLeft, ToggleRight } from 'lucide-react';
import type { Intent } from '@/types';

interface IntentCardProps {
  intent: Intent;
  /** 是否已有关联队伍（传入 groupId 表示已组队） */
  groupId?: string;
  /** 点击卡片跳转 */
  onClick: () => void;
  /** 编辑意图 */
  onEdit?: () => void;
  /** 切换匹配开关 */
  onToggleMatch?: (enabled: boolean) => void;
  /** 匹配是否开启 */
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
}

const TAG_STYLES = [
  'bg-amber-50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800',
  'bg-purple-50 dark:bg-purple-900/10 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800',
  'bg-blue-50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800',
  'bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800',
];

function getTagColor(index: number) {
  return TAG_STYLES[index % TAG_STYLES.length];
}

export default function IntentCard({
  intent, groupId, onClick, onEdit, onToggleMatch,
  matchingEnabled, hikeStatus, hot, likes, memberCount, maxMembers,
}: IntentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const hasTeam = !!groupId;
  const title = intent.rawInput || '未命名意图';
  const location = intent.essentials?.location;
  const prompts = intent.prompts || [];
  const enabled = matchingEnabled ?? (intent.status === 'matching');
  const needPeople = (maxMembers || 6) - (memberCount || 0);
  const urgency = needPeople >= 3 ? 'high' : needPeople >= 2 ? 'mid' : 'low';

  return (
    <div
      className="shrink-0 w-[calc(33.333%-4px)] aspect-square rounded-xl shadow-sm dark:shadow-gray-900/50 border-2 border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col relative cursor-pointer"
    >
      {/* ── 主体图片区 ── */}
      <div onClick={onClick} className="flex-1 relative overflow-hidden">
        <div className="w-full h-full bg-gradient-to-b from-sky-200 to-emerald-200 dark:from-slate-700 dark:to-emerald-900/30" />
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

        {/* 标题 */}
        <h4 className="absolute bottom-1.5 left-2 right-2 text-[10px] font-bold text-white truncate drop-shadow-md">
          {title}
        </h4>
      </div>

      {/* ── 底部信息条 ── */}
      <div onClick={onClick} className="px-2 py-1.5 bg-white dark:bg-gray-800">
        <div className="flex items-center gap-1">
          <MapPin className="w-2 h-2 text-gray-300 dark:text-gray-600 shrink-0" />
          <span className="text-[8px] text-gray-400 dark:text-gray-500 truncate">
            {location || '待确定'}
          </span>
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
        </div>
      </div>

      {/* ── 右上角：匹配开关 + 编辑 ── */}
      <div className="absolute top-1 right-1 flex items-center gap-0.5">
        {onToggleMatch && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleMatch(!enabled); }}
            className="w-5 h-5 rounded-full bg-black/25 flex items-center justify-center hover:bg-black/35 transition-colors"
            title={enabled ? '关闭匹配' : '开启匹配'}
          >
            {enabled
              ? <ToggleRight className="w-3.5 h-3.5 text-green-400" />
              : <ToggleLeft className="w-3.5 h-3.5 text-white/60" />
            }
          </button>
        )}
        {onEdit && (
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="w-5 h-5 rounded-full bg-black/25 flex items-center justify-center hover:bg-black/35 transition-colors"
            title="编辑意图"
          >
            <Pencil className="w-3 h-3 text-white/80" />
          </button>
        )}
      </div>

      {/* ── 点赞数 ── */}
      {(likes ?? 0) > 0 && (
        <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 bg-black/25 rounded-full px-1.5 py-0.5" style={onToggleMatch || onEdit ? { top: '22px' } : {}}>
          <Heart className="w-2 h-2 text-white/80" />
          <span className="text-[7px] text-white/80">{likes}</span>
        </div>
      )}

      {/* ── 成员数 badge ── */}
      {(memberCount ?? 0) > 0 && (
        <div className={`absolute bottom-8 right-1.5 px-1.5 py-0.5 rounded-md text-[8px] font-bold flex items-center gap-0.5 ${
          urgency === 'high' ? 'bg-red-500/90 text-white' : urgency === 'mid' ? 'bg-amber-500/90 text-white' : 'bg-green-500/90 text-white'
        }`}>
          <Users className="w-2.5 h-2.5" />
          <span>{memberCount}/{maxMembers || 6}</span>
        </div>
      )}

      {/* ── 展开提示词（底部） ── */}
      {prompts.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0">
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="w-full h-5 bg-black/30 flex items-center justify-center gap-0.5 hover:bg-black/40 transition-colors"
          >
            <span className="text-[7px] text-white/70 font-bold">{expanded ? '收起' : `${prompts.length} 个提示词`}</span>
            {expanded
              ? <ChevronUp className="w-2.5 h-2.5 text-white/70" />
              : <ChevronDown className="w-2.5 h-2.5 text-white/70" />
            }
          </button>
          {expanded && (
            <div className="bg-black/60 backdrop-blur-sm p-1.5 flex flex-wrap gap-1 max-h-20 overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {prompts.map((p, i) => (
                <span key={i} className={`px-1.5 py-0.5 rounded text-[7px] font-bold ${getTagColor(i)}`}>
                  {p}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 组队状态角标 ── */}
      {hasTeam && (
        <div className="absolute top-0 left-0 w-0 h-0 border-t-[24px] border-t-green-500 border-r-[24px] border-r-transparent" />
      )}
    </div>
  );
}
