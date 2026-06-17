import { useNavigate, useLocation } from 'react-router-dom';
import { Home, User, Compass, Bell } from 'lucide-react';

const tabs = [
  { path: '/', icon: Home, label: '首页' },
  { path: '/lobby', icon: Compass, label: '图鉴' },
  { path: '/notices', icon: Bell, label: '通知' },
  { path: '/profile', icon: User, label: '我的' },
];

export default function TabBar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 z-50 safe-area-bottom">
      <div className="flex items-center justify-around py-2 px-1">
        {tabs.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-all ${
                isActive ? 'text-green-600' : 'text-gray-400 dark:text-gray-500'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
