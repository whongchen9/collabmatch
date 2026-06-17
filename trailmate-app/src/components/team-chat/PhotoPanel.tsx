import { Image as ImageIcon, Upload, Trash2 } from 'lucide-react';

interface PhotoPanelProps {
  photos: string[];
  uploading: boolean;
  isLeader: boolean;
  onUpload: (file: File) => void;
  onDelete: (index: number) => void;
}

const MAX_PHOTOS = 20;
const MAX_SIZE_MB = 2;

export default function PhotoPanel({ photos, uploading, isLeader, onUpload, onDelete }: PhotoPanelProps) {
  const canUpload = photos.length < MAX_PHOTOS && isLeader;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      alert(`图片不能超过 ${MAX_SIZE_MB}MB`);
      e.target.value = '';
      return;
    }
    onUpload(file);
    e.target.value = '';
  };

  return (
    <div className="flex flex-col h-full">

      {/* ═══ 上传按钮 ═══ */}
      {canUpload && (
        <div className="shrink-0 px-3.5 mt-3">
          <label className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30 text-gray-400 dark:text-gray-500 text-[11px] font-bold cursor-pointer hover:border-green-400 hover:text-green-600 dark:hover:text-green-400 transition-colors">
            <Upload className="w-4 h-4" />
            {uploading ? '压缩上传中…' : '点击上传照片'}
            <input type="file" accept="image/*" onChange={handleFileChange} disabled={uploading} className="hidden" />
          </label>
          <p className="text-center text-[9px] text-gray-300 dark:text-gray-600 mt-1">
            单张 ≤ {MAX_SIZE_MB}MB · 共 {MAX_PHOTOS} 张上限
          </p>
        </div>
      )}
      {!canUpload && !isLeader && (
        <div className="shrink-0 px-3.5 mt-3 text-center">
          <p className="text-[10px] text-gray-400 dark:text-gray-500">仅队长可上传照片</p>
        </div>
      )}

      {/* ═══ 照片网格 ═══ */}
      <div className="flex-1 overflow-y-auto px-3.5 pt-3 pb-2">
        {photos.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo, i) => (
              <div key={i} className="group relative aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 shadow-sm">
                <img src={photo} alt={`照片 ${i + 1}`}
                  className="w-full h-full object-cover" />
                {isLeader && (
                  <button
                    onClick={() => onDelete(i)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-lg bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center mb-3">
              <ImageIcon className="w-6 h-6 text-gray-300 dark:text-gray-600" />
            </div>
            <p className="text-[11px] text-gray-400 dark:text-gray-500">还没有上传照片</p>
            {!isLeader && <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-1">等待队长上传队伍照片</p>}
          </div>
        )}
      </div>

    </div>
  );
}
