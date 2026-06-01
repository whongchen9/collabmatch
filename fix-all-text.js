const fs = require('fs');

const pairs = [
  // broken onclick / syntax
  ["filterSkillCat('沟退,this)", "filterSkillCat('沟通',this)"],
  ["' <span style=\"font-size:10px;color:var(--accent-purple);\">(/</span>'", "' <span style=\"font-size:10px;color:var(--accent-purple);\">(我)</span>'"],
  ["<motion style=\"font-size:12px;color:var(--text-muted);\" id=\"chat-intro-text\">Side Project 联创助手  整理需求、匹配伙伴、一键组队</div>>", "<motion id=\"chat-intro-text\">PLACEHOLDER</motion>"],

  // HTML modals & nav
  ['<span class="modal-title">发送协作邀</span>', '<span class="modal-title">发送协作邀请</span>'],
  ['<span class="modal-title">创建自定义技</span>', '<span class="modal-title">创建自定义技能</span>'],
  ['<span class="modal-title">🔄 工作</span>', '<span class="modal-title">🔄 工作流</span>'],
  ['<span class="modal-title">转发到对</span>', '<span class="modal-title">转发到对话</span>'],
  ['onclick="createCustomWorkflow()">创建工作</button>', 'onclick="createCustomWorkflow()">创建工作流</button>'],

  // chat intro & extra >
  ['Side Project 联创助手  整理需求、匹配伙伴、一键组队</motion>>', 'Side Project 联创助手 · 整理需求、匹配伙伴、一键组队</motion>'],
  ['Side Project 联创助手  整理需求、匹配伙伴、一键组队</div>>', 'Side Project 联创助手 · 整理需求、匹配伙伴、一键组队</div>'],

  // match section
  ['点击左侧需求查看智能匹配结</motion>', '点击左侧需求查看智能匹配结果</div>'],
  ['点击左侧需求查看智能匹配结</motion>', '点击左侧需求查看智能匹配结果</div>'],
  ['点击左侧需求查看智能匹配结</div>', '点击左侧需求查看智能匹配结果</motion>'],
  ['点击左侧需求查看智能匹配结</div>', '点击左侧需求查看智能匹配结果</div>'],

  // square & skills page
  ['🛠 开源协</div>', '🛠 开源协作</motion>'],
  ['🛠 开源协</motion>', '🛠 开源协作</div>'],
  ['<option value="newest">最新发</option>', '<option value="newest">最新发布</option>'],
  ['<option value="match">匹配度最</option>', '<option value="match">匹配度最高</option>'],
  ['onclick="switchSkillTab(\'mine\',this)">我的技</span>', 'onclick="switchSkillTab(\'mine\',this)">我的技能</span>'],
  ['从想法到组队一步到</p>', '从想法到组队一步到位</p>'],
  ['<span class="skill-banner-tag">联创需</span>', '<span class="skill-banner-tag">联创需求</span>'],
  ["onclick=\"filterSkillCat('沟退,this)\">💬 沟</span>", "onclick=\"filterSkillCat('沟通',this)\">💬 沟通</span>"],

  // workflow buttons & status
  ['>▀执行流程</button>', '>▶ 执行流程</button>'],
  ['>▀执行</button>', '>▶ 执行</button>'],
  ["statusEl.textContent = '⏀执行一..';", "statusEl.textContent = '⏳ 执行中…';"],
  ["showToast('工作流执行完/', 'success');", "showToast('工作流执行完成', 'success');"],
  ["statusEl.textContent = '❀执行失败';", "statusEl.textContent = '❌ 执行失败';"],

  // JS UI strings
  ["showToast('请先登录或等待对话加轀', 'warning');", "showToast('请先登录或等待对话加载', 'warning');"],
  ['所需技</div>', '所需技能</div>'],
  ['该需求暂不对外开放申</span>', '该需求暂不对外开放申请</span>'],
  ['暂无待处理申</div>', '暂无待处理申请</motion>'],
  ['暂无待处理申</motion>', '暂无待处理申请</div>'],
  ['<h3>暂无需</h3>', '<h3>暂无需求</h3>'],
  ['先去 AI 对话页面生成一条需</p>', '先去 AI 对话页面生成一条需求</p>'],
  ['>去生成需</button>', '>去生成需求</button>'],
  ['已按匹配度排</motion>', '已按匹配度排序</div>'],
  ['已按匹配度排</div>', '已按匹配度排序</div>'],
  ['${u.portfolioCount} 件作</div>', '${u.portfolioCount} 件作品</div>'],
  ['⭀${u.collabScore} (${u.projects}个项盀</motion>', '⭐ ${u.collabScore} (${u.projects} 个项目)</div>'],
  ['⭀${u.collabScore} (${u.projects}个项盀</motion>', '⭐ ${u.collabScore} (${u.projects} 个项目)</div>'],
  ['>邀请协</button>', '>邀请协作</button>'],
  ['>我的技</div>', '>我的技能</div>'],
  ['>为你推荐的匹配需</div>', '>为你推荐的匹配需求</div>'],
  ['扫描广场上的开放需</div>', '扫描广场上的开放需求</div>'],
  ['🔍 系统为你找到亀${matched.length} 条匹配需</div>', '🔍 系统为你找到 ${matched.length} 条匹配需求</div>'],
  ['    厀<span style="color:var(--accent-purple);', '    前往 <span style="color:var(--accent-purple);'],
  ['>邀请参与项</div>', '>邀请参与项目</div>'],
  ["return `<div style=\"text-align:center;font-size:11px;color:var(--text-muted);padding:6px 0;\"> ${escapeHtml(msg.content)} </motion>\";", "return `<div style=\"text-align:center;font-size:11px;color:var(--text-muted);padding:6px 0;\">${escapeHtml(msg.content)}</motion>\";"],
  ["return `<div style=\"text-align:center;font-size:11px;color:var(--)text-muted);padding:6px 0;\"> ${escapeHtml(msg.content)} </div>`;", "return `<div style=\"text-align:center;font-size:11px;color:var(--text-muted);padding:6px 0;\">${escapeHtml(msg.content)}</div>`;"],
  ["return `<div style=\"text-align:center;font-size:11px;color:var(--text-muted);padding:6px 0;\"> ${escapeHtml(msg.content)} </div>`;", "return `<motion style=\"text-align:center;font-size:11px;color:var(--text-muted);padding:6px 0;\">${escapeHtml(msg.content)}</motion>`;"],
  ['开源协</span>', '开源协作</span>'],
  ['>已申</button>', '>已申请</button>'],
  ['>🎯 技能标</motion>', '>🎯 技能标签</motion>'],
  ['>🎯 技能标</div>', '>🎯 技能标签</div>'],
  ['审批状</div>', '审批状态</div>'],
  ['${(currentUser.portfolio || []).length} 件作</span>', '${(currentUser.portfolio || []).length} 件作品</span>'],
  ["showToast('✅AI 已根据你的协作记录更新名牀', 'success');", "showToast('✅ AI 已根据你的协作记录更新名片', 'success');"],
  ["+ '@协作耀';", "+ '@协作组';"],
  ["vis-badge-invite\">🔐 定向</span>'", "vis-badge-invite\">🔐 定向邀请</span>'"],
  ['placeholder="添加技能.."', 'placeholder="添加技能…"'],

  // comments (cosmetic)
  ['/** 渲染领域标签栀*/', '/** 渲染领域标签栏 */'],
  ['/** 智能匹配缓存的用户卡牀*/', '/** 智能匹配缓存的用户卡片 */'],
  ['/** 渲染反向匹配需求卡牀*/', '/** 渲染反向匹配需求卡片 */'],
  ['/** 渲染个人名片页的「为你匹配」区址*/', '/** 渲染个人名片页的「为你匹配」区块 */'],
];

let html = fs.readFileSync('index.html', 'utf8');

// remove placeholder hack if present
html = html.replace(/<motion id="chat-intro-text">PLACEHOLDER<\/motion>/g, '');

for (const [from, to] of pairs) {
  if (from.includes('motion') && !to.includes('motion')) {
    // skip pairs that accidentally use motion
  }
  if (!from.includes('motion') || to.includes('div')) {
    html = html.split(from).join(to);
  }
}

// fix any accidental motion tags
html = html.replace(/<\/?motion\b/g, tag => tag.startsWith('</') ? '</div>' : '<motion>').replace(/<motion>/g, '<div>');

// normalize unicode spaces in visible Chinese UI (not in regex/comments only if safe)
html = html.replace(/联创助手  整理/g, '联创助手 · 整理');
html = html.replace(/ \$\{escapeHtml\(msg\.content\)\}/g, '${escapeHtml(msg.content)}');
html = html.replace(/ \$\{/g, '${');

fs.writeFileSync('index.html', html, 'utf8');

const script = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));
try {
  new Function(script);
  console.log('JS OK');
} catch (e) {
  console.log('JS FAIL:', e.message);
  process.exit(1);
}

// report remaining suspicious truncations
const suspicious = [];
html.split('\n').forEach((line, i) => {
  const m = line.match(/>([^<]{1,8})<\//);
  if (m && /[\u4e00-\u9fff]/.test(m[1]) && !/[。！？…]$/.test(m[1]) && m[1].length <= 6) {
    if (!['全部','草稿','取消','登录','复制','引用','移除','删除','公开','在线','场景','姓名','简介','文档','分析','设计','流程','对话','文件','会议','项目','作品','资源','技能','需求','匹配','邀请','协作','广场','名片','助手','群组','成员','加载'].some(ok => m[1].includes(ok) || ok.includes(m[1]))) {
      suspicious.push({ line: i + 1, text: m[1] });
    }
  }
});
console.log('Remaining suspicious UI fragments:', suspicious.length);
suspicious.slice(0, 40).forEach(s => console.log(s.line, s.text));
