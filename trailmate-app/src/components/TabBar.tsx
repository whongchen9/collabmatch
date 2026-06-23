import { useNavigate, useLocation } from 'react-router-dom';
import { Home, User, Compass, Users } from 'lucide-react';
import { useStore } from '@/store';
import { useT } from '@/i18n';

const tabs = [
  { path: '/', icon: Home, labelKey: 'tabbar.home' },
  { path: '/lobby', icon: Compass, labelKey: 'tabbar.routes' },
  { path: '/teams', icon: Users, labelKey: 'tabbar.teams' },
  { path: '/profile', icon: User, labelKey: 'tabbar.profile' },
];

export default function TabBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { groups } = useStore();
  const t = useT();

  /** 获取每个 tab 的角标数 */
  const getBadge = (path: string): number => {
    if (path === '/teams') return groups.length;
    return 0;
  };

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 z-50">
      <div className="flex items-center justify-around py-2 px-1">
        {tabs.map(({ path, icon: Icon, labelKey }) => {
          const isActive = location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
          const badge = getBadge(path);
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`relative flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-all ${
                isActive ? 'text-green-600' : 'text-gray-400 dark:text-gray-500'
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {badge > 0 && (
                    <span className="absolute -top-1 -right-2 min-w-[14px] h-[14px] rounded-full flex items-center justify-center text-[8px] font-extrabold text-white px-[3px] bg-green-600">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{t(labelKey)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
