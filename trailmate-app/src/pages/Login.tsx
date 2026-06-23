import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Mountain, Mail, Lock, User, Github, ArrowLeft } from 'lucide-react';
import { useStore } from '@/store';
import { authApi } from '@/api';
import { useT } from '@/i18n';

export default function Login() {
  const { isLoggedIn, login, register } = useStore();
  const t = useT();

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
      if (!validateEmail(email)) { setError(t('login.invalidEmail')); return; }
      setLoading(true);
      try {
        await authApi.forgotPassword(email);
        setForgotSent(true);
      } catch (err: unknown) {
        setError((err as Error).message || t('login.sendFailed'));
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!validateEmail(email)) { setError(t('login.invalidEmail')); return; }
    if (!validatePassword(password)) { setError(t('login.passwordTooShort')); return; }

    if (mode === 'register') {
      if (!validateName(name)) { setError(t('login.nameTooShort')); return; }
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password, name);
      }
    } catch (err: unknown) {
      setError((err as Error).message || t('login.operationFailed'));
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
        <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">{t('login.subtitle')}</p>
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
              {t('login.login')}
            </button>
            <button
              onClick={() => { setMode('register'); setError(''); }}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${mode === 'register' ? 'bg-white dark:bg-gray-600 shadow text-green-700 dark:text-green-400' : 'text-gray-500 dark:text-gray-300'}`}
            >
              {t('login.register')}
            </button>
          </div>
        ) : (
          <div className="mb-6">
            <button onClick={() => { setMode('login'); setError(''); setForgotSent(false); }} className="flex items-center gap-1 text-gray-500 dark:text-gray-300 text-sm mb-2">
              <ArrowLeft className="w-4 h-4" />{t('login.backToLogin')}
            </button>
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">{t('login.forgotPassword')}</h2>
            <p className="text-xs text-gray-400 dark:text-gray-400 mt-1">{t('login.inputEmailHint')}</p>
          </div>
        )}

        {mode === 'forgot' && forgotSent ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-50 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-gray-800 dark:text-gray-100 font-bold">{t('login.resetLinkSent')}</p>
            <p className="text-gray-400 dark:text-gray-300 text-sm mt-2">{t('login.checkEmail', { email })}</p>
            <button
              onClick={() => { setMode('login'); setError(''); setForgotSent(false); }}
              className="mt-6 px-6 py-2 bg-green-600 text-white rounded-xl text-sm font-medium shadow-md shadow-green-200"
            >
              {t('login.backToLogin')}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  placeholder={t('login.nickname')}
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
                placeholder={t('login.email')}
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
                  placeholder={t('login.password')}
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
              {loading ? t('login.pleaseWait') : mode === 'login' ? t('login.login') : mode === 'register' ? t('login.register') : t('login.sendResetLink')}
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
              {t('login.forgotPasswordQuestion')}
            </button>
          </div>
        )}

        {/* Divider */}
        {mode !== 'forgot' && (
          <>
            <div className="flex items-center my-5">
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-600" />
              <span className="px-3 text-xs text-gray-400 dark:text-gray-400">{t('login.or')}</span>
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-600" />
            </div>

            {/* GitHub Login */}
            <button
              onClick={handleGithub}
              className="w-full py-3 bg-gray-800 hover:bg-gray-900 text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <Github className="w-5 h-5" />
              {t('login.githubLogin')}
            </button>

            {/* Guest Mode - local only, no backend required */}
            <button
              onClick={() => {
                const guestUser = {
                  id: 'guest-' + Date.now(),
                  name: t('home.guest') + Math.random().toString(36).slice(2, 6),
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
                useStore.setState({ user: guestUser, isLoggedIn: true, isGuest: true });
                window.dispatchEvent(new CustomEvent('toast', { detail: t('login.guestToast') }));
              }}
              className="w-full py-3 mt-3 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 text-sm font-medium transition-all"
            >
              {t('login.guestMode')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
