import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';

export default function TermsOfService() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-800/50">
      <div className="bg-white dark:bg-gray-900 px-4 py-3 flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="text-gray-600 dark:text-gray-400">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-bold text-gray-800 dark:text-gray-200">服务条款</h1>
      </div>

      <div className="px-4 py-5 space-y-5 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
          <FileText className="w-4 h-4" />
          <span className="font-bold">最后更新：2026年6月23日</span>
        </div>

        <section>
          <h2 className="text-base font-bold text-gray-800 dark:text-gray-200 mb-2">1. 服务说明</h2>
          <p>TrailMate（以下简称"本服务"）是一个户外徒步路线分享与组队平台。用户可以通过本服务浏览徒步路线、创建或加入队伍、分享位置信息及徒步日志。</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-800 dark:text-gray-200 mb-2">2. 用户注册与账户</h2>
          <p>用户在注册时需提供真实、准确的信息。用户账户仅供本人使用，不得转让、出借或共享。用户需妥善保管账户密码，因账户泄露导致的损失由用户自行承担。</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-800 dark:text-gray-200 mb-2">3. 用户行为规范</h2>
          <p className="mb-2">用户在使用本服务时，不得发布以下内容：</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>违反法律法规的信息，包括但不限于危害国家安全、淫秽色情、暴力恐怖、诈骗等</li>
            <li>侵犯他人知识产权、隐私权等合法权益的内容</li>
            <li>垃圾广告、恶意链接或病毒代码</li>
            <li>辱骂、骚扰、歧视或威胁他人的内容</li>
            <li>虚假、误导性信息</li>
            <li>其他违反公序良俗的内容</li>
          </ul>
          <p className="mt-2">违反上述规定的用户，我们有权删除内容、限制账户功能或永久封禁账户。</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-800 dark:text-gray-200 mb-2">4. 户外活动免责声明</h2>
          <p className="mb-2">本服务仅提供信息分享和组队匹配功能，不组织、不承办任何户外徒步活动。用户需注意：</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>户外徒步存在固有风险，包括但不限于受伤、迷路、天气突变等</li>
            <li>用户应自行评估路线难度和自身身体状况，量力而行</li>
            <li>本服务提供的路线信息可能不准确或已过时，用户应自行核实</li>
            <li>队伍中的其他成员不对您的安全负责，您需对自己的安全负责</li>
            <li>建议用户购买户外运动保险，并告知紧急联系人您的行程</li>
          </ul>
          <p className="mt-2">因用户参与户外活动导致的任何人身伤害或财产损失，本服务不承担任何责任。</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-800 dark:text-gray-200 mb-2">5. 知识产权</h2>
          <p>用户在本服务上发布的原创内容（包括文字、图片、路线数据等），著作权归用户所有。用户发布内容即视为授予本服务在全球范围内免费使用、复制、修改、展示该内容的非独占许可。本服务的软件、设计、商标等知识产权归本服务所有。</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-800 dark:text-gray-200 mb-2">6. 内容审核与管理</h2>
          <p>我们有权但无义务对用户发布的内容进行审核。我们保留随时删除违规内容、限制或终止违规用户账户的权利。用户可以通过举报功能向我们报告违规内容。</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-800 dark:text-gray-200 mb-2">7. 服务变更与终止</h2>
          <p>我们保留随时修改、暂停或终止本服务的权利。用户可随时停止使用本服务并注销账户。账户注销后，我们将在合理期限内删除用户的个人信息（法律法规另有规定的除外）。</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-800 dark:text-gray-200 mb-2">8. 责任限制</h2>
          <p>本服务按"现状"提供，不保证服务的可用性、准确性或可靠性。在法律允许的范围内，本服务不对因使用本服务导致的任何直接或间接损失承担责任。</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-800 dark:text-gray-200 mb-2">9. 条款修改</h2>
          <p>我们保留随时修改本条款的权利。修改后的条款将在本服务中公布，用户继续使用本服务即视为接受修改后的条款。</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-800 dark:text-gray-200 mb-2">10. 联系我们</h2>
          <p>如有任何问题，请联系：support@trailmate.app</p>
        </section>

        <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
          <p className="text-xs text-gray-400">使用本服务即表示您已阅读并同意以上条款。</p>
        </div>
      </div>
    </div>
  );
}
