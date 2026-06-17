import { Users, Crown, User } from 'lucide-react';

interface MemberPanelProps {
  members: any[];
  checkpoints: any[];
  hikeStatus: string;
  user: { id: string } | null;
  isLeader: boolean;
  onSelectMember: (member: any) => void;
}

export default function MemberPanel({
  members, checkpoints, hikeStatus, user, isLeader, onSelectMember,
}: MemberPanelProps) {
  return (
    <div className="px-4 py-3">
      {members.length > 0 ? (
        <div className="space-y-2 mb-4">
          {members.map((m: any, i: number) => {
            const memberId = typeof m === 'string' ? m : m.id;
            const memberName = typeof m === 'string' ? '未知' : m.name || '未知';
            const memberAvatar = typeof m === 'string' ? '' : m.avatar || m.avatarUrl || '';
            const isLeaderMember = typeof m === 'object' && m.role === 'leader';
            const isMe = memberId === user?.id;
            return (
              <div key={i}
                onClick={() => {
                  if (isMe) return;
                  const memberInfo = typeof m === 'object' ? m : { id: m, name: '未知' };
                  onSelectMember({ ...memberInfo, role: m.role, avatarUrl: memberAvatar });
                }}
                className={`flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-900 rounded-xl shadow-sm dark:shadow-gray-900/50 ${!isMe ? 'cursor-pointer hover:bg-gray-50 dark:bg-gray-800/50 active:scale-[0.98] transition-all' : ''}`}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                  style={{ background: isLeaderMember ? '#f59e0b' : '#10b981' }}>
                  {memberAvatar ? <img src={memberAvatar} className="w-10 h-10 rounded-full object-cover" alt="" /> : memberName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">{memberName}</span>
                    {isLeaderMember && <Crown className="w-3.5 h-3.5 text-amber-500" />}
                    {isMe && <span className="px-1.5 py-0 bg-green-50 text-green-600 rounded text-[9px] font-bold">我</span>}
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{isLeaderMember ? '队长' : '队员'}{!isMe && ' · 点击查看'}</p>
                  {hikeStatus === 'hiking' && (
                    <div className="flex items-center gap-1 mt-1">
                      {checkpoints.map((cp: any, ci: number) => {
                        const checked = (cp.checkins || []).some((c: any) => c.userId === memberId);
                        return <span key={ci} className={`w-2 h-2 rounded-full ${checked ? 'bg-green-400' : 'bg-gray-200'}`} />;
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 text-center">
          <Users className="w-8 h-8 text-gray-200 mx-auto mb-2" />
          <p className="text-xs text-gray-400 dark:text-gray-500">暂无成员</p>
        </div>
      )}
    </div>
  );
}

/** 成员信息弹窗 */
interface MemberModalProps {
  member: any;
  isLeader: boolean;
  userId: string | undefined;
  onTransferLeader: (member: any) => void;
  onViewProfile: (userId: string) => void;
  onClose: () => void;
}

export function MemberModal({ member, isLeader, userId, onTransferLeader, onViewProfile, onClose }: MemberModalProps) {
  const isMe = member.id === userId;
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-5" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-white shrink-0"
            style={{ background: member.role === 'leader' ? '#f59e0b' : '#10b981' }}>
            {member.avatarUrl ? <img src={member.avatarUrl} className="w-14 h-14 rounded-full object-cover" alt="" /> : (member.name || '?')[0]}
          </div>
          <div>
            <h3 className="font-bold text-gray-800 dark:text-gray-200">{member.name || '未知'}</h3>
            <p className="text-xs text-gray-400 dark:text-gray-500">{member.role === 'leader' ? '👑 队长' : '🥾 队员'}</p>
          </div>
        </div>
        {!isMe && (
          <div className="flex gap-2">
            <button onClick={() => onViewProfile(member.id)}
              className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center justify-center gap-1.5">
              <User className="w-4 h-4" />查看信息
            </button>
            {isLeader && member.role !== 'leader' && (
              <button onClick={() => onTransferLeader(member)}
                className="flex-1 py-2.5 bg-amber-500 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-1.5">
                <Crown className="w-4 h-4" />移交队长
              </button>
            )}
          </div>
        )}
        <button onClick={onClose}
          className="w-full mt-2 py-2.5 text-sm text-gray-400 dark:text-gray-500 font-medium">关闭</button>
      </div>
    </div>
  );
}
