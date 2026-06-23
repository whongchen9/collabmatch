import { useCallback, useEffect, useRef } from 'react';
import { useStore } from '@/store';
import { signalsApi, userLocationApi } from '@/api';

const POLL_INTERVAL = 10000;
const LOCATION_INTERVAL = 30000;

export function useSignals(lat: number | null, lng: number | null, range: number) {
  const pollRef = useRef<number>(0);
  const locRef = useRef<number>(0);
  const { myActiveSignal, showToast } = useStore();
  const setMyActiveSignal = useStore(s => s.setMyActiveSignal);
  const setSignals = useStore(s => s.setSignals);

  const sendSignal = useCallback(async (type: 'help' | 'sos', signalLat: number, signalLng: number) => {
    try {
      const res = await signalsApi.send(type, signalLat, signalLng);
      setMyActiveSignal(res.signal);
      showToast?.(`${type === 'sos' ? '求救' : '求助'}信号已发送，30分钟内有效`);
      return res.signal;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '发送失败';
      showToast?.(message);
      return null;
    }
  }, [setMyActiveSignal, showToast]);

  const clearSignal = useCallback(() => {
    setMyActiveSignal(null);
  }, [setMyActiveSignal]);

  // Poll nearby signals
  useEffect(() => {
    if (!lat || !lng) return;
    const poll = async () => {
      try {
        const res = await signalsApi.getNearby(lat, lng, range);
        setSignals(res.signals || []);
      } catch {
        // Silently ignore poll errors
      }
    };
    poll();
    pollRef.current = window.setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(pollRef.current);
  }, [lat, lng, range, setSignals]);

  // Report location periodically
  useEffect(() => {
    if (!lat || !lng) return;
    locRef.current = window.setInterval(() => {
      userLocationApi.reportLocation(lat, lng).catch(() => {});
    }, LOCATION_INTERVAL);
    return () => clearInterval(locRef.current);
  }, [lat, lng]);

  // Clear expired signals periodically
  useEffect(() => {
    const t = setInterval(() => {
      useStore.getState().clearExpiredSignals();
    }, 30000);
    return () => clearInterval(t);
  }, []);

  // Auto-clear my active signal after TTL
  useEffect(() => {
    if (!myActiveSignal) return;
    const remaining = myActiveSignal.expiresAt - Date.now();
    if (remaining <= 0) { setMyActiveSignal(null); return; }
    const t = setTimeout(() => setMyActiveSignal(null), remaining);
    return () => clearTimeout(t);
  }, [myActiveSignal, setMyActiveSignal]);

  return { sendSignal, clearSignal };
}
