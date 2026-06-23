import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, UserX } from 'lucide-react';
import { useStore } from '@/store';

export default function BlockedUsers() {
  const navigate = useNavigate();
  const { blockedUsers, unblockUser, showToast } = useStore();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-800/50">
      <div className="bg-white dark:bg-gray-900 px-4 py-3 flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="text-gray-600 dark:text-gray-400">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-bold text-gray-800 dark:text-gray-200">屏蔽列表</h1>
      </div>

      <div className="px-4 py-5">
        {blockedUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Shield className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-sm text-gray-400 dark:text-gray-500">暂无屏蔽的用户</p>
            <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">在聊天中长按消息可以屏蔽用户</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-xl overflow-hidden shadow-sm">
            {blockedUsers.map((u, i) => (
              <div key={u.userId} className={`flex items-center gap-3 px-4 py-3 ${i < blockedUsers.length - 1 ? 'border-b border-gray-50 dark:border-gray-800' : ''}`}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0"
                  style={{ background: u.avatarColor || '#6b7280' }}>
                  {u.userName?.[0] || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">{u.userName}</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">屏蔽于 {new Date(u.blockedAt).toLocaleDateString()}</p>
                </div>
                <button onClick={() => { unblockUser(u.userId); showToast(`已取消屏蔽 ${u.userName}`); }}
                  className="px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-1">
                  <UserX className="w-3.5 h-3.5" />取消屏蔽
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
