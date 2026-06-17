import { useEffect, useCallback, useRef } from 'react';
import { X } from 'lucide-react';

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

  // 点击面板外部关闭
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (visible) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
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
      <div className="shrink-0 px-4 py-3 flex items-center justify-between border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
        <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200">{title}</h2>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4">
        {children}
      </div>
    </div>
  );
}
