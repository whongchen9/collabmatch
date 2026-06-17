import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Check, X, Sparkles, AlertCircle, RefreshCw, Merge, UserPlus, Users } from 'lucide-react';
import { intentApi, groupsApi } from '@/api';
import type { MatchNotice } from '@/types';
import Empty from '@/components/Empty';

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
  const [acceptedGroupId, setAcceptedGroupId] = useState<string | null>(null);

  // 下拉刷新
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadNotices = async () => {
    if (localStorage.getItem('trailmate_guest')) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const data = await intentApi.notices();
      setNotices(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadNotices();
  }, []);

  const handleRespond = async (noticeId: string, status: 'accepted' | 'rejected', noticeType?: string) => {
    setResponding(noticeId);
    try {
      if (noticeType === 'merge_request') {
        if (status === 'accepted') {
          const result = await groupsApi.acceptMergeRequest(noticeId);
          setNotices(prev => prev.map(n => n.id === noticeId ? { ...n, status } : n));
          if (result.groupId) setAcceptedGroupId(result.groupId);
        } else {
          await groupsApi.rejectMergeRequest(noticeId);
          setNotices(prev => prev.map(n => n.id === noticeId ? { ...n, status } : n));
        }
      } else if (noticeType === 'join_request') {
        if (status === 'accepted') {
          const result = await groupsApi.acceptJoinRequest(noticeId);
          setNotices(prev => prev.map(n => n.id === noticeId ? { ...n, status } : n));
          if (result.groupId) setAcceptedGroupId(result.groupId);
        } else {
          await groupsApi.rejectJoinRequest(noticeId);
          setNotices(prev => prev.map(n => n.id === noticeId ? { ...n, status } : n));
        }
      } else {
        const result = await intentApi.respondNotice(noticeId, status);
        setNotices(prev => prev.map(n => n.id === noticeId ? { ...n, status } : n));
        if (status === 'accepted' && (result as any)?.groupId) {
          setAcceptedGroupId((result as any).groupId);
        }
      }
    } catch (err: any) {
      window.dispatchEvent(new CustomEvent('toast', { detail: { message: err.message || '操作失败', type: 'error' } }));
    } finally {
      setResponding(null);
    }
  };

  // 下拉刷新触摸事件
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const diff = e.touches[0].clientY - touchStartY.current;
    if (diff > 0 && (containerRef.current?.scrollTop || 0) <= 0) {
      setPullDistance(Math.min(diff * 0.5, 80));
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance > 50) {
      setRefreshing(true);
      await loadNotices();
    }
    setPullDistance(0);
  };

  const pending = notices.filter(n => n.status === 'pending');
  const processed = notices.filter(n => n.status !== 'pending');

  return (
    <div
      ref={containerRef}
      className="pb-24 min-h-screen bg-[#faf7f2] dark:bg-gray-950"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* 下拉刷新指示器 */}
      {(pullDistance > 0 || refreshing) && (
        <div className="flex items-center justify-center py-2 transition-all" style={{ height: refreshing ? 40 : pullDistance }}>
          <RefreshCw className={`w-5 h-5 text-green-500 ${refreshing ? 'animate-spin' : ''}`} />
          <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">{refreshing ? '刷新中...' : pullDistance > 50 ? '松开刷新' : '下拉刷新'}</span>
        </div>
      )}

      {/* 接受通知后的引导 */}
      {acceptedGroupId && (
        <div className="mx-5 mt-3 bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shrink-0">
            <Check className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-green-800">已加入队伍</p>
            <p className="text-xs text-green-600">快去和队友打个招呼吧</p>
          </div>
          <button
            onClick={() => navigate(`/team/${acceptedGroupId}`)}
            className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-bold shadow-sm dark:shadow-gray-900/50"
          >
            进入队伍
          </button>
        </div>
      )}

      {/* Header */}
      <div className="px-5 pt-6 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-500 dark:text-gray-400">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Bell className="w-5 h-5 text-green-600" />
        <h1 className="text-lg font-bold text-gray-800 dark:text-gray-200">匹配通知</h1>
        {pending.length > 0 && (
          <span className="px-2 py-0.5 bg-red-500 text-white rounded-full text-xs font-bold">{pending.length}</span>
        )}
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400 dark:text-gray-500">加载中...</div>
      ) : notices.length === 0 ? (
        <Empty
          icon={Bell}
          title="暂无匹配通知"
          description="有人匹配到你时会在这里提醒"
          action={{ label: '去匹配队友', onClick: () => navigate('/') }}
        />
      ) : (
        <div className="px-5 space-y-4">
          {/* Pending notices */}
          {pending.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-2 font-medium">待回复</p>
              <div className="space-y-3">
                {pending.map(notice => (
                  <NoticeCard
                    key={notice.id}
                    notice={notice}
                    responding={responding === notice.id}
                    onAccept={() => handleRespond(notice.id, 'accepted', notice.type)}
                    onReject={() => handleRespond(notice.id, 'rejected', notice.type)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Processed notices */}
          {processed.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-2 font-medium mt-2">已处理</p>
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

  // merge_request 类型特殊渲染
  if (notice.type === 'merge_request') {
    return (
      <div className={`bg-white dark:bg-gray-900 rounded-2xl shadow-sm dark:shadow-gray-900/50 overflow-hidden ${isPending ? 'border-l-4 border-blue-500' : 'opacity-60'}`}>
        <div className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <Merge className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-800 dark:text-gray-200 text-sm">{notice.title || '队伍合并申请'}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{notice.content || ''}</p>
            </div>
          </div>
        </div>
        {isPending && (
          <div className="flex border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={onReject}
              disabled={responding}
              className="flex-1 py-2.5 text-gray-400 dark:text-gray-500 text-xs font-medium hover:bg-gray-50 dark:bg-gray-800/50 disabled:opacity-50 flex items-center justify-center gap-1"
            >
              <X className="w-3.5 h-3.5" />忽略
            </button>
            <button
              onClick={onAccept}
              disabled={responding}
              className="flex-1 py-2.5 text-blue-600 text-xs font-bold hover:bg-blue-50 disabled:opacity-50 flex items-center justify-center gap-1 border-l border-gray-100 dark:border-gray-800"
            >
              {responding ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}知道了
            </button>
          </div>
        )}
      </div>
  );
  }

  // join_request 类型特殊渲染
  if (notice.type === 'join_request') {
    return (
      <div className={`bg-white dark:bg-gray-900 rounded-2xl shadow-sm dark:shadow-gray-900/50 overflow-hidden ${isPending ? 'border-l-4 border-green-500' : 'opacity-60'}`}>
        <div className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
              <UserPlus className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-800 dark:text-gray-200 text-sm">{notice.title || '入队申请'}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{notice.content || ''}</p>
            </div>
          </div>
        </div>
        {isPending && (
          <div className="flex border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={onReject}
              disabled={responding}
              className="flex-1 py-2.5 text-gray-400 dark:text-gray-500 text-xs font-medium hover:bg-gray-50 dark:bg-gray-800/50 disabled:opacity-50 flex items-center justify-center gap-1"
            >
              <X className="w-3.5 h-3.5" />拒绝
            </button>
            <button
              onClick={onAccept}
              disabled={responding}
              className="flex-1 py-2.5 text-green-600 text-xs font-bold hover:bg-green-50 disabled:opacity-50 flex items-center justify-center gap-1 border-l border-gray-100 dark:border-gray-800"
            >
              {responding ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}同意加入
            </button>
          </div>
        )}
      </div>
  );
  }

  // team_match / team_recommend 类型：队伍匹配通知
  if (notice.type === 'team_match' || notice.type === 'team_recommend') {
    const isRecommend = notice.type === 'team_recommend';
    return (
      <div className={`bg-white dark:bg-gray-900 rounded-2xl shadow-sm dark:shadow-gray-900/50 overflow-hidden ${isPending ? 'border-l-4 border-orange-500' : 'opacity-60'}`}>
        <div className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-orange-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-800 dark:text-gray-200 text-sm">
                  {isRecommend ? '发现匹配队伍' : '有人想加入你的队伍'}
                </span>
                <span className="px-1.5 py-0.5 bg-orange-50 text-orange-600 rounded text-[10px] font-bold">
                  {notice.matchPct}% 匹配
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {notice.targetTeamName || '未命名队伍'} · {(notice as any).targetTeamMembers || '?'}人
              </p>
            </div>
          </div>

          {/* 匹配解读 */}
          <div className="mt-3 bg-orange-50 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Sparkles className="w-3.5 h-3.5 text-orange-600" />
              <span className="text-xs font-bold text-orange-700">TrailMate 匹配引擎</span>
            </div>
            <p className="text-xs text-orange-800 leading-relaxed">{notice.reason}</p>
            {notice.prompts?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {notice.prompts?.slice(0, 6).map((p, i) => (
                  <span key={i} className="px-2 py-0.5 bg-white text-orange-700 rounded-full text-[10px] font-medium border border-orange-200">
                    {p}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Essentials */}
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg py-1.5">
              <p className="text-[10px] text-gray-400 dark:text-gray-500">地点</p>
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{notice.essentials?.location || '待定'}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg py-1.5">
              <p className="text-[10px] text-gray-400 dark:text-gray-500">时间</p>
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{notice.essentials.date ? (dateLabel[notice.essentials.date] || notice.essentials.date) : '待定'}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg py-1.5">
              <p className="text-[10px] text-gray-400 dark:text-gray-500">人数</p>
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{notice.essentials.groupSize ? `${notice.essentials.groupSize}人` : '待定'}</p>
            </div>
          </div>
        </div>

        {isPending && (
          <div className="px-4 pb-4 flex gap-3">
            <button
              onClick={onReject}
              disabled={responding}
              className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-medium rounded-xl text-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <X className="w-4 h-4" />不感兴趣
            </button>
            <button
              onClick={onAccept}
              disabled={responding}
              className="flex-1 py-2.5 bg-orange-500 text-white font-bold rounded-xl text-sm disabled:opacity-50 shadow-md dark:shadow-gray-900/50 shadow-orange-200 flex items-center justify-center gap-1.5"
            >
              {responding ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {isRecommend ? '加入队伍' : '同意加入'}
            </button>
          </div>
        )}

        {!isPending && (
          <div className="px-4 pb-3">
            <span className={`text-xs font-medium ${notice.status === 'accepted' ? 'text-green-600' : 'text-gray-400 dark:text-gray-500'}`}>
              {notice.status === 'accepted' ? '✓ 已接受' : '✕ 已忽略'}
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-2xl shadow-sm dark:shadow-gray-900/50 overflow-hidden ${isPending ? 'border-l-4 border-green-500' : 'opacity-60'}`}>
      {/* Top: Who + Match */}
      <div className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-sm font-bold text-green-700 shrink-0">
            {notice.fromUser.name?.[0] || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-800 dark:text-gray-200 text-sm">{notice.fromUser.name}</span>
              <span className="px-1.5 py-0.5 bg-green-50 text-green-600 rounded text-[10px] font-bold">
                {notice.matchPct}% 匹配
              </span>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">想找你一起徒步</p>
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
          {notice.prompts?.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {notice.prompts?.map((p, i) => (
                <span key={i} className="px-2 py-0.5 bg-white dark:bg-gray-900 text-green-700 rounded-full text-[10px] font-medium border border-green-200">
                  {p}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Constraint highlight */}
        {notice.prompts?.length > 0 && isPending && (
          <div className="mt-3 bg-amber-50 rounded-xl p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-amber-800">请注意对方的要求</p>
              <p className="text-xs text-amber-700 mt-0.5">
                该队伍有「{notice.prompts?.join('、')}」的要求，请确认你是否能接受
              </p>
            </div>
          </div>
        )}

        {/* Essentials */}
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg py-1.5">
            <p className="text-[10px] text-gray-400 dark:text-gray-500">地点</p>
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{notice.essentials?.location || '待定'}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg py-1.5">
            <p className="text-[10px] text-gray-400 dark:text-gray-500">时间</p>
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{notice.essentials.date ? (dateLabel[notice.essentials.date] || notice.essentials.date) : '待定'}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg py-1.5">
            <p className="text-[10px] text-gray-400 dark:text-gray-500">人数</p>
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{notice.essentials.groupSize ? `${notice.essentials.groupSize}人` : '待定'}</p>
          </div>
        </div>

        {/* Match reason */}
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">匹配理由：{notice.reason}</p>
      </div>

      {/* Actions */}
      {isPending && (
        <div className="px-4 pb-4 flex gap-3">
          <button
            onClick={onReject}
            disabled={responding}
            className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-medium rounded-xl text-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <X className="w-4 h-4" />不合适
          </button>
          <button
            onClick={onAccept}
            disabled={responding}
            className="flex-1 py-2.5 bg-green-600 text-white font-bold rounded-xl text-sm disabled:opacity-50 shadow-md dark:shadow-gray-900/50 shadow-green-200 flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" />可以接受
          </button>
        </div>
      )}

      {/* Status badge */}
      {!isPending && (
        <div className="px-4 pb-3">
          <span className={`text-xs font-medium ${notice.status === 'accepted' ? 'text-green-600' : notice.status === 'rejected' ? 'text-gray-400 dark:text-gray-500' : 'text-gray-400 dark:text-gray-500'}`}>
            {notice.status === 'accepted' ? '✓ 已接受' : notice.status === 'rejected' ? '✕ 已拒绝' : '已过期'}
          </span>
        </div>
      )}
    </div>
  );
}
