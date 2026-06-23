import { Navigation, Users, FileText, Image, AlertTriangle, LogOut } from 'lucide-react';

interface SidebarButtonsProps {
  sidebarPanel: string | null;
  onToggle: (panel: string | null) => void;
  memberCount: number;
  photoCount: number;
  hikeStatus: string;
  isLeader: boolean;
  onSOS: () => void;
  onLeave: () => void;
  closeAllModals: () => void;
  expanded: boolean;
}

export default function SidebarButtons({
  sidebarPanel, onToggle, memberCount, photoCount, hikeStatus, isLeader,
  onSOS, onLeave, closeAllModals, expanded,
}: SidebarButtonsProps) {
  if (!expanded) return null;

  const buttons = [
    { key: 'location', label: '位置', icon: Navigation },
    { key: 'members', label: '成员', icon: Users, badge: memberCount },
    { key: 'plan', label: '计划', icon: FileText },
    { key: 'photo', label: '相册', icon: Image, badge: photoCount || undefined },
  ];

  return (
    <div className="absolute right-3.5 top-[68px] z-20 flex flex-col items-center gap-1 p-1.5 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md rounded-2xl shadow-lg shadow-black/[0.04] dark:shadow-black/20">
      {buttons.map(({ key, label, icon: Icon, badge }) => (
        <button key={key} onClick={() => { closeAllModals(); onToggle(sidebarPanel === key ? null : key); }}
          title={label}
          className={`relative w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90 ${
            sidebarPanel === key
              ? 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400 shadow-sm'
              : 'text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300'
          }`}>
          <Icon className="w-[18px] h-[18px]" />
          {badge != null && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] bg-green-500 text-white rounded-full text-[8px] font-extrabold flex items-center justify-center leading-none">
              {badge}
            </span>
          )}
        </button>
      ))}
      <div className="w-6 h-px bg-gray-200 dark:bg-gray-700 my-1" />
      <button onClick={onSOS} title="紧急求救"
        className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600">
        <AlertTriangle className="w-[18px] h-[18px]" />
      </button>
      {hikeStatus !== 'hiking' && (
        <button onClick={onLeave} title="退出队伍"
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-red-500 dark:hover:text-red-400">
          <LogOut className="w-[18px] h-[18px]" />
        </button>
      )}
    </div>
  );
}
