import { useState, useRef, useCallback } from 'react';
import { Camera, Sparkles, Send, RefreshCw, Bell, Flag, Trash2, Shield, X } from 'lucide-react';
import type { GroupMessage, User, ReportReason } from '@/types';
import { formatMsgTime } from '@/lib/utils';
import { useStore } from '@/store';
import { reportApi } from '@/api';

interface ChatMessagesProps {
  messages: GroupMessage[];
  user: User | null;
  msg: string;
  setMsg: (v: string) => void;
  onSend: () => void;
  sending: boolean;
  bottomRef: React.RefObject<HTMLDivElement>;
  onAiAssistant: () => void;
  aiAssistantLoading: boolean;
  pendingBulletin: string | null;
  onConfirmBulletin: () => void;
  onDismissBulletin: () => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  imageInputRef: React.RefObject<HTMLInputElement>;
  hikeStatus: string;
  isVisitor?: boolean;
  isLeader?: boolean;
  groupId?: string;
  onDeleteMessage?: (index: number) => void;
}

function getSystemMsgStyle(content: string): string {
  if (content.includes('加入') || content.includes('加入队伍')) {
    return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20';
  }
  if (content.includes('签到') || content.includes('打卡')) {
    return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20';
  }
  if (content.includes('AI') || content.includes('匹配')) {
    return 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20';
  }
  return 'text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800';
}

const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'spam', label: '垃圾广告' },
  { value: 'abuse', label: '辱骂攻击' },
  { value: 'inappropriate', label: '不当内容' },
  { value: 'illegal', label: '违法信息' },
  { value: 'other', label: '其他' },
];

export default function ChatMessages({
  messages, user, msg, setMsg, onSend, sending, bottomRef,
  onAiAssistant, aiAssistantLoading, pendingBulletin,
  onConfirmBulletin, onDismissBulletin, onImageUpload, imageInputRef,
  hikeStatus, isVisitor, isLeader, groupId, onDeleteMessage,
}: ChatMessagesProps) {
  const { blockedUsers, blockUser, isBlocked, showToast } = useStore();
  const [actionMenu, setActionMenu] = useState<{ msgIndex: number; x: number; y: number } | null>(null);
  const [reportModal, setReportModal] = useState<{ userId: string; userName: string; messageId?: string } | null>(null);
  const [reportReason, setReportReason] = useState<ReportReason>('spam');
  const [reportDesc, setReportDesc] = useState('');
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 过滤被屏蔽用户的消息
  const visibleMessages = messages.filter(m => {
    if (m.type === 'system') return true;
    return !isBlocked(m.user?.id);
  });

  const handleLongPressStart = useCallback((e: React.TouchEvent, index: number) => {
    const touch = e.touches[0];
    longPressTimer.current = setTimeout(() => {
      setActionMenu({ msgIndex: index, x: touch.clientX, y: touch.clientY });
    }, 500);
  }, []);

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent, index: number) => {
    e.preventDefault();
    setActionMenu({ msgIndex: index, x: e.clientX, y: e.clientY });
  }, []);

  const handleReport = async () => {
    if (!reportModal) return;
    try {
      await reportApi.reportUser({
        targetUserId: reportModal.userId,
        reason: reportReason,
        description: reportDesc || undefined,
        targetMessageId: reportModal.messageId,
        groupId,
      });
      showToast('举报已提交，我们会尽快处理');
    } catch {
      showToast('举报提交失败，请稍后重试');
    }
    setReportModal(null);
    setReportDesc('');
    setReportReason('spam');
  };

  const handleBlock = (userId: string, userName: string, avatarColor?: string) => {
    blockUser(userId, userName, avatarColor);
    showToast(`已屏蔽 ${userName}`);
    setActionMenu(null);
  };

  const handleDelete = () => {
    if (actionMenu && onDeleteMessage) {
      onDeleteMessage(actionMenu.msgIndex);
    }
    setActionMenu(null);
  };

  return (
    <div className="flex-1 flex flex-col">
      {hikeStatus === 'hiking' && (
        <div className="text-center pt-2 pb-1">
          <span className="inline-block px-3 py-1 bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 rounded-full text-[10px] font-bold">
            <span className="inline-flex items-center gap-1">
              <Sparkles className="w-3 h-3" />征途进行中，匹配已关闭
            </span>
          </span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 pr-4 py-3 space-y-2.5">
        {blockedUsers.length > 0 && (
          <div className="text-center py-1">
            <span className="inline-block px-2.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 rounded-full text-[9px]">
              已屏蔽 {blockedUsers.length} 人的消息
            </span>
          </div>
        )}
        {visibleMessages?.map((m: GroupMessage, i: number) => {
          const isMe = m.user?.id === user?.id;
          const isSystem = m.type === 'system';
          if (isSystem) {
            return (
              <div key={i} className="text-center py-0.5">
                <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold ${getSystemMsgStyle(m.content)}`}>
                  {m.content}
                </span>
              </div>
            );
          }
          return (
            <div key={i} className={`flex gap-2.5 ${isMe ? 'justify-end' : 'justify-start'}`}
              onTouchStart={(e) => handleLongPressStart(e, i)}
              onTouchEnd={handleLongPressEnd}
              onTouchMove={handleLongPressEnd}
              onContextMenu={(e) => handleContextMenu(e, i)}
            >
              {!isMe && (
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-extrabold text-white shrink-0 mt-4"
                  style={{ background: m.user?.avatarColor || '#10b981' }}>
                  {(m.user?.name || '?')[0]}
                </div>
              )}
              <div className={`max-w-[72%] ${isMe ? '' : ''}`}>
                {!isMe && (
                  <p className="text-[10px] font-extrabold text-gray-500 dark:text-gray-400 mb-1 ml-0.5">
                    {m.user?.name || '未知'}
                  </p>
                )}
                <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  isMe
                    ? 'bg-green-600 text-white rounded-br-md'
                    : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-md shadow-sm dark:shadow-gray-900/50'
                }`}>
                  {m.type === 'image' ? (
                    <img src={m.content} alt="图片" className="max-w-[180px] max-h-[180px] rounded-xl object-cover" />
                  ) : (
                    m.content
                  )}
                </div>
                <p className={`text-[9px] text-gray-300 dark:text-gray-600 mt-0.5 ${isMe ? 'text-right mr-1' : 'ml-1'}`}>
                  {formatMsgTime(m.time)}
                </p>
              </div>
              {isMe && (
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-extrabold text-white shrink-0 mt-4"
                  style={{ background: user?.avatarColor || '#059669' }}>
                  {(user?.name || '?')[0]}
                </div>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {pendingBulletin && isLeader && (
        <div className="mx-4 mb-2 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-2xl flex items-start gap-3">
          <div className="w-7 h-7 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0 mt-0.5">
            <Bell className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-extrabold text-amber-800 dark:text-amber-300 mb-1">AI 建议更新行动计划</p>
            <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed line-clamp-3 whitespace-pre-wrap">{pendingBulletin}</p>
            <div className="flex gap-2 mt-2.5">
              <button onClick={onDismissBulletin}
                className="px-3 py-1.5 bg-white dark:bg-gray-900 border border-amber-200 dark:border-amber-800 rounded-lg text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-50 transition-colors">忽略</button>
              <button onClick={onConfirmBulletin}
                className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-[10px] font-bold hover:bg-amber-600 transition-colors">更新计划</button>
            </div>
          </div>
        </div>
      )}

      {isVisitor ? (
        <div className="px-4 py-3 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 text-center">
          <p className="text-xs text-gray-400 dark:text-gray-500">加入队伍后即可发送消息</p>
        </div>
      ) : (
      <div className="px-4 py-3 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex items-center gap-2">
        <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={onImageUpload} />
        <button onClick={() => imageInputRef.current?.click()} disabled={sending}
          className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center disabled:opacity-50 shrink-0">
          <Camera className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        </button>
        <button onClick={() => setMsg(msg.startsWith('@AI助手') ? msg : '@AI助手 ' + msg)}
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${msg.includes('@AI助手') ? 'bg-green-100 dark:bg-green-900/30 text-green-600' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
          <Sparkles className="w-4 h-4" />
        </button>
        <input type="text" value={msg} onChange={e => setMsg(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              if (msg.includes('@AI助手')) onAiAssistant();
              else onSend();
            }
          }}
          placeholder="输入消息... 点✨ @AI助手" className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-xl text-sm outline-none focus:ring-1 focus:ring-green-500" />
        <button onClick={msg.includes('@AI助手') ? onAiAssistant : onSend}
          disabled={sending || !msg.trim() || aiAssistantLoading}
          className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center disabled:opacity-50 shadow-md dark:shadow-gray-900/50 shadow-green-200">
          {aiAssistantLoading ? <RefreshCw className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
        </button>
      </div>
      )}

      {/* 消息操作菜单 */}
      {actionMenu && (() => {
        const m = visibleMessages[actionMenu.msgIndex];
        if (!m || m.type === 'system') return null;
        const isMe = m.user?.id === user?.id;
        return (
          <>
            <div className="fixed inset-0 z-50" onClick={() => setActionMenu(null)} />
            <div className="fixed z-50 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 py-1 min-w-[140px]"
              style={{ left: Math.min(actionMenu.x, window.innerWidth - 160), top: Math.min(actionMenu.y, window.innerHeight - 200) }}>
              {!isMe && (
                <button onClick={() => {
                  setReportModal({ userId: m.user.id, userName: m.user.name, messageId: m.id });
                  setActionMenu(null);
                }}
                  className="w-full px-4 py-2.5 flex items-center gap-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                  <Flag className="w-4 h-4" />举报
                </button>
              )}
              {!isMe && (
                <button onClick={() => handleBlock(m.user.id, m.user.name, m.user.avatarColor)}
                  className="w-full px-4 py-2.5 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <Shield className="w-4 h-4" />屏蔽
                </button>
              )}
              {(isLeader || isMe) && onDeleteMessage && (
                <button onClick={handleDelete}
                  className="w-full px-4 py-2.5 flex items-center gap-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                  <Trash2 className="w-4 h-4" />删除
                </button>
              )}
            </div>
          </>
        );
      })()}

      {/* 举报弹窗 */}
      {reportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-5" onClick={() => setReportModal(null)}>
          <div className="w-full max-w-xs bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-800 dark:text-gray-200">举报 {reportModal.userName}</h3>
              <button onClick={() => setReportModal(null)} className="text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 mb-4">
              {REPORT_REASONS.map(r => (
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
      )}
    </div>
  );
}
