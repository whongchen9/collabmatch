import { ArrowLeft, Play, Flag, Mountain, FileText, Share2, UserPlus, X } from 'lucide-react';
import type { Group } from '@/types';

interface ChatHeaderProps {
  group: Group;
  isLeader: boolean;
  isVisitor: boolean;
  hikeStatus: string;
  checkpoints: any[];
  checkedInCount: number;
  photos: string[];
  members: any[];
  went: boolean;
  showGoModal: boolean;
  showNoCheckpointModal: boolean;
  hikingActionLoading: boolean;
  showCheckpointGuide: boolean;
  onGo: () => void;
  onComplete: () => void;
  onDismissGuide: () => void;
  onNavigate: (path: string) => void;
  onGoBack: () => void;
  onApplyJoin: () => void;
  sidebarExpanded: boolean;
  onToggleSidebar: () => void;
  merging: boolean;
  showToast: (m: string) => void;
}

export default function ChatHeader({
  group, isLeader, isVisitor, hikeStatus, checkpoints, checkedInCount,
  photos, members, went, showGoModal, showNoCheckpointModal,
  hikingActionLoading, showCheckpointGuide,
  onGo, onComplete, onDismissGuide, onNavigate, onGoBack, onApplyJoin, sidebarExpanded, onToggleSidebar, merging, showToast,
}: ChatHeaderProps) {

  const statusLabel = hikeStatus === 'hiking' ? '征途中' : hikeStatus === 'completed' ? '已完成' : '等待出发';
  const progressPct = checkpoints.length > 0 ? Math.round((checkedInCount / checkpoints.length) * 100) : 0;

  return (
    <>
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-start gap-2.5 px-4 pt-4 pb-3">
          <button onClick={onGoBack} className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0 mt-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
            <ArrowLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-extrabold text-base text-gray-800 dark:text-gray-200 truncate">{group.name}</h1>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
              {members.length}位成员{group.essentials?.location ? ` · ${group.essentials.location}` : ''}{hikeStatus === 'idle' ? ` · ${statusLabel}` : ''}
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
            {isVisitor ? (
              <button onClick={onApplyJoin} disabled={merging}
                className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-[11px] font-extrabold flex items-center gap-1 shadow-sm disabled:opacity-50 transition-all active:scale-95">
                <UserPlus className="w-3 h-3" />{merging ? '申请中…' : '申请加入'}
              </button>
            ) : (
              <>
                {hikeStatus === 'idle' && isLeader && (
                  <button onClick={onGo}
                    disabled={went || showGoModal || showNoCheckpointModal || hikingActionLoading}
                    className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-[11px] font-extrabold flex items-center gap-1 shadow-sm disabled:opacity-50 transition-all active:scale-95">
                    <Play className="w-3 h-3" />{hikingActionLoading ? '出发中' : '出发'}
                  </button>
                )}
                {hikeStatus === 'idle' && !isLeader && (
                  <span className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-lg text-[11px] font-bold flex items-center gap-1">
                    <Play className="w-3 h-3" />等待出发
                  </span>
                )}
                {hikeStatus === 'hiking' && (
                  <button onClick={onComplete} disabled={hikingActionLoading}
                    className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-[11px] font-extrabold flex items-center gap-1 shadow-sm disabled:opacity-50 transition-all active:scale-95">
                    <Flag className="w-3 h-3" />{hikingActionLoading ? '完成中' : `完成 ${progressPct}%`}
                  </button>
                )}
              </>
            )}
            <button onClick={onToggleSidebar}
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-95 ${
                sidebarExpanded ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}>
              {sidebarExpanded ? <X className="w-4 h-4 text-gray-500 dark:text-gray-400" /> : <span className="text-base font-bold text-gray-400 dark:text-gray-500">⋯</span>}
            </button>
          </div>
        </div>
      </div>

      {showCheckpointGuide && isLeader && hikeStatus === 'idle' && checkpoints.length === 0 && (
        <div className="mx-4 mt-3 px-3 py-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 rounded-xl flex items-center gap-2">
          <span className="text-[10px] text-blue-600 dark:text-blue-400 flex-1">
            ⛰ 设置打卡点后就可以出发啦！点击右上角 📍 前往地图设置
          </span>
          <button onClick={onDismissGuide}
            className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-500 dark:text-blue-400 flex items-center justify-center text-[9px] shrink-0 hover:bg-blue-200 transition-colors">
            ✕
          </button>
        </div>
      )}

      {hikeStatus === 'hiking' && (
        <div className="mx-4 mt-3 bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-sm dark:shadow-gray-900/50 border-l-[3px] border-l-green-400">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-extrabold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <Mountain className="w-3.5 h-3.5 text-green-500" />征途中
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500">{checkedInCount}/{checkpoints.length} 打卡点</span>
              <div className="w-20 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mt-1">
                <div className="h-full bg-green-500 rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {hikeStatus === 'completed' && (
        <div className="mx-4 mt-3 bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-sm dark:shadow-gray-900/50 border-l-[3px] border-l-amber-400">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span className="text-xs font-extrabold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <Flag className="w-3.5 h-3.5 text-amber-500" />凯旋而归
              </span>
              <span className="text-[10px] text-gray-400 dark:text-gray-500">· 共计 {checkpoints.length} 个打卡点</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => onNavigate('/hike-log')}
                className="px-2.5 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-lg text-[10px] font-bold flex items-center gap-1 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                <FileText className="w-3 h-3" />查看日志
              </button>
              <button onClick={() => {
                const shareText = `🏔 刚在 TrailMate 完成了一场徒步！\n📍 ${group.essentials?.location || ''} · ${checkpoints.length} 个打卡点 · ${members.length} 人同行\n📸 ${photos.length} 张照片\n—— 来自 TrailMate 户外组队`;
                if (navigator.share) {
                  navigator.share({ title: 'TrailMate 徒步分享', text: shareText }).catch(() => {});
                } else {
                  navigator.clipboard.writeText(shareText).then(() => showToast('已复制分享文案')).catch(() => {});
                }
              }}
                className="px-2.5 py-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-lg text-[10px] font-bold flex items-center gap-1 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors">
                <Share2 className="w-3 h-3" />分享战绩
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
