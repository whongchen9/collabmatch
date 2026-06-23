import { useEffect, useCallback, useRef } from 'react';

interface InlinePanelProps {
  title: string;
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  sidebarWidth?: number; // 右侧栏宽度
}

export default function InlinePanel({ 
  title, 
  visible, 
  onClose, 
  children,
  sidebarWidth = 44 // 默认 44px (6px margin + 32px icon + 6px gap)
}: InlinePanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  // 点击面板外部关闭 — 用 composedPath 避免 React 重渲染后 ref 失效
  // 使用 click 而非 mousedown，避免与按钮 click 事件冲突导致面板刚打开就被关闭
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (panelRef.current && !e.composedPath().includes(panelRef.current)) {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (visible) {
      document.addEventListener('keydown', handleKeyDown);
      // 延迟添加 click 监听，避免触发面板打开的同一个事件
      const timer = setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 0);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [visible, handleKeyDown, handleClickOutside]);

  if (!visible) return null;

  return (
    <div 
      ref={panelRef}
      className="absolute z-30 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col animate-slide-in-right"
      style={{
        right: `${sidebarWidth + 8}px`, // 右侧栏左边 + 8px 间隙
        top: '60px', // header 下方
        bottom: '80px', // 输入框上方
        left: '12px', // 左边留 12px 间隙
        maxWidth: 'calc(100% - 60px)',
      }}
    >
      {/* Header */}
      <div className="shrink-0 px-4 py-3 flex items-center border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
        <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200">{title}</h2>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4">
        {children}
      </div>
    </div>
  );
}
