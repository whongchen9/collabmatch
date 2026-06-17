import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Bell, UserPlus, Info, ChevronRight, ToggleLeft, ToggleRight, LogOut, Cpu, ExternalLink, Copy, Key, Trash2, Siren, Sun, Moon } from 'lucide-react';
import { useStore } from '@/store';
import { usersApi } from '@/api';
import { useTheme } from '@/hooks/useTheme';

export default function Settings() {
  const navigate = useNavigate();
  const { user, logout, showToast } = useStore();
  const { isDark, toggleTheme } = useTheme();

  // 从 localStorage 读取设置
  const [autoJoinEnabled, setAutoJoinEnabled] = useState(() => {
    try { return JSON.parse(localStorage.getItem('trailmate_auto_join') || '{}').enabled || false; } catch { return false; }
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
  const [sosNotifyNearby, setSosNotifyNearby] = useState(true);
  const [showMcp, setShowMcp] = useState(false);
  const [apiToken, setApiToken] = useState('');
  const [tokenLoading, setTokenLoading] = useState(false);

  // 持久化通知设置到 localStorage + 后端
  useEffect(() => {
    const settings = { match: notifyMatch, team: notifyTeam, chat: notifyChat };
    localStorage.setItem('trailmate_notify', JSON.stringify(settings));
    // 异步同步到后端
    usersApi.updateSettings({ notifySettings: settings }).catch(() => {});
  }, [notifyMatch, notifyTeam, notifyChat]);

  // 保存自动进队设置到 localStorage
  useEffect(() => {
    localStorage.setItem('trailmate_auto_join', JSON.stringify({ enabled: autoJoinEnabled, threshold: autoJoinThreshold }));
  }, [autoJoinEnabled, autoJoinThreshold]);

  // 加载用户设置
  useEffect(() => {
    usersApi.getSettings().then(settings => {
      if (settings.sosNotifyNearby !== undefined) setSosNotifyNearby(settings.sosNotifyNearby);
    }).catch(() => {});
  }, []);

  // 保存 SOS 附近通知设置
  const toggleSosNotifyNearby = (v: boolean) => {
    setSosNotifyNearby(v);
    usersApi.updateSettings({ sosNotifyNearby: v }).catch(() => {});
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
    <button onClick={() => onChange(!value)} className="shrink-0">
      {value ? <ToggleRight className="w-8 h-8 text-green-600" /> : <ToggleLeft className="w-8 h-8 text-gray-300 dark:text-gray-600" />}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-16">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 px-4 py-3 flex items-center gap-3 border-b border-gray-100 dark:border-gray-700">
        <button onClick={() => navigate(-1)} className="text-gray-600 dark:text-gray-300"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-base font-bold text-gray-800 dark:text-gray-100">设置</h1>
      </div>

      {/* 外观设置 */}
      <div className="mt-4 px-4">
        <h2 className="text-xs font-bold text-gray-400 dark:text-gray-400 mb-2 flex items-center gap-1">
          {isDark ? <Moon className="w-3 h-3" /> : <Sun className="w-3 h-3" />}外观设置
        </h2>
        <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100">暗色模式</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-400 mt-0.5">{isDark ? '深色主题已启用' : '使用浅色主题'}</p>
            </div>
            <Toggle value={isDark} onChange={toggleTheme} />
          </div>
        </div>
      </div>

      {/* 匹配设置 */}
      <div className="mt-4 px-4">
        <h2 className="text-xs font-bold text-gray-400 dark:text-gray-400 mb-2 flex items-center gap-1"><UserPlus className="w-3 h-3" />匹配设置</h2>
        <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 flex items-center justify-between border-b border-gray-50 dark:border-gray-700">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100">自动进队</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-400 mt-0.5">匹配度达到阈值时，队友无需邀请直接进队</p>
            </div>
            <Toggle value={autoJoinEnabled} onChange={setAutoJoinEnabled} />
          </div>
          {autoJoinEnabled && (
            <div className="px-4 py-3 border-b border-gray-50 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-700 dark:text-gray-300">匹配度阈值</p>
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
        <h2 className="text-xs font-bold text-gray-400 dark:text-gray-400 mb-2 flex items-center gap-1"><Bell className="w-3 h-3" />通知设置</h2>
        <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 flex items-center justify-between border-b border-gray-50 dark:border-gray-700">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100">匹配通知</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500">有新匹配时通知我</p>
            </div>
            <Toggle value={notifyMatch} onChange={setNotifyMatch} />
          </div>
          <div className="px-4 py-3 flex items-center justify-between border-b border-gray-50 dark:border-gray-700">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100">队伍通知</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500">队伍状态变更时通知我</p>
            </div>
            <Toggle value={notifyTeam} onChange={setNotifyTeam} />
          </div>
          <div className="px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100">聊天通知</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500">收到新消息时通知我</p>
            </div>
            <Toggle value={notifyChat} onChange={setNotifyChat} />
          </div>
        </div>
      </div>

      {/* 安全设置 */}
      <div className="mt-4 px-4">
        <h2 className="text-xs font-bold text-gray-400 dark:text-gray-400 mb-2 flex items-center gap-1"><Siren className="w-3 h-3" />安全设置</h2>
        <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100">接收附近求救通知</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500">接收 1 公里范围内其他用户发起的紧急求助</p>
            </div>
            <Toggle value={sosNotifyNearby} onChange={toggleSosNotifyNearby} />
          </div>
        </div>
      </div>

      {/* 隐私与安全 */}
      <div className="mt-4 px-4">
        <h2 className="text-xs font-bold text-gray-400 dark:text-gray-400 mb-2 flex items-center gap-1"><Shield className="w-3 h-3" />隐私与安全</h2>
        <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm">
          <button onClick={() => navigate('/profile')} className="w-full px-4 py-3 flex items-center justify-between border-b border-gray-50 dark:border-gray-700 text-left">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-100">个人资料</p>
            <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
          </button>
          <button onClick={() => navigate('/profile')} className="w-full px-4 py-3 flex items-center justify-between border-b border-gray-50 dark:border-gray-700 text-left">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-100">紧急联系人</p>
            <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
          </button>
          <button onClick={() => navigate('/privacy-policy')} className="w-full px-4 py-3 flex items-center justify-between text-left">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-100">隐私政策</p>
            <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
          </button>
        </div>
      </div>

      {/* 关于 */}
      <div className="mt-4 px-4">
        <h2 className="text-xs font-bold text-gray-400 dark:text-gray-400 mb-2 flex items-center gap-1"><Info className="w-3 h-3" />关于</h2>
        <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 flex items-center justify-between border-b border-gray-50 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-100">版本</p>
            <span className="text-xs text-gray-400 dark:text-gray-500">1.0.0</span>
          </div>
          <button onClick={() => navigate('/feedback')} className="w-full px-4 py-3 flex items-center justify-between border-b border-gray-50 dark:border-gray-700 text-left">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-100">意见反馈</p>
            <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
          </button>
          <button onClick={() => setShowMcp(!showMcp)} className="w-full px-4 py-3 flex items-center justify-between text-left">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-green-600" />
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100">MCP 开发者</p>
            </div>
            <ChevronRight className={`w-4 h-4 text-gray-300 dark:text-gray-600 transition-transform ${showMcp ? 'rotate-90' : ''}`} />
          </button>
        </div>
        {showMcp && (
          <div className="mt-2 bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm dark:shadow-gray-900/50 p-4 space-y-3">
            <div>
              <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-green-600" />Model Context Protocol
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-300 mt-1 leading-relaxed">
                TrailMate 支持 MCP（Model Context Protocol），允许 AI 助手通过标准化协议接入平台能力，实现智能匹配、队伍管理等功能的自动化调用。
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 mb-1.5">可用工具</p>
              <div className="space-y-1.5">
                {[
                  { name: 'match_teammates', desc: '根据提示词匹配队友' },
                  { name: 'create_intent', desc: '创建匹配意图' },
                  { name: 'list_groups', desc: '查看我的队伍' },
                  { name: 'get_group_detail', desc: '获取队伍详情（成员/打卡/照片）' },
                  { name: 'send_message', desc: '发送队伍消息' },
                  { name: 'list_trails', desc: '获取活动日志' },
                  { name: 'check_safety', desc: '查看队伍SOS求救状态' },
                  { name: 'dissolve_team', desc: '解散队伍并迭代匹配' },
                ].map(tool => (
                  <div key={tool.name} className="flex items-start gap-2">
                    <span className="px-1.5 py-0 bg-green-100 text-green-700 rounded text-[9px] font-mono font-bold shrink-0">{tool.name}</span>
                    <span className="text-[10px] text-gray-500 dark:text-gray-300">{tool.desc}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 mb-1.5">API Token</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-300 leading-relaxed mb-2">
                生成 API Token 用于 MCP 客户端认证，请妥善保管。
              </p>
              {apiToken ? (
                <div className="space-y-2">
                  <div className="bg-gray-800 rounded-lg p-2.5 flex items-center gap-2">
                    <code className="text-[9px] text-green-400 font-mono flex-1 overflow-x-auto break-all">{apiToken}</code>
                    <button onClick={() => { navigator.clipboard.writeText(apiToken); showToast('已复制到剪贴板'); }}
                      className="shrink-0 p-1 hover:bg-gray-700 rounded">
                      <Copy className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                    </button>
                  </div>
                  <button onClick={async () => {
                    setTokenLoading(true);
                    try { await usersApi.revokeApiToken(); setApiToken(''); showToast('Token 已撤销'); } catch { showToast('撤销失败'); }
                    setTokenLoading(false);
                  }} disabled={tokenLoading}
                    className="flex items-center gap-1 text-[10px] text-red-500 font-medium">
                    <Trash2 className="w-3 h-3" />撤销 Token
                  </button>
                </div>
              ) : (
                <button onClick={async () => {
                  setTokenLoading(true);
                  try { const { token } = await usersApi.generateApiToken(); setApiToken(token); showToast('Token 已生成，请妥善保管'); } catch { showToast('生成失败'); }
                  setTokenLoading(false);
                }} disabled={tokenLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-[11px] font-bold active:scale-95">
                  <Key className="w-3 h-3" />{tokenLoading ? '生成中...' : '生成 API Token'}
                </button>
              )}
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 mb-1.5">接入方式</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-300 leading-relaxed">
                在 MCP 客户端（如 Claude Desktop、Cursor）中配置 TrailMate MCP Server，使用 API Token 认证即可调用上述工具。
              </p>
              <div className="mt-2 bg-gray-800 rounded-lg p-2.5">
                <pre className="text-[9px] text-green-400 font-mono overflow-x-auto">{`{
  "mcpServers": {
    "trailmate": {
      "command": "npx",
      "args": ["-y", "trailmate-mcp"],
      "env": {
        "TRAILMATE_API_URL": "${window.location.hostname.includes('tcloudbaseapp.com') ? 'https://cloudbase-d6g8yog0ub3e56efe.service.tcloudbase.com/api' : window.location.origin + '/api'}",
        "TRAILMATE_API_TOKEN": "${apiToken || 'your-token'}"
      }
    }
  }
}`}</pre>
              </div>
            </div>
            <a href="https://modelcontextprotocol.io" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] text-green-600 font-medium">
              <ExternalLink className="w-3 h-3" />了解 MCP 协议
            </a>
          </div>
        )}
      </div>

      {/* 退出登录 */}
      <div className="mt-6 px-4 pb-8">
        <button onClick={handleLogout}
          className="w-full py-3 bg-white dark:bg-gray-800 rounded-xl text-red-500 font-medium text-sm shadow-sm active:scale-[0.98] transition-transform flex items-center justify-center gap-2">
          <LogOut className="w-4 h-4" />退出登录
        </button>
      </div>
    </div>
  );
}
