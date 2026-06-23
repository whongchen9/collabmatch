import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Bell, UserPlus, Info, ChevronRight, ToggleLeft, ToggleRight, LogOut, Cpu, ExternalLink, Copy, Key, Trash2, Sun, Moon, Globe } from 'lucide-react';
import { useStore } from '@/store';
import { usersApi, userLocationApi } from '@/api';
import { useTheme } from '@/hooks/useTheme';
import { useT, useLanguage, useI18n } from '@/i18n';

/** 开关按钮组件 */
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)} className="shrink-0">
      {value ? <ToggleRight className="w-8 h-8 text-green-600" /> : <ToggleLeft className="w-8 h-8 text-gray-300 dark:text-gray-600" />}
    </button>
  );
}

export default function Settings() {
  const navigate = useNavigate();
  const { logout, showToast, isGuest } = useStore();
  const { isDark, toggleTheme } = useTheme();
  const t = useT();
  const language = useLanguage();
  const setLanguage = useI18n((s) => s.setLanguage);

  // 从 localStorage 读取设置
  const [autoJoinEnabled, setAutoJoinEnabled] = useState(() => {
    try { return JSON.parse(localStorage.getItem('trailmate_auto_join') || '{}').enabled ?? true; } catch { return true; }
  });
  const [autoJoinThreshold, setAutoJoinThreshold] = useState(() => {
    try { return JSON.parse(localStorage.getItem('trailmate_auto_join') || '{}').threshold || 90; } catch { return 90; }
  });
  const [notifyMatch, setNotifyMatch] = useState(() => {
    try { return JSON.parse(localStorage.getItem('trailmate_notify') || '{}').match ?? true; } catch { return true; }
  });
  const [notifyTeam, setNotifyTeam] = useState(() => {
    try { return JSON.parse(localStorage.getItem('trailmate_notify') || '{}').team ?? true; } catch { return true; }
  });
  const [notifyChat, setNotifyChat] = useState(() => {
    try { return JSON.parse(localStorage.getItem('trailmate_notify') || '{}').chat ?? true; } catch { return true; }
  });
  const [showAbout, setShowAbout] = useState(false);
  const [showMcp, setShowMcp] = useState(false);
  const [apiToken, setApiToken] = useState('');
  const [tokenLoading, setTokenLoading] = useState(false);

  // Signal notification settings from localStorage
  const [notifyHelpEnabled, setNotifyHelpEnabled] = useState(() => {
    try { return JSON.parse(localStorage.getItem('trailmate_signal_settings') || '{}').notifyHelpEnabled ?? true; } catch { return true; }
  });
  const [notifySOSEnabled, setNotifySOSEnabled] = useState(() => {
    try { return JSON.parse(localStorage.getItem('trailmate_signal_settings') || '{}').notifySOSEnabled ?? true; } catch { return true; }
  });
  const [signalRange, setSignalRange] = useState(() => {
    try { return JSON.parse(localStorage.getItem('trailmate_signal_settings') || '{}').signalRange ?? 5; } catch { return 5; }
  });

  const saveSignalSettings = (key: string, value: unknown) => {
    const current = JSON.parse(localStorage.getItem('trailmate_signal_settings') || '{}');
    current[key] = value;
    localStorage.setItem('trailmate_signal_settings', JSON.stringify(current));
    userLocationApi.updateSettings(current).catch(() => {});
  };

  useEffect(() => {
    const settings = { match: notifyMatch, team: notifyTeam, chat: notifyChat };
    localStorage.setItem('trailmate_notify', JSON.stringify(settings));
    if (isGuest) return;
    usersApi.updateSettings({ notifySettings: settings }).catch(() => {});
  }, [notifyMatch, notifyTeam, notifyChat, isGuest]);

  useEffect(() => {
    localStorage.setItem('trailmate_auto_join', JSON.stringify({ enabled: autoJoinEnabled, threshold: autoJoinThreshold }));
  }, [autoJoinEnabled, autoJoinThreshold]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const features = language === 'en' ? [
    { icon: '🧭', title: 'One-Sentence Match', desc: 'Enter your desired route, time, and difficulty. AI matches you with like-minded hikers automatically.' },
    { icon: '🗺', title: 'Route Atlas', desc: '100+ classic hiking routes with stories, guides, and local food. Tap to match with teammates instantly.' },
    { icon: '📍', title: 'Real-time Location', desc: 'Auto GPS reporting after departure. See teammates on the map in real-time. Checkpoints and track recording supported.' },
    { icon: '🆘', title: 'Help / SOS', desc: 'Tap help (yellow) or SOS (red) on the map. Location shared with nearby online users within 5km.' },
    { icon: '⚡', title: 'Cultivation Levels', desc: 'Earn experience from hikes. Level up from Qi Refining to Immortal. Higher levels earn trust in matching.' },
    { icon: '🌗', title: 'Dark Mode', desc: 'Light/dark theme toggle. Easy on the eyes for night hiking.' },
  ] : [
    { icon: '🧭', title: '一句话匹配', desc: '输入你想去的路线、时间、难度，AI 自动匹配志同道合的徒友。不用翻帖子、不用加群，一句话就搞定。' },
    { icon: '🗺', title: '路线图鉴', desc: '收录全国 100+ 条经典徒步路线，含故事、攻略、当地美食。点击路线即可一键匹配队友。' },
    { icon: '📍', title: '实时位置共享', desc: '出发后自动上报 GPS 位置，队友在地图上实时可见。支持打卡点签到、GPS 轨迹记录。' },
    { icon: '🆘', title: '求助 / 求救', desc: '地图上点击求助（黄闪）或求救（红闪），位置实时共享给附近 5km 内的在线用户。' },
    { icon: '⚡', title: '修仙境界', desc: '完成徒步次数和里程积累修为，从练气期一路修炼到散仙。境界越高越能在匹配中获得信任。' },
    { icon: '🌗', title: '暗色模式', desc: '支持浅色/暗色主题切换，夜间徒步查看地图不刺眼。' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-16">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 px-4 py-3 flex items-center gap-3 border-b border-gray-100 dark:border-gray-700">
        <button onClick={() => navigate(-1)} className="text-gray-600 dark:text-gray-300"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-base font-bold text-gray-800 dark:text-gray-100">{t('settings.title')}</h1>
      </div>

      {/* 外观设置 */}
      <div className="mt-4 px-4">
        <h2 className="text-xs font-bold text-gray-400 dark:text-gray-400 mb-2 flex items-center gap-1">
          {isDark ? <Moon className="w-3 h-3" /> : <Sun className="w-3 h-3" />}{t('settings.appearance')}
        </h2>
        <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{t('settings.darkMode')}</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-400 mt-0.5">{isDark ? t('settings.darkModeOn') : t('settings.darkModeOff')}</p>
            </div>
            <Toggle value={isDark} onChange={toggleTheme} />
          </div>
        </div>
      </div>

      {/* 偏好设置（语言切换） */}
      <div className="mt-4 px-4">
        <h2 className="text-xs font-bold text-gray-400 dark:text-gray-400 mb-2 flex items-center gap-1">
          <Globe className="w-3 h-3" />{t('settings.preferences')}
        </h2>
        <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{t('settings.language')}</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{language === 'zh' ? '中文' : 'English'}</p>
            </div>
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setLanguage('zh')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${language === 'zh' ? 'bg-white dark:bg-gray-600 shadow text-green-700 dark:text-green-400' : 'text-gray-500 dark:text-gray-300'}`}
              >
                中文
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${language === 'en' ? 'bg-white dark:bg-gray-600 shadow text-green-700 dark:text-green-400' : 'text-gray-500 dark:text-gray-300'}`}
              >
                EN
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 匹配设置 */}
      <div className="mt-4 px-4">
        <h2 className="text-xs font-bold text-gray-400 dark:text-gray-400 mb-2 flex items-center gap-1"><UserPlus className="w-3 h-3" />{t('settings.matching')}</h2>
        <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 flex items-center justify-between border-b border-gray-50 dark:border-gray-700">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{t('settings.autoJoin')}</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-400 mt-0.5">{t('settings.autoJoinDesc')}</p>
            </div>
            <Toggle value={autoJoinEnabled} onChange={setAutoJoinEnabled} />
          </div>
          {autoJoinEnabled && (
            <div className="px-4 py-3 border-b border-gray-50 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-700 dark:text-gray-300">{t('settings.matchThreshold')}</p>
                <span className="text-sm font-bold text-green-600">{autoJoinThreshold}%</span>
              </div>
              <input type="range" min={60} max={100} step={5} value={autoJoinThreshold}
                onChange={e => setAutoJoinThreshold(Number(e.target.value))}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600" />
              <div className="flex justify-between mt-1">
                <span className="text-[9px] text-gray-300 dark:text-gray-600">60%</span>
                <span className="text-[9px] text-gray-300 dark:text-gray-600">100%</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 通知设置 */}
      <div className="mt-4 px-4">
        <h2 className="text-xs font-bold text-gray-400 dark:text-gray-400 mb-2 flex items-center gap-1"><Bell className="w-3 h-3" />{t('settings.notifications')}</h2>
        <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 flex items-center justify-between border-b border-gray-50 dark:border-gray-700">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{t('settings.matchNotify')}</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500">{t('settings.matchNotifyDesc')}</p>
            </div>
            <Toggle value={notifyMatch} onChange={setNotifyMatch} />
          </div>
          <div className="px-4 py-3 flex items-center justify-between border-b border-gray-50 dark:border-gray-700">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{t('settings.teamNotify')}</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500">{t('settings.teamNotifyDesc')}</p>
            </div>
            <Toggle value={notifyTeam} onChange={setNotifyTeam} />
          </div>
          <div className="px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{t('settings.chatNotify')}</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500">{t('settings.chatNotifyDesc')}</p>
            </div>
            <Toggle value={notifyChat} onChange={setNotifyChat} />
          </div>
        </div>
      </div>

      {/* 求助信号设置 */}
      <div className="mt-4 px-4">
        <h2 className="text-xs font-bold text-gray-400 dark:text-gray-400 mb-2 flex items-center gap-1"><Shield className="w-3 h-3" />{t('settings.signalSettings')}</h2>
        <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 flex items-center justify-between border-b border-gray-50 dark:border-gray-700">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{t('settings.helpNotify')}</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500">{t('settings.helpNotifyDesc')}</p>
            </div>
            <Toggle value={notifyHelpEnabled} onChange={(v) => { setNotifyHelpEnabled(v); saveSignalSettings('notifyHelpEnabled', v); }} />
          </div>
          <div className="px-4 py-3 flex items-center justify-between border-b border-gray-50 dark:border-gray-700">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{t('settings.sosNotify')}</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500">{t('settings.sosNotifyDesc')}</p>
            </div>
            <Toggle value={notifySOSEnabled} onChange={(v) => { setNotifySOSEnabled(v); saveSignalSettings('notifySOSEnabled', v); }} />
          </div>
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-700 dark:text-gray-300">{t('settings.signalRange')}</p>
              <span className="text-sm font-bold text-green-600">{signalRange} km</span>
            </div>
            <input type="range" min="1" max="10" step="1" value={signalRange}
              onChange={e => { const v = parseInt(e.target.value); setSignalRange(v); saveSignalSettings('signalRange', v); }}
              className="w-full accent-green-600" />
            <div className="flex justify-between mt-1">
              <span className="text-[9px] text-gray-300 dark:text-gray-600">1 km</span>
              <span className="text-[9px] text-gray-300 dark:text-gray-600">10 km</span>
            </div>
          </div>
        </div>
      </div>

      {/* 隐私与安全 */}
      <div className="mt-4 px-4">
        <h2 className="text-xs font-bold text-gray-400 dark:text-gray-400 mb-2 flex items-center gap-1"><Shield className="w-3 h-3" />{t('settings.privacySecurity')}</h2>
        <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm">
          <button onClick={() => navigate('/privacy-policy')} className="w-full px-4 py-3 flex items-center justify-between text-left border-b border-gray-50 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{t('settings.privacyPolicy')}</p>
            <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
          </button>
          <button onClick={() => navigate('/terms')} className="w-full px-4 py-3 flex items-center justify-between text-left border-b border-gray-50 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{t('settings.termsOfService')}</p>
            <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
          </button>
          <button onClick={() => navigate('/blocked-users')} className="w-full px-4 py-3 flex items-center justify-between text-left">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{t('settings.blockedUsers')}</p>
            <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
          </button>
        </div>
      </div>

      {/* 关于 */}
      <div className="mt-4 px-4">
        <h2 className="text-xs font-bold text-gray-400 dark:text-gray-400 mb-2 flex items-center gap-1"><Info className="w-3 h-3" />{t('settings.aboutTrailMate')}</h2>
        <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 flex items-center justify-between border-b border-gray-50 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{t('settings.version')}</p>
            <span className="text-xs text-gray-400 dark:text-gray-500">1.0.0</span>
          </div>
          <button onClick={() => navigate('/feedback')} className="w-full px-4 py-3 flex items-center justify-between border-b border-gray-50 dark:border-gray-700 text-left">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{t('settings.feedback')}</p>
            <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
          </button>
          <button onClick={() => setShowAbout(!showAbout)} className="w-full px-4 py-3 flex items-center justify-between border-b border-gray-50 dark:border-gray-700 text-left">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{t('settings.productIntro')}</p>
            <ChevronRight className={`w-4 h-4 text-gray-300 dark:text-gray-600 transition-transform ${showAbout ? 'rotate-90' : ''}`} />
          </button>
          <button onClick={() => setShowMcp(!showMcp)} className="w-full px-4 py-3 flex items-center justify-between text-left">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-green-600" />
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{t('settings.mcpDev')}</p>
            </div>
            <ChevronRight className={`w-4 h-4 text-gray-300 dark:text-gray-600 transition-transform ${showMcp ? 'rotate-90' : ''}`} />
          </button>
        </div>

        {/* 产品介绍 — 展开 */}
        {showAbout && (
          <div className="mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white text-sm">🥾</div>
              <div>
                <h3 className="text-sm font-black text-gray-800 dark:text-gray-200">TrailMate</h3>
                <p className="text-[10px] text-gray-400 dark:text-gray-500">{t('settings.tagline')}</p>
              </div>
            </div>
            {features.map((item, i) => (
              <div key={i} className="flex gap-2.5 items-start">
                <span className="text-lg shrink-0">{item.icon}</span>
                <div>
                  <h4 className="text-[12px] font-extrabold text-gray-700 dark:text-gray-300">{item.title}</h4>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-relaxed mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* MCP 开发者 — 展开 */}
        {showMcp && (
          <div className="mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 space-y-3">
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-green-600" />Model Context Protocol
            </h3>
            <p className="text-[11px] text-gray-500 dark:text-gray-300 leading-relaxed">
              {t('settings.mcpDesc')}
            </p>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 mb-1.5">{t('settings.availableTools')}</p>
              <div className="space-y-1.5">
                {['match_teammates','create_intent','list_groups','send_message','list_trails','check_safety','dissolve_team'].map(tool => (
                  <span key={tool} className="inline-block px-1.5 py-0.5 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded text-[9px] font-mono font-bold mr-1 mb-1">{tool}</span>
                ))}
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 mb-1.5">{t('settings.apiToken')}</p>
              {apiToken ? (
                <div className="space-y-2">
                  <div className="bg-gray-800 rounded-lg p-2.5 flex items-center gap-2">
                    <code className="text-[9px] text-green-400 font-mono flex-1 overflow-x-auto break-all">{apiToken}</code>
                    <button onClick={() => { navigator.clipboard.writeText(apiToken); showToast(t('settings.tokenCopied')); }} className="shrink-0 p-1 hover:bg-gray-700 rounded"><Copy className="w-3.5 h-3.5 text-gray-400" /></button>
                  </div>
                  <button onClick={async () => { setTokenLoading(true); try { await usersApi.revokeApiToken(); setApiToken(''); showToast(t('settings.tokenRevoked')); } catch { showToast(t('settings.revokeFailed')); } setTokenLoading(false); }} disabled={tokenLoading} className="flex items-center gap-1 text-[10px] text-red-500 font-medium"><Trash2 className="w-3 h-3" />{t('settings.revoke')}</button>
                </div>
              ) : (
                <button onClick={async () => { setTokenLoading(true); try { const { token } = await usersApi.generateApiToken(); setApiToken(token); showToast(t('settings.tokenGenerated')); } catch { showToast(t('settings.generateFailed')); } setTokenLoading(false); }} disabled={tokenLoading} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-[11px] font-bold">
                  <Key className="w-3 h-3" />{tokenLoading ? t('settings.generating') : t('settings.generateToken')}
                </button>
              )}
            </div>
            <a href="https://modelcontextprotocol.io" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[11px] text-green-600 font-medium">
              <ExternalLink className="w-3 h-3" />{t('settings.learnMcp')}
            </a>
          </div>
        )}
      </div>

      {/* 退出登录 */}
      <div className="mt-6 px-4 pb-8">
        <button onClick={handleLogout}
          className="w-full py-3 bg-white dark:bg-gray-800 rounded-xl text-red-500 font-medium text-sm shadow-sm active:scale-[0.98] transition-transform flex items-center justify-center gap-2">
          <LogOut className="w-4 h-4" />{t('settings.logout')}
        </button>
      </div>
    </div>
  );
}
