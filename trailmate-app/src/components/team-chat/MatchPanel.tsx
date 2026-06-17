import { Sparkles, Users, UserPlus, MapPin, Merge, Zap, ArrowRight, Pencil } from 'lucide-react';

interface MatchPanelProps {
  matchTab: 'members' | 'teams';
  setMatchTab: (tab: 'members' | 'teams') => void;
  matchedUsers: any[];
  matchTeams: any[];
  matchingEnabled: boolean;
  onToggleMatching: (enabled: boolean) => void;
  isLeader: boolean;
  onInvite: (userId: string) => void;
  onMergeTeam: (team: any) => void;
  onApplyJoin: (team: any) => void;
  merging: boolean;
  mergeConfirmTeam: any;
  myLeaderTeams: any[];
  selectedFromTeamId: string;
  setSelectedFromTeamId: (id: string) => void;
  doApplyMerge: () => void;
  onCancelMerge: () => void;
  // 匹配提示词
  editingPrompts: boolean;
  editPromptsText: string;
  setEditPromptsText: (v: string) => void;
  onSavePrompts: () => void;
  onCancelPrompts: () => void;
  onShowPromptsConfirm: () => void;
  groupPrompts: string[];
}

const TAG_COLORS = ['purple', 'amber', 'blue', 'green'] as const;

function getTagColor(index: number) {
  return TAG_COLORS[index % TAG_COLORS.length];
}

export default function MatchPanel({
  matchTab, setMatchTab, matchedUsers, matchTeams,
  matchingEnabled, onToggleMatching, isLeader,
  onInvite, onMergeTeam, onApplyJoin, merging,
  mergeConfirmTeam, myLeaderTeams, selectedFromTeamId,
  setSelectedFromTeamId, doApplyMerge, onCancelMerge,
  editingPrompts, editPromptsText, setEditPromptsText,
  onSavePrompts, onCancelPrompts, onShowPromptsConfirm,
  groupPrompts,
}: MatchPanelProps) {

  const avgMatchPct = (() => {
    const all = [
      ...matchedUsers.map((u: any) => u.matchPct),
      ...matchTeams.map((t: any) => t.matchPct),
    ];
    if (all.length === 0) return 0;
    return Math.round(all.reduce((s, n) => s + n, 0) / all.length);
  })();

  const memberCount = matchedUsers.length;
  const teamCount = matchTeams.length;

  // ── 匹配理由截断 ──
  const truncReason = (r: string) => r?.length > 24 ? r.slice(0, 24) + '…' : r;

  return (
    <div className="flex flex-col h-full">

      {/* ═══ 匹配开关 ═══ */}
      <div className="shrink-0 mx-4 mt-3 flex items-center justify-between bg-white dark:bg-gray-900 rounded-xl px-4 py-2.5 shadow-sm dark:shadow-gray-900/50 border border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${matchingEnabled ? 'bg-green-500 animate-pulse' : 'bg-gray-300 dark:bg-gray-600'}`} />
          <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{matchingEnabled ? 'AI 匹配中' : '匹配已关闭'}</span>
        </div>
        {isLeader && (
          <button onClick={() => onToggleMatching(!matchingEnabled)}
            className={`shrink-0 w-10 h-5 rounded-full relative transition-colors ${
              matchingEnabled ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
            }`}>
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
              matchingEnabled ? 'left-5' : 'left-0.5'
            }`} />
          </button>
        )}
      </div>

      {/* ═══ Tab Bar ═══ */}
      <div className="shrink-0 mx-4 mt-3 flex bg-white dark:bg-gray-900 rounded-xl p-1 shadow-sm dark:shadow-gray-900/50">
        <button onClick={() => setMatchTab('members')}
          className={`flex-1 py-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 ${
            matchTab === 'members'
              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-gray-400 dark:text-gray-500'
          }`}>
          <Users className="w-3.5 h-3.5" />成员推荐
        </button>
        <button onClick={() => setMatchTab('teams')}
          className={`flex-1 py-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 ${
            matchTab === 'teams'
              ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 shadow-sm'
              : 'text-gray-400 dark:text-gray-500'
          }`}>
          <Sparkles className="w-3.5 h-3.5" />队伍推荐
        </button>
      </div>

      {/* ═══ 可滚动内容区 ═══ */}
      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-2 space-y-3">

        {/* ── 成员推荐 ── */}
        {matchTab === 'members' && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-sm dark:shadow-gray-900/50">
            <div className="flex items-center justify-between px-4 py-3 border-l-[3px] border-l-blue-400">
              <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-500" />推荐成员
              </h4>
              {memberCount > 0 && (
                <span className="text-[10px] font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full">{memberCount}人</span>
              )}
            </div>

            {memberCount > 0 ? (
              <div>
                {matchedUsers.map((mu: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors border-b border-gray-50 dark:border-gray-800/50 last:border-b-0">
                    {/* 头像 + 匹配度环 */}
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white"
                        style={{ background: mu.user?.avatarColor || `hsl(${mu.matchPct * 1.2}, 55%, 45%)` }}>
                        {mu.user?.name?.[0] || '?'}
                      </div>
                      <span className={`absolute -top-1 -right-1 w-[18px] h-[18px] rounded-full flex items-center justify-center text-[8px] font-extrabold text-white border-2 border-white dark:border-gray-900 ${
                        mu.matchPct >= 80 ? 'bg-green-500' : mu.matchPct >= 60 ? 'bg-amber-500' : 'bg-gray-400'
                      }`}>
                        {mu.matchPct}
                      </span>
                    </div>

                    {/* 信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 truncate">{mu.user?.name || '匿名'}</span>
                      </div>
                      {mu.reason && (
                        <p className="text-[9px] text-gray-400 dark:text-gray-500 truncate">{truncReason(mu.reason)}</p>
                      )}
                    </div>

                    {/* 操作按钮 */}
                    <button onClick={() => onInvite(mu.user?.id || mu.userId)}
                      className="shrink-0 px-4 py-1.5 rounded-full bg-green-600 text-white text-[10px] font-bold flex items-center gap-1 hover:bg-green-700 active:scale-95 transition-all">
                      <UserPlus className="w-3 h-3" />邀请
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 pb-5 text-center">
                <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center mx-auto mb-2">
                  <Users className="w-5 h-5 text-gray-300 dark:text-gray-600" />
                </div>
                <p className="text-[11px] text-gray-400 dark:text-gray-500">暂无匹配成员</p>
                {!matchingEnabled && isLeader && (
                  <button onClick={() => onToggleMatching(true)}
                    className="mt-2 text-[10px] text-blue-600 font-bold flex items-center gap-1 mx-auto hover:underline">
                    <Zap className="w-3 h-3" />开启匹配
                  </button>
                )}
                {matchingEnabled && (
                  <p className="text-[9px] text-gray-300 dark:text-gray-600 mt-1">系统正在为你寻找合适的队友…</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── 队伍推荐 ── */}
        {matchTab === 'teams' && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-sm dark:shadow-gray-900/50">
            <div className="flex items-center justify-between px-4 py-3 border-l-[3px] border-l-amber-400">
              <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />推荐队伍
              </h4>
              {teamCount > 0 && (
                <span className="text-[10px] font-bold text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">{teamCount}队</span>
              )}
            </div>

            {teamCount > 0 ? (
              <div>
                {matchTeams.map((team: any) => {
                  const isExpanding = mergeConfirmTeam?.id === team.id;
                  const teamMembers = team.members || team.groupMembers || [];
                  const teamType = team.type || team.essentials?.eventType || (team.tags?.includes('徒步') ? 'hike' : undefined);
                  const isHike = teamType === 'hike' || teamType === '徒步';
                  const displayType = teamType === 'other' || teamType === '其他' ? '其他' : '徒步';

                  return (
                    <div key={team.id} className="border-b border-gray-50 dark:border-gray-800/50 last:border-b-0">
                      {/* 队伍横向卡片 */}
                      <div className="flex items-center gap-3 px-4 py-2.5">
                        {/* 缩略图 */}
                        <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-base font-extrabold ${
                          isHike
                            ? 'bg-gradient-to-br from-emerald-100 to-green-200 dark:from-emerald-900/30 dark:to-green-800/30 text-green-700 dark:text-green-400'
                            : 'bg-gradient-to-br from-purple-100 to-violet-200 dark:from-purple-900/30 dark:to-violet-800/30 text-purple-700 dark:text-purple-400'
                        }`}>
                          {isHike ? '🥾' : '📋'}
                        </div>

                        {/* 信息 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 truncate">{team.name || '未命名队伍'}</span>
                            <span className={`text-[8px] font-bold px-1.5 py-0 rounded ${
                              isHike ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400'
                            }`}>{displayType}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {(team.location || team.essentials?.location) && (
                              <span className="text-[9px] text-gray-400 dark:text-gray-500 flex items-center gap-0.5">
                                <MapPin className="w-2.5 h-2.5" />{team.location || team.essentials?.location}
                              </span>
                            )}
                            {(team.date || team.essentials?.date) && (
                              <span className="text-[9px] text-gray-400 dark:text-gray-500">{team.date || team.essentials?.date}</span>
                            )}
                          </div>
                          {/* 成员头像行 */}
                          {teamMembers.length > 0 && (
                            <div className="flex items-center gap-0.5 mt-1">
                              {teamMembers.slice(0, 4).map((m: any, mi: number) => (
                                <span key={mi} className="w-[15px] h-[15px] rounded-full flex items-center justify-center text-[7px] font-bold text-white border border-white dark:border-gray-900 -ml-1 first:ml-0"
                                  style={{ background: m.avatarColor || `hsl(${(mi + 2) * 72}, 50%, 45%)` }}>
                                  {(m.name || '?')[0]}
                                </span>
                              ))}
                              {teamMembers.length > 4 && (
                                <span className="text-[7px] text-gray-400 dark:text-gray-500 ml-0.5">+{teamMembers.length - 4}</span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* 匹配度 */}
                        <span className={`shrink-0 w-[22px] h-[22px] rounded-full flex items-center justify-center text-[8px] font-extrabold text-white ${
                          team.matchPct >= 80 ? 'bg-green-500' : team.matchPct >= 60 ? 'bg-amber-500' : 'bg-gray-400'
                        }`}>
                          {team.matchPct}
                        </span>

                        {/* 操作按钮 */}
                        {isLeader ? (
                          <button onClick={() => onMergeTeam(team)} disabled={merging}
                            className="shrink-0 px-4 py-1.5 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center gap-1 hover:bg-blue-600 disabled:opacity-50 active:scale-95 transition-all">
                            <Merge className="w-3 h-3" />合并
                          </button>
                        ) : (
                          <button onClick={() => onApplyJoin(team)} disabled={merging}
                            className="shrink-0 px-4 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-[10px] font-bold flex items-center gap-1 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 active:scale-95 transition-all">
                            <UserPlus className="w-3 h-3" />申请
                          </button>
                        )}
                      </div>

                      {/* 内联合并展开 */}
                      {isExpanding && isLeader && (
                        <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-800 pt-3 bg-gray-50/50 dark:bg-gray-800/20">
                          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 mb-2">将我的队伍（来源）</p>
                          {myLeaderTeams.length > 0 ? (
                            <select value={selectedFromTeamId} onChange={e => setSelectedFromTeamId(e.target.value)}
                              className="w-full bg-white dark:bg-gray-900 rounded-lg px-3 py-2 text-[11px] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 focus:border-blue-400 outline-none mb-3">
                              {myLeaderTeams.map((t: any) => (
                                <option key={t.id} value={t.id}>{t.name}（{t.members?.length || 0}人）</option>
                              ))}
                            </select>
                          ) : (
                            <p className="text-[10px] text-gray-300 dark:text-gray-600 mb-3">暂无可合并的队伍</p>
                          )}

                          {/* 对比摘要 */}
                          <div className="flex items-center justify-center gap-2 bg-blue-50 dark:bg-blue-900/10 rounded-xl py-3 px-3 mb-3">
                            <div className="text-center flex-1 min-w-0">
                              <div className="text-[10px] font-bold text-gray-700 dark:text-gray-300 truncate">
                                {(() => { const fromTeam = myLeaderTeams.find((t: any) => t.id === selectedFromTeamId); return fromTeam?.name || '-'; })()}
                              </div>
                              <div className="text-[8px] text-gray-400 dark:text-gray-500">{(() => { const fromTeam = myLeaderTeams.find((t: any) => t.id === selectedFromTeamId); return (fromTeam?.members?.length || 0); })()}人</div>
                            </div>
                            <ArrowRight className="w-4 h-4 text-blue-400 shrink-0" />
                            <div className="text-center flex-1 min-w-0">
                              <div className="text-[10px] font-bold text-gray-700 dark:text-gray-300 truncate">{mergeConfirmTeam?.name || '目标队伍'}</div>
                              <div className="text-[8px] text-gray-400 dark:text-gray-500">{(mergeConfirmTeam?.members || mergeConfirmTeam?.groupMembers || []).length}人</div>
                            </div>
                          </div>

                          {/* 合并后总人数 */}
                          <p className="text-[9px] text-center text-gray-400 dark:text-gray-500 mb-3">
                            合并后总人数：
                            <strong className="text-blue-600 dark:text-blue-400">
                              {(() => {
                                const fromTeam = myLeaderTeams.find((t: any) => t.id === selectedFromTeamId);
                                return (fromTeam?.members?.length || 0) + (mergeConfirmTeam?.members || mergeConfirmTeam?.groupMembers || []).length;
                              })()} 人
                            </strong>
                          </p>

                          <div className="flex gap-2">
                            <button onClick={onCancelMerge}
                              className="flex-1 py-2 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-lg text-[11px] font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                              取消
                            </button>
                            <button onClick={doApplyMerge} disabled={merging || !selectedFromTeamId || selectedFromTeamId === mergeConfirmTeam?.id}
                              className="flex-1 py-2 bg-blue-500 text-white rounded-lg text-[11px] font-bold disabled:opacity-50 hover:bg-blue-600 transition-colors">
                              {selectedFromTeamId === mergeConfirmTeam?.id ? '不能申请自身' : merging ? '发送中…' : '确认申请合并'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="px-4 pb-5 text-center">
                <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center mx-auto mb-2">
                  <Sparkles className="w-5 h-5 text-gray-300 dark:text-gray-600" />
                </div>
                <p className="text-[11px] text-gray-400 dark:text-gray-500">暂无匹配队伍</p>
                {!matchingEnabled && isLeader && (
                  <button onClick={() => onToggleMatching(true)}
                    className="mt-2 text-[10px] text-amber-600 font-bold flex items-center gap-1 mx-auto hover:underline">
                    <Zap className="w-3 h-3" />开启匹配
                  </button>
                )}
                {matchingEnabled && (
                  <p className="text-[9px] text-gray-300 dark:text-gray-600 mt-1">附近队伍将自动出现在这里</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── 匹配提示词 ── */}
        {isLeader && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-sm dark:shadow-gray-900/50">
            <div className="flex items-center justify-between px-4 py-3 border-l-[3px] border-l-amber-400">
              <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />匹配提示词
              </h4>
              {!editingPrompts && (
                <button onClick={() => { setEditPromptsText((groupPrompts || []).join('、')); }}
                  className="w-6 h-6 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-500 flex items-center justify-center hover:bg-amber-100 transition-colors">
                  <Pencil className="w-3 h-3" />
                </button>
              )}
            </div>
            {editingPrompts ? (
              <div className="px-4 pb-4 space-y-2">
                <input type="text" value={editPromptsText} onChange={e => setEditPromptsText(e.target.value)}
                  placeholder="用顿号分隔，如：不喜欢抽烟、有经验优先"
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/30 rounded-xl border border-gray-200 dark:border-gray-700 text-[11px] text-gray-700 dark:text-gray-300 outline-none focus:border-green-500" />
                <div className="flex gap-2">
                  <button onClick={onCancelPrompts} className="flex-1 py-2 rounded-lg text-[11px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-500">取消</button>
                  <button onClick={() => { if (!editPromptsText.trim()) return; onShowPromptsConfirm(); }}
                    className="flex-1 py-2 rounded-lg text-[11px] font-bold bg-green-600 text-white">保存提示词</button>
                </div>
              </div>
            ) : (groupPrompts || []).length > 0 ? (
              <div className="px-4 pb-4 flex flex-wrap gap-1.5">
                {(groupPrompts || []).map((p: string, i: number) => (
                  <span key={i} className="px-2.5 py-1 bg-amber-50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400 rounded-full text-[10px] font-medium">{p}</span>
                ))}
              </div>
            ) : (
              <div className="px-4 pb-5 text-center">
                <p className="text-[11px] text-gray-400 dark:text-gray-500">暂未设置</p>
                <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-1">设置后可提升匹配精度</p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
