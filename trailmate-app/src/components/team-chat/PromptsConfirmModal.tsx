import { RefreshCw } from 'lucide-react';

interface PromptsConfirmModalProps {
  editPromptsText: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function PromptsConfirmModal({
  editPromptsText, onConfirm, onCancel,
}: PromptsConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-5">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <RefreshCw className="w-5 h-5 text-green-600" />
          <h3 className="font-bold text-gray-800 dark:text-gray-200">更新匹配提示词</h3>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">保存后将自动发起新匹配，为队伍寻找更合适的队友。确认更新吗？</p>
        <div className="flex flex-wrap gap-1.5 mb-4 p-3 bg-green-50 rounded-xl">
          {editPromptsText.split(/[、,，]/).map(s => s.trim()).filter(Boolean).map((p, i) => (
            <span key={i} className="px-2 py-0.5 bg-white dark:bg-gray-900 text-green-600 rounded-full text-[10px] font-medium">{p}</span>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel}
            className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-xl text-sm font-bold">取消</button>
          <button onClick={onConfirm}
            className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-bold">确认更新并匹配</button>
        </div>
      </div>
    </div>
  );
}
