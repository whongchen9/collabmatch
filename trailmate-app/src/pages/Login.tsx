import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Mountain, Mail, Lock, User, Github, ArrowLeft } from 'lucide-react';
import { useStore } from '@/store';
import { authApi } from '@/api';

export default function Login() {
  const { isLoggedIn, login, register } = useStore();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [githubClientId, setGithubClientId] = useState('');

  useEffect(() => {
    authApi.getConfig().then(config => {
      if (config.githubClientId) setGithubClientId(config.githubClientId);
    }).catch(() => {});
  }, []);

  // 已登录则跳转首页（必须在所有 hooks 之后）
  if (isLoggedIn) return <Navigate to="/" replace />;

  const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const validatePassword = (p: string) => p.length >= 6;
  const validateName = (n: string) => n.trim().length >= 2;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'forgot') {
      if (!validateEmail(email)) { setError('请输入有效的邮箱地址'); return; }
      setLoading(true);
      try {
        await authApi.forgotPassword(email);
        setForgotSent(true);
      } catch (err: any) {
        setError(err.message || '发送失败');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!validateEmail(email)) { setError('请输入有效的邮箱地址'); return; }
    if (!validatePassword(password)) { setError('密码至少6位'); return; }

    if (mode === 'register') {
      if (!validateName(name)) { setError('昵称至少2位'); return; }
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password, name);
      }
    } catch (err: any) {
      setError(err.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  const handleGithub = () => {
    const redirectUri = window.location.origin;
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${githubClientId}&redirect_uri=${redirectUri}&scope=user:email`;
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-[#faf7f2] dark:bg-gray-950" style={{ background: 'linear-gradient(180deg, #f0fdf4 0%, #faf7f2 50%, #fef3c7 100%)' }}>
      {/* Logo */}
      <div className="flex flex-col items-center mb-10">
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4 shadow-lg" style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
          <Mountain className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">TrailMate</h1>
        <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">找到志同道合的徒步伙伴</p>
      </div>

      {/* Form Card */}
      <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
        {/* Tab Switch */}
        {mode !== 'forgot' ? (
          <div className="flex mb-6 bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
            <button
              onClick={() => { setMode('login'); setError(''); }}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${mode === 'login' ? 'bg-white dark:bg-gray-600 shadow text-green-700 dark:text-green-400' : 'text-gray-500 dark:text-gray-300'}`}
            >
              登录
            </button>
            <button
              onClick={() => { setMode('register'); setError(''); }}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${mode === 'register' ? 'bg-white dark:bg-gray-600 shadow text-green-700 dark:text-green-400' : 'text-gray-500 dark:text-gray-300'}`}
            >
              注册
            </button>
          </div>
        ) : (
          <div className="mb-6">
            <button onClick={() => { setMode('login'); setError(''); setForgotSent(false); }} className="flex items-center gap-1 text-gray-500 dark:text-gray-300 text-sm mb-2">
              <ArrowLeft className="w-4 h-4" />返回登录
            </button>
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">忘记密码</h2>
            <p className="text-xs text-gray-400 dark:text-gray-400 mt-1">输入注册邮箱，我们将发送重置链接</p>
          </div>
        )}

        {mode === 'forgot' && forgotSent ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-50 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-gray-800 dark:text-gray-100 font-bold">重置链接已发送</p>
            <p className="text-gray-400 dark:text-gray-300 text-sm mt-2">请检查你的邮箱 {email}</p>
            <button
              onClick={() => { setMode('login'); setError(''); setForgotSent(false); }}
              className="mt-6 px-6 py-2 bg-green-600 text-white rounded-xl text-sm font-medium shadow-md shadow-green-200"
            >
              返回登录
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  placeholder="昵称（至少2位）"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition-all text-sm"
                />
              </div>
            )}
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
              <input
                type="email"
                placeholder="邮箱"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition-all text-sm"
                required
              />
            </div>
            {mode !== 'forgot' && (
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                <input
                  type="password"
                  placeholder="密码（至少6位）"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition-all text-sm"
                  required
                />
              </div>
            )}

            {error && <p className="text-red-500 text-xs text-center">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-all disabled:opacity-50 shadow-md shadow-green-200"
            >
              {loading ? '请稍候...' : mode === 'login' ? '登录' : mode === 'register' ? '注册' : '发送重置链接'}
            </button>
          </form>
        )}

        {/* 忘记密码链接 */}
        {mode === 'login' && (
          <div className="mt-3 text-center">
            <button
              onClick={() => { setMode('forgot'); setError(''); setForgotSent(false); }}
              className="text-xs text-gray-400 dark:text-gray-400 hover:text-green-600 transition-colors"
            >
              忘记密码？
            </button>
          </div>
        )}

        {/* Divider */}
        {mode !== 'forgot' && (
          <>
            <div className="flex items-center my-5">
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-600" />
              <span className="px-3 text-xs text-gray-400 dark:text-gray-400">或</span>
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-600" />
            </div>

            {/* GitHub Login */}
            <button
              onClick={handleGithub}
              className="w-full py-3 bg-gray-800 hover:bg-gray-900 text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <Github className="w-5 h-5" />
              GitHub 登录
            </button>

            {/* Guest Mode - local only, no backend required */}
            <button
              onClick={() => {
                const guestUser = {
                  id: 'guest-' + Date.now(),
                  name: '访客' + Math.random().toString(36).slice(2, 6),
                  email: '',
                  hikeFrequency: 'monthly1',
                  creditScore: 100,
                  hikeCount: 0,
                  totalDistance: 0,
                  emergencyContacts: [],
                  userPrompts: [],
                };
                const guestToken = 'guest_' + Date.now() + '_' + Math.random().toString(36).slice(2);
                localStorage.setItem('trailmate_token', guestToken);
                localStorage.setItem('trailmate_guest', JSON.stringify(guestUser));
                useStore.setState({ user: guestUser, isLoggedIn: true });
                window.dispatchEvent(new CustomEvent('toast', { detail: '正在使用访客模式，数据仅保存在本地' }));
              }}
              className="w-full py-3 mt-3 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 text-sm font-medium transition-all"
            >
              以访客模式浏览
            </button>
          </>
        )}
      </div>
    </div>
  );
}
