import { FileText } from 'lucide-react';
import type { Group } from '@/types';

interface PlanPanelProps {
  group: Group;
  isLeader: boolean;
  isMember: boolean;
  editingPlan: boolean;
  planEditorRef: React.RefObject<HTMLTextAreaElement>;
  onSavePlan: () => void;
  onCancelPlan: () => void;
  onStartEdit: () => void;
}

export default function PlanPanel({
  group, isLeader, isMember,
  editingPlan, planEditorRef, onSavePlan, onCancelPlan, onStartEdit,
}: PlanPanelProps) {
  return (
    <div className="flex flex-col h-full">

      {/* ═══ 行动计划 ═══ */}
      <div className="flex-1 overflow-y-auto px-3 pt-3 pb-2">
        <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-sm dark:shadow-gray-900/50">
          <div className="flex items-center justify-between px-3.5 py-3 border-l-[3px] border-l-blue-400">
            <h4 className="text-[11px] font-extrabold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-500" />行动计划
            </h4>
            {isLeader && !editingPlan && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={onStartEdit}
                  className="px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400 text-[9px] font-extrabold hover:bg-amber-100 dark:hover:bg-amber-900/20 transition-colors"
                >
                  编辑
                </button>
              </div>
            )}
          </div>

          {editingPlan ? (
            <div className="px-3.5 pb-3.5 space-y-2">
              <textarea
                ref={planEditorRef}
                className="w-full min-h-[150px] max-h-[300px] overflow-y-auto px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-[11px] text-gray-700 dark:text-gray-300 outline-none focus:border-green-500 bg-gray-50 dark:bg-gray-800/30 leading-relaxed resize-none"
                placeholder="输入行动计划…"
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
      </div>
    </div>
  );
}
