import { useState } from 'react';
import { Mountain, Mail, Lock, User, Github } from 'lucide-react';
import { useStore } from '@/store';

export default function Login() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        if (!name.trim()) { setError('请输入昵称'); setLoading(false); return; }
        await register(email, password, name);
      }
    } catch (err: any) {
      setError(err.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  const handleGithub = () => {
    // GitHub OAuth redirect
    const clientId = 'Ov23liq85d6hBRbmCfOh';
    const redirectUri = window.location.origin;
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=user:email`;
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12" style={{ background: 'linear-gradient(180deg, #f0fdf4 0%, #faf7f2 50%, #fef3c7 100%)' }}>
      {/* Logo */}
      <div className="flex flex-col items-center mb-10">
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4 shadow-lg" style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
          <Mountain className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-800 tracking-tight">TrailMate</h1>
        <p className="text-sm text-gray-500 mt-1">找到志同道合的徒步伙伴</p>
      </div>

      {/* Form Card */}
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-6">
        {/* Tab Switch */}
        <div className="flex mb-6 bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => { setMode('login'); setError(''); }}
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${mode === 'login' ? 'bg-white shadow text-green-700' : 'text-gray-500'}`}
          >
            登录
          </button>
          <button
            onClick={() => { setMode('register'); setError(''); }}
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${mode === 'register' ? 'bg-white shadow text-green-700' : 'text-gray-500'}`}
          >
            注册
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="昵称"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition-all text-sm"
              />
            </div>
          )}
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="email"
              placeholder="邮箱"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition-all text-sm"
              required
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="password"
              placeholder="密码"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition-all text-sm"
              required
            />
          </div>

          {error && <p className="text-red-500 text-xs text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-all disabled:opacity-50 shadow-md shadow-green-200"
          >
            {loading ? '请稍候...' : mode === 'login' ? '登录' : '注册'}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center my-5">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="px-3 text-xs text-gray-400">或</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* GitHub Login */}
        <button
          onClick={handleGithub}
          className="w-full py-3 bg-gray-800 hover:bg-gray-900 text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2"
        >
          <Github className="w-5 h-5" />
          GitHub 登录
        </button>

        {/* Guest Mode */}
        <button
          onClick={() => { window.location.href = '/'; }}
          className="w-full py-3 mt-3 text-gray-500 hover:text-gray-700 text-sm font-medium transition-all"
        >
          以访客模式浏览
        </button>
      </div>
    </div>
  );
}
