import { Camera, Sparkles, Send, RefreshCw, FileText, Bell } from 'lucide-react';
import type { GroupMessage } from '@/types';
import { formatMsgTime } from '@/hooks/useTeamChat';

interface ChatMessagesProps {
  messages: GroupMessage[];
  user: { id: string } | null;
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

export default function ChatMessages({
  messages, user, msg, setMsg, onSend, sending, bottomRef,
  onAiAssistant, aiAssistantLoading, pendingBulletin,
  onConfirmBulletin, onDismissBulletin, onImageUpload, imageInputRef,
  hikeStatus, isVisitor, isLeader,
}: ChatMessagesProps) {
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
        {messages?.map((m: GroupMessage, i: number) => {
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
            <div key={i} className={`flex gap-2.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
              {!isMe && (
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-extrabold text-white shrink-0 mt-4"
                  style={{ background: (m.user as any)?.avatarColor || '#10b981' }}>
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
                  style={{ background: (user as any)?.avatarColor || '#059669' }}>
                  {((user as any)?.name || '?')[0]}
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
    </div>
  );
}
