const fs = require('fs');
const pairs = [
  ['title="转发到其他对话>↗️', 'title="转发到其他对话">↗️'],
  ['<b>仅匹配推荀/b>', '<b>仅匹配推荐</b>'],
  ["match_only:{ icon: '🔒', name: '仅匹配推荀, desc: '广场不可见，系统为你静默匹配合适的协作者（稍后可升级为公开＀, cls: 'vis-private' },",
   "match_only:{ icon: '🔒', name: '仅匹配推荐', desc: '广场不可见，系统为你静默匹配合适的协作者（稍后可升级为公开）', cls: 'vis-private' },"],
  ["invite_only:{ icon: '🔐', name: '定向邀请,  desc:", "invite_only:{ icon: '🔐', name: '定向邀请',  desc:"],
  ['showToast(`✀需求已设为　{label}」`,', 'showToast(`✅ 需求已设为「${label}」`,'],
  ['showToast(`✀已设为　{label}」`,', 'showToast(`✅ 已设为「${label}」`,'],
  ['showToast(`✀已升级为　{label}」`,', 'showToast(`✅ 已升级为「${label}」`,'],
  ['showToast(`✀已向 ${user.name} 发送邀请并创建协作群！`,', 'showToast(`✅ 已向 ${user.name} 发送邀请并创建协作群！`,'],
  ['showToast(`✀已申请参与　{req?.title || \'\'}」`,', 'showToast(`✅ 已申请参与「${req?.title || \'\'}」`,'],
  ['showToast(`✀技能　{val}」已添加`,', 'showToast(`✅ 技能「${val}」已添加`,'],
  ['showToast(`文件　{file.name}」已发送`,', 'showToast(`文件「${file.name}」已发送`,'],
  ['showToast(\'已添加资源，请编辑内宀\',', 'showToast(\'已添加资源，请编辑内容\','],
  ['>＀添加作品</motion>', '>＋ 添加作品</div>'],
  ['>＀添加作品</div>', '>＋ 添加作品</motion>'],
  ["${req.status==='open'?'已发布:'草稿'}", "${req.status==='open'?'已发布':'草稿'}"],
  ['发布耀 <strong', '发布者 <strong'],
  ['🔒 仅匹</span>', '🔒 仅匹配</span>'],
  ['🔒 改为仅匹</button>', '🔒 改为仅匹配</button>'],
  ['<option value="match_only">🔒 仅匹</option>', '<option value="match_only">🔒 仅匹配</option>'],
  ['>　{escapeHtml(req.title)}」的推荐协作</div>', '>「${escapeHtml(req.title)}」的推荐协作</div>'],
  ['>你好，我在做　{escapeHtml(req.title)}」项目，看到你在 ${escapeHtml(user.skills[0])} 方面很有经验，希望能和你合作＀/textarea>',
   '>你好，我在做「${escapeHtml(req.title)}」项目，看到你在 ${escapeHtml(user.skills[0])} 方面很有经验，希望能和你合作。</textarea>'],
  ['>发送邀</button>', '>发送邀请</button>'],
  ['placeholder="简单介绍你的背景和参与意向 ></textarea>', 'placeholder="简单介绍你的背景和参与意向…"></textarea>'],
  ['<div" style="display:flex;gap:8px;">', '<div style="display:flex;gap:8px;">'],
  ["${currentUser.collabScore || ' }", "${currentUser.collabScore || '—'}"],
  ['未找到匹配技</div>', '未找到匹配技能</div>'],
  ['<span class="modal-title">发布需</span>', '<span class="modal-title">发布需求</span>'],
  ['onclick="goPublishRequirement()">+ 发布需</button>', 'onclick="goPublishRequirement()">+ 发布需求</button>'],
  ['>发布需</div>', '>发布需求</div>'],
  ['一键组</div>', '一键组队</motion>'],
  ['一键组队</motion>', '一键组队</div>'],
  ['placeholder="发送消恀.."', 'placeholder="发送消息…"'],
  ['申请加</p>', '申请加入</p>'],
  ['只有你邀请的人可</span>', '只有你邀请的人可见</span>'],
  ['/** 详情顀/ 聊天气泡统一改可见怀*/', '/** 详情页 / 聊天气泡统一改可见性 */'],
  ['/** 推断需求场景（Phase 2a 启发式；Phase 2b 甀req.sceneTag＀*/', '/** 推断需求场景（Phase 2a 启发式；Phase 2b 用 req.sceneTag） */'],
  ['🌟 发布到广</button>', '🌟 发布到广场</button>'],
];

let html = fs.readFileSync('index.html', 'utf8');
for (const [from, to] of pairs) {
  if (from.includes('motion')) continue;
  html = html.split(from).join(to);
}
html = html.replace(/<\/?motion\b/g, tag => tag.startsWith('</') ? '</div>' : '<div');

fs.writeFileSync('index.html', html, 'utf8');

const scriptStart = html.indexOf('<script>') + '<script>'.length;
const script = html.slice(scriptStart, html.lastIndexOf('</script>'));
const base = html.slice(0, scriptStart).split('\n').length;
try {
  new Function(script);
  console.log('JS OK');
} catch (e) {
  console.log('FAIL', e.message);
  script.split('\n').forEach((line, i) => {
    if ((line.match(/'/g) || []).length % 2 === 1) console.log('odd', base + i, line.trim().slice(0, 120));
  });
}
