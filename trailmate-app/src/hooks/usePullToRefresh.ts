import { useState, useRef, useCallback, useEffect } from 'react';

interface PullToRefreshOptions {
  /** 触发刷新的下拉距离阈值（像素） */
  threshold?: number;
  /** 下拉阻尼系数，0-1 之间 */
  damping?: number;
  /** 最大下拉距离（像素） */
  maxDistance?: number;
}

interface PullToRefreshResult {
  refreshing: boolean;
  pullDistance: number;
  containerRef: React.RefObject<HTMLDivElement>;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
}

/**
 * 下拉刷新 Hook，封装触摸事件处理与刷新状态管理。
 * 将返回的 containerRef 绑定到可滚动容器，并在 JSX 中渲染指示器即可。
 */
export function usePullToRefresh(
  onRefresh: () => Promise<void>,
  options: PullToRefreshOptions = {}
): PullToRefreshResult {
  const { threshold = 50, damping = 0.5, maxDistance = 80 } = options;

  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const pullingRef = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    pullingRef.current = false;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const diff = e.touches[0].clientY - touchStartY.current;
    if (diff > 0 && (containerRef.current?.scrollTop || 0) <= 0) {
      pullingRef.current = true;
      setPullDistance(Math.min(diff * damping, maxDistance));
    }
  }, [damping, maxDistance]);

  const handleTouchEnd = useCallback(async () => {
    if (pullingRef.current && pullDistance > threshold) {
      setRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    }
    setPullDistance(0);
    pullingRef.current = false;
  }, [pullDistance, threshold, onRefresh]);

  // 组件卸载时重置状态，避免内存泄漏
  useEffect(() => {
    return () => {
      setPullDistance(0);
      setRefreshing(false);
    };
  }, []);

  return {
    refreshing,
    pullDistance,
    containerRef,
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };
}
