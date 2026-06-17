import { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

interface SidePanelProps {
  title: string;
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export default function SidePanel({ title, visible, onClose, children }: SidePanelProps) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (visible) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [visible, handleKeyDown]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[60] flex">
      {/* Semi-transparent backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      {/* Slide-in panel from left */}
      <div
        className="relative w-[85%] max-w-[360px] h-full bg-white dark:bg-gray-900 shadow-2xl flex flex-col animate-slide-in-left overflow-hidden"
        style={{ animation: 'slideInLeft 0.25s ease-out' }}
      >
        {/* Header */}
        <div className="shrink-0 px-4 py-3 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200">{title}</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {/* Content */}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
