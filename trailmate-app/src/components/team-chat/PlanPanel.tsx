import { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, Sparkles, FileText, Users, UserPlus, MapPin, Zap } from 'lucide-react';

interface PlanPanelProps {
  group: any;
  isLeader: boolean;
  isMember: boolean;
  editingPlan: boolean;
  planEditorRef: React.RefObject<HTMLDivElement>;
  onSavePlan: () => void;
  onCancelPlan: () => void;
  // 匹配提示词
  editingPrompts: boolean;
  editPromptsText: string;
  setEditPromptsText: (v: string) => void;
  onSavePrompts: () => void;
  onCancelPrompts: () => void;
  onShowPromptsConfirm: () => void;
  groupPrompts: string[];
  intentRawInput?: string;
  // 匹配开关 + 推荐
  matchingEnabled: boolean;
  onToggleMatching: (enabled: boolean) => void;
  matchedUsers: any[];
  matchTeams: any[];
  onInvite: (userId: string) => void;
  onApplyJoin: (team: any) => void;
  // 导航
  onBack: () => void;
  onCompleteTeam: () => void;
  // 面板关闭（用于 sidebar 模式）
  onClose?: () => void;
}

const TAG_STYLES = [
  'bg-amber-50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800',
  'bg-purple-50 dark:bg-purple-900/10 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800',
  'bg-blue-50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800',
  'bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800',
];

function getTagColor(index: number) {
  return TAG_STYLES[index % TAG_STYLES.length];
}

/** 匹配理由截断 */
function truncReason(r: string) {
  return r?.length > 28 ? r.slice(0, 28) + '…' : r;
}

export default function PlanPanel({
  group, isLeader, isMember,
  editingPlan, planEditorRef, onSavePlan, onCancelPlan,
  editingPrompts, editPromptsText, setEditPromptsText,
  onSavePrompts, onCancelPrompts, onShowPromptsConfirm, groupPrompts,
  intentRawInput,
  matchingEnabled, onToggleMatching,
  matchedUsers, matchTeams,
  onInvite, onApplyJoin,
  onBack, onCompleteTeam,
  onClose,
}: PlanPanelProps) {
  const members = group?.members || [];
  const maxMembers = group?.maxMembers || 6;
  const hikeStatus = group?.hikeStatus || 'idle';
  const statusLabels: Record<string, string> = { idle: '等待出发', hiking: '征途中', completed: '已完成' };

  // 点击外部关闭（sidebar 模式）
  const panelRef = useRef<HTMLDivElement>(null);
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose?.();
  }, [onClose]);
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (panelRef.current && !panelRef.current.contains(e.target as Node) && onClose) {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (onClose) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [onClose, handleKeyDown, handleClickOutside]);

  const memberCount = members.length;
  const recCount = matchedUsers.length + matchTeams.length;

  return (
    <div ref={onClose ? panelRef : undefined} className="flex flex-col h-full bg-[#faf7f2] dark:bg-gray-950">

      {/* ═══ 绿色渐变顶栏 ═══ */}
      <div className="shrink-0 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-b-2xl shadow-md shadow-green-200/30 dark:shadow-green-900/20">
        <div className="flex items-start gap-2.5 px-3.5 py-3">
          <button onClick={onClose || onBack}
            className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center hover:bg-white/25 transition-colors shrink-0 mt-0.5">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-[14px] font-extrabold truncate">{group?.name || '未命名队伍'}</h2>
            <p className="text-[10px] text-white/65 mt-0.5">
              {memberCount}位成员{group?.essentials?.location ? ` · ${group.essentials.location}` : ''}{group?.matchMode === 'auto' ? ' · 自由匹配' : ''}
            </p>
          </div>
          <span className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
            matchingEnabled ? 'bg-white/20 text-white' : 'bg-gray-100/20 dark:bg-gray-100/10 text-white/60'
          }`}>
            {matchingEnabled ? '匹配中' : '已关闭'}
          </span>
        </div>

        {/* 状态统计条 */}
        <div className="flex gap-4 px-3.5 pb-3">
          {[
            { val: memberCount, label: '队员' },
            { val: maxMembers, label: '上限' },
            { val: recCount, label: '推荐' },
            { val: `${Math.round((memberCount / maxMembers) * 100)}%`, label: '满员' },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <div className="text-[15px] font-extrabold">{s.val}</div>
              <div className="text-[9px] text-white/55">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ 可滚动内容区 ═══ */}
      <div className="flex-1 overflow-y-auto px-3 pt-3 pb-2 space-y-2.5">

        {/* ── ① 匹配提示词 ── */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-sm dark:shadow-gray-900/50">
          <div className="flex items-center justify-between px-3.5 py-3 border-l-[3px] border-l-amber-400">
            <h4 className="text-[11px] font-extrabold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />匹配提示词
            </h4>
            <div className="flex items-center gap-2">
              {isLeader && !editingPrompts && (
                <button
                  onClick={() => { setEditPromptsText((groupPrompts || []).join('、')); }}
                  className="px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400 text-[9px] font-extrabold hover:bg-amber-100 dark:hover:bg-amber-900/20 transition-colors"
                >
                  编辑
                </button>
              )}
              {isLeader && (
                <button
                  onClick={() => onToggleMatching(!matchingEnabled)}
                  className={`relative w-9 h-5 rounded-full transition-colors ${
                    matchingEnabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
                    matchingEnabled ? 'left-[18px]' : 'left-0.5'
                  }`} />
                </button>
              )}
            </div>
          </div>

          {/* 意图原话 */}
          {intentRawInput && (
            <div className="px-3.5 pb-1">
              <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed">
                <span className="font-bold text-gray-400 dark:text-gray-500">意图：</span>{intentRawInput}
              </p>
            </div>
          )}

          {editingPrompts ? (
            <div className="px-3.5 pb-3.5 space-y-2">
              <input
                type="text"
                value={editPromptsText}
                onChange={e => setEditPromptsText(e.target.value)}
                placeholder="用顿号分隔，如：不抽烟、有经验优先、慢行"
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/30 rounded-xl border border-gray-200 dark:border-gray-700 text-[11px] text-gray-700 dark:text-gray-300 outline-none focus:border-green-500"
              />
              <div className="flex gap-2">
                <button onClick={onCancelPrompts}
                  className="flex-1 py-2 rounded-lg text-[11px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-500">
                  取消
                </button>
                <button
                  onClick={() => { if (!editPromptsText.trim()) return; onShowPromptsConfirm(); }}
                  className="flex-1 py-2 rounded-lg text-[11px] font-extrabold bg-green-600 text-white"
                >
                  保存并重新匹配
                </button>
              </div>
            </div>
          ) : (
            <>
              {(groupPrompts || []).length > 0 ? (
                <div className="px-3.5 pb-1 flex flex-wrap gap-1.5">
                  {(groupPrompts || []).map((p: string, i: number) => (
                    <span key={i} className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${getTagColor(i)}`}>
                      {p}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="px-3.5 pb-4 text-center">
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">暂未设置提示词</p>
                  <p className="text-[9px] text-gray-300 dark:text-gray-600 mt-0.5">
                    {isLeader ? '设置提示词可提升匹配精度' : '等待队长设置匹配提示词'}
                  </p>
                </div>
              )}
              {isLeader && (
                <div className="px-3.5 pb-3.5 pt-1">
                  <button
                    onClick={() => { setEditPromptsText((groupPrompts || []).join('、')); }}
                    className="w-full py-2.5 rounded-xl bg-green-600 text-white text-[10px] font-extrabold hover:bg-green-700 transition-colors"
                  >
                    编辑提示词并重新匹配
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── ② 行动计划 ── */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-sm dark:shadow-gray-900/50">
          <div className="flex items-center justify-between px-3.5 py-3 border-l-[3px] border-l-blue-400">
            <h4 className="text-[11px] font-extrabold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-500" />行动计划
            </h4>
            {isLeader && !editingPlan && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={onCancelPlan}
                  className="px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400 text-[9px] font-extrabold hover:bg-amber-100 dark:hover:bg-amber-900/20 transition-colors"
                >
                  编辑
                </button>
              </div>
            )}
          </div>

          {editingPlan ? (
            <div className="px-3.5 pb-3.5 space-y-2">
              <div
                ref={planEditorRef}
                contentEditable
                suppressContentEditableWarning
                className="w-full min-h-[100px] max-h-[250px] overflow-y-auto px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-[11px] text-gray-700 dark:text-gray-300 outline-none focus:border-green-500 bg-gray-50 dark:bg-gray-800/30 leading-relaxed"
                data-placeholder="输入行动计划…"
              />
              <div className="flex gap-2">
                <button onClick={onCancelPlan}
                  className="flex-1 py-2 rounded-lg text-[11px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-500">
                  取消
                </button>
                <button onClick={onSavePlan}
                  className="flex-1 py-2 rounded-lg text-[11px] font-extrabold bg-green-600 text-white">
                  保存计划
                </button>
              </div>
            </div>
          ) : group?.plan ? (
            <div className="px-3.5 pb-3.5">
              <div className="bg-gray-50 dark:bg-gray-800/30 rounded-xl p-3 text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">
                {group.plan}
              </div>
            </div>
          ) : (
            <div className="px-3.5 pb-5 text-center">
              <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center mx-auto mb-2">
                <FileText className="w-5 h-5 text-gray-300 dark:text-gray-600" />
              </div>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">暂未制定行动计划</p>
              {!isMember && (
                <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-1">加入队伍后可共同编辑计划</p>
              )}
            </div>
          )}
        </div>

        {/* ── ③ 当前成员 ── */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-sm dark:shadow-gray-900/50">
          <div className="flex items-center justify-between px-3.5 py-3 border-l-[3px] border-l-green-400">
            <h4 className="text-[11px] font-extrabold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-green-500" />当前成员
            </h4>
            <span className="text-[10px] font-extrabold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full">
              {memberCount}/{maxMembers}
            </span>
          </div>
          {members.length > 0 ? (
            <div>
              {members.map((m: any, i: number) => (
                <div key={m.id || i}
                  className="flex items-center gap-2.5 px-3.5 py-2 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors border-b border-gray-50 dark:border-gray-800/50 last:border-b-0"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-extrabold text-white shrink-0"
                    style={{ background: m.avatarColor || `hsl(${(i + 1) * 72}, 55%, 45%)` }}
                  >
                    {(m.name || '?')[0]}
                  </div>
                  <div className="flex-1 min-w-0 flex items-center gap-1.5">
                    <span className="text-[11px] font-extrabold text-gray-700 dark:text-gray-300 truncate">
                      {m.name || '匿名'}
                    </span>
                    {m.id === (group?.leaderId || group?.createdBy) && (
                      <span className="text-[7px] font-extrabold px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-900/10 text-amber-600 dark:text-amber-400">
                        队长
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-3.5 pb-5 text-center">
              <p className="text-[11px] text-gray-400 dark:text-gray-500">暂无成员</p>
            </div>
          )}
        </div>

        {/* ── ④ 匹配推荐 ── */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-sm dark:shadow-gray-900/50">
          <div className="flex items-center justify-between px-3.5 py-3 border-l-[3px] border-l-purple-400">
            <h4 className="text-[11px] font-extrabold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-500" />匹配推荐
            </h4>
            {recCount > 0 && (
              <span className="text-[10px] font-extrabold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-2 py-0.5 rounded-full">
                {recCount}项
              </span>
            )}
          </div>

          {recCount > 0 ? (
            <div>
              {/* 推荐成员 */}
              {matchedUsers.map((mu: any, i: number) => (
                <div key={`u-${mu.userId || mu.user?.id || i}`}
                  className="flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors border-b border-gray-50 dark:border-gray-800/50 last:border-b-0"
                >
                  <div className="relative shrink-0">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-extrabold text-white"
                      style={{ background: mu.user?.avatarColor || `hsl(${(i + 2) * 60}, 55%, 45%)` }}
                    >
                      {(mu.user?.name || '?')[0]}
                    </div>
                    <span className={`absolute -top-1 -right-1 w-[17px] h-[17px] rounded-full flex items-center justify-center text-[7px] font-extrabold text-white border-2 border-white dark:border-gray-900 ${
                      mu.matchPct >= 80 ? 'bg-green-500' : mu.matchPct >= 60 ? 'bg-amber-500' : 'bg-gray-400'
                    }`}>
                      {mu.matchPct}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-extrabold text-gray-700 dark:text-gray-300 truncate">
                        {mu.user?.name || '匿名'}
                      </span>
                      <span className={`text-[8px] font-extrabold px-1.5 py-0 rounded ${
                        mu.matchPct >= 80
                          ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                          : mu.matchPct >= 60
                            ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
                            : ''
                      }`}>
                        {mu.matchPct >= 60 ? `${mu.matchPct}%` : ''}
                      </span>
                    </div>
                    {mu.reason && (
                      <p className="text-[9px] text-gray-400 dark:text-gray-500 truncate">{truncReason(mu.reason)}</p>
                    )}
                  </div>
                  <button
                    onClick={() => onInvite(mu.user?.id || mu.userId)}
                    className="shrink-0 px-3.5 py-1.5 rounded-full bg-green-600 text-white text-[10px] font-extrabold flex items-center gap-1 hover:bg-green-700 active:scale-95 transition-all"
                  >
                    <UserPlus className="w-3 h-3" />邀请
                  </button>
                </div>
              ))}

              {/* 推荐队伍 */}
              {matchTeams.map((team: any, i: number) => {
                const teamMembers = team.members || team.groupMembers || [];
                return (
                  <div key={`t-${team.id || i}`}
                    className="flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors border-b border-gray-50 dark:border-gray-800/50 last:border-b-0"
                  >
                    <div className="relative shrink-0">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[13px] font-extrabold bg-gradient-to-br from-emerald-100 to-green-200 dark:from-emerald-900/30 dark:to-green-800/30 text-green-700 dark:text-green-400">
                        <Users className="w-4 h-4" />
                      </div>
                      <span className={`absolute -top-1 -right-1 w-[17px] h-[17px] rounded-full flex items-center justify-center text-[7px] font-extrabold text-white border-2 border-white dark:border-gray-900 ${
                        team.matchPct >= 80 ? 'bg-green-500' : team.matchPct >= 60 ? 'bg-amber-500' : 'bg-gray-400'
                      }`}>
                        {team.matchPct}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-extrabold text-gray-700 dark:text-gray-300 truncate">
                          {team.name || '未命名队伍'}
                        </span>
                        <span className="text-[8px] font-extrabold px-1.5 py-0 rounded bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400">
                          队伍
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {(team.location || team.essentials?.location) && (
                          <span className="text-[9px] text-gray-400 dark:text-gray-500 flex items-center gap-0.5">
                            <MapPin className="w-2.5 h-2.5" />{team.location || team.essentials?.location}
                          </span>
                        )}
                        {teamMembers.length > 0 && (
                          <span className="text-[9px] text-gray-400 dark:text-gray-500">{teamMembers.length}人</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => onApplyJoin(team)}
                      className="shrink-0 px-3.5 py-1.5 rounded-full bg-blue-600 text-white text-[10px] font-extrabold flex items-center gap-1 hover:bg-blue-700 active:scale-95 transition-all"
                    >
                      <UserPlus className="w-3 h-3" />加入
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-3.5 pb-5 text-center">
              <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center mx-auto mb-2">
                <Sparkles className="w-5 h-5 text-gray-300 dark:text-gray-600" />
              </div>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">暂无匹配推荐</p>
              {!matchingEnabled && isLeader && (
                <button onClick={() => onToggleMatching(true)}
                  className="mt-2 text-[10px] text-purple-600 font-extrabold flex items-center gap-1 mx-auto hover:underline">
                  <Zap className="w-3 h-3" />开启匹配
                </button>
              )}
              {matchingEnabled && (
                <p className="text-[9px] text-gray-300 dark:text-gray-600 mt-1">系统正在为你寻找合适的队友…</p>
              )}
            </div>
          )}
        </div>

      </div>

      {/* ═══ 底部按钮 ═══ */}
      <div className="shrink-0 px-3 py-3">
        <button
          onClick={onCompleteTeam}
          disabled={memberCount < 2}
          className="w-full py-3 rounded-2xl bg-green-600 text-white text-[13px] font-extrabold shadow-md shadow-green-200/30 dark:shadow-green-900/20 hover:bg-green-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          完成组队，开始聊天
        </button>
        <p className="text-center text-[9px] text-gray-400 dark:text-gray-500 mt-1">
          {memberCount < 2 ? '凑满 2 人即可出发' : '队伍已就绪，点击开始聊天'}
        </p>
      </div>
    </div>
  );
}
