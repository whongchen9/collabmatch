import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mountain, Sparkles, Users, User, MessageCircle, ArrowRight, Check, X, Bell } from 'lucide-react';
import { useStore } from '@/store';
import { intentApi } from '@/api';
import type { Intent, MatchedUser } from '@/types';

type Phase = 'idle' | 'thinking' | 'scanning' | 'found' | 'revealing' | 'done';

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

/* ── 匹配动画 ── */
function MatchAnimation({ phase, progress, prompts }: { phase: Phase; progress: number; prompts: string[] }) {
  if (phase === 'idle') return null;

  return (
    <div className="flex flex-col items-center justify-center py-10">
      {/* 中心圆 */}
      <div className="relative w-36 h-36">
        {(phase === 'scanning' || phase === 'found') && (
          <>
            <div className="absolute inset-0 rounded-full border-2 border-green-400 animate-ping opacity-20" />
            <div className="absolute inset-3 rounded-full border border-green-300 animate-ping opacity-15" style={{ animationDelay: '0.7s' }} />
          </>
        )}
        <div className={`absolute inset-6 rounded-full flex items-center justify-center transition-all duration-500 ${
          phase === 'thinking' ? 'bg-green-50' :
          phase === 'scanning' ? 'bg-green-100' :
          phase === 'found' ? 'bg-green-200' :
          'bg-green-500'
        }`}>
          {phase === 'thinking' && <Sparkles className="w-12 h-12 text-green-400 animate-pulse" />}
          {phase === 'scanning' && <Users className="w-12 h-12 text-green-500 animate-bounce" />}
          {phase === 'found' && <Mountain className="w-12 h-12 text-green-700" />}
          {phase === 'revealing' && <span className="text-3xl font-black text-white">{Math.round(progress)}%</span>}
        </div>
      </div>

      <div className="mt-6 text-center max-w-xs">
        {phase === 'thinking' && (
          <>
            <p className="text-gray-700 font-bold text-lg animate-pulse">理解你的需求...</p>
            <div className="mt-3 space-y-1">
              {prompts.map((p, i) => (
                <span key={i} className="inline-block px-2.5 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium mr-1.5 mb-1"
                  style={{ animation: `fadeIn 0.3s ease-out ${i * 0.3}s both` }}>
                  {p}
                </span>
              ))}
            </div>
          </>
        )}
        {phase === 'scanning' && (
          <>
            <p className="text-green-700 font-bold text-lg">扫描匹配中</p>
            <p className="text-gray-400 text-sm mt-1">正在寻找最合适的队友</p>
          </>
        )}
        {phase === 'found' && (
          <>
            <p className="text-green-700 font-bold text-xl">找到了！</p>
            <p className="text-gray-400 text-sm mt-1">正在揭示匹配结果</p>
          </>
        )}
        {phase === 'revealing' && (
          <p className="text-green-700 font-bold">匹配度计算中...</p>
        )}
      </div>
    </div>
  );
}

/* ── 队友卡片 ── */
function TeammateCard({ mu, index, selected, onToggle }: {
  mu: MatchedUser; index: number; selected: boolean; onToggle: () => void;
}) {
  const [visible, setVisible] = useState(false);
  setTimeout(() => setVisible(true), index * 500);

  if (!visible) return <div className="h-28 bg-gray-100 rounded-2xl animate-pulse" />;

  return (
    <div
      onClick={onToggle}
      className={`bg-white rounded-2xl p-4 cursor-pointer transition-all duration-300 border-2 ${
        selected ? 'border-green-500 shadow-lg shadow-green-100 scale-[1.02]' : 'border-transparent shadow-sm'
      }`}
      style={{ animation: 'slideInUp 0.4s ease-out' }}
    >
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white shrink-0"
          style={{ background: `hsl(${mu.matchPct * 1.2}, 60%, 45%)` }}>
          {mu.user.name?.[0] || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-gray-800">{mu.user.name}</h3>
            <span className="px-2 py-0.5 bg-green-50 text-green-600 rounded-full text-xs font-bold">
              {mu.matchPct}%
            </span>
            {selected && <Check className="w-4 h-4 text-green-600" />}
          </div>
          {/* AI 匹配理由 */}
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{mu.reason}</p>
        </div>
      </div>
      {/* 匹配分项 */}
      <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-gray-50">
        {[
          { label: '必要因素', value: mu.breakdown.essentials, icon: '📋' },
          { label: '提示词', value: mu.breakdown.prompts, icon: '💡' },
          { label: '档案', value: mu.breakdown.profile, icon: '👤' },
        ].map(item => (
          <div key={item.label} className="text-center">
            <span className="text-xs">{item.icon}</span>
            <div className="h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
              <div className={`h-full rounded-full ${item.value >= 80 ? 'bg-green-500' : item.value >= 60 ? 'bg-amber-500' : 'bg-gray-400'}`}
                style={{ width: `${item.value}%`, transition: 'width 0.5s ease-out' }} />
            </div>
            <p className="text-[10px] text-gray-400 mt-0.5">{item.label} {item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── 主页 ── */
export default function Home() {
  const { user } = useStore();
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  const [intent, setIntent] = useState<Intent | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [unreadCount, setUnreadCount] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Fetch unread notice count
  useEffect(() => {
    if (user) {
      intentApi.unreadCount().then(r => setUnreadCount(r.count)).catch(() => {});
    }
  }, [user]);

  const handleMatch = async () => {
    if (!input.trim()) return;

    // Phase 1: Thinking (show extracted prompts)
    setPhase('thinking');
    await sleep(1200);

    // Phase 2: Scanning
    setPhase('scanning');
    await sleep(1500);

    // Phase 3: Call API
    setPhase('found');
    try {
      const result = await intentApi.create(input);
      setIntent(result);
    } catch (err: any) {
      alert(err.message || '匹配失败');
      setPhase('idle');
      return;
    }
    await sleep(800);

    // Phase 4: Revealing
    setPhase('revealing');
    for (let i = 0; i <= 100; i += 4) {
      setProgress(i);
      await sleep(20);
    }

    // Phase 5: Done
    setPhase('done');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleMatch(); }
  };

  const toggleSelect = (uid: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid); else next.add(uid);
      return next;
    });
  };

  const handleConfirmTeam = async () => {
    if (!intent || selectedIds.size === 0) return;
    try {
      await intentApi.confirmTeam(intent.id, Array.from(selectedIds));
      navigate('/teams');
    } catch (err: any) {
      alert(err.message || '组队失败');
    }
  };

  // Extracted prompts for animation (mock before API returns)
  const animPrompts = phase === 'thinking' ? extractPrompts(input) : (intent?.prompts || []);

  return (
    <div className="pb-24 min-h-screen flex flex-col" style={{ background: '#faf7f2' }}>
      {/* Header */}
      <div className="px-5 pt-6 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mountain className="w-6 h-6 text-green-600" />
          <span className="text-lg font-bold text-gray-800">TrailMate</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/notices')} className="relative text-gray-400 hover:text-gray-600">
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">{unreadCount}</span>
            )}
          </button>
          <button onClick={() => navigate('/profile')} className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
            <User className="w-4 h-4 text-green-600" />
          </button>
        </div>
      </div>

      {/* ═══ IDLE: 输入区 ═══ */}
      {phase === 'idle' && (
        <div className="flex-1 flex flex-col justify-center px-5">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-gray-800 leading-tight">
              一句话<br /><span className="text-green-600">匹配队友</span>
            </h1>
            <p className="text-gray-400 text-sm mt-3">告诉我想去哪里、想找什么样的人</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-4 border border-gray-100">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="我想周末去梧桐山徒步，找3-4个人，不喜欢抽烟的..."
              className="w-full resize-none outline-none text-gray-800 placeholder-gray-300 text-base leading-relaxed"
              rows={3}
            />
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
              <span className="text-xs text-gray-300">Enter 开始匹配</span>
              <button onClick={handleMatch} disabled={!input.trim()}
                className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl disabled:opacity-30 shadow-md shadow-green-200 transition-all active:scale-95 flex items-center gap-2 text-sm">
                <Sparkles className="w-4 h-4" />开始匹配
              </button>
            </div>
          </div>

          {/* Quick suggestions */}
          <div className="mt-5 flex flex-wrap gap-2 justify-center">
            {[
              '周末梧桐山日归',
              '找个不喜欢抽烟的队友',
              '想走有水的轻松路线',
              '3天长线挑战，要老驴',
            ].map(s => (
              <button key={s} onClick={() => { setInput(s); inputRef.current?.focus(); }}
                className="px-3 py-1.5 bg-white rounded-full text-xs text-gray-500 border border-gray-200 hover:border-green-300 hover:text-green-600 transition-all">
                {s}
              </button>
            ))}
          </div>

          {/* Profile hint */}
          {user && (!user.preferences || user.preferences.length === 0) && (
            <div className="mt-6 bg-green-50 rounded-xl p-3 flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-green-500 shrink-0" />
              <p className="text-xs text-green-700">完善徒步偏好，匹配更精准</p>
              <button onClick={() => navigate('/profile')} className="text-xs text-green-600 font-medium ml-auto whitespace-nowrap">去设置</button>
            </div>
          )}
        </div>
      )}

      {/* ═══ MATCHING: 动画 ═══ */}
      {['thinking', 'scanning', 'found', 'revealing'].includes(phase) && (
        <div className="flex-1 flex flex-col items-center justify-center px-5">
          <MatchAnimation phase={phase} progress={progress} prompts={animPrompts} />
          <div className="mt-4 bg-white/80 rounded-xl px-4 py-2 max-w-xs">
            <p className="text-sm text-gray-500 text-center">"{input}"</p>
          </div>
        </div>
      )}

      {/* ═══ DONE: 匹配结果 ═══ */}
      {phase === 'done' && intent && (
        <div className="flex-1 px-5 pt-4">
          {/* Essentials extracted */}
          <div className="bg-white rounded-2xl shadow-sm p-4 mb-3">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-green-600" />
              <span className="text-sm font-bold text-gray-800">AI 理解了你的需求</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {intent.prompts.map((p, i) => (
                <span key={i} className="px-2.5 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium">{p}</span>
              ))}
            </div>
            {/* Show what's confirmed vs open */}
            <div className="mt-2 pt-2 border-t border-gray-50 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-xs text-gray-400">地点</p>
                <p className="text-sm font-medium text-gray-700">{intent.essentials.location || '待定'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">时间</p>
                <p className="text-sm font-medium text-gray-700">{intent.essentials.date || '待定'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">人数</p>
                <p className="text-sm font-medium text-gray-700">{intent.essentials.groupSize ? `${intent.essentials.groupSize}人` : '待定'}</p>
              </div>
            </div>
            {!intent.essentialsComplete && (
              <p className="text-xs text-amber-600 mt-2">💡 部分细节待定，匹配到队友后可以一起商量</p>
            )}
          </div>

          {/* Matched teammates */}
          <div className="text-center mb-3">
            <h2 className="text-lg font-bold text-gray-800">为你找到 {intent.matchedUsers.length} 位队友</h2>
            <p className="text-xs text-gray-400 mt-0.5">点击选择想组队的人</p>
          </div>

          <div className="space-y-3">
            {intent.matchedUsers.map((mu, i) => (
              <TeammateCard
                key={mu.user.id}
                mu={mu}
                index={i}
                selected={selectedIds.has(mu.user.id)}
                onToggle={() => toggleSelect(mu.user.id)}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="mt-6 space-y-3 pb-4">
            <button onClick={handleConfirmTeam}
              disabled={selectedIds.size === 0}
              className="w-full py-3.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg shadow-green-200 transition-all active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2">
              <Users className="w-5 h-5" />
              {selectedIds.size > 0 ? `确认组队（已选${selectedIds.size}人）` : '选择队友后确认组队'}
            </button>
            <button onClick={() => { setPhase('idle'); setInput(''); setIntent(null); setSelectedIds(new Set()); }}
              className="w-full py-3 text-gray-500 font-medium text-sm">
              重新匹配
            </button>
          </div>
        </div>
      )}

      {/* Bottom nav (idle only) */}
      {phase === 'idle' && (
        <div className="px-5 pb-4 mt-auto">
          <div className="flex gap-3">
            <button onClick={() => navigate('/teams')}
              className="flex-1 bg-white rounded-xl p-3 flex items-center gap-2 shadow-sm">
              <MessageCircle className="w-4 h-4 text-amber-500" />
              <span className="text-xs text-gray-600 font-medium">我的队伍</span>
            </button>
            <button onClick={() => navigate('/notices')}
              className="flex-1 bg-white rounded-xl p-3 flex items-center gap-2 shadow-sm">
              <Bell className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-gray-600 font-medium">匹配通知</span>
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
}

/** 前端简单提取提示词（后端 AI 做更精准的提取） */
function extractPrompts(text: string): string[] {
  const prompts: string[] = [];
  if (/梧桐山|泰山|华山|黄山/.test(text)) prompts.push('🏔️ ' + text.match(/(梧桐山|泰山|华山|黄山)/)?.[1]);
  if (/周末|周六|周日/.test(text)) prompts.push('⏰ 周末出行');
  if (/不喜欢抽烟|不抽烟|无烟/.test(text)) prompts.push('🚭 不抽烟');
  if (/有经验|老驴|老手/.test(text)) prompts.push('🥾 有经验优先');
  if (/轻松|休闲|简单/.test(text)) prompts.push('🌿 轻松休闲');
  if (/挑战|难度|长线/.test(text)) prompts.push('💪 挑战型');
  if (/拍照|摄影|风景/.test(text)) prompts.push('📸 喜欢拍照');
  if (/有水|溪流|瀑布/.test(text)) prompts.push('💧 有水路线');
  if (/\d+人|\d+-\d+/.test(text)) prompts.push('👥 ' + (text.match(/\d+[-~]\d+人|\d+人/)?.[0] || '小队'));
  if (/日归|当天/.test(text)) prompts.push('☀️ 日归');
  if (/多日|过夜|露营/.test(text)) prompts.push('⛺ 多日行程');
  if (prompts.length === 0) prompts.push('🎯 正在分析...');
  return prompts;
}
