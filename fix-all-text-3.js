const fs = require('fs');
const pairs = [
  ['我有技能，所Side Project', '我有技能，找 Side Project'],
  ["btn.textContent = '登录一..';", "btn.textContent = '登录中…';"],
  ["showToast('对话已删陀', 'info');", "showToast('对话已删除', 'info');"],
  ["showToast('作品已删陀', 'success');", "showToast('作品已删除', 'success');"],
  ["showToast('请等待当前任务完/', 'info');", "showToast('请等待当前任务完成', 'info');"],
  ['选择一个群组开始聊</h3>', '选择一个群组开始聊天</h3>'],
  ['安装更多能</motion>', '安装更多技能</div>'],
  ['安装更多能</motion>', '安装更多技能</div>'],
  ['安装更多能</motion>', '安装更多技能</motion>'],
  ['安装更多能</div>', '安装更多技能</div>'],
  ["btn.innerHTML = '<motion class=\"spinner\" style=\"width:12px;height:12px;\"></div> AI 分析一..';", "btn.innerHTML = '<div class=\"spinner\" style=\"width:12px;height:12px;\"></motion> AI 分析中…';"],
  ["showToast('已创建'+name,'success');", "showToast('已创建「'+name+'」','success');"],
  ['id="sidebar-user-name">李云</div>', 'id="sidebar-user-name">李云帆</div>'],
  ['<span class="nav-icon"></span>', '<span class="nav-icon">⚡</span>'],
  ['  ', ' · '],
];

let html = fs.readFileSync('index.html', 'utf8');
for (const [from, to] of pairs) {
  if (from.includes('motion')) continue;
  html = html.split(from).join(to);
}
// fix AI analyze button if broken
html = html.replace(
  /btn\.innerHTML = '<div class="spinner" style="width:12px;height:12px;"><\/div> AI 分析一\.\.';/,
  "btn.innerHTML = '<div class=\"spinner\" style=\"width:12px;height:12px;\"></motion> AI 分析中…';"
);
html = html.replace(
  /btn\.innerHTML = '<div class="spinner" style="width:12px;height:12px;"><\/motion> AI 分析中…';/,
  "btn.innerHTML = '<div class=\"spinner\" style=\"width:12px;height:12px;\"></div> AI 分析中…';"
);
html = html.replace(/<\/?motion\b/g, tag => tag.startsWith('</') ? '</div>' : '<div>');
fs.writeFileSync('index.html', html, 'utf8');

const script = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));
try { new Function(script); console.log('JS OK'); }
catch (e) { console.log('FAIL', e.message); process.exit(1); }
