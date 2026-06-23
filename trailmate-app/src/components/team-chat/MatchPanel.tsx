import { Sparkles, UserPlus, Users, MapPin } from 'lucide-react';
import type { MatchedUser } from '@/types';

type MatchedUserItem = MatchedUser & { userId?: string };
type MatchedTeamItem = {
  id?: string;
  name?: string;
  location?: string;
  matchPct: number;
  essentials?: { location?: string };
};

interface MatchPanelProps {
  // 匹配提示词
  editingPrompts: boolean;
  editPromptsText: string;
  setEditPromptsText: (v: string) => void;
  onSavePrompts: () => void;
  onCancelPrompts: () => void;
  onShowPromptsConfirm: () => void;
  onStartEditPrompts: () => void;
  groupPrompts: string[];
  intentRawInput?: string;
  // 匹配开关
  matchingEnabled: boolean;
  onToggleMatching: (enabled: boolean) => void;
  isLeader: boolean;
  // 匹配推荐
  matchedUsers: MatchedUserItem[];
  matchTeams: MatchedTeamItem[];
  onInvite: (userId: string) => void;
  onApplyJoin: (team: MatchedTeamItem) => void;
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

export default function MatchPanel({
  editingPrompts, editPromptsText, setEditPromptsText,
  onCancelPrompts, onShowPromptsConfirm, onStartEditPrompts,
  groupPrompts, intentRawInput,
  matchingEnabled, onToggleMatching, isLeader,
  matchedUsers, matchTeams, onInvite, onApplyJoin,
}: MatchPanelProps) {
  const recCount = matchedUsers.length + matchTeams.length;
  const truncReason = (r: string) => r?.length > 28 ? r.slice(0, 28) + '…' : r;
  return (
    <div className="flex flex-col h-full overflow-y-auto px-3 pt-3 pb-2">

      {/* ── ① 匹配提示词 ── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-sm dark:shadow-gray-900/50">
        <div className="flex items-center justify-between px-3.5 py-3 border-l-[3px] border-l-amber-400">
          <h4 className="text-[11px] font-extrabold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />匹配提示词
          </h4>
          <div className="flex items-center gap-2">
            {isLeader && !editingPrompts && (
              <button
                onClick={onStartEditPrompts}
                className="px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400 text-[9px] font-extrabold hover:bg-amber-100 dark:hover:bg-amber-900/20 transition-colors"
              >
                编辑
              </button>
            )}
            {isLeader && (
              <div className="flex items-center gap-2">
                <span className={`text-[9px] font-bold ${
                  matchingEnabled ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'
                }`}>
                  {matchingEnabled ? '匹配中' : '已关闭'}
                </span>
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
              </div>
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
              <div className="px-3.5 pb-3 flex flex-wrap gap-1.5">
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
          </>
        )}
      </div>

      {/* ── 匹配推荐 ── */}
      <div className={`bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-sm dark:shadow-gray-900/50 mt-2.5 transition-opacity ${!matchingEnabled ? 'opacity-40' : ''}`}>
        <div className="flex items-center justify-between px-3.5 py-3 border-l-[3px] border-l-purple-400">
          <h4 className="text-[11px] font-extrabold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-purple-500" />匹配推荐
          </h4>
          {matchingEnabled && recCount > 0 && (
            <span className="text-[10px] font-extrabold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-2 py-0.5 rounded-full">
              {recCount}项
            </span>
          )}
          {!matchingEnabled && (
            <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500">
              需开启匹配
            </span>
          )}
        </div>

        {matchingEnabled && recCount > 0 ? (
          <div>
            {matchedUsers.map((mu: MatchedUserItem, i: number) => (
              <div key={`u-${mu.userId || mu.user?.id || i}`}
                className="flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors border-b border-gray-50 dark:border-gray-800/50 last:border-b-0"
              >
                <div className="relative shrink-0">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-extrabold text-white"
                    style={{ background: mu.user?.avatarColor || `hsl(${(i + 2) * 60}, 55%, 45%)` }}>
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
                    <span className="text-[11px] font-extrabold text-gray-700 dark:text-gray-300 truncate">{mu.user?.name || '匿名'}</span>
                  </div>
                  {mu.reason && <p className="text-[9px] text-gray-400 dark:text-gray-500 truncate">{truncReason(mu.reason)}</p>}
                </div>
                {isLeader && (
                  <button onClick={() => onInvite(mu.user?.id || mu.userId || '')}
                    className="shrink-0 px-3 py-1.5 rounded-full bg-green-600 text-white text-[9px] font-extrabold flex items-center gap-1 hover:bg-green-700 active:scale-95 transition-all">
                    <UserPlus className="w-3 h-3" />邀请
                  </button>
                )}
              </div>
            ))}
            {matchTeams.map((team: MatchedTeamItem, i: number) => (
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
                    <span className="text-[11px] font-extrabold text-gray-700 dark:text-gray-300 truncate">{team.name || '未命名队伍'}</span>
                    <span className="text-[8px] font-extrabold px-1.5 py-0 rounded bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400">队伍</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {(team.location || team.essentials?.location) && (
                      <span className="text-[9px] text-gray-400 dark:text-gray-500 flex items-center gap-0.5">
                        <MapPin className="w-2.5 h-2.5" />{team.location || team.essentials?.location}
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => onApplyJoin(team)}
                  className="shrink-0 px-3 py-1.5 rounded-full bg-blue-600 text-white text-[9px] font-extrabold flex items-center gap-1 hover:bg-blue-700 active:scale-95 transition-all">
                  <UserPlus className="w-3 h-3" />加入
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-3.5 pb-4 text-center">
            {!matchingEnabled ? (
              <p className="text-[11px] text-gray-500 dark:text-gray-400 pt-3 pb-2">
                匹配已关闭
              </p>
            ) : (
              <p className="text-[11px] text-gray-400 dark:text-gray-500 pt-3 pb-2">
                暂无匹配推荐
              </p>
            )}
            <p className="text-[9px] text-gray-300 dark:text-gray-600">
              {!matchingEnabled
                ? '开启匹配后，系统会推荐合适的用户和队伍'
                : isLeader ? '完善提示词可提升匹配精度' : '等待队长设置匹配提示词'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
