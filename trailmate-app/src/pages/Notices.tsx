import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Check, X, Mountain, Users, MapPin, Clock, Sparkles, AlertCircle } from 'lucide-react';
import { intentApi } from '@/api';
import type { MatchNotice } from '@/types';

const dateLabel: Record<string, string> = {
  this_weekend: '这周末', next_weekend: '下周末', weekend: '周末',
  saturday: '周六', sunday: '周日', tomorrow: '明天',
  next_week: '下周', holiday: '假期',
};

export default function Notices() {
  const navigate = useNavigate();
  const [notices, setNotices] = useState<MatchNotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState<string | null>(null);

  useEffect(() => {
    intentApi.notices()
      .then(setNotices)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleRespond = async (noticeId: string, status: 'accepted' | 'rejected') => {
    setResponding(noticeId);
    try {
      await intentApi.respondNotice(noticeId, status);
      setNotices(prev => prev.map(n => n.id === noticeId ? { ...n, status } : n));
    } catch (err: any) {
      alert(err.message || '操作失败');
    } finally {
      setResponding(null);
    }
  };

  const pending = notices.filter(n => n.status === 'pending');
  const processed = notices.filter(n => n.status !== 'pending');

  return (
    <div className="pb-24 min-h-screen" style={{ background: '#faf7f2' }}>
      {/* Header */}
      <div className="px-5 pt-6 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-500">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Bell className="w-5 h-5 text-green-600" />
        <h1 className="text-lg font-bold text-gray-800">匹配通知</h1>
        {pending.length > 0 && (
          <span className="px-2 py-0.5 bg-red-500 text-white rounded-full text-xs font-bold">{pending.length}</span>
        )}
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">加载中...</div>
      ) : notices.length === 0 ? (
        <div className="text-center py-20">
          <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">暂无匹配通知</p>
          <p className="text-gray-300 text-sm mt-1">有人匹配到你时会在这里提醒</p>
        </div>
      ) : (
        <div className="px-5 space-y-4">
          {/* Pending notices */}
          {pending.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 mb-2 font-medium">待回复</p>
              <div className="space-y-3">
                {pending.map(notice => (
                  <NoticeCard
                    key={notice.id}
                    notice={notice}
                    responding={responding === notice.id}
                    onAccept={() => handleRespond(notice.id, 'accepted')}
                    onReject={() => handleRespond(notice.id, 'rejected')}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Processed notices */}
          {processed.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 mb-2 font-medium mt-2">已处理</p>
              <div className="space-y-3">
                {processed.map(notice => (
                  <NoticeCard key={notice.id} notice={notice} responding={false} onAccept={() => {}} onReject={() => {}} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NoticeCard({ notice, responding, onAccept, onReject }: {
  notice: MatchNotice; responding: boolean; onAccept: () => void; onReject: () => void;
}) {
  const isPending = notice.status === 'pending';

  return (
    <div className={`bg-white rounded-2xl shadow-sm overflow-hidden ${isPending ? 'border-l-4 border-green-500' : 'opacity-60'}`}>
      {/* Top: Who + Match */}
      <div className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-sm font-bold text-green-700 shrink-0">
            {notice.fromUser.name?.[0] || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-800 text-sm">{notice.fromUser.name}</span>
              <span className="px-1.5 py-0.5 bg-green-50 text-green-600 rounded text-[10px] font-bold">
                {notice.matchPct}% 匹配
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">想找你一起徒步</p>
          </div>
        </div>

        {/* System as middleman: explain the match */}
        <div className="mt-3 bg-green-50 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Sparkles className="w-3.5 h-3.5 text-green-600" />
            <span className="text-xs font-bold text-green-700">TrailMate 为你解读</span>
          </div>
          <p className="text-xs text-green-800 leading-relaxed">
            <strong>{notice.fromUser.name}</strong>说：「{notice.rawInput}」
          </p>
          {notice.prompts.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {notice.prompts.map((p, i) => (
                <span key={i} className="px-2 py-0.5 bg-white text-green-700 rounded-full text-[10px] font-medium border border-green-200">
                  {p}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Constraint highlight */}
        {notice.prompts.length > 0 && isPending && (
          <div className="mt-3 bg-amber-50 rounded-xl p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-amber-800">请注意对方的要求</p>
              <p className="text-xs text-amber-700 mt-0.5">
                该队伍有「{notice.prompts.join('、')}」的要求，请确认你是否能接受
              </p>
            </div>
          </div>
        )}

        {/* Essentials */}
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="bg-gray-50 rounded-lg py-1.5">
            <p className="text-[10px] text-gray-400">地点</p>
            <p className="text-xs font-medium text-gray-700">{notice.essentials.location || '待定'}</p>
          </div>
          <div className="bg-gray-50 rounded-lg py-1.5">
            <p className="text-[10px] text-gray-400">时间</p>
            <p className="text-xs font-medium text-gray-700">{notice.essentials.date ? (dateLabel[notice.essentials.date] || notice.essentials.date) : '待定'}</p>
          </div>
          <div className="bg-gray-50 rounded-lg py-1.5">
            <p className="text-[10px] text-gray-400">人数</p>
            <p className="text-xs font-medium text-gray-700">{notice.essentials.groupSize ? `${notice.essentials.groupSize}人` : '待定'}</p>
          </div>
        </div>

        {/* Match reason */}
        <p className="text-xs text-gray-400 mt-2">匹配理由：{notice.reason}</p>
      </div>

      {/* Actions */}
      {isPending && (
        <div className="px-4 pb-4 flex gap-3">
          <button
            onClick={onReject}
            disabled={responding}
            className="flex-1 py-2.5 bg-gray-100 text-gray-600 font-medium rounded-xl text-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <X className="w-4 h-4" />不合适
          </button>
          <button
            onClick={onAccept}
            disabled={responding}
            className="flex-1 py-2.5 bg-green-600 text-white font-bold rounded-xl text-sm disabled:opacity-50 shadow-md shadow-green-200 flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" />可以接受
          </button>
        </div>
      )}

      {/* Status badge */}
      {!isPending && (
        <div className="px-4 pb-3">
          <span className={`text-xs font-medium ${notice.status === 'accepted' ? 'text-green-600' : notice.status === 'rejected' ? 'text-gray-400' : 'text-gray-400'}`}>
            {notice.status === 'accepted' ? '✓ 已接受' : notice.status === 'rejected' ? '✕ 已拒绝' : '已过期'}
          </span>
        </div>
      )}
    </div>
  );
}
