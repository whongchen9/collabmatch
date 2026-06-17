import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import { PackageOpen } from 'lucide-react';

interface EmptyProps {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export default function Empty({
  icon: Icon = PackageOpen,
  title = '暂无数据',
  description,
  action,
  className,
}: EmptyProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4 text-center', className)}>
      <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-gray-300 dark:text-gray-600" />
      </div>
      {title && <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{title}</h3>}
      {description && <p className="text-xs text-gray-400 dark:text-gray-500 max-w-xs">{description}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium shadow-sm active:scale-95 transition-transform"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
