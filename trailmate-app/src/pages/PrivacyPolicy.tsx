import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-800/50">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 px-4 py-3 flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="text-gray-600 dark:text-gray-400">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-bold text-gray-800 dark:text-gray-200">隐私政策</h1>
      </div>

      {/* Content */}
      <div className="px-5 py-5 max-w-lg">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm dark:shadow-gray-900/50 p-5 space-y-4 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">TrailMate 隐私政策</h2>
          </div>

          <p className="text-xs text-gray-400 dark:text-gray-500">更新日期：2026年1月1日</p>

          <div className="space-y-3">
            <section>
              <h3 className="font-bold text-gray-800 dark:text-gray-200 text-sm mb-1">1. 信息收集</h3>
              <p>我们收集您在使用 TrailMate 服务时提供的信息，包括但不限于：</p>
              <ul className="list-disc pl-5 mt-1 space-y-0.5 text-gray-500 dark:text-gray-400">
                <li>账户信息：姓名、邮箱地址等注册信息</li>
                <li>个人资料：徒步偏好、经验等级、常驻城市等信息</li>
                <li>位置信息：用于队伍位置共享和紧急求助功能</li>
                <li>活动数据：徒步日志、行程记录、照片等内容</li>
                <li>设备信息：设备型号、操作系统版本等</li>
              </ul>
            </section>

            <section>
              <h3 className="font-bold text-gray-800 dark:text-gray-200 text-sm mb-1">2. 信息使用</h3>
              <p>我们使用收集的信息来：</p>
              <ul className="list-disc pl-5 mt-1 space-y-0.5 text-gray-500 dark:text-gray-400">
                <li>提供和维护 TrailMate 的核心功能</li>
                <li>基于您的偏好进行智能队友匹配</li>
                <li>展示您的徒步活动和队伍信息</li>
                <li>发送重要通知和安全提醒</li>
                <li>改进和优化我们的服务体验</li>
              </ul>
            </section>

            <section>
              <h3 className="font-bold text-gray-800 dark:text-gray-200 text-sm mb-1">3. 信息共享</h3>
              <p className="text-gray-500 dark:text-gray-400">我们不会将您的个人信息出售给第三方。在以下情况下我们可能分享信息：</p>
              <ul className="list-disc pl-5 mt-1 space-y-0.5 text-gray-500 dark:text-gray-400">
                <li>经您明确授权和同意</li>
                <li>队伍内部的位置共享（仅限同队成员可见）</li>
                <li>法律法规要求或政府机关依法要求</li>
              </ul>
            </section>

            <section>
              <h3 className="font-bold text-gray-800 dark:text-gray-200 text-sm mb-1">4. 数据安全</h3>
              <p className="text-gray-500 dark:text-gray-400">我们采用业界标准的安全措施保护您的个人信息，包括数据加密传输（TLS）、访问控制、定期安全审计等措施。但请注意，没有任何网络传输或存储方式是 100% 安全的。</p>
            </section>

            <section>
              <h3 className="font-bold text-gray-800 dark:text-gray-200 text-sm mb-1">5. 您的权利</h3>
              <p className="text-gray-500 dark:text-gray-400">您有权访问、更正或删除您的个人信息。您可以在应用的"设置 → 个人资料"中管理大部分信息。如需完全删除账户，请联系我们的支持团队。您还有权举报不当内容和屏蔽其他用户。</p>
            </section>

            <section>
              <h3 className="font-bold text-gray-800 dark:text-gray-200 text-sm mb-1">6. 内容审核与举报</h3>
              <p className="text-gray-500 dark:text-gray-400">我们重视用户内容安全。您可以通过长按消息或在用户资料页举报不当内容。我们收到举报后会进行审核，并可能删除违规内容或限制相关账户。您也可以屏蔽特定用户，被屏蔽用户的消息将不会显示给您。</p>
            </section>

            <section>
              <h3 className="font-bold text-gray-800 dark:text-gray-200 text-sm mb-1">7. Cookie 和追踪</h3>
              <p className="text-gray-500 dark:text-gray-400">我们使用必要的 Cookie 来维持您的登录状态和应用设置，不用于追踪目的。您可以在浏览器设置中管理 Cookie 偏好。</p>
            </section>

            <section>
              <h3 className="font-bold text-gray-800 dark:text-gray-200 text-sm mb-1">8. 隐私政策更新</h3>
              <p className="text-gray-500 dark:text-gray-400">我们可能会不时更新本隐私政策。更新后的政策将在本页面发布，重大变更将通过应用内通知告知。</p>
            </section>

            <section>
              <h3 className="font-bold text-gray-800 dark:text-gray-200 text-sm mb-1">9. 联系我们</h3>
              <p className="text-gray-500 dark:text-gray-400">如果您对本隐私政策有任何疑问或建议，请通过 TrailMate 的"意见反馈"功能联系我们，或发送邮件至 privacy@trailmate.app。</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
