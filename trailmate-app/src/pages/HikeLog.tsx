import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, ChevronDown, ChevronUp, Image, X, MapPin, Clock, Trash2, Pencil, Share2, Star, Upload, Mountain, Users, Navigation } from 'lucide-react';
import { MapContainer, TileLayer, Polyline } from 'react-leaflet';
import { traillogsApi, usersApi } from '@/api';
import { useConfirm } from '@/components/ConfirmDialog';
import { useStore } from '@/store';
import type { TrailLog } from '@/types';
import Empty from '@/components/Empty';

const yearTabs = [2024, 2025, 2026];

// 队伍类型 → 中文标签
const typeLabels: Record<string, string> = {
  hike: '🥾 徒步',
  other: '📋 其他',
};

export default function HikeLog() {
  const navigate = useNavigate();
  const { confirm: confirmDialog, ConfirmDialog } = useConfirm();
  const { showToast } = useStore();
  const [logs, setLogs] = useState<TrailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeYear, setActiveYear] = useState(2026);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingLog, setEditingLog] = useState<TrailLog | null>(null);
  const [form, setForm] = useState<Partial<TrailLog>>({
    type: 'hike',
    title: '',
    date: new Date().toISOString().split('T')[0],
    distance: 0,
    duration: 0,
    notes: '',
  });
  const [formPhotos, setFormPhotos] = useState<string[]>([]);
  const [formRating, setFormRating] = useState<number>(0);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const loadLogs = async () => {
    try {
      const data = await traillogsApi.list();
      setLogs(data || []);
    } catch {
      // 后端不可用时回退 localStorage
      try {
        const stored = localStorage.getItem('trailmate_hike_logs');
        if (stored) setLogs(JSON.parse(stored));
      } catch {}
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadLogs(); }, []);

  const filteredLogs = logs.filter(log => log.date?.startsWith(String(activeYear)));

  const groupedLogs: Record<string, TrailLog[]> = {};
  filteredLogs.forEach(log => {
    const month = log.date?.substring(0, 7) || '';
    if (!groupedLogs[month]) groupedLogs[month] = [];
    groupedLogs[month].push(log);
  });

  const monthLabels: Record<string, string> = {
    '01': '一月', '02': '二月', '03': '三月', '04': '四月',
    '05': '五月', '06': '六月', '07': '七月', '08': '八月',
    '09': '九月', '10': '十月', '11': '十一月', '12': '十二月',
  };

  // 按 groupId 聚合：同一次徒步的多条签到日志合并为一个条目
  const groupedEntries = Object.entries(groupedLogs)
    .sort(([a], [b]) => b.localeCompare(a));
  const aggregatedEntries = groupedEntries.map(([month, entries]) => {
    const groups: Record<string, TrailLog[]> = {};
    const standalone: TrailLog[] = [];
    entries.forEach(log => {
      if (log.groupId) {
        if (!groups[log.groupId]) groups[log.groupId] = [];
        groups[log.groupId].push(log);
      } else {
        standalone.push(log);
      }
    });
    return { month, standalone, groups: Object.entries(groups) };
  });
  const totalHikes = filteredLogs.length;
  const totalHours = filteredLogs.reduce((s, l) => s + (l.duration || 0), 0);
  const totalDistance = filteredLogs.reduce((s, l) => s + (l.distance || 0), 0);

  // 同 groupId 日志计数，用于聚合提示
  const groupIdCounts: Record<string, number> = {};
  filteredLogs.forEach(log => { if (log.groupId) groupIdCounts[log.groupId] = (groupIdCounts[log.groupId] || 0) + 1; });

  const handleSave = async () => {
    if (!form.title?.trim() || !form.date) return;
    setSaving(true);
    try {
      const data = {
        type: form.type || 'hike',
        title: form.title.trim(),
        date: form.date,
        location: form.location || '',
        distance: form.distance || 0,
        duration: form.duration || 0,
        notes: form.notes || '',
        photos: formPhotos,
        rating: formRating || undefined,
      };
      if (editingLog) {
        await traillogsApi.update(editingLog.id, data);
      } else {
        await traillogsApi.create(data);
      }
      setShowModal(false);
      setEditingLog(null);
      setForm({ type: 'hike', title: '', date: new Date().toISOString().split('T')[0], distance: 0, duration: 0, notes: '' });
      setFormPhotos([]);
      setFormRating(0);
      await loadLogs();
    } catch (e: any) {
      showToast(e?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirmDialog({ title: '删除日志', message: '确定删除这条活动日志？', confirmText: '删除', danger: true });
    if (!ok) return;
    try {
      await traillogsApi.delete(id);
      await loadLogs();
    } catch {}
  };

  const handleEdit = (log: TrailLog) => {
    setEditingLog(log);
    setForm({
      type: log.type || 'hike',
      title: log.title,
      date: log.date,
      location: log.location || '',
      distance: log.distance || 0,
      duration: log.duration || 0,
      notes: log.notes || '',
    });
    setFormPhotos(log.photos || []);
    setFormRating(log.rating || 0);
    setShowModal(true);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const remaining = 9 - formPhotos.length;
    if (remaining <= 0) return;
    const filesToUpload = Array.from(files).slice(0, remaining);
    setUploadingPhoto(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of filesToUpload) {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        const { url } = await usersApi.uploadImage(base64, file.name);
        uploadedUrls.push(url);
      }
      setFormPhotos(prev => [...prev, ...uploadedUrls]);
    } catch (err: any) {
      showToast(err.message || '照片上传失败');
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const removePhoto = (index: number) => {
    setFormPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleShareToGuide = (log: TrailLog) => {
    const text = `【${log.title}】\n日期：${log.date}\n地点：${log.location || '未知'}\n距离：${log.distance || 0}km\n时长：${log.duration || 0}h\n评分：${log.rating ? '⭐'.repeat(log.rating) : '未评分'}\n\n${log.notes || ''}`;
    navigator.clipboard.writeText(text).then(() => {
      showToast('已复制，可前往攻略页发布');
    }).catch(() => showToast('复制失败'));
  };

  const handleShareToMoments = (log: TrailLog) => {
    const checkpointInfo = log.checkpoints?.length ? `\n📍 ${log.checkpoints.length}个打卡点` : '';
    const text = `🏔 ${log.title}\n📅 ${log.date}  📍 ${log.location || ''}\n🥾 ${log.distance || 0}km  ⏱ ${log.duration || 0}h${checkpointInfo}\n${log.rating ? '⭐'.repeat(log.rating) + '\n' : ''}${log.notes ? '\n' + log.notes : ''}\n\n—— 来自 TrailMate 户外组队`;
    if (navigator.share) {
      navigator.share({ title: log.title, text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).then(() => showToast('已复制到剪贴板，可粘贴到朋友圈')).catch(() => showToast('复制失败'));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#faf7f2] dark:bg-gray-950">
        <div className="animate-spin w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 bg-[#faf7f2] dark:bg-gray-950">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 bg-white dark:bg-gray-900 sticky top-0 z-10 shadow-sm dark:shadow-gray-900/50 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-500 dark:text-gray-400">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-200">活动日志</h1>
      </div>

      <div className="px-5 mt-4 space-y-4">
        {/* Year selector */}
        <div className="flex gap-2">
          {yearTabs.map(year => (
            <button
              key={year}
              onClick={() => setActiveYear(year)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                activeYear === year
                  ? 'bg-green-600 text-white shadow-sm dark:shadow-gray-900/50'
                  : 'bg-white text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-gray-800'
              }`}
            >
              {year}
            </button>
          ))}
        </div>

        {/* Stats summary */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm dark:shadow-gray-900/50 p-4 grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-2xl font-bold text-green-600">{totalDistance.toFixed(1)}<span className="text-sm">km</span></p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">总里程</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">{totalHikes}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">总次数</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">{totalHours.toFixed(1)}<span className="text-sm">h</span></p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">总时长</p>
          </div>
        </div>

        {/* Monthly log entries */}
        {Object.keys(groupedLogs).length === 0 ? (
          <Empty
            icon={MapPin}
            title={`${activeYear}年暂无活动记录`}
            description="完成一次徒步后，日志会自动生成在这里"
          />
        ) : (
          Object.entries(groupedLogs)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([month, entries]) => (
              <div key={month}>
                <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">
                  {monthLabels[month.substring(5, 7)] || month}
                </h3>
                <div className="space-y-2">
                  {entries.map(log => {
                    const isExpanded = expandedId === log.id;
                    return (
                      <div key={log.id} className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm dark:shadow-gray-900/50 overflow-hidden">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : log.id)}
                          className="w-full p-4 text-left flex items-center gap-3"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {log.type && log.type !== 'hike' && (
                                <span className="text-[10px] bg-gray-50 dark:bg-gray-800/50 rounded px-1.5 py-0.5">{typeLabels[log.type]}</span>
                              )}
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-gray-800 dark:text-gray-200 text-sm truncate">{log.title}</h4>
                                {log.status === 'active' ? (
                                  <span className="shrink-0 px-1.5 py-0.5 bg-green-100 text-green-600 rounded text-[9px] font-bold animate-pulse">征途中</span>
                                ) : log.status === 'completed' && !log.rating ? (
                                  <span className="shrink-0 px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 rounded text-[9px] font-bold">已完成</span>
                                ) : null}
                              </div>
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-gray-400 dark:text-gray-500">
                              <span>{log.date}</span>
                              {log.location && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{log.location}</span>}
                              {log.distance ? <span>{log.distance}km</span> : null}
                              {log.duration ? <span>{log.duration}h</span> : null}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {log.rating ? (
                              <div className="flex items-center gap-0.5">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <div key={i} className={`w-2 h-2 rounded-full ${i < (log.rating || 0) ? 'bg-green-500' : 'bg-gray-200'}`} />
                                ))}
                              </div>
                            ) : null}
                            {log.photos && log.photos.length > 0 && (
                              <span className="flex items-center gap-0.5 text-[10px] text-gray-400 dark:text-gray-500">
                                <Image className="w-3 h-3" />{log.photos.length}
                              </span>
                            )}
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-300 dark:text-gray-600" /> : <ChevronDown className="w-4 h-4 text-gray-300 dark:text-gray-600" />}
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="px-4 pb-4 pt-0">
                            <div className="border-t border-gray-50 dark:border-gray-800/50 pt-3 space-y-2">
                              {log.rating ? (
                                <div className="flex items-center gap-1">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <Star key={i} className={`w-4 h-4 ${i < (log.rating || 0) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
                                  ))}
                                </div>
                              ) : null}
                              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{log.notes || '暂无笔记'}</p>
                              {log.checkpoints && log.checkpoints.length > 0 && (
                                <div className="bg-green-50/50 rounded-xl p-3">
                                  <h5 className="text-xs font-bold text-green-700 mb-2 flex items-center gap-1">
                                    <Mountain className="w-3.5 h-3.5" />打卡记录
                                  </h5>
                                  <div className="space-y-1.5">
                                    {log.checkpoints.map((cp: any, i: number) => (
                                      <div key={i} className="flex items-center gap-2 text-xs">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                                        <span className="text-gray-700 dark:text-gray-300 font-medium">{cp.label || '打卡点'}</span>
                                        {cp.checkedInAt && (
                                          <span className="text-gray-400 dark:text-gray-500 ml-auto">
                                            {new Date(cp.checkedInAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                                          </span>
                                        )}
                                        {cp.notes && (
                                          <span className="text-gray-400 dark:text-gray-500 text-[10px] truncate max-w-[120px]">"{cp.notes}"</span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {/* GPS 轨迹 */}
                              {log.track && log.track.length > 1 && (
                                <div className="bg-blue-50/50 rounded-xl p-3">
                                  <h5 className="text-xs font-bold text-blue-700 mb-2 flex items-center gap-1">
                                    <Navigation className="w-3.5 h-3.5" />GPS 轨迹
                                  </h5>
                                  <div className="w-full h-[200px] rounded-lg overflow-hidden">
                                    <MapContainer
                                      center={[log.track[0].lat, log.track[0].lng]}
                                      zoom={13}
                                      className="h-full w-full"
                                      zoomControl={false}
                                      dragging={false}
                                      scrollWheelZoom={false}
                                    >
                                      <TileLayer
                                        attribution=''
                                        url="https://wprd01.is.autonavi.com/appmaptile?x={x}&y={y}&z={z}&lang=zh_cn&size=1&scl=1&style=7"
                                      />
                                      <Polyline
                                        positions={log.track.map(p => [p.lat, p.lng] as [number, number])}
                                        pathOptions={{ color: '#3B82FD', weight: 3, opacity: 0.6 }}
                                      />
                                    </MapContainer>
                                  </div>
                                  <div className="grid grid-cols-3 gap-2 mt-2 text-center">
                                    <div>
                                      <p className="text-sm font-bold text-blue-600">{(log.totalDistance || 0) >= 1000 ? `${((log.totalDistance || 0) / 1000).toFixed(2)}` : String(log.totalDistance || 0)}</p>
                                      <p className="text-[10px] text-blue-400">{(log.totalDistance || 0) >= 1000 ? 'km' : 'm'}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-bold text-blue-600">{Math.floor((log.movingDuration || 0) / 60)}</p>
                                      <p className="text-[10px] text-blue-400">min</p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-bold text-blue-600">
                                        {log.avgPace ? `${Math.floor((log.avgPace || 0) / 60)}'${String(Math.floor((log.avgPace || 0) % 60)).padStart(2, '0')}"` : '-'}
                                      </p>
                                      <p className="text-[10px] text-blue-400">配速</p>
                                    </div>
                                  </div>
                                </div>
                              )}
                              {(log.groupId || (log.location && log.location.includes(','))) && (
                                <div className="flex items-center gap-2 flex-wrap p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                                  {log.groupId && (
                                    <span className="flex items-center gap-1 text-[10px] text-green-600 font-medium">
                                      <Users className="w-3 h-3" />组队记录{(groupIdCounts[log.groupId] || 0) > 1 ? ` · ${groupIdCounts[log.groupId]} 条签到` : ''}
                                    </span>
                                  )}
                                  {log.location && log.location.includes(',') && (
                                    <span className="flex items-center gap-1 text-[10px] text-blue-500 font-medium">
                                      <MapPin className="w-3 h-3" />
                                      {log.location.split(',').map((s: string) => parseFloat(s).toFixed(4)).join(', ')}
                                    </span>
                                  )}
                                </div>
                              )}
                              {log.photos && log.photos.length > 0 && (
                                <div className="grid grid-cols-3 gap-1.5">
                                  {log.photos.map((url, i) => (
                                    <div key={i} className="aspect-square rounded-lg overflow-hidden">
                                      <img src={url} alt="" className="w-full h-full object-cover" />
                                    </div>
                                  ))}
                                </div>
                              )}
                              <div className="flex items-center gap-2 flex-wrap">
                                {log.photos && log.photos.length > 0 && (
                                  <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                                    <Image className="w-3.5 h-3.5" />{log.photos.length} 张照片
                                  </span>
                                )}
                                <div className="ml-auto flex items-center gap-1">
                                  <button onClick={(e) => { e.stopPropagation(); handleEdit(log); }}
                                    title="编辑"
                                    className="p-1 text-green-600 hover:bg-green-50 rounded-md transition-colors">
                                    <Pencil className="w-3 h-3" />
                                  </button>
                                  <button onClick={(e) => { e.stopPropagation(); handleShareToMoments(log); }}
                                    title="分享到朋友圈"
                                    className="p-1 text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                                    <Share2 className="w-3 h-3" />
                                  </button>
                                  <button onClick={(e) => { e.stopPropagation(); handleShareToGuide(log); }}
                                    title="分享到攻略"
                                    className="px-1.5 py-0.5 text-[10px] text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                                    攻略
                                  </button>
                                  <button onClick={(e) => { e.stopPropagation(); handleDelete(log.id); }}
                                    title="删除"
                                    className="p-1 text-red-400 hover:bg-red-50 rounded-md transition-colors">
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
        )}
      </div>

      {/* Floating add button */}
      <button
        onClick={() => { setShowModal(true); setEditingLog(null); setForm({ type: 'hike', title: '', date: new Date().toISOString().split('T')[0], distance: 0, duration: 0, notes: '' }); setFormPhotos([]); setFormRating(0); }}
        className="fixed bottom-20 right-5 w-14 h-14 bg-green-600 rounded-full shadow-lg dark:shadow-gray-900/50 shadow-green-200 flex items-center justify-center text-white z-40 active:scale-90 transition-transform"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Add log modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-t-3xl p-5 pb-8 space-y-4 max-h-[85vh] overflow-y-auto" style={{ animation: 'slideUp 0.3s ease-out' }}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">{editingLog ? '编辑日志' : '记录活动'}</h2>
              <button onClick={() => { setShowModal(false); setEditingLog(null); }} className="text-gray-400 dark:text-gray-500"><X className="w-5 h-5" /></button>
            </div>

            {/* 活动类型 */}
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">活动类型</label>
              <div className="flex gap-2">
                {(['hike', 'other'] as const).map(t => (
                  <button key={t}
                    onClick={() => setForm(p => ({ ...p, type: t }))}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                      form.type === t ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                    }`}
                  >{typeLabels[t]}</button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">活动名称</label>
              <input
                type="text"
                value={form.title || ''}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="例如：梧桐山徒步"
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 text-sm outline-none focus:border-green-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">日期</label>
                <input
                  type="date"
                  value={form.date || ''}
                  onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 text-sm outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">地点</label>
                <input
                  type="text"
                  value={form.location || ''}
                  onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                  placeholder="深圳·梧桐山"
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 text-sm outline-none focus:border-green-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">距离 (km)</label>
                <input
                  type="number"
                  step="0.1"
                  value={form.distance || ''}
                  onChange={e => setForm(p => ({ ...p, distance: parseFloat(e.target.value) || 0 }))}
                  placeholder="0.0"
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 text-sm outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">时长 (小时)</label>
                <input
                  type="number"
                  step="0.5"
                  value={form.duration || ''}
                  onChange={e => setForm(p => ({ ...p, duration: parseFloat(e.target.value) || 0 }))}
                  placeholder="0.0"
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 text-sm outline-none focus:border-green-500"
                />
              </div>
            </div>

            {/* 评分 */}
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">评分</label>
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setFormRating(i + 1)}
                    className="p-0.5 transition-colors"
                  >
                    <Star
                      className={`w-7 h-7 ${
                        i < formRating
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-gray-200'
                      }`}
                    />
                  </button>
                ))}
                {formRating > 0 && (
                  <button
                    type="button"
                    onClick={() => setFormRating(0)}
                    className="ml-2 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600"
                  >
                    清除
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">感受/笔记</label>
              <textarea
                value={form.notes || ''}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="记录一下这次活动的感受..."
                rows={3}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 text-sm outline-none focus:border-green-500 resize-none"
              />
            </div>

            {/* 照片上传 */}
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">
                照片（{formPhotos.length}/9）
              </label>
              {formPhotos.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {formPhotos.map((url, i) => (
                    <div key={i} className="aspect-square rounded-xl overflow-hidden relative bg-gray-100 dark:bg-gray-800">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center text-white text-xs"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {formPhotos.length < 9 && (
                <div>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-sm text-gray-400 dark:text-gray-500 hover:border-green-400 hover:text-green-600 transition-colors disabled:opacity-50"
                  >
                    {uploadingPhoto ? (
                      <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    上传照片
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={handleSave}
              disabled={!form.title?.trim() || !form.date || saving}
              className="w-full py-3 bg-green-600 text-white rounded-xl font-medium text-sm disabled:opacity-40 active:scale-[0.98] transition-transform"
            >
              {saving ? '保存中...' : editingLog ? '更新' : '保存'}
            </button>
          </div>
        </div>
      )}

      {ConfirmDialog}
    </div>
  );
}
