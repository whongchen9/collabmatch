import { Flag } from 'lucide-react';

interface NoCheckpointModalProps {
  onClose: () => void;
  onGoToMap: () => void;
}

export default function NoCheckpointModal({ onClose, onGoToMap }: NoCheckpointModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-5">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <Flag className="w-5 h-5 text-amber-500" />
          <h3 className="font-bold text-gray-800 dark:text-gray-200">设置打卡点</h3>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">出发前需要设置至少 1 个打卡点，让队友们沿途签到。</p>
        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-xl text-sm font-bold">取消</button>
          <button onClick={onGoToMap}
            className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-bold">去设置</button>
        </div>
      </div>
    </div>
  );
}
