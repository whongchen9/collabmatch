import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, LogOut, Plus, Trash2, Save, Camera, MapPin, Sparkles, Wrench, X, Navigation, Share2, Settings, Mountain, Users, Award, Leaf, Phone, Shield, BookOpen, Star, Clock } from 'lucide-react';
import { useStore } from '@/store';
import { usersApi, groupsApi, gamificationApi, teamRankApi, personalityApi } from '@/api';
import type { GamificationRank, GamificationRealm, GamificationTitle, MountainCodex, TeamRankInfo, TrailPersonality } from '@/api';


export default function Profile() {
  const navigate = useNavigate();
  const { user, logout, isLoggedIn, showToast } = useStore();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || '',
    city: user?.city || '',
    bio: user?.bio || '',
  });
  const [resources, setResources] = useState<string[]>(user?.resources?.map(r => typeof r === 'string' ? r : r.text) || []);
  const [showAddResource, setShowAddResource] = useState(false);
  const [newResText, setResText] = useState('');
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<{ hikeCount: number; totalDistance: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [myGroups, setMyGroups] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 游戏化数据
  const [gamiData, setGamiData] = useState<{
    rank: GamificationRank | null;
    realm: GamificationRealm | null;
    titles: GamificationTitle[];
    allTitles: GamificationTitle[];
    codex: MountainCodex[];
    stats: { totalCheckins: number; uniqueLocations: number; totalHikes: number };
  } | null>(null);
  const [showCodex, setShowCodex] = useState(false);
  const [showTitles, setShowTitles] = useState(false);
  const [bestTeamRank, setBestTeamRank] = useState<TeamRankInfo | null>(null);
  const [myPersonality, setMyPersonality] = useState<TrailPersonality | null>(null);

  // 紧急联系人本地状态
  const [emergencyContacts, setEmergencyContacts] = useState<{ name: string; phone: string }[]>([]);

  // 当 user 数据加载完成后同步表单
  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        city: user.city || '',
        bio: user.bio || '',
      });
      setResources(user.resources?.map((r: any) => typeof r === 'string' ? r : r.text) || []);
      setEmergencyContacts(user.emergencyContacts || []);
    }
  }, [user]);

  const isGuest = !!localStorage.getItem('trailmate_guest');

  useEffect(() => {
    if (isGuest) return;
    usersApi.getStats().then(setStats).catch(() => {});
  }, []);

  useEffect(() => {
    if (isGuest) return;
    gamificationApi.me().then(setGamiData).catch(() => {});
    teamRankApi.me().then(res => { if (res.bestRank) setBestTeamRank(res.bestRank.rank); }).catch(() => {});
    // 从 user 对象读取人格
    const PERSONALITY_MAP: Record<string, TrailPersonality> = {
      navigator: { key: 'navigator', name: '领航者', emoji: '🦅', desc: '带领节奏、找路', color: '#3b82f6' },
      enjoyer: { key: 'enjoyer', name: '享受者', emoji: '🐢', desc: '慢行拍照、不赶时间', color: '#10b981' },
      socializer: { key: 'socializer', name: '社交者', emoji: '🦊', desc: '聊天为主、徒步为辅', color: '#f59e0b' },
      challenger: { key: 'challenger', name: '挑战者', emoji: '🐺', desc: '追求速度、极限路线', color: '#ef4444' },
    };
    if ((user as any)?.personality) setMyPersonality(PERSONALITY_MAP[(user as any).personality] || null);
  }, []);

  useEffect(() => {
    if (isGuest) return;
    groupsApi.list().then(groups => {
      const mine = groups.filter(g => (g.members || []).some((m: any) => (m.id || m) === user?.id));
      setMyGroups(mine);
    }).catch(() => {});
  }, [user]);

  if (!user) {
    if (isLoggedIn) {
      return <div className="flex items-center justify-center h-screen bg-[#faf7f2] dark:bg-gray-950">
        <div className="text-center"><div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" /><p className="text-gray-400 dark:text-gray-500 text-sm">加载中...</p></div>
      </div>;
    }
    return <div className="flex items-center justify-center h-screen bg-[#faf7f2] dark:bg-gray-950"><p className="text-gray-400 dark:text-gray-500">请先登录</p></div>;
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      await usersApi.updateProfile({ ...form, resources: resources.map(text => ({ text })) });
      // 保存紧急联系人
      await usersApi.updateEmergencyContacts(emergencyContacts);
      await useStore.getState().loadUser();
      setEditing(false);
    } catch (err: any) {
      showToast(err.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleAvatarClick = () => {
    if (!editing) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      // 转 base64
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      // 上传
      const { url } = await usersApi.uploadImage(base64, file.name);
      // 更新头像
      await usersApi.updateAvatar(url);
      await useStore.getState().loadUser();
    } catch (err: any) {
      showToast(err.message || '头像上传失败');
    } finally {
      setUploading(false);
      // 清空 input 以便再次选择同一文件
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const addResource = () => {
    if (!newResText.trim()) return;
    setResources([...resources, newResText.trim()]);
    setResText('');
    setShowAddResource(false);
  };

  const addEmergencyContact = () => {
    setEmergencyContacts([...emergencyContacts, { name: '', phone: '' }]);
  };

  const updateEmergencyContact = (index: number, field: 'name' | 'phone', value: string) => {
    setEmergencyContacts(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const removeEmergencyContact = (index: number) => {
    setEmergencyContacts(prev => prev.filter((_, i) => i !== index));
  };

  const displayStats = stats || { hikeCount: user.hikeCount || 0, totalDistance: user.totalDistance || 0 };

  return (
    <div className="pb-24 min-h-screen bg-[#faf7f2] dark:bg-gray-950">
      <div className="px-5 pt-6 pb-4 bg-white dark:bg-gray-900 sticky top-0 z-10 shadow-sm dark:shadow-gray-900/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-gray-500 dark:text-gray-400"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-200">个人中心</h1>
        </div>
        {editing ? (
          <button onClick={handleSave} disabled={saving || isGuest} className="flex items-center gap-1 text-green-600 text-sm font-medium disabled:opacity-50">
            <Save className="w-4 h-4" />{saving ? '保存中...' : '保存'}
          </button>
        ) : (
          <button onClick={() => !isGuest && setEditing(true)} className={`text-sm font-medium ${isGuest ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' : 'text-green-600'}`}>
            {isGuest ? '编辑（需登录）' : '编辑'}
          </button>
        )}
      </div>

      {/* 访客模式横幅 */}
      {isGuest && (
        <div className="mx-5 mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LogOut className="w-4 h-4 text-amber-600" />
            <span className="text-xs text-amber-700 dark:text-amber-300 font-medium">访客模式 · 数据仅保存在本地</span>
          </div>
          <button onClick={handleLogout}
            className="px-3 py-1 bg-amber-500 text-white rounded-lg text-[11px] font-bold active:scale-95">
            退出登录
          </button>
        </div>
      )}

      <div className="px-5 mt-4 space-y-4">
        {/* Avatar & Name */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm dark:shadow-gray-900/50 p-4">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white overflow-hidden ${editing ? 'cursor-pointer' : ''}`}
                style={{ background: user.avatarUrl ? 'transparent' : (user.avatarColor || 'linear-gradient(135deg, #4ade80, #16a34a)') }}
                onClick={handleAvatarClick}
              >
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  user.name?.[0] || '?'
                )}
              </div>
              {editing && (
                <div
                  className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center cursor-pointer"
                  onClick={handleAvatarClick}
                >
                  {uploading ? (
                    <div className="w-2.5 h-2.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Camera className="w-2.5 h-2.5 text-white" />
                  )}
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
            <div className="flex-1 min-w-0 flex items-center justify-between">
              <div className="min-w-0 flex-1">
                {editing ? (
                  <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    className="text-base font-bold text-gray-800 dark:text-gray-200 outline-none border-b border-green-500 pb-0.5 w-full" />
                ) : (
                  <h2 className="text-base font-bold text-gray-800 dark:text-gray-200 truncate">{user.name}</h2>
                )}
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 truncate">{user.email || ''}</p>
                {/* 段位/境界/人格徽章横排 */}
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {myPersonality && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-300 border border-purple-100 dark:border-purple-800">
                      <span className="text-xs">{myPersonality.emoji || '🦅'}</span>{myPersonality.name}
                    </span>
                  )}
                  {bestTeamRank && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-300 border border-amber-100 dark:border-amber-800">
                      🏆 {bestTeamRank.name}
                    </span>
                  )}
                  {gamiData?.realm && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-300 border border-green-100 dark:border-green-800">
                      ⚡ {gamiData.realm.name} · {gamiData.realm.stability}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bio */}
        {editing && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm dark:shadow-gray-900/50 p-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">常驻城市</label>
              <input type="text" value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
                placeholder="例如：深圳" className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 text-sm outline-none focus:border-green-500" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">自我介绍</label>
              <textarea
                value={form.bio}
                onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
                placeholder="介绍一下自己吧..."
                rows={3}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 text-sm outline-none focus:border-green-500 resize-none"
              />
            </div>
          </div>
        )}
        {!editing && user.bio && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm dark:shadow-gray-900/50 p-4">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">自我介绍</label>
            <p className="text-sm text-gray-600 dark:text-gray-400">{user.bio}</p>
          </div>
        )}
        {!editing && user.city && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm dark:shadow-gray-900/50 p-4 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
            <span className="text-sm text-gray-600 dark:text-gray-400">{user.city}</span>
          </div>
        )}

        {/* 称号墙 + 山志图鉴入口 */}
        {gamiData && (
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setShowTitles(true)}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm dark:shadow-gray-900/50 p-4 text-left active:scale-[0.98] transition-transform">
              <div className="flex items-center gap-1.5 mb-2">
                <Star className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">称号墙</span>
              </div>
              <p className="text-2xl font-black text-amber-600">{gamiData.titles.length}</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500">已解锁 / {gamiData.allTitles.length}个</p>
            </button>
            <button onClick={() => setShowCodex(true)}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm dark:shadow-gray-900/50 p-4 text-left active:scale-[0.98] transition-transform">
              <div className="flex items-center gap-1.5 mb-2">
                <BookOpen className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">山志图鉴</span>
              </div>
              <p className="text-2xl font-black text-emerald-600">{gamiData.codex.filter(c => c.unlocked).length}</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500">已解锁 / {gamiData.codex.length}座</p>
            </button>
          </div>
        )}

        {/* 称号墙弹窗 */}
        {showTitles && gamiData && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center" onClick={() => setShowTitles(false)}>
            <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-t-3xl max-h-[80vh] overflow-y-auto p-5 pb-8" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">称号墙</h2>
                <button onClick={() => setShowTitles(false)} className="text-gray-400"><X className="w-5 h-5" /></button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {gamiData.allTitles.map(title => {
                  const unlocked = gamiData.titles.some(t => t.id === title.id);
                  return (
                    <div key={title.id} className={`p-3 rounded-xl border ${unlocked ? 'bg-gradient-to-br from-amber-100 to-yellow-200 dark:from-amber-900/30 dark:to-yellow-800/30 border-amber-200 dark:border-amber-800' : 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-800 opacity-50'}`}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-sm">{unlocked ? '✦' : '✧'}</span>
                        <span className={`text-xs font-bold ${unlocked ? 'text-amber-700 dark:text-amber-300' : 'text-gray-400'}`}>{title.name}</span>
                      </div>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500">{title.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 山志图鉴弹窗 */}
        {showCodex && gamiData && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center" onClick={() => setShowCodex(false)}>
            <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-t-3xl max-h-[80vh] overflow-y-auto p-5 pb-8" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">山志图鉴</h2>
                <button onClick={() => setShowCodex(false)} className="text-gray-400"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-2">
                {gamiData.codex.map(mountain => (
                  <div key={mountain.id} className={`p-3 rounded-xl border ${mountain.unlocked ? 'bg-gradient-to-br from-emerald-100 to-green-200 dark:from-emerald-900/30 dark:to-green-800/30 border-emerald-200 dark:border-emerald-800' : 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-800'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Mountain className={`w-4 h-4 ${mountain.unlocked ? 'text-emerald-600' : 'text-gray-300'}`} />
                        <span className={`text-sm font-bold ${mountain.unlocked ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-400'}`}>{mountain.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-gray-400">
                        <span>{mountain.elevation}m</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${
                          mountain.difficulty === 'casual' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' :
                          mountain.difficulty === 'moderate' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                          mountain.difficulty === 'advanced' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                          'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
                        }`}>
                          {mountain.difficulty === 'casual' ? '休闲' : mountain.difficulty === 'moderate' ? '中等' : mountain.difficulty === 'advanced' ? '困难' : '挑战'}
                        </span>
                      </div>
                    </div>
                    {mountain.unlocked ? (
                      <>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-1.5">{mountain.legend}</p>
                        <div className="flex gap-1">
                          {Object.entries(mountain.seasons).map(([key, val]) => (
                            <span key={key} className="text-[9px] px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded">{val}</span>
                          ))}
                        </div>
                      </>
                    ) : (
                      <p className="text-[10px] text-gray-300 dark:text-gray-600">签到后解锁传说与四季...</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 功能入口 */}
        <div className="space-y-2">
          {/* 徒步日志 */}
          <button
            onClick={() => navigate('/hike-log')}
            className="w-full bg-white dark:bg-gray-900 rounded-2xl shadow-sm dark:shadow-gray-900/50 p-4 text-left active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <h3 className="font-bold text-gray-800 dark:text-gray-200 text-sm">徒步日志</h3>
              </div>
              <span className="text-gray-300 dark:text-gray-600 text-lg">›</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1 text-center py-1.5 bg-green-50 dark:bg-green-900/20 rounded-xl">
                <p className="text-xl font-black text-green-600">{displayStats.hikeCount || 0}</p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">次数</p>
              </div>
              <div className="flex-1 text-center py-1.5 bg-green-50 dark:bg-green-900/20 rounded-xl">
                <p className="text-xl font-black text-green-600">{displayStats.totalDistance || 0}<span className="text-xs font-bold">km</span></p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">总里程</p>
              </div>
            </div>
          </button>
        </div>

        {/* 资源设备 */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm dark:shadow-gray-900/50 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <Wrench className="w-4 h-4 text-green-600" />
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">资源设备</h3>
            </div>
            {editing && (
              <button onClick={() => setShowAddResource(true)}
                className="text-green-600 text-xs font-medium flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" />添加
              </button>
            )}
          </div>

          {/* 添加资源 */}
          {editing && showAddResource && (
            <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl space-y-2">
              <input type="text" value={newResText} onChange={e => setResText(e.target.value)}
                placeholder="例如：我有车、高端相机..." className="w-full px-3 py-2 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 text-sm outline-none focus:border-green-500" />
              <div className="flex gap-2">
                <button onClick={() => { setShowAddResource(false); setResText(''); }}
                  className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-gray-200 text-gray-600 dark:text-gray-400">取消</button>
                <button onClick={addResource} disabled={!newResText.trim()}
                  className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-green-600 text-white disabled:opacity-50">添加</button>
              </div>
            </div>
          )}

          {/* 资源卡片列表 */}
          {resources.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
              {resources.map((text, i) => (
                <div key={i} className="shrink-0 w-[calc(33.333%-6px)] aspect-square rounded-xl shadow-sm dark:shadow-gray-900/50 border border-gray-100 dark:border-gray-800 overflow-hidden relative bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 flex flex-col items-center justify-center p-2">
                  <Wrench className="w-6 h-6 text-green-400 mb-1.5" />
                  <p className="text-[10px] font-bold text-gray-700 dark:text-gray-300 text-center line-clamp-3 leading-tight">{text}</p>
                  {editing && (
                    <button onClick={() => setResources(resources.filter((_, j) => j !== i))}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/30 rounded-full flex items-center justify-center">
                      <X className="w-3 h-3 text-white" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">暂无资源设备</p>
          )}
        </div>

        {/* 紧急联系人 */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm dark:shadow-gray-900/50 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-green-600" />
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">紧急联系人</h3>
            </div>
            {editing && (
              <button onClick={addEmergencyContact}
                className="text-green-600 text-xs font-medium flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" />添加
              </button>
            )}
          </div>

          {emergencyContacts.length > 0 ? (
            <div className="space-y-2">
              {emergencyContacts.map((contact, i) => (
                editing ? (
                  <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                    <input
                      type="text"
                      value={contact.name}
                      onChange={e => updateEmergencyContact(i, 'name', e.target.value)}
                      placeholder="姓名"
                      className="flex-1 px-3 py-2 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 text-sm outline-none focus:border-green-500"
                    />
                    <input
                      type="text"
                      value={contact.phone}
                      onChange={e => updateEmergencyContact(i, 'phone', e.target.value)}
                      placeholder="电话"
                      className="flex-1 px-3 py-2 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 text-sm outline-none focus:border-green-500"
                    />
                    <button
                      onClick={() => removeEmergencyContact(i)}
                      className="shrink-0 w-8 h-8 flex items-center justify-center text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div key={i} className="flex items-center gap-3 px-3 py-2 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <Phone className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{contact.name || '未命名'}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{contact.phone || '无电话'}</p>
                    </div>
                  </div>
                )
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">暂无紧急联系人</p>
          )}
        </div>



        {/* 位置共享 - 队伍地图卡片 */}
        {myGroups.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm dark:shadow-gray-900/50 p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <Navigation className="w-4 h-4 text-green-600" />
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">位置共享</h3>
            </div>
            <div className="space-y-2">
              {myGroups.map(g => (
                <button key={g.id} onClick={() => navigate(`/location/${g.id}`)}
                  className="w-full p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl flex items-center gap-3 text-left active:scale-[0.98] transition-transform">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-800 dark:text-gray-200 text-xs truncate">{g.name}</h4>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500">{(g.members || []).length} 位成员 · {g.essentials?.location || ''}</p>
                  </div>
                  <Share2 className="w-4 h-4 text-green-400" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 设置 */}
        <button onClick={() => navigate('/settings')}
          className="w-full bg-white dark:bg-gray-900 rounded-2xl shadow-sm dark:shadow-gray-900/50 p-4 flex items-center gap-3 text-left active:scale-[0.98] transition-transform">
          <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
            <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-800 dark:text-gray-200 text-sm">设置</h3>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">应用设置与 API 配置</p>
          </div>
          <span className="text-gray-300 dark:text-gray-600 text-lg">›</span>
        </button>

        {/* Logout */}
        <button onClick={handleLogout}
          className="w-full bg-white dark:bg-gray-900 rounded-2xl shadow-sm dark:shadow-gray-900/50 p-4 flex items-center justify-center gap-2 text-red-500 font-medium text-sm hover:bg-red-50 transition-colors">
          <LogOut className="w-4 h-4" />退出登录
        </button>
      </div>
    </div>
  );
}
