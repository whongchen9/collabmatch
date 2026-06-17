import { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { ArrowLeft, Share2, LocateFixed, Flag, Navigation, MapPin, CheckCircle, Users, Camera, Upload, X, RefreshCw, Image, Play, Map, Activity, Plus } from 'lucide-react';
import { groupsApi, usersApi, traillogsApi } from '@/api';
import { useStore } from '@/store';
import { useConfirm } from '@/components/ConfirmDialog';
import 'leaflet/dist/leaflet.css';

// Fix leaflet default icon issue
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// 蓝色圆点：标记自己的位置
const myPosIcon = L.divIcon({
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#3b82f6;border:3px solid #fff;box-shadow:0 0 8px rgba(59,130,246,0.6);"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  className: '',
});

// 绿色圆点：标记队友位置
const teammateIcon = L.divIcon({
  html: `<div style="width:12px;height:12px;border-radius:50%;background:#22c55e;border:2px solid #fff;box-shadow:0 0 6px rgba(34,197,94,0.5);"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6],
  className: '',
});

// SOS 红色闪烁圆点
const sosIcon = L.divIcon({
  html: `<div style="width:14px;height:14px;border-radius:50%;background:#ef4444;border:2px solid #fff;box-shadow:0 0 10px rgba(239,68,68,0.7);"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
  className: 'sos-marker',
});

// 打卡点图标工厂：颜色根据类型变化 + 签到人数徽章
function createFlagIcon(count: number, type?: string): L.DivIcon {
  const colorMap: Record<string, string> = { meeting: '#6366f1', start: '#10b981', end: '#ef4444' };
  const iconMap: Record<string, string> = { meeting: '📍', start: '🚩', end: '🏁', checkpoint: '📌' };
  const color = colorMap[type || ''] || '#f59e0b';
  const icon = iconMap[type || ''] || '📌';
  const badge = count > 0
    ? `<span style="position:absolute;top:-6px;left:18px;background:#ef4444;color:#fff;font-size:10px;font-weight:700;min-width:16px;height:16px;border-radius:8px;display:flex;align-items:center;justify-content:center;padding:0 3px;border:1.5px solid #fff;line-height:1;">${count}</span>`
    : '';
  return L.divIcon({
    html: `<div style="position:relative;width:28px;height:28px;overflow:visible;">
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></svg>
      ${badge}
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [4, 26],
    popupAnchor: [14, -20],
    className: 'flag-marker',
  });
}

function FitBounds({ locations, checkpoints }: { locations: any[]; checkpoints: any[] }) {
  const map = useMap();
  const [fitted, setFitted] = useState(false);
  useEffect(() => {
    if (fitted) return;
    const allPoints = [
      ...locations.map(l => [l.lat, l.lng] as [number, number]),
      ...checkpoints.map(c => [c.lat, c.lng] as [number, number]),
    ];
    if (allPoints.length > 0) {
      const bounds = L.latLngBounds(allPoints);
      map.fitBounds(bounds, { padding: [50, 50] });
      setFitted(true);
    }
  }, [locations, checkpoints, map, fitted]);
  return null;
}

// Memo 化的打卡点标记，避免父组件重渲染时闪烁
const MemoCheckpointMarkers = memo(function MemoCheckpointMarkers({
  checkpoints, icons, locations, onSelect, onFlyToPos, onFlyVer, isLeader, onDeleteCheckpoint
}: {
  checkpoints: any[]; icons: L.DivIcon[]; locations: any[];
  onSelect: (i: number) => void;
  onFlyToPos: (pt: [number, number]) => void;
  onFlyVer: (fn: (v: number) => number) => void;
  isLeader: boolean;
  onDeleteCheckpoint: (i: number) => void;
}) {
  const iconMap: Record<string, string> = { meeting: '📍', start: '🚩', end: '🏁', checkpoint: '📌' };
  return (
    <>
      {checkpoints.map((cp, i) => (
        <Marker key={`cp-${i}`} position={[cp.lat, cp.lng]} icon={icons[i]}
          eventHandlers={{ click: () => onSelect(i) }}>
          <Popup>
            <div className="text-center min-w-[120px]">
              <p className="font-bold text-xs text-gray-800 dark:text-gray-100">
                {iconMap[cp.type] || '📌'} {cp.label || `打卡点 ${i + 1}`}
              </p>
              {(cp.checkins || []).length > 0 && (
                <div className="mt-1 flex items-center justify-center gap-1 flex-wrap">
                  {(cp.checkins || []).map((c: any) => (
                    <span key={c.userId}
                      className="inline-block w-5 h-5 rounded-full text-[8px] font-bold text-white flex items-center justify-center cursor-pointer hover:scale-125 transition-transform"
                      style={{ backgroundColor: c.avatarColor || '#10b981' }}
                      title={`${c.userName} · 点击定位`}
                      onClick={(e) => {
                        e.stopPropagation();
                        const loc = locations.find((l: any) => l.userId === c.userId);
                        if (loc) { onFlyToPos([loc.lat, loc.lng]); onFlyVer(v => v + 1); }
                      }}
                    >{(c.userName || '?')[0]}</span>
                  ))}
                </div>
              )}
              {isLeader && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteCheckpoint(i);
                  }}
                  className="mt-2 text-[10px] text-red-500 hover:text-red-700 font-medium underline"
                >
                  删除此打卡点
                </button>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
});

// 一键定位：收到定位请求时飞到指定位置
function FlyTo({ pos, ver }: { pos: [number, number] | null; ver: number }) {
  const map = useMap();
  useEffect(() => {
    if (!pos) return;
    map.flyTo(pos, Math.max(map.getZoom(), 15), { duration: 1 });
  }, [ver, map]); // 用 ver 而非 pos 触发，避免同坐标不响应
  return null;
}

// 长按地图设置打卡点（仅队长），使用 Leaflet 原生事件
function MapLongPress({ isLeader, onLongPress }: { isLeader: boolean; onLongPress: (lat: number, lng: number) => void }) {
  const map = useMap();
  const downAt = useRef(0);
  const downLatLng = useRef<L.LatLng | null>(null);
  const moved = useRef(false);

  useEffect(() => {
    if (!isLeader) return;

    const onDown = (e: any) => {
      downAt.current = Date.now();
      downLatLng.current = e.latlng;
      moved.current = false;
    };

    const onMove = () => {
      moved.current = true;
    };

    const onUp = (e: any) => {
      const elapsed = Date.now() - downAt.current;
      if (!moved.current && elapsed > 500 && elapsed < 2000 && downLatLng.current) {
        onLongPress(downLatLng.current.lat, downLatLng.current.lng);
      }
      downAt.current = 0;
      downLatLng.current = null;
    };

    map.on('mousedown', onDown);
    map.on('touchstart', onDown);
    map.on('movestart', onMove);
    map.on('drag', onMove);
    map.on('mouseup', onUp);
    map.on('touchend', onUp);

    return () => {
      map.off('mousedown', onDown);
      map.off('touchstart', onDown);
      map.off('movestart', onMove);
      map.off('drag', onMove);
      map.off('mouseup', onUp);
      map.off('touchend', onUp);
      downAt.current = 0;
      downLatLng.current = null;
    };
  }, [map, isLeader, onLongPress]);

  return null;
}

// 添加打卡点：点击地图添加（添加模式下）
function AddCheckpointClick({ enabled, onAdd }: { enabled: boolean; onAdd: (lat: number, lng: number) => void }) {
  const map = useMap();
  const mapRef = useRef(map);
  mapRef.current = map;

  useEffect(() => {
    if (!enabled) return;
    const handleClick = (e: L.LeafletMouseEvent) => {
      onAdd(e.latlng.lat, e.latlng.lng);
    };
    map.on('click', handleClick);
    return () => { map.off('click', handleClick); };
  }, [enabled, map, onAdd]);

  return null;
}

export default function LocationMap() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const shareToken = searchParams.get('token');
  const navigate = useNavigate();
  const { user, showToast, track, addTrackPoint } = useStore();
  const { confirm: confirmDialog, ConfirmDialog } = useConfirm();
  const [locations, setLocations] = useState<any[]>([]);
  const [checkpoints, setCheckpoints] = useState<any[]>([]);
  const [groupName, setGroupName] = useState('');
  const [teamInfo, setTeamInfo] = useState<any>(null);
  const [groupData, setGroupData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [checkingIn, setCheckingIn] = useState(false);
  // 一键定位自己
  const [flyToPos, setFlyToPos] = useState<[number, number] | null>(null);
  const [flyVer, setFlyVer] = useState(0);
  const [myPos, setMyPos] = useState<[number, number] | null>(null);
  const checkpointsRef = useRef<any[]>([]);
  const locationsRef = useRef<any[]>([]);
  const [sosActive, setSosActive] = useState(false);
  const [sendingSos, setSendingSos] = useState(false);
  const [selectedCp, setSelectedCp] = useState<number | null>(null);
  // 添加打卡点模式
  const [addCheckpointMode, setAddCheckpointMode] = useState(false);

  // 打卡签到弹窗
  const [checkinNote, setCheckinNote] = useState('');
  const [checkinPhotos, setCheckinPhotos] = useState<string[]>([]);
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [currentCheckpoint, setCurrentCheckpoint] = useState<number | null>(null);
  const [uploadingCheckinPhoto, setUploadingCheckinPhoto] = useState(false);
  const checkinPhotoInputRef = useRef<HTMLInputElement>(null);

  // 打卡点添加弹窗
  const [newCheckpointType, setNewCheckpointType] = useState('checkpoint');
  const [showAddCheckpointDialog, setShowAddCheckpointDialog] = useState(false);
  const [newCheckpointLat, setNewCheckpointLat] = useState(0);
  const [newCheckpointLng, setNewCheckpointLng] = useState(0);
  const [newCheckpointLabel, setNewCheckpointLabel] = useState('');
  const [loadingLocationName, setLoadingLocationName] = useState(false);

  // 逆地理编码获取地点名称
  const fetchLocationName = async (lat: number, lng: number): Promise<string> => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`);
      const data = await res.json();
      return data.display_name ? data.display_name.split(',').slice(0, 2).join(',') : '';
    } catch {
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  };

  // 判断是否为队长
  const isLeader = groupData?.members?.some((m: any) => (m.id || m) === user?.id && m.role === 'leader') ?? false;
  const isMember = groupData?.members?.some((m: any) => (m.id || m) === user?.id) ?? false;

  // 缓存打卡点图标，避免缩放时图标引用失效
  const flagIcons = useMemo(() => checkpoints.map(cp => createFlagIcon((cp.checkins || []).length, cp.type)), [checkpoints]);

  useEffect(() => {
    if (!id) return;
    loadLocations();
    const interval = setInterval(loadLocations, 15000);
    return () => clearInterval(interval);
  }, [id, shareToken]);

  // 打开页面时自动获取自己的 GPS 位置
  useEffect(() => {
    if (!id || shareToken) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const pt: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setMyPos(pt);
        groupsApi.reportLocation(id, pt[0], pt[1]).catch(() => {});
      },
      () => {}, // 静默失败
      { timeout: 10000, enableHighAccuracy: true }
    );
  }, [id, shareToken]);

  // GPS 轨迹追踪（hiking 状态下持续记录）
  useEffect(() => {
    if (!id || shareToken) return;
    const isHiking = groupData?.hikeStatus === 'hiking';
    if (!isHiking) return;

    let gpsInterval: ReturnType<typeof setInterval> | null = null;

    const tick = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const pt = { lat: pos.coords.latitude, lng: pos.coords.longitude, timestamp: Date.now() };
          addTrackPoint(pt);
          setMyPos([pt.lat, pt.lng]);
          groupsApi.reportLocation(id, pt.lat, pt.lng).catch(() => {});
        },
        () => {},
        { timeout: 10000, enableHighAccuracy: true }
      );
    };

    // 立即执行一次
    tick();
    gpsInterval = setInterval(tick, 15000);

    return () => { if (gpsInterval) clearInterval(gpsInterval); };
  }, [id, shareToken, groupData?.hikeStatus]);

  const loadLocations = async () => {
    try {
      const res = await groupsApi.getLocations(id!, shareToken || undefined);
      const newLocations = res.locations || [];
      const newCheckpoints = res.checkpoints || [];
      // 数据无变化时不更新 state，避免 Marker 重渲染导致闪烁
      if (JSON.stringify(newCheckpoints) !== JSON.stringify(checkpointsRef.current)) {
        checkpointsRef.current = newCheckpoints;
        setCheckpoints(newCheckpoints);
      }
      if (JSON.stringify(newLocations) !== JSON.stringify(locationsRef.current)) {
        locationsRef.current = newLocations;
        setLocations(newLocations);
        // 检查当前用户 SOS 状态
        const myLoc = newLocations.find((l: any) => l.userId === user?.id);
        setSosActive(!!(myLoc && myLoc.sos));
      }
      setGroupName(res.groupName || '');
      setTeamInfo(res.teamInfo || null);
      // 获取队伍详情以判断队长身份
      if (!shareToken) {
        try {
          const g = await groupsApi.get(id!);
          setGroupData(g);
        } catch {}
      }
      setLoading(false);
    } catch (err: any) {
      setError(err.message || '加载失败');
      setLoading(false);
    }
  };

  // 打卡点签到：打开签到弹窗
  const handleCheckinAtCheckpoint = useCallback(async (cpIndex: number) => {
    setCurrentCheckpoint(cpIndex);
    setCheckinNote('');
    setCheckinPhotos([]);
    setShowCheckinModal(true);
  }, []);

  // 点击打卡点 → 选中 + 打开签到弹窗
  const onCheckpointClick = useCallback((i: number) => {
    if (!isMember || shareToken) return;
    setSelectedCp(i);
    handleCheckinAtCheckpoint(i);
  }, [isMember, shareToken, handleCheckinAtCheckpoint]);

  // 执行签到（从弹窗触发）
  const doCheckin = useCallback(async () => {
    if (!id || currentCheckpoint === null) return;
    setCheckingIn(true);
    try {
      let lat: number, lng: number;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch {
        showToast('无法获取位置，请确保已开启定位权限');
        setCheckingIn(false);
        return;
      }
      // 上报位置
      await groupsApi.reportLocation(id, lat, lng);
      // 签到（后端已处理去重和写入）
      const res = await groupsApi.checkin(id, currentCheckpoint, lat, lng);
      // 如果有照片或备注，更新签到记录
      if (checkinPhotos.length > 0 || checkinNote.trim()) {
        try {
          const latestGroup = await groupsApi.get(id);
          const latestCheckpoints = latestGroup.checkpoints || [];
          if (currentCheckpoint < latestCheckpoints.length) {
            const newCheckpoints = [...latestCheckpoints];
            const cp = { ...newCheckpoints[currentCheckpoint] };
            const existingCheckins = [...(cp.checkins || [])];
            const myCheckinIdx = existingCheckins.findIndex(c => c.userId === user?.id);
            if (myCheckinIdx >= 0) {
              existingCheckins[myCheckinIdx] = {
                ...existingCheckins[myCheckinIdx],
                photos: checkinPhotos.length > 0 ? checkinPhotos : existingCheckins[myCheckinIdx].photos,
                notes: checkinNote.trim() || existingCheckins[myCheckinIdx].notes,
              };
              cp.checkins = existingCheckins;
              newCheckpoints[currentCheckpoint] = cp;
              await groupsApi.update(id, { checkpoints: newCheckpoints });
            }
          }
        } catch {}
      }
      setShowCheckinModal(false);
      showToast(`签到成功！距打卡点${res.distance}米`);
      await loadLocations();
    } catch (err: any) {
      showToast(err.message || '签到失败');
    } finally {
      setCheckingIn(false);
    }
  }, [id, currentCheckpoint, checkinNote, checkinPhotos, user, groupName, showToast]);

  // 上传签到照片
  const handleCheckinPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const remaining = 3 - checkinPhotos.length;
    if (remaining <= 0) return;
    const filesToUpload = Array.from(files).slice(0, remaining);
    setUploadingCheckinPhoto(true);
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
      setCheckinPhotos(prev => [...prev, ...uploadedUrls]);
    } catch (err: any) {
      showToast(err.message || '上传失败');
    } finally {
      setUploadingCheckinPhoto(false);
      if (checkinPhotoInputRef.current) checkinPhotoInputRef.current.value = '';
    }
  };

  // SOS 求助（切换）
  const handleSos = useCallback(async () => {
    if (!id || sendingSos) return;
    setSendingSos(true);
    try {
      const res = await groupsApi.sos(id);
      setSosActive(!!res.sos);
    } catch (e: any) {
      showToast(e.message || 'SOS 发送失败');
    } finally {
      setSendingSos(false);
    }
  }, [id, sendingSos]);

  const handleShare = async () => {
    if (!id) return;
    try {
      const res = await groupsApi.generateShareToken(id);
      const link = `${window.location.origin}/location/${id}?token=${res.shareToken}`;
      setShareLink(link);
      if (navigator.share) {
        await navigator.share({ title: `${groupName} - 位置共享`, url: link });
      } else {
        await navigator.clipboard.writeText(link);
        showToast('链接已复制到剪贴板');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        showToast('生成分享链接失败');
      }
    }
  };

  const handleMapLongPress = useCallback(async (lat: number, lng: number) => {
    if (!id || !isLeader) return;
    setNewCheckpointLat(lat);
    setNewCheckpointLng(lng);
    setNewCheckpointType('checkpoint');
    setNewCheckpointLabel('');
    setLoadingLocationName(true);
    setShowAddCheckpointDialog(true);
    // 自动获取地点名
    try {
      const name = await fetchLocationName(lat, lng);
      setNewCheckpointLabel(name);
    } catch {}
    setLoadingLocationName(false);
  }, [id, isLeader]);

  // 保存新打卡点
  const saveNewCheckpoint = useCallback(async () => {
    if (!id) return;
    const label = newCheckpointLabel.trim() || `${newCheckpointLat.toFixed(4)}, ${newCheckpointLng.toFixed(4)}`;
    const newCheckpoint = { lat: newCheckpointLat, lng: newCheckpointLng, label, type: newCheckpointType, createdAt: Date.now(), checkins: [] };
    const newCheckpoints = [...checkpoints, newCheckpoint];
    const wasEmpty = checkpoints.length === 0;
    try {
      await groupsApi.update(id, { checkpoints: newCheckpoints });
      setCheckpoints(newCheckpoints);
      setShowAddCheckpointDialog(false);
      showToast('打卡点已设置');
      // 首个打卡点设置后自动返回队伍出发
      if (wasEmpty && groupData?.hikeStatus === 'idle') {
        setTimeout(() => navigate(`/team/${id}`), 800);
      }
    } catch (err: any) {
      showToast(err.message || '设置打卡点失败');
    }
  }, [id, newCheckpointLat, newCheckpointLng, newCheckpointLabel, newCheckpointType, checkpoints, groupData?.hikeStatus, navigate, showToast]);

  // 队长删除打卡点
  const handleDeleteCheckpoint = useCallback(async (cpIndex: number) => {
    if (!id) return;
    const cp = checkpoints[cpIndex];
    const ok = await confirmDialog({
      title: '删除打卡点',
      message: `确认删除打卡点「${cp?.label || `打卡点${cpIndex + 1}`}」？`,
      confirmText: '删除',
      danger: true,
    });
    if (!ok) return;
    const newCheckpoints = checkpoints.filter((_, i) => i !== cpIndex);
    try {
      await groupsApi.update(id, { checkpoints: newCheckpoints });
      setCheckpoints(newCheckpoints);
      setSelectedCp(null);
    } catch (err: any) {
      showToast(err.message || '删除打卡点失败');
    }
  }, [id, checkpoints, confirmDialog, showToast]);

  // 一键定位自己
  const handleLocateMe = useCallback(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const pt: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setMyPos(pt);
        setFlyToPos(pt);
        setFlyVer(v => v + 1);
        // 同时上报位置
        if (id) {
          groupsApi.reportLocation(id, pt[0], pt[1]).catch(() => {});
        }
      },
      () => showToast('无法获取位置，请确保已开启定位权限'),
      { timeout: 10000, enableHighAccuracy: true }
    );
  }, [id]);

  // 默认中心点（深圳）
  const defaultCenter: [number, number] = [22.5431, 114.0579];
  const center = locations.length > 0
    ? [locations[0].lat, locations[0].lng] as [number, number]
    : defaultCenter;

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <Navigation className="w-8 h-8 text-green-500 mx-auto mb-2 animate-pulse" />
          <p className="text-sm text-gray-500 dark:text-gray-300">加载位置中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center px-6">
          <MapPin className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="text-sm text-red-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="h-dvh flex flex-col bg-gray-100 dark:bg-gray-800">
      {/* Header bar — 信息顶栏 */}
      <div className="shrink-0 px-3 py-2.5 bg-white dark:bg-gray-900 shadow-sm z-20 flex items-center gap-3 border-b border-gray-100 dark:border-gray-800">
        <button onClick={() => window.history.back()} className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
          <ArrowLeft className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-extrabold text-gray-800 dark:text-gray-100 text-xs truncate">{groupName || '位置共享'}</h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            {groupData?.hikeStatus === 'hiking' ? (
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            ) : groupData?.hikeStatus === 'completed' ? (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
            )}
            <span className="text-[9px] text-gray-400 dark:text-gray-500">
              {groupData?.hikeStatus === 'hiking' ? `征途中 · ${locations.length}人定位 · ${checkpoints.length}个打卡点` :
               groupData?.hikeStatus === 'completed' ? `已完成 · ${checkpoints.length}个打卡点` :
               isLeader ? `长按地图设打卡点` : '等待出发'}
            </span>
          </div>
        </div>
        {!shareToken && (
          <div className="flex gap-1.5 shrink-0">
            <button onClick={handleShare}
              className="px-2.5 py-1.5 bg-green-600 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 active:scale-95 hover:bg-green-700 transition-colors">
              <Share2 className="w-3 h-3" />分享
            </button>
          </div>
        )}
      </div>

      {/* Info Card — 打卡点 + 签到情况 */}
      {isMember && (
        <div className="shrink-0 mx-3 mt-3 bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-sm dark:shadow-gray-900/50">
          {/* 打卡点标题 */}
          <div className="flex items-center px-4 py-3 border-l-[3px] border-l-blue-400">
            <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <Flag className="w-3.5 h-3.5 text-blue-500" />打卡点
            </h4>
            <span className="ml-auto text-[9px] text-gray-300 dark:text-gray-600">点击签到（500米内）</span>
          </div>

          {checkpoints.length === 0 ? (
            <div className="px-4 pb-4 text-center">
              <div className="w-8 h-8 rounded-xl bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center mx-auto mb-2">
                <Flag className="w-4 h-4 text-gray-300 dark:text-gray-600" />
              </div>
              <p className="text-[10px] text-gray-400 dark:text-gray-500">暂无打卡点</p>
              {isLeader && <p className="text-[9px] text-green-600 dark:text-green-400 font-bold mt-0.5">长按地图位置设置打卡点，队员可点击打卡点进行签到</p>}
            </div>
          ) : (
            <>
            {/* 打卡点 Chip 横滑 */}
            <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
              {checkpoints.map((cp: any, i: number) => {
                const checkins = cp.checkins || [];
                const myCheckedIn = checkins.some((c: any) => c.userId === user?.id);
                const isSelected = selectedCp === i;
                return (
                  <div key={i} className="shrink-0 flex flex-col items-center gap-1">
                    <button
                      onClick={() => {
                        setFlyToPos([cp.lat, cp.lng]);
                        setFlyVer(v => v + 1);
                        setSelectedCp(prev => prev === i ? null : i);
                      }}
                      className={`relative w-9 h-9 rounded-xl flex items-center justify-center text-[13px] font-extrabold transition-all active:scale-90 ${
                        myCheckedIn
                          ? 'bg-red-50 dark:bg-red-900/20 text-red-500'
                          : 'bg-gray-50 dark:bg-gray-800/50 text-gray-400 dark:text-gray-500'
                      } ${isSelected ? 'ring-2 ring-blue-400 dark:ring-blue-500 ring-offset-1 shadow-md' : ''}`}>
                      {myCheckedIn ? '✓' : i + 1}
                      {checkins.length > 0 && (
                        <span className={`absolute -top-1 -right-1 min-w-[14px] h-[14px] rounded-full flex items-center justify-center text-[7px] font-extrabold text-white leading-none ${
                          myCheckedIn ? 'bg-red-500' : 'bg-gray-400'
                        }`}>
                          {checkins.length}
                        </span>
                      )}
                    </button>
                    <span className={`text-[8px] truncate text-center max-w-[40px] leading-tight ${isSelected ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-gray-400 dark:text-gray-500'}`}>
                      {cp.label || `点${i + 1}`}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* 分割线 */}
            <div className="border-t border-gray-50 dark:border-gray-800 mx-4" />

            {/* 选中打卡点的签到情况 */}
            <div className="px-4 py-3">
              <div className="text-[9px] font-bold text-gray-400 dark:text-gray-500 mb-2">
                {selectedCp !== null && checkpoints[selectedCp]
                  ? `${checkpoints[selectedCp].label || `打卡点${selectedCp + 1}`} · 签到情况`
                  : '选择打卡点查看签到情况'}
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {[...(groupData?.members || [])].map((m: any) => {
                  const memberId = m.id || m;
                  const memberName = m.name || m.userName || '?';
                  const avatarColor = m.avatarColor || '#10b981';
                  const checkedIn = selectedCp !== null
                    ? (checkpoints[selectedCp]?.checkins || []).some((c: any) => c.userId === memberId)
                    : false;
                  const highlighted = selectedCp !== null && checkedIn;
                  const loc = locations.find((l: any) => l.userId === memberId);
                  const isMe = memberId === user?.id;
                  const targetPos = loc ? [loc.lat, loc.lng] as [number, number] : (isMe && myPos ? myPos : null);
                  return (
                    <button
                      key={memberId}
                      onClick={() => {
                        if (targetPos) { setFlyToPos(targetPos); setFlyVer(v => v + 1); }
                      }}
                      className={`w-7 h-7 rounded-xl flex items-center justify-center text-[9px] font-extrabold text-white border-2 border-white dark:border-gray-900 shadow-sm transition-all duration-200 cursor-pointer hover:scale-125 active:scale-110 ${!highlighted ? 'opacity-25 grayscale' : ''}`}
                      style={{ backgroundColor: highlighted ? avatarColor : '#9ca3af' }}
                      title={`${memberName}${highlighted ? ' · 已签到' : ' · 未签到'}${targetPos ? ' · 点击定位' : ''}`}
                    >
                      {(memberName || '?')[0]}
                    </button>
                  );
                })}
              </div>
            </div>
            </>
          )}
        </div>
      )}

      {/* Map Card — 全屏地图 */}
      <div className="mx-3 my-3 flex-1 min-h-0 rounded-2xl overflow-hidden shadow-lg dark:shadow-gray-900/30 border-0 bg-white dark:bg-gray-900 relative ring-1 ring-black/[0.04] dark:ring-white/[0.02]">
        <MapContainer center={center} zoom={13} className={`h-full w-full ${addCheckpointMode ? 'cursor-crosshair' : ''}`} zoomControl={false}>
          <TileLayer
            attribution='&copy; 高德地图'
            url="https://wprd01.is.autonavi.com/appmaptile?x={x}&y={y}&z={z}&lang=zh_cn&size=1&scl=1&style=7"
          />
          <FitBounds locations={locations} checkpoints={checkpoints} />
          <FlyTo pos={flyToPos} ver={flyVer} />
          <MapLongPress isLeader={isLeader} onLongPress={handleMapLongPress} />
          <AddCheckpointClick enabled={addCheckpointMode} onAdd={(lat, lng) => { handleMapLongPress(lat, lng); setAddCheckpointMode(false); }} />

          {/* 成员位置标记 */}
          {locations.map((loc, i) => (
            <Marker key={`loc-${i}`} position={[loc.lat, loc.lng]} icon={loc.sos ? sosIcon : teammateIcon}>
              <Popup>
                <div className="text-center">
                  <p className="font-bold text-xs">{loc.userName}{loc.sos ? ' 🆘' : ''}</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-300">
                    {loc.updatedAt ? `更新于 ${new Date(loc.updatedAt).toLocaleTimeString('zh-CN')}` : ''}
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* 自己的位置（蓝色圆点） */}
          {myPos && (
            <Marker position={myPos} icon={myPosIcon}>
              <Popup>
                <div className="text-center">
                  <p className="font-bold text-sm">我的位置</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">{myPos[0].toFixed(5)}, {myPos[1].toFixed(5)}</p>
                </div>
              </Popup>
            </Marker>
          )}

          {/* 打卡点标记（彩色小旗+签到人数，仅队友可见） */}
          {isMember && (
            <MemoCheckpointMarkers
              checkpoints={checkpoints}
              icons={flagIcons}
              locations={locations}
              onSelect={onCheckpointClick}
              onFlyToPos={setFlyToPos}
              onFlyVer={setFlyVer}
              isLeader={isLeader}
              onDeleteCheckpoint={handleDeleteCheckpoint}
            />
          )}

          {/* GPS 轨迹线 */}
          {track.length > 1 && (
            <Polyline
              positions={track.map(p => [p.lat, p.lng] as [number, number])}
              pathOptions={{ color: '#3B82FD', weight: 4, opacity: 0.5 }}
            />
          )}
        </MapContainer>

        {/* 右侧按钮组 */}
        <div className="absolute top-3 right-3 z-[999] flex flex-col gap-2">
          {/* 一键定位按钮 */}
          <button onClick={handleLocateMe}
            className="w-9 h-9 bg-white dark:bg-gray-900 rounded-xl shadow-lg flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-95 transition-all"
            style={{ pointerEvents: 'auto' }}>
            <LocateFixed className="w-4 h-4 text-blue-500" />
          </button>
          {/* 添加打卡点按钮（仅队长可见，且处于等待出发状态） */}
          {isLeader && groupData?.hikeStatus === 'idle' && (
            <button
              onClick={() => setAddCheckpointMode(prev => !prev)}
              className={`w-9 h-9 rounded-xl shadow-lg flex items-center justify-center active:scale-95 transition-all ${
                addCheckpointMode
                  ? 'bg-amber-500 text-white'
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
              style={{ pointerEvents: 'auto' }}
              title={addCheckpointMode ? '取消添加' : '添加打卡点'}>
              {addCheckpointMode ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </button>
          )}
        </div>

        {/* 无位置提示 */}
        {locations.length === 0 && checkpoints.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-gray-900/50 backdrop-blur-[1px] z-[5] pointer-events-none rounded-2xl">
            <div className="text-center">
              <Map className="w-10 h-10 text-gray-200 dark:text-gray-700 mx-auto mb-2" />
              <p className="text-xs text-gray-400 dark:text-gray-500 font-bold">暂无成员上报位置</p>
              <p className="text-[9px] text-gray-300 dark:text-gray-600 mt-1">出发后位置将自动在此显示</p>
            </div>
          </div>
        )}
      </div>
    </div>

    {/* ── 浮层 Modals（在 flex 容器外）── */}
    <>

    {/* 分享链接展示 */}
      {shareLink && (
        <div className="px-4 py-3 bg-green-50 dark:bg-green-900/20 rounded-t-xl mx-3">
          <p className="text-[10px] text-green-600 dark:text-green-400 mb-1.5 font-bold">分享链接（发送给紧急联系人）：</p>
          <div className="flex items-center gap-2">
            <input readOnly value={shareLink}
              className="flex-1 px-3 py-1.5 bg-white dark:bg-gray-900 rounded-lg text-[10px] text-gray-600 dark:text-gray-300 border border-green-100 dark:border-green-900/50 outline-none" />
            <button onClick={() => { navigator.clipboard.writeText(shareLink); showToast('已复制'); }}
              className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-[10px] font-bold hover:bg-green-700 transition-colors">复制</button>
          </div>
        </div>
      )}
      {/* 打卡点已设置 → 返回队伍出发 */}
      {isLeader && checkpoints.length > 0 && groupData?.hikeStatus === 'idle' && (
        <div className="px-4 py-3 bg-green-50 dark:bg-green-900/20 mx-3 rounded-xl flex items-center justify-between gap-2">
          <span className="text-[10px] text-green-700 dark:text-green-300 font-bold flex items-center gap-1">
            ✅ 已设置 {checkpoints.length} 个打卡点
          </span>
          <button onClick={() => navigate(`/team/${id}`)}
            className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 hover:bg-green-700 active:scale-95 transition-all">
            返回队伍出发 →
          </button>
        </div>
      )}
      {/* 队长提示：如何添加打卡点 */}
      {isLeader && checkpoints.length === 0 && groupData?.hikeStatus === 'idle' && !addCheckpointMode && (
        <div className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 mx-3 rounded-xl">
          <p className="text-[11px] text-blue-700 dark:text-blue-300 font-bold flex items-center gap-2 mb-2">
            <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] font-extrabold flex items-center justify-center shrink-0">?</span>
            如何添加打卡点？
          </p>
          <p className="text-[10px] text-blue-600 dark:text-blue-400 leading-relaxed">
            点击地图右上角的 <span className="font-bold text-green-600 dark:text-green-400">绿色「+」按钮</span>，然后点击地图上的位置即可添加打卡点。
          </p>
        </div>
      )}
      {/* 签到弹窗 */}
      {showCheckinModal && currentCheckpoint !== null && checkpoints[currentCheckpoint] && (
        <div className="fixed inset-0 z-[1000] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCheckinModal(false)} />
          <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-t-3xl p-5 pb-8 space-y-4 max-h-[85vh] overflow-y-auto" style={{ animation: 'slideUp 0.3s ease-out' }}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                打卡签到 · {checkpoints[currentCheckpoint].label || `打卡点${currentCheckpoint + 1}`}
              </h2>
              <button onClick={() => setShowCheckinModal(false)} className="text-gray-400 dark:text-gray-500"><X className="w-5 h-5" /></button>
            </div>

            {/* 位置信息 */}
            <div className="bg-gray-50 dark:bg-gray-950 rounded-xl p-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-green-500 shrink-0" />
              <span className="text-xs text-gray-500 dark:text-gray-300">
                {checkpoints[currentCheckpoint].lat.toFixed(5)}, {checkpoints[currentCheckpoint].lng.toFixed(5)}
              </span>
            </div>

            {/* 备注 */}
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-300 mb-1 block">记录此刻的心情</label>
              <textarea
                value={checkinNote}
                onChange={e => setCheckinNote(e.target.value)}
                placeholder="吹着山风，感觉整个人都被治愈了..."
                rows={3}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-700 text-sm outline-none focus:border-green-500 resize-none"
              />
            </div>

            {/* 照片上传 */}
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-300 mb-1 block">
                签到照片（{checkinPhotos.length}/3）
              </label>
              {checkinPhotos.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {checkinPhotos.map((url, i) => (
                    <div key={i} className="aspect-square rounded-xl overflow-hidden relative bg-gray-100 dark:bg-gray-800">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setCheckinPhotos(prev => prev.filter((_, j) => j !== i))}
                        className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center text-white text-xs"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {checkinPhotos.length < 3 && (
                <div>
                  <input
                    ref={checkinPhotoInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleCheckinPhotoUpload}
                  />
                  <button
                    type="button"
                    onClick={() => checkinPhotoInputRef.current?.click()}
                    disabled={uploadingCheckinPhoto}
                    className="flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-950 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-sm text-gray-400 dark:text-gray-500 hover:border-green-400 hover:text-green-600 transition-colors disabled:opacity-50"
                  >
                    {uploadingCheckinPhoto ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    上传照片
                  </button>
                </div>
              )}
            </div>

            {/* 签到按钮 */}
            <button
              onClick={doCheckin}
              disabled={checkingIn}
              className="w-full py-3 bg-green-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-transform"
            >
              {checkingIn ? (
                <><RefreshCw className="w-4 h-4 animate-spin" />签到中...</>
              ) : (
                <><CheckCircle className="w-4 h-4" />打卡签到</>
              )}
            </button>
          </div>
        </div>
      )}
      {/* 添加打卡点弹窗 */}
      {showAddCheckpointDialog && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAddCheckpointDialog(false)} />
          <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl p-5 max-h-[85vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">添加打卡点</h2>
              <button onClick={() => setShowAddCheckpointDialog(false)} className="text-gray-400 dark:text-gray-500"><X className="w-5 h-5" /></button>
            </div>

            {/* 位置信息 */}
            <div className="bg-gray-50 dark:bg-gray-950 rounded-xl p-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-green-500 shrink-0" />
              <span className="text-xs text-gray-500 dark:text-gray-300">
                {newCheckpointLat.toFixed(5)}, {newCheckpointLng.toFixed(5)}
              </span>
            </div>

            {/* 名称输入 */}
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-300 mb-1 block">打卡点名称</label>
              <div className="relative">
                <input
                  value={newCheckpointLabel}
                  onChange={e => setNewCheckpointLabel(e.target.value)}
                  placeholder="输入名称..."
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-700 text-sm outline-none focus:border-green-500"
                />
                {loadingLocationName && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <RefreshCw className="w-4 h-4 text-gray-400 dark:text-gray-500 animate-spin" />
                  </div>
                )}
              </div>
            </div>

            {/* 打卡点类型选择 */}
            <div className="flex gap-1.5 mb-3">
              {[
                { key: 'meeting', label: '集合点', color: '#6366f1', icon: '📍' },
                { key: 'start', label: '起点', color: '#10b981', icon: '🚩' },
                { key: 'end', label: '终点', color: '#ef4444', icon: '🏁' },
                { key: 'checkpoint', label: '打卡点', color: '#f59e0b', icon: '📌' },
              ].map(({ key, label, color, icon }) => (
                <button key={key}
                  onClick={() => setNewCheckpointType(key)}
                  className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-all ${
                    newCheckpointType === key
                      ? 'text-white shadow-sm '
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-300'
                  }`}
                  style={newCheckpointType === key ? { background: color } : {}}>
                  {icon} {label}
                </button>
              ))}
            </div>

            {/* 保存按钮 */}
            <button
              onClick={saveNewCheckpoint}
              className="w-full py-3 bg-green-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            >
              <Flag className="w-4 h-4" />确认添加
            </button>
          </div>
        </div>
      )}
      {ConfirmDialog}
    </>
    </>
  );
}

