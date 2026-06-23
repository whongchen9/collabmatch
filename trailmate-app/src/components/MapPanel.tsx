import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Group } from '@/types';

// Fix leaflet default icon
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const flagIcon = L.divIcon({
  html: `<div style="width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:16px;">📌</div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 24],
  className: '',
});

interface MapPanelProps {
  checkpoints: NonNullable<Group['checkpoints']>;
  visible: boolean;  // used to trigger invalidateSize
}

export default function MapPanel({ checkpoints, visible }: MapPanelProps) {
  const mapRef = useRef<L.Map | null>(null);

  // Invalidate size when panel opens
  useEffect(() => {
    if (visible && mapRef.current) {
      setTimeout(() => mapRef.current?.invalidateSize(), 200);
    }
  }, [visible]);

  const defaultCenter: [number, number] = checkpoints.length > 0
    ? [checkpoints[0].lat, checkpoints[0].lng]
    : [39.9042, 116.4074]; // 默认北京

  return (
    <div className="w-full h-64 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
      <MapContainer
        center={defaultCenter}
        zoom={13}
        className="h-full w-full"
        zoomControl={false}
        ref={mapRef}
      >
        <TileLayer
          attribution=''
          url="https://wprd01.is.autonavi.com/appmaptile?x={x}&y={y}&z={z}&lang=zh_cn&size=1&scl=1&style=7"
        />
        {checkpoints.map((cp, i) => (
          <Marker key={i} position={[cp.lat, cp.lng]} icon={flagIcon}>
            <Popup>
              <div style={{ fontSize: 12 }}>
                <strong>{cp.label || `打卡点 ${i + 1}`}</strong>
                <br />
                签到: {cp.checkins?.length || 0}人
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
