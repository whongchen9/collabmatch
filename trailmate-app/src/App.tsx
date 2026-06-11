import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from '@/store';
import Login from '@/pages/Login';
import Home from '@/pages/Home';
import Teams from '@/pages/Teams';
import TeamChat from '@/pages/TeamChat';
import Profile from '@/pages/Profile';
import Notices from '@/pages/Notices';
import TabBar from '@/components/TabBar';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useStore();
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const { isLoggedIn, loadAll } = useStore();

  useEffect(() => {
    if (isLoggedIn) loadAll();
  }, [isLoggedIn, loadAll]);

  // Handle GitHub OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code && !isLoggedIn) {
      const { authApi } = require('@/api');
      authApi.githubLogin(code).then(({ token, user }) => {
        authApi.setToken(token);
        useStore.setState({ user, isLoggedIn: true });
        window.history.replaceState({}, '', '/');
      }).catch(console.error);
    }
  }, []);

  return (
    <Router>
      <div className="max-w-lg mx-auto min-h-screen relative">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<AuthGuard><Home /></AuthGuard>} />
          <Route path="/teams" element={<AuthGuard><Teams /></AuthGuard>} />
          <Route path="/team/:id" element={<AuthGuard><TeamChat /></AuthGuard>} />
          <Route path="/profile" element={<AuthGuard><Profile /></AuthGuard>} />
          <Route path="/notices" element={<AuthGuard><Notices /></AuthGuard>} />
        </Routes>
        {isLoggedIn && <TabBar />}
      </div>
    </Router>
  );
}
