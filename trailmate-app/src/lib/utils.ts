import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import DOMPurify from 'dompurify';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Haversine 公式计算两点间距离（米） */
export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** 使用 DOMPurify 安全清理 HTML，防止 XSS */
export function sanitizeHTML(html: string): string {
  if (!html) return '';
  return DOMPurify.sanitize(html, {
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
  });
}

export function isHTML(str: string): boolean {
  return /<[a-z][\s\S]*>/i.test(str);
}

/** 格式化消息时间 */
export function formatMsgTime(time: string | number): string {
  const date = new Date(time);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const timeStr = `${hh}:${mm}`;
  if (msgDate.getTime() === today.getTime()) return timeStr;
  if (msgDate.getTime() === yesterday.getTime()) return `昨天 ${timeStr}`;
  const MM = String(date.getMonth() + 1).padStart(2, '0');
  const DD = String(date.getDate()).padStart(2, '0');
  return `${MM}/${DD} ${timeStr}`;
}

/** 轨迹点类型 */
export interface TrackPoint {
  lat: number;
  lng: number;
  timestamp: number;
}

/** 计算轨迹统计：距离(米)、时长(秒)、配速(秒/公里) */
export function calcTrackStats(track: TrackPoint[]): { distance: number; duration: number; pace: number } {
  if (!track || track.length <= 1) {
    return { distance: 0, duration: 0, pace: 0 };
  }
  const distance = track.slice(1).reduce(
    (sum, pt, i) => sum + haversineDistance(track[i].lat, track[i].lng, pt.lat, pt.lng),
    0
  );
  const duration = (track[track.length - 1].timestamp - track[0].timestamp) / 1000;
  const pace = distance > 0 && duration > 0 ? duration / (distance / 1000) : 0;
  return { distance, duration, pace };
}
