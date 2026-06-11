import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, LogOut, Plus, Trash2, Save, Mountain } from 'lucide-react';
import { useStore } from '@/store';
import { usersApi } from '@/api';

const experienceOptions = [
  { value: 'novice', label: '🌱 新手' },
  { value: 'experienced', label: '🥾 有经验' },
  { value: 'veteran', label: '🏔️ 老驴' },
];

const preferenceOptions = [
  { value: 'scenery', label: '🏞️ 风景' },
  { value: 'challenge', label: '💪 挑战' },
  { value: 'social', label: '🤝 社交' },
  { value: 'photography', label: '📷 摄影' },
];

const frequencyOptions = [
  { value: 'monthly1', label: '每月1次' },
  { value: 'monthly2-3', label: '每月2-3次' },
  { value: 'weekly1', label: '每周1次' },
  { value: 'weekly+', label: '每周多次' },
];

export default function Profile() {
  const navigate = useNavigate();
  const { user, logout } = useStore();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || '',
    city: user?.city || '',
    experienceLevel: user?.experienceLevel || 'novice',
    preferences: user?.preferences || [],
    hikeFrequency: user?.hikeFrequency || 'monthly1',
    bio: user?.bio || '',
  });
  const [contacts, setContacts] = useState(user?.emergencyContacts || []);
  const [saving, setSaving] = useState(false);

  if (!user) return <div className="flex items-center justify-center h-screen" style={{ background: '#faf7f2' }}><p className="text-gray-400">请先登录</p></div>;

  const togglePref = (p: string) => {
    setForm(prev => ({
      ...prev,
      preferences: prev.preferences.includes(p) ? prev.preferences.filter(x => x !== p) : [...prev.preferences, p],
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await usersApi.updateProfile(form);
      await usersApi.updateEmergencyContacts(contacts);
      await useStore.getState().loadUser();
      setEditing(false);
    } catch (err: any) {
      alert(err.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="pb-24" style={{ background: '#faf7f2', minHeight: '100vh' }}>
      <div className="px-5 pt-6 pb-4 bg-white sticky top-0 z-10 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-gray-500"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-xl font-bold text-gray-800">个人中心</h1>
        </div>
        {editing ? (
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-1 text-green-600 text-sm font-medium">
            <Save className="w-4 h-4" />{saving ? '保存中...' : '保存'}
          </button>
        ) : (
          <button onClick={() => setEditing(true)} className="text-green-600 text-sm font-medium">编辑</button>
        )}
      </div>

      <div className="px-5 mt-4 space-y-4">
        {/* Avatar & Name */}
        <div className="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white shrink-0"
            style={{ background: user.avatarColor || 'linear-gradient(135deg, #4ade80, #16a34a)' }}>
            {user.name?.[0] || '?'}
          </div>
          <div className="flex-1 min-w-0">
            {editing ? (
              <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className="w-full text-lg font-bold text-gray-800 outline-none border-b border-green-500 pb-1" />
            ) : (
              <h2 className="text-lg font-bold text-gray-800 truncate">{user.name}</h2>
            )}
            <p className="text-xs text-gray-400 mt-0.5">{user.email || ''}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-white rounded-2xl shadow-sm p-4 grid grid-cols-3 gap-2 text-center">
          <div><p className="text-2xl font-bold text-green-600">{user.hikeCount || 0}</p><p className="text-xs text-gray-400 mt-0.5">徒步次数</p></div>
          <div><p className="text-2xl font-bold text-green-600">{user.totalDistance || 0}<span className="text-sm">km</span></p><p className="text-xs text-gray-400 mt-0.5">总里程</p></div>
          <div><p className="text-2xl font-bold text-green-600">{user.creditScore || 100}</p><p className="text-xs text-gray-400 mt-0.5">信用分</p></div>
        </div>

        {/* Experience & Preferences */}
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">经验等级</label>
            <div className="flex gap-2 flex-wrap">
              {experienceOptions.map(opt => (
                <button key={opt.value} onClick={() => editing && setForm(p => ({ ...p, experienceLevel: opt.value as 'novice' | 'experienced' | 'veteran' }))}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    form.experienceLevel === opt.value ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'
                  } ${!editing ? 'pointer-events-none' : ''}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">徒步偏好</label>
            <div className="flex gap-2 flex-wrap">
              {preferenceOptions.map(opt => (
                <button key={opt.value} onClick={() => editing && togglePref(opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    form.preferences.includes(opt.value) ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'
                  } ${!editing ? 'pointer-events-none' : ''}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">出行频率</label>
            <div className="flex gap-2 flex-wrap">
              {frequencyOptions.map(opt => (
                <button key={opt.value} onClick={() => editing && setForm(p => ({ ...p, hikeFrequency: opt.value }))}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    form.hikeFrequency === opt.value ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'
                  } ${!editing ? 'pointer-events-none' : ''}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          {editing && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">常驻城市</label>
              <input type="text" value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
                placeholder="例如：深圳" className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-500" />
            </div>
          )}
        </div>

        {/* Emergency Contacts */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800 text-sm">紧急联系人</h3>
            {editing && (
              <button onClick={() => setContacts([...contacts, { name: '', phone: '' }])}
                className="text-green-600 text-xs font-medium flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" />添加
              </button>
            )}
          </div>
          {contacts.length === 0 ? (
            <p className="text-xs text-gray-400">暂未设置紧急联系人</p>
          ) : (
            <div className="space-y-2">
              {contacts.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  {editing ? (
                    <>
                      <input type="text" value={c.name} onChange={e => { const n = [...contacts]; n[i] = { ...n[i], name: e.target.value }; setContacts(n); }}
                        placeholder="姓名" className="flex-1 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-sm outline-none" />
                      <input type="tel" value={c.phone} onChange={e => { const n = [...contacts]; n[i] = { ...n[i], phone: e.target.value }; setContacts(n); }}
                        placeholder="电话" className="flex-1 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-sm outline-none" />
                      <button onClick={() => setContacts(contacts.filter((_, j) => j !== i))} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
                    </>
                  ) : (
                    <div className="flex-1 text-sm">
                      <span className="font-medium text-gray-700">{c.name}</span>
                      <span className="text-gray-400 ml-2">{c.phone}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Logout */}
        <button onClick={handleLogout}
          className="w-full bg-white rounded-2xl shadow-sm p-4 flex items-center justify-center gap-2 text-red-500 font-medium text-sm hover:bg-red-50 transition-colors">
          <LogOut className="w-4 h-4" />退出登录
        </button>
      </div>
    </div>
  );
}
