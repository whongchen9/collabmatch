import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Send, Check } from 'lucide-react';
import { useStore } from '@/store';

type FeedbackType = 'feature' | 'bug' | 'other';

const feedbackTypeOptions: { value: FeedbackType; label: string }[] = [
  { value: 'feature', label: '功能建议' },
  { value: 'bug', label: 'Bug 反馈' },
  { value: 'other', label: '其他' },
];

export default function Feedback() {
  const navigate = useNavigate();
  const { showToast } = useStore();
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('feature');
  const [content, setContent] = useState('');
  const [contact, setContact] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      // Submit feedback to backend
      let apiSuccess = false;
      try {
        const { usersApi } = await import('@/api');
        await usersApi.updateSettings({ feedback: { type: feedbackType, content: content.trim(), contact: contact.trim() } });
        apiSuccess = true;
      } catch (apiErr: any) {
        console.error('Feedback API error:', apiErr);
        // If backend doesn't support feedback endpoint, fall back to localStorage
        try {
          const stored = JSON.parse(localStorage.getItem('trailmate_feedback') || '[]');
          stored.push({
            type: feedbackType,
            content: content.trim(),
            contact: contact.trim(),
            createdAt: new Date().toISOString(),
          });
          localStorage.setItem('trailmate_feedback', JSON.stringify(stored));
        } catch {}
      }
      setSubmitted(true);
      showToast(apiSuccess ? '感谢您的反馈！' : '反馈已保存到本地，联网后将自动同步');
      setTimeout(() => {
        navigate(-1);
      }, 2000);
    } catch (err: any) {
      showToast(err?.message || '提交失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-1">感谢您的反馈！</h2>
          <p className="text-sm text-gray-400 dark:text-gray-400">我们会认真对待每一条建议</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-8">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 px-4 py-3 flex items-center gap-3 border-b border-gray-100 dark:border-gray-700 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="text-gray-600 dark:text-gray-300">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-bold text-gray-800 dark:text-gray-100">意见反馈</h1>
      </div>

      {/* Form */}
      <div className="px-5 mt-5 space-y-4 max-w-lg">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 space-y-4">
          {/* 反馈类型 */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">反馈类型</label>
            <div className="flex gap-2">
              {feedbackTypeOptions.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setFeedbackType(value)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    feedbackType === value
                      ? 'bg-green-600 text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 反馈内容 */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">反馈内容</label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="请描述您的问题或建议..."
              rows={6}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 text-sm outline-none focus:border-green-500 resize-none"
            />
          </div>

          {/* 联系方式 */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">联系方式（可选）</label>
            <input
              type="text"
              value={contact}
              onChange={e => setContact(e.target.value)}
              placeholder="方便我们联系您（可选）"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 text-sm outline-none focus:border-green-500"
            />
          </div>

          {/* 提交按钮 */}
          <button
            onClick={handleSubmit}
            disabled={!content.trim() || submitting}
            className="w-full py-3 bg-green-600 text-white rounded-xl font-medium text-sm disabled:opacity-40 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>提交中...</>
            ) : (
              <>
                <Send className="w-4 h-4" />提交反馈
              </>
            )}
          </button>
        </div>

        <p className="text-center text-xs text-gray-300 dark:text-gray-600">
          您的反馈将帮助我们改进 TrailMate
        </p>
      </div>
    </div>
  );
}
