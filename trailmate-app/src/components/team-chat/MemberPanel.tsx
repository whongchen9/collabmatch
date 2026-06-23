import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Crown, Flag, Plus, X, User as UserIcon, Sparkles, Shield, Flag as FlagIcon } from 'lucide-react';
import type { User, Group, ReportReason } from '@/types';
import { useStore } from '@/store';
import { reportApi } from '@/api';

type Member = Group['members'][number];
type Checkpoint = NonNullable<Group['checkpoints']>[number];
type Checkin = NonNullable<Checkpoint['checkins']>[number];

interface MatchedUser {
  user: { id: string; name: string; avatar?: string; avatarColor?: string };
  matchPct: number;
  reason: string;
}

interface MemberPanelProps {
  members: Group['members'];
  checkpoints: NonNullable<Group['checkpoints']>;
  hikeStatus: string;
  user: User | null;
  isLeader: boolean;
  isMember: boolean;
  onSelectMember: (member: Member) => void;
  onClaimLeader?: () => void;
  maxSlots?: number;
  onAddSlot?: () => void;
  matchedUsers?: MatchedUser[];
  onInviteToSlot?: (userId: string) => void;
  // 匹配开关 + 提示词
  matchingEnabled?: boolean;
  onToggleMatching?: (v: boolean) => void;
  editingPrompts?: boolean;
  editPromptsText?: string;
  setEditPromptsText?: (v: string) => void;
  onSavePrompts?: () => void;
  onCancelPrompts?: () => void;
  onStartEditPrompts?: () => void;
  groupPrompts?: string[];
  intentRawInput?: string;
}

const SLOT_GRADIENTS = [
  'linear-gradient(135deg, #3b82f6, #6366f1)',
  'linear-gradient(135deg, #10b981, #06b6d4)',
  'linear-gradient(135deg, #f59e0b, #ef4444)',
  'linear-gradient(135deg, #ec4899, #f43f5e)',
  'linear-gradient(135deg, #8b5cf6, #6366f1)',
  'linear-gradient(135deg, #06b6d4, #3b82f6)',
  'linear-gradient(135deg, #84cc16, #22c55e)',
  'linear-gradient(135deg, #f97316, #eab308)',
];

export function MemberModal({ member, visible, onClose, onTransfer, isLeader }: {
  member: Member | undefined;
  visible: boolean;
  onClose: () => void;
  onTransfer?: (member: Member) => void;
  isLeader?: boolean;
}) {
  const navigate = useNavigate();
  const { blockUser, isBlocked, unblockUser, showToast } = useStore();
  const [reportMode, setReportMode] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason>('spam');
  const [reportDesc, setReportDesc] = useState('');

  if (!visible || !member) return null;
  const memberName = member?.name || '未知';
  const memberAvatar = member?.avatar || member?.avatarUrl || '';
  const memberRole = member?.role;
  const isLeaderMember = memberRole === 'leader';
  const canTransfer = !!isLeader && !isLeaderMember && !!onTransfer;
  const blocked = isBlocked(member.id);

  const handleReport = async () => {
    try {
      await reportApi.reportUser({ targetUserId: member.id, reason: reportReason, description: reportDesc || undefined });
      showToast('举报已提交，我们会尽快处理');
    } catch {
      showToast('举报提交失败，请稍后重试');
    }
    setReportMode(false);
    setReportDesc('');
    setReportReason('spam');
    onClose();
  };

  const handleBlock = () => {
    if (blocked) {
      unblockUser(member.id);
      showToast(`已取消屏蔽 ${memberName}`);
    } else {
      blockUser(member.id, memberName, member.avatarColor);
      showToast(`已屏蔽 ${memberName}`);
    }
    onClose();
  };

  if (reportMode) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-5" onClick={onClose}>
        <div className="w-full max-w-xs bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-gray-800 dark:text-gray-200">举报 {memberName}</h3>
            <button onClick={() => setReportMode(false)} className="text-gray-400"><X className="w-4 h-4" /></button>
          </div>
          <div className="space-y-2 mb-4">
            {[
              { value: 'spam' as const, label: '垃圾广告' },
              { value: 'abuse' as const, label: '辱骂攻击' },
              { value: 'inappropriate' as const, label: '不当内容' },
              { value: 'illegal' as const, label: '违法信息' },
              { value: 'other' as const, label: '其他' },
            ].map(r => (
              <button key={r.value} onClick={() => setReportReason(r.value)}
                className={`w-full px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-colors ${
                  reportReason === r.value
                    ? 'bg-red-50 dark:bg-red-900/20 text-red-600 border border-red-200 dark:border-red-800'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-transparent'
                }`}>
                {r.label}
              </button>
            ))}
          </div>
          <textarea value={reportDesc} onChange={e => setReportDesc(e.target.value)}
            placeholder="补充说明（可选）"
            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 rounded-xl text-sm text-gray-700 dark:text-gray-300 outline-none focus:ring-1 focus:ring-red-400 resize-none mb-4"
            rows={2} />
          <button onClick={handleReport}
            className="w-full py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors">
            提交举报
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-5" onClick={onClose}>
      <div className="w-full max-w-xs bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white"
            style={{ background: isLeaderMember ? '#f59e0b' : '#10b981' }}>
            {memberAvatar ? <img src={memberAvatar} className="w-12 h-12 rounded-full object-cover" alt="" /> : memberName[0]}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold text-gray-800 dark:text-gray-200">{memberName}</span>
              {isLeaderMember && <Crown className="w-4 h-4 text-amber-500" />}
            </div>
            <p className="text-sm text-gray-400 dark:text-gray-500">{isLeaderMember ? '队长' : '队员'}</p>
          </div>
        </div>
        <button onClick={() => { navigate(`/profile?userId=${member.id}`); onClose(); }}
          className="w-full py-2.5 rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-sm font-bold hover:bg-green-100 dark:hover:bg-green-900/20 transition-colors mb-2 flex items-center justify-center gap-1.5">
          <UserIcon className="w-4 h-4" />个人主页
        </button>
        {canTransfer && (
          <button onClick={() => onTransfer(member)}
            className="w-full py-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-sm font-bold hover:bg-amber-100 dark:hover:bg-amber-900/20 transition-colors mb-2">
            移交队长给 {memberName}
          </button>
        )}
        <button onClick={() => setReportMode(true)}
          className="w-full py-2.5 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-bold hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors mb-2 flex items-center justify-center gap-1.5">
          <FlagIcon className="w-4 h-4" />举报用户
        </button>
        <button onClick={handleBlock}
          className="w-full py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-sm font-bold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors mb-2 flex items-center justify-center gap-1.5">
          <Shield className="w-4 h-4" />{blocked ? '取消屏蔽' : '屏蔽用户'}
        </button>
        <button onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-sm font-bold mt-2">
          关闭
        </button>
      </div>
    </div>
  );
}

export default function MemberPanel({
  members, checkpoints, hikeStatus, user, isLeader, isMember, onSelectMember, onClaimLeader,
  maxSlots: externalSlots, onAddSlot, matchedUsers = [], onInviteToSlot,
  matchingEnabled, onToggleMatching, editingPrompts, editPromptsText, setEditPromptsText,
  onSavePrompts, onCancelPrompts, onStartEditPrompts, groupPrompts, intentRawInput,
}: MemberPanelProps) {
  const defaultSlots = Math.max(members.length, 2);
  const maxSlots = externalSlots ?? defaultSlots;
  const MAX_SLOTS = 12;
  const canAdd = maxSlots < MAX_SLOTS;
  const isLarge = maxSlots >= 8;

  // Pick-panel state
  const [pickingSlot, setPickingSlot] = useState<number | null>(null);

  const getMemberAt = (slotIdx: number): Member | null => {
    // slot 0 is always first member (leader)
    if (slotIdx >= 0 && slotIdx < members.length) return members[slotIdx];
    return null;
  };

  const getSlotGradient = (idx: number) => {
    const m = getMemberAt(idx);
    if (m && typeof m === 'object' && m.role === 'leader') return '#f59e0b';
    if (m && typeof m === 'object' && m.avatarColor) return m.avatarColor;
    return SLOT_GRADIENTS[idx % SLOT_GRADIENTS.length];
  };

  const getSlotName = (idx: number) => {
    const m = getMemberAt(idx);
    if (!m) return '?';
    return typeof m === 'string' ? '?' : (m.name || '?')[0];
  };

  const getCheckpointDots = (memberId: string) => {
    if (hikeStatus !== 'hiking') return null;
    return (
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-[1.5px]">
        {checkpoints.map((cp: Checkpoint, ci: number) => {
          const checked = (cp.checkins || []).some((c: Checkin) => c.userId === memberId);
          return <span key={ci} className={`w-1 h-1 rounded-full ${checked ? 'bg-green-400' : 'bg-gray-300 dark:bg-gray-600'}`} />;
        })}
      </div>
    );
  };

  const handleSlotClick = (idx: number) => {
    const m = getMemberAt(idx);
    if (m) {
      const memberInfo = typeof m === 'object' ? m : { id: m, name: '未知' };
      onSelectMember(memberInfo);
    } else {
      // Empty slot — show matched users picker
      setPickingSlot(idx);
    }
  };

  const handleInvite = async (matchedUser: MatchedUser) => {
    if (onInviteToSlot) {
      await onInviteToSlot(matchedUser.user.id);
    }
    setPickingSlot(null);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto px-3 pt-3 pb-2 space-y-2.5">

      {/* ── 匹配开关 + 提示词 ── */}
      {isLeader && matchingEnabled !== undefined && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-sm dark:shadow-gray-900/50">
          <div className="flex items-center justify-between px-3.5 py-3 border-l-[3px] border-l-amber-400">
            <h4 className="text-[11px] font-extrabold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />匹配
            </h4>
            <div className="flex items-center gap-2">
              {!editingPrompts && (
                <button onClick={onStartEditPrompts}
                  className="px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400 text-[9px] font-extrabold">
                  编辑
                </button>
              )}
              <button onClick={() => onToggleMatching?.(!matchingEnabled)}
                className={`relative w-9 h-5 rounded-full transition-colors ${matchingEnabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${matchingEnabled ? 'left-[18px]' : 'left-0.5'}`} />
              </button>
            </div>
          </div>
          {intentRawInput && (
            <div className="px-3.5 pb-1">
              <p className="text-[10px] text-gray-500 dark:text-gray-400"><span className="font-bold text-gray-400">意图：</span>{intentRawInput}</p>
            </div>
          )}
          {editingPrompts ? (
            <div className="px-3.5 pb-3.5 space-y-2">
              <input type="text" value={editPromptsText || ''} onChange={e => setEditPromptsText?.(e.target.value)}
                placeholder="用顿号分隔，如：不抽烟、有经验优先"
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/30 rounded-xl border border-gray-200 dark:border-gray-700 text-[11px] text-gray-700 dark:text-gray-300 outline-none focus:border-green-500" />
              <div className="flex gap-2">
                <button onClick={onCancelPrompts} className="flex-1 py-2 rounded-lg text-[11px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-500">取消</button>
                <button onClick={onSavePrompts} className="flex-1 py-2 rounded-lg text-[11px] font-extrabold bg-green-600 text-white">保存</button>
              </div>
            </div>
          ) : groupPrompts && groupPrompts.length > 0 ? (
            <div className="flex gap-1.5 flex-wrap px-3.5 pb-3">
              {groupPrompts.map((p, i) => (
                <span key={i} className="px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-[9px] font-bold border border-amber-100 dark:border-amber-800">{p}</span>
              ))}
            </div>
          ) : null}
        </div>
      )}

      {/* ── 认领队长 ── */}
      {isMember && !isLeader && onClaimLeader && (
        <button onClick={onClaimLeader}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-xs font-extrabold hover:bg-amber-100 dark:hover:bg-amber-900/20 transition-colors">
          <Flag className="w-4 h-4" />
          认领队长
        </button>
      )}

      {/* ── 坑位区 ── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-sm dark:shadow-gray-900/50 p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-[11px] font-extrabold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-green-500" />队员
          </h4>
          <span className="text-[10px] text-gray-400 dark:text-gray-500">
            {members.length}/{maxSlots}
          </span>
        </div>

        {/* Slot Row */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {Array.from({ length: maxSlots }, (_, i) => {
            const m = getMemberAt(i);
            const memberId = m && typeof m === 'object' ? m.id : (typeof m === 'string' ? m : null);
            const isLeaderSlot = i === 0 && m !== null;
            const isMe = memberId === user?.id;

            return (
              <div key={i} className="relative">
                <div
                  onClick={() => handleSlotClick(i)}
                  className={`w-11 h-11 rounded-xl flex items-center justify-center font-extrabold text-sm text-white cursor-pointer transition-all active:scale-95 ${
                    m
                      ? 'hover:scale-105 hover:shadow-lg'
                      : 'bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-200 dark:border-gray-700 text-gray-300 dark:text-gray-600'
                  }`}
                  style={m ? { background: getSlotGradient(i) } : undefined}
                  title={m ? (typeof m === 'object' ? m.name : '成员') : '空位 · 点击邀请队友'}
                >
                  {getSlotName(i)}
                </div>
                {/* Leader crown */}
                {isLeaderSlot && (
                  <div className="absolute -top-1.5 -right-1.5">
                    <Crown className="w-3.5 h-3.5 text-amber-500 drop-shadow-sm" />
                  </div>
                )}
                {/* Self badge */}
                {isMe && !isLeaderSlot && (
                  <div className="absolute -top-1.5 -right-1.5 px-1 py-0 bg-green-500 text-white rounded text-[7px] font-bold">
                    我
                  </div>
                )}
                {/* Checkpoint dots */}
                {memberId && getCheckpointDots(memberId)}
              </div>
            );
          })}

          {/* Add slot button */}
          {canAdd && onAddSlot && (
            <button
              onClick={onAddSlot}
              className="w-11 h-11 rounded-xl bg-gray-50 dark:bg-gray-800 border-2 border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-300 dark:text-gray-600 hover:border-green-300 hover:text-green-500 transition-colors"
              title="增加坑位"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Hint text */}
        <p className={`text-[9px] mt-2.5 leading-relaxed ${
          isLarge ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400 dark:text-gray-500'
        }`}>
          {members.length < 2
            ? '至少 2 人才能组队 · 点击空位邀请队友'
            : isLarge
              ? '队伍较大，建议拆分小组'
              : `点击头像查看详情 · 点击空位邀请队友`}
        </p>
      </div>

      {/* ── 匹配成员选择面板 ── */}
      {pickingSlot !== null && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-sm dark:shadow-gray-900/50">
          <div className="flex items-center justify-between px-3.5 py-3 border-l-[3px] border-l-amber-400">
            <h4 className="text-[11px] font-extrabold text-gray-700 dark:text-gray-300">
              匹配队友 <span className="text-amber-500 font-normal">· 坑位 {pickingSlot + 1}</span>
            </h4>
            <button onClick={() => setPickingSlot(null)} className="w-5 h-5 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400">
              <X className="w-3 h-3" />
            </button>
          </div>
          <div className="px-3.5 pb-3 max-h-48 overflow-y-auto">
            {matchedUsers.length === 0 ? (
              <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center py-6">
                暂无匹配推荐 · 开启匹配后可在此选择队友
              </p>
            ) : (
              matchedUsers.map((mu, i) => {
                const alreadyIn = members.some(m =>
                  typeof m === 'object' && m.id === mu.user.id
                );
                return (
                  <div key={mu.user.id || i}
                    className={`flex items-center gap-2.5 px-2 py-2 rounded-xl transition-colors ${
                      alreadyIn ? 'opacity-50' : 'hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer'
                    }`}
                    onClick={() => !alreadyIn && handleInvite(mu)}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-extrabold text-white shrink-0"
                      style={{ background: mu.user.avatarColor || `hsl(${mu.matchPct * 1.5}, 55%, 45%)` }}>
                      {mu.user.name?.[0] || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-extrabold text-gray-700 dark:text-gray-300">{mu.user.name}</span>
                        <span className="text-[8px] font-bold text-green-600 bg-green-50 dark:bg-green-900/20 px-1 rounded">{mu.matchPct}%</span>
                      </div>
                      <p className="text-[9px] text-gray-400 dark:text-gray-500 truncate">{mu.reason}</p>
                    </div>
                    {alreadyIn ? (
                      <span className="text-[8px] font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded">已加入</span>
                    ) : (
                      <span className="text-[8px] font-bold text-white bg-green-600 px-2 py-0.5 rounded-full shrink-0">确认加入</span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ── 徒步状态 ── */}
      {hikeStatus === 'hiking' && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-sm dark:shadow-gray-900/50">
          <div className="flex items-center justify-between px-3.5 py-3 border-l-[3px] border-l-blue-400">
            <h4 className="text-[11px] font-extrabold text-gray-700 dark:text-gray-300">
              签到进度
            </h4>
          </div>
          <div className="px-3.5 pb-3">
            {members.map((m, i) => {
              const memberId = typeof m === 'string' ? m : m.id;
              const memberName = typeof m === 'string' ? '未知' : m.name || '未知';
              const checkedCount = checkpoints.filter((cp: Checkpoint) =>
                (cp.checkins || []).some((c: Checkin) => c.userId === memberId)
              ).length;
              return (
                <div key={memberId || i} className="flex items-center gap-2.5 py-1.5 border-b border-gray-50 dark:border-gray-800/50 last:border-b-0">
                  <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300 flex-1 truncate">{memberName}</span>
                  <div className="flex items-center gap-0.5">
                    <div className="w-16 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${(checkedCount / Math.max(checkpoints.length, 1)) * 100}%` }} />
                    </div>
                    <span className="text-[9px] text-gray-400 dark:text-gray-500 ml-1">{checkedCount}/{checkpoints.length}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
