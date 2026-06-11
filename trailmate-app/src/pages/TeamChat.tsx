import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, MapPin, AlertTriangle, UserMinus, RefreshCw, Check, Sparkles } from 'lucide-react';
import { groupsApi, eventsApi, intentApi } from '@/api';
import { useStore } from '@/store';
import type { Group, GroupMessage, Intent } from '@/types';

/** 预览结果 */
interface PreviewResult {
  preview: boolean;
  differencePoints: string[];
  myPreferences: { topic: string; preference: string }[];
  otherPreferences: { topic: string; preference: string; userName: string }[];
  message: string;
}

/** 解散结果 */
interface DissolveResult {
  dissolved: boolean;
  differencePoints: string[];
  myPreferences: { topic: string; preference: string }[];
  otherPreferences: { topic: string; preference: string; userName: string }[];
  selectedPreferences: string[];
  newPrompts: string[];
  newIntent: Intent;
  message: string;
}

/** AI 对话阶段 */
type AIStage = 'idle' | 'analyzing' | 'selecting' | 'matching' | 'done';

export default function TeamChat() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useStore();
  const [group, setGroup] = useState<Group | null>(null);
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<number>(0);

  // AI 对话式解散
  const [aiStage, setAiStage] = useState<AIStage>('idle');
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null);
  const [selectedPrefs, setSelectedPrefs] = useState<Set<string>>(new Set());
  const [dissolveResult, setDissolveResult] = useState<DissolveResult | null>(null);

  const loadGroup = async () => {
    if (!id) return;
    try {
      const g = await groupsApi.get(id);
      setGroup(g);
    } catch (e) {
      console.error('Failed to load group:', e);
    }
  };

  useEffect(() => {
    loadGroup();
    pollRef.current = window.setInterval(loadGroup, 3000);
    return () => clearInterval(pollRef.current);
  }, [id]);

  // AI 消息出现时自动滚到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [group?.messages?.length, aiStage, previewResult, dissolveResult]);

  const handleSend = async () => {
    if (!msg.trim() || !id || sending) return;
    setSending(true);
    try {
      await groupsApi.sendMessage(id, msg.trim());
      setMsg('');
      await loadGroup();
    } catch (e) {
      console.error('Failed to send message:', e);
    } finally {
      setSending(false);
    }
  };

  const handleCheckin = async (type: 'start' | 'finish') => {
    if (!group?.eventId) return;
    try {
      await eventsApi.checkin(group.eventId, type);
      alert(type === 'start' ? '起点签到成功！' : '终点签到成功！');
    } catch (err: any) {
      alert(err.message || '签到失败');
    }
  };

  const handleSOS = async () => {
    if (!group?.eventId) return;
    if (!confirm('确认发送 SOS 紧急求助？')) return;
    try {
      await eventsApi.sos(group.eventId);
      alert('SOS 已发送！紧急联系人将收到通知。');
    } catch (err: any) {
      alert(err.message || 'SOS 发送失败');
    }
  };

  /** 构造聊天消息 */
  const buildChatMessages = () => {
    return (group?.messages || [])
      .filter((m: GroupMessage) => m.type !== 'system' && m.user?.name)
      .map((m: GroupMessage) => ({
        content: m.content,
        userName: m.user?.name || '未知',
      }));
  };

  /** 点击解散 → AI 开始分析 */
  const handleDissolve = async () => {
    if (!group?.intentId) return;
    setAiStage('analyzing');
    try {
      const chatMessages = buildChatMessages();
      const result = await intentApi.dissolvePreview(group.intentId, chatMessages);
      setPreviewResult(result);
      // 默认全选自己的偏好
      setSelectedPrefs(new Set(result.myPreferences.map(p => p.preference)));
      setAiStage('selecting');
    } catch (err: any) {
      alert(err.message || '分析失败');
      setAiStage('idle');
    }
  };

  /** 切换偏好选择 */
  const togglePref = (pref: string) => {
    setSelectedPrefs(prev => {
      const next = new Set(prev);
      if (next.has(pref)) next.delete(pref);
      else next.add(pref);
      return next;
    });
  };

  /** 确认选择 → 解散并匹配 */
  const handleConfirmDissolve = async () => {
    if (!group?.intentId) return;
    setAiStage('matching');
    try {
      const chatMessages = buildChatMessages();
      const result = await intentApi.dissolve(
        group.intentId,
        chatMessages,
        Array.from(selectedPrefs),
      );
      setDissolveResult(result);
      setAiStage('done');
    } catch (err: any) {
      alert(err.message || '解散失败');
      setAiStage('selecting');
    }
  };

  /** 继续匹配 */
  const handleContinueMatch = () => {
    navigate('/');
  };

  /** 暂不匹配 */
  const handleSkipMatch = () => {
    navigate('/teams');
  };

  if (!group) return <div className="flex items-center justify-center h-screen" style={{ background: '#faf7f2' }}><p className="text-gray-400">加载中...</p></div>;

  return (
    <div className="flex flex-col h-screen" style={{ background: '#faf7f2' }}>
      {/* Header */}
      <div className="px-5 pt-6 pb-3 bg-white sticky top-0 z-10 shadow-sm flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-500"><ArrowLeft className="w-5 h-5" /></button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-gray-800 text-sm truncate">{group.name}</h1>
          <p className="text-xs text-gray-400">{group.members?.length || 0} 位成员</p>
        </div>
        <div className="flex gap-2">
          {group.eventId && (
            <>
              <button onClick={() => handleCheckin('start')} className="px-3 py-1.5 bg-green-50 text-green-600 rounded-lg text-xs font-medium">
                <MapPin className="w-3.5 h-3.5 inline mr-1" />签到
              </button>
              <button onClick={handleSOS} className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium">
                <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />SOS
              </button>
            </>
          )}
          {aiStage === 'idle' && (
            <button
              onClick={handleDissolve}
              className="px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-xs font-medium"
            >
              <UserMinus className="w-3.5 h-3.5 inline mr-1" />解散
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {group.messages?.map((m: GroupMessage, i: number) => {
          const isMe = m.user?.id === user?.id;
          const isSystem = m.type === 'system';
          if (isSystem) {
            return (
              <div key={i} className="text-center">
                <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">{m.content}</span>
              </div>
            );
          }
          return (
            <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] ${isMe ? 'order-1' : ''}`}>
                {!isMe && <p className="text-xs text-gray-400 mb-1 ml-1">{m.user?.name || '未知'}</p>}
                <div className={`px-4 py-2.5 rounded-2xl text-sm ${
                  isMe ? 'bg-green-600 text-white rounded-br-md' : 'bg-white text-gray-800 rounded-bl-md shadow-sm'
                }`}>
                  {m.content}
                </div>
              </div>
            </div>
          );
        })}

        {/* ── AI 对话式解散消息 ── */}

        {/* 阶段 1：分析中 */}
        {aiStage === 'analyzing' && (
          <div className="flex justify-start">
            <div className="max-w-[85%]">
              <p className="text-xs text-blue-400 mb-1 ml-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> TrailMate AI
              </p>
              <div className="px-4 py-3 bg-blue-50 rounded-2xl rounded-bl-md text-sm text-blue-700">
                <span className="inline-flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  正在分析你们的聊天记录，提取差异点...
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 阶段 2：展示差异点 + 选择 */}
        {aiStage === 'selecting' && previewResult && (
          <div className="space-y-3">
            {/* AI 消息：分析完成 */}
            <div className="flex justify-start">
              <div className="max-w-[85%]">
                <p className="text-xs text-blue-400 mb-1 ml-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> TrailMate AI
                </p>
                <div className="px-4 py-3 bg-blue-50 rounded-2xl rounded-bl-md text-sm text-blue-700">
                  {previewResult.differencePoints.length > 0
                    ? `我分析了你们的聊天，发现 ${previewResult.differencePoints.length} 个差异点。选择你想加入新匹配条件的偏好：`
                    : '我分析了你们的聊天，未发现明显差异点。你可以直接重新匹配。'}
                </div>
              </div>
            </div>

            {/* 可选择的偏好卡片 */}
            {previewResult.myPreferences.length > 0 && (
              <div className="ml-2 space-y-2">
                <p className="text-xs text-green-600 font-medium pl-1">你的偏好（点击选择）</p>
                {previewResult.myPreferences.map((p, i) => {
                  const isSelected = selectedPrefs.has(p.preference);
                  return (
                    <button
                      key={i}
                      onClick={() => togglePref(p.preference)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                        isSelected
                          ? 'bg-green-50 border-2 border-green-300 shadow-sm'
                          : 'bg-white border-2 border-gray-100'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-colors ${
                        isSelected ? 'bg-green-500' : 'bg-gray-200'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800">{p.topic}</p>
                        <p className="text-xs text-gray-400">{p.preference}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* 对方偏好（仅展示） */}
            {previewResult.otherPreferences.length > 0 && (
              <div className="ml-2 space-y-2">
                <p className="text-xs text-orange-500 font-medium pl-1">对方的偏好（不会影响你的新匹配）</p>
                {previewResult.otherPreferences.map((p, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-orange-50/50 border border-orange-100"
                  >
                    <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 bg-orange-200">
                      <span className="text-orange-500 text-xs">~</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700">{p.userName}：{p.topic}</p>
                      <p className="text-xs text-gray-400">{p.preference}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 操作按钮（内联在聊天流中） */}
            <div className="flex gap-3 px-1 pt-1">
              <button
                onClick={() => { setAiStage('idle'); setPreviewResult(null); setSelectedPrefs(new Set()); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-gray-100 text-gray-600"
              >
                取消解散
              </button>
              <button
                onClick={handleConfirmDissolve}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-green-600 text-white flex items-center justify-center gap-2 shadow-md shadow-green-200"
              >
                <RefreshCw className="w-4 h-4" />
                {selectedPrefs.size > 0
                  ? `加入 ${selectedPrefs.size} 个条件并匹配`
                  : '直接重新匹配'}
              </button>
            </div>
          </div>
        )}

        {/* 阶段 3：匹配中 */}
        {aiStage === 'matching' && (
          <div className="flex justify-start">
            <div className="max-w-[85%]">
              <p className="text-xs text-blue-400 mb-1 ml-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> TrailMate AI
              </p>
              <div className="px-4 py-3 bg-blue-50 rounded-2xl rounded-bl-md text-sm text-blue-700">
                <span className="inline-flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  队伍已解散，正在根据新条件为你匹配队友...
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 阶段 4：匹配完成 */}
        {aiStage === 'done' && dissolveResult && (
          <div className="space-y-3">
            {/* AI 消息：匹配结果 */}
            <div className="flex justify-start">
              <div className="max-w-[85%]">
                <p className="text-xs text-blue-400 mb-1 ml-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> TrailMate AI
                </p>
                <div className="px-4 py-3 bg-blue-50 rounded-2xl rounded-bl-md text-sm text-blue-700">
                  {dissolveResult.message}
                </div>
              </div>
            </div>

            {/* 已加入的匹配条件 */}
            {dissolveResult.selectedPreferences && dissolveResult.selectedPreferences.length > 0 && (
              <div className="ml-2 p-3 bg-green-50 rounded-xl">
                <p className="text-xs text-green-600 font-medium mb-2">已加入的匹配条件</p>
                <div className="flex flex-wrap gap-1.5">
                  {dissolveResult.selectedPreferences.map((p, i) => (
                    <span key={i} className="px-2.5 py-1 bg-white text-green-700 rounded-full text-xs font-medium shadow-sm">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex gap-3 px-1 pt-1">
              <button
                onClick={handleSkipMatch}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-gray-100 text-gray-600"
              >
                暂不匹配
              </button>
              <button
                onClick={handleContinueMatch}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-green-600 text-white flex items-center justify-center gap-2 shadow-md shadow-green-200"
              >
                <RefreshCw className="w-4 h-4" />
                继续匹配
              </button>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input — 解散流程中隐藏输入框 */}
      {aiStage === 'idle' && (
        <div className="px-4 py-3 bg-white border-t border-gray-100 flex items-center gap-2">
          <input
            type="text" value={msg} onChange={e => setMsg(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="输入消息..." className="flex-1 px-4 py-2.5 bg-gray-50 rounded-xl text-sm outline-none focus:ring-1 focus:ring-green-500"
          />
          <button
            onClick={handleSend} disabled={sending || !msg.trim()}
            className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center disabled:opacity-50 shadow-md shadow-green-200"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      )}
    </div>
  );
}
