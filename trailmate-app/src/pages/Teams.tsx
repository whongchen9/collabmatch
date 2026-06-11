import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, MessageCircle } from 'lucide-react';
import { useStore } from '@/store';

export default function Teams() {
  const { groups, loadGroups } = useStore();
  const navigate = useNavigate();

  useEffect(() => { loadGroups(); }, [loadGroups]);

  return (
    <div className="pb-24" style={{ background: '#faf7f2', minHeight: '100vh' }}>
      <div className="px-5 pt-6 pb-4 bg-white sticky top-0 z-10 shadow-sm">
        <h1 className="text-xl font-bold text-gray-800">我的队伍</h1>
      </div>

      <div className="px-5 mt-4 space-y-3">
        {groups.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center mt-8">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">还没有加入任何队伍</p>
            <button onClick={() => navigate('/')} className="mt-3 text-green-600 text-sm font-medium">
              去匹配队友
            </button>
          </div>
        ) : (
          groups.map(group => {
            const lastMsg = group.messages?.[group.messages.length - 1];
            return (
              <button
                key={group.id}
                onClick={() => navigate(`/team/${group.id}`)}
                className="w-full bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3 text-left hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: group.avatarColor || 'linear-gradient(135deg, #4ade80, #16a34a)' }}>
                  {group.emoji || '🥾'}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-800 text-sm truncate">{group.name}</h3>
                  {lastMsg && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">
                      {lastMsg.type === 'system' ? '📢 ' : ''}{lastMsg.content}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Users className="w-3 h-3" />{group.members?.length || 0}
                  </div>
                  {group.status && (
                    <span className="text-xs text-green-600 mt-0.5 block">
                      {group.status === 'forming' ? '组队中' : group.status === 'ready' ? '已就绪' : group.status === 'ongoing' ? '进行中' : '已完成'}
                    </span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
