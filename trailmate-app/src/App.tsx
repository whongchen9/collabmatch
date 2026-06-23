import { useEffect, useState, useRef } from 'react';
import { BrowserRouter as Router, Routes as RouterRoutes, Route, Navigate, useLocation } from 'react-router-dom';
import { useStore } from '@/store';
import Login from '@/pages/Login';
import Home from '@/pages/Home';
import Teams from '@/pages/Teams';
import TeamChat from '@/pages/TeamChat';
import Profile from '@/pages/Profile';
import Notices from '@/pages/Notices';
import Settings from '@/pages/Settings';
import HikeLog from '@/pages/HikeLog';
import LocationMap from '@/pages/LocationMap';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import Feedback from '@/pages/Feedback';
import Lobby from '@/pages/Lobby';
import RouteGuide from '@/pages/RouteGuide';
import RouteDetail from '@/pages/RouteDetail';
import TermsOfService from '@/pages/TermsOfService';
import BlockedUsers from '@/pages/BlockedUsers';
import TabBar from '@/components/TabBar';
import { CheckCircle } from 'lucide-react';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useStore();
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function GlobalToast() {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'success' | 'error'>('success');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const msg = typeof detail === 'string' ? detail : detail?.message || '';
      const t = typeof detail === 'object' && detail?.type === 'error' ? 'error' : 'success';
      setMessage(msg);
      setType(t);
      setVisible(true);
      // 清除前一个定时器，避免快速连续触发时提前关闭后续 toast
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setVisible(false), 2500);
    };
    window.addEventListener('toast', handler);
    return () => {
      window.removeEventListener('toast', handler);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] max-w-lg w-[90%] animate-slideDown">
      <div className={`rounded-xl px-4 py-3 shadow-lg dark:shadow-gray-900/50 flex items-center gap-2 ${type === 'error' ? 'bg-red-600 text-white' : 'bg-gray-800 text-white'}`}>
        <CheckCircle className={`w-4 h-4 shrink-0 ${type === 'error' ? 'text-red-200' : 'text-green-400'}`} />
        <span className="text-sm">{message}</span>
      </div>
    </div>
  );
}

function AppContent() {
  const { isLoggedIn, loadAll } = useStore();
  const location = useLocation();
  const hideTabBarPaths = ['/team/', '/login', '/settings', '/hike-log', '/location/', '/privacy-policy', '/terms', '/blocked-users', '/feedback', '/route/'];
  // 使用精确匹配避免 /team-xxx 误匹配 /team/
  const showTabBar = isLoggedIn && !hideTabBarPaths.some(p => p.endsWith('/') ? location.pathname.startsWith(p) : location.pathname === p);

  useEffect(() => {
    if (!isLoggedIn) return;
    const guestData = localStorage.getItem('trailmate_guest');
    if (guestData) {
      // 访客模式：guest 键存储的是 JSON 用户对象
      try {
        const guestUser = JSON.parse(guestData);
        if (guestUser && !useStore.getState().user) {
          useStore.setState({ user: guestUser });
        }
      } catch {
        // ignore
      }
    } else {
      loadAll();
    }
  }, [isLoggedIn, loadAll]);

  // Handle GitHub OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (!code) return;
    // 使用 ref 引用最新的 isLoggedIn，避免闭包过期
    if (useStore.getState().isLoggedIn) {
      window.history.replaceState({}, '', '/');
      return;
    }
    import('@/api').then(({ authApi }) => {
      authApi.githubLogin(code).then(({ token, user }) => {
        authApi.setToken(token);
        useStore.setState({ user, isLoggedIn: true });
        window.history.replaceState({}, '', '/');
      }).catch((e) => {
        window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'GitHub 登录失败：' + (e instanceof Error ? e.message : '请重试'), type: 'error' } }));
      });
    });
  }, []);

  // Handle 401 unauthorized
  useEffect(() => {
    const handler = () => {
      useStore.setState({ user: null, isLoggedIn: false, isGuest: false });
      window.dispatchEvent(new CustomEvent('toast', { detail: { message: '登录已过期，请重新登录', type: 'error' } }));
    };
    window.addEventListener('unauthorized', handler);
    return () => window.removeEventListener('unauthorized', handler);
  }, []);

  return (
    <div className="max-w-lg mx-auto min-h-screen relative bg-gray-50 dark:bg-gray-800/50">
      <GlobalToast />
      <RouterRoutes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<AuthGuard><Home /></AuthGuard>} />
        <Route path="/lobby" element={<AuthGuard><Lobby /></AuthGuard>} />
        <Route path="/teams" element={<AuthGuard><Teams /></AuthGuard>} />
        <Route path="/team/:id" element={<AuthGuard><TeamChat /></AuthGuard>} />
        <Route path="/profile" element={<AuthGuard><Profile /></AuthGuard>} />
        <Route path="/notices" element={<AuthGuard><Notices /></AuthGuard>} />
        <Route path="/settings" element={<AuthGuard><Settings /></AuthGuard>} />
        <Route path="/hike-log" element={<AuthGuard><HikeLog /></AuthGuard>} />
        <Route path="/hike-log/:userId" element={<AuthGuard><HikeLog /></AuthGuard>} />
        <Route path="/location/:id" element={<AuthGuard><LocationMap /></AuthGuard>} />
        <Route path="/privacy-policy" element={<AuthGuard><PrivacyPolicy /></AuthGuard>} />
        <Route path="/terms" element={<AuthGuard><TermsOfService /></AuthGuard>} />
        <Route path="/blocked-users" element={<AuthGuard><BlockedUsers /></AuthGuard>} />
        <Route path="/feedback" element={<AuthGuard><Feedback /></AuthGuard>} />
        <Route path="/route-guide" element={<AuthGuard><RouteGuide /></AuthGuard>} />
        <Route path="/route/:id" element={<AuthGuard><RouteDetail /></AuthGuard>} />
      </RouterRoutes>
      {showTabBar && <TabBar />}
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
