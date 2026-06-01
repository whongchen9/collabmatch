const fs = require('fs');
const pairs = [
  ['需求详</span>', '需求详情</span>'],
  ['创建并安</button>', '创建并安装</button>'],
  ['💬 沟</span>', '💬 沟通</span>'],
  ['告诉 AI 具体怎么做.."', '告诉 AI 具体怎么做…"'],
  ['</motion>>', '</motion>'],
  ['</div>>', '</div>'],
  ['<motion class="collab-score-val">⭀${u.collabScore} (${u.projects}个项盀</motion>', '<div class="collab-score-val">⭐ ${u.collabScore} (${u.projects} 个项目)</div>'],
  ['<div class="collab-score-val">⭀${u.collabScore} (${u.projects}个项盀</div>', '<motion class="collab-score-val">⭐ ${u.collabScore} (${u.projects} 个项目)</div>'],
  ['return `<div> style="text-align:center;font-size:11px;color:var(--text-muted);padding:6px 0;">${escapeHtml(msg.content)}</div>`;', 'return `<div style="text-align:center;font-size:11px;color:var(--text-muted);padding:6px 0;">${escapeHtml(msg.content)}</div>`;'],
  ['placeholder="例如：智能数据分析平叀"', 'placeholder="例如：智能数据分析平台"'],
  ['placeholder="全栈开叀/ UI 设计..."', 'placeholder="全栈开发者 / UI 设计..."'],
  ['>可见</label>', '>可见性</label>'],
  ["showToast('没有其他对话可转叀', 'info');", "showToast('没有其他对话可转发', 'info');"],
  ["showToast('消息已转叀', 'success');", "showToast('消息已转发', 'success');"],
  ['<div class="collab-score-label">发布</motion>', '<div class="collab-score-label">发布者</div>'],
  ['<div class="collab-score-label">发布</div>', '<div class="collab-score-label">发布者</motion>'],
];

let html = fs.readFileSync('index.html', 'utf8');
for (const [from, to] of pairs) {
  if (from.includes('motion')) continue;
  html = html.split(from).join(to);
}
html = html.replace(/<\/?motion\b/g, tag => tag.startsWith('</') ? '</div>' : '<div>');
html = html.replace(/<div class="collab-score-label">发布者<\/motion>/g, '<div class="collab-score-label">发布者</div>');

fs.writeFileSync('index.html', html, 'utf8');
const script = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));
try { new Function(script); console.log('JS OK'); }
catch (e) { console.log('FAIL', e.message); process.exit(1); }
