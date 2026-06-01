/**
 * 打包 CollabMatch Coze 上线目录（不含 node_modules、开发脚本与本地密钥）
 * 用法: node scripts/pack-coze-release.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'release', 'collabmatch-coze');

const COPY_FILES = [
  'index.html',
  'api-bridge.js',
  '.coze',
  '.env.coze.example',
  'COZE_DATABASE.md',
  'COZE_DEPLOY.md',
];

const COPY_SERVER = [
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  '.env.example',
];

function rmrf(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function copyDir(src, dest, skipDirNames = new Set(['node_modules', '.env'])) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    if (skipDirNames.has(name)) continue;
    const s = path.join(src, name);
    const d = path.join(dest, name);
    const st = fs.statSync(s);
    if (st.isDirectory()) copyDir(s, d, skipDirNames);
    else copyFile(s, d);
  }
}

console.log('[pack] 构建 server...');
execSync('npm run build', { cwd: path.join(root, 'server'), stdio: 'inherit' });

console.log('[pack] 写入', outDir);
rmrf(outDir);
fs.mkdirSync(outDir, { recursive: true });

for (const f of COPY_FILES) {
  const src = path.join(root, f);
  if (!fs.existsSync(src)) {
    console.warn('[pack] 跳过缺失文件:', f);
    continue;
  }
  copyFile(src, path.join(outDir, f));
}

const serverOut = path.join(outDir, 'server');
fs.mkdirSync(serverOut, { recursive: true });
for (const f of COPY_SERVER) {
  copyFile(path.join(root, 'server', f), path.join(serverOut, f));
}
copyDir(path.join(root, 'server', 'src'), path.join(serverOut, 'src'));
copyDir(path.join(root, 'server', 'dist'), path.join(serverOut, 'dist'));

const readme = `# CollabMatch · Coze 部署包

本目录为可直接上传 Coze 的纯净版本（已预编译 \`server/dist\`，平台构建时会重新编译）。

## 快速步骤

1. 将整个 \`collabmatch-coze\` 目录作为项目根目录上传到 Coze
2. 在 Coze 环境变量中配置 \`.env.coze.example\` 中的项（尤其 \`JWT_SECRET\`、确认 \`DATABASE_URL\`）
3. 使用平台默认构建/启动（读取根目录 \`.coze\`）
4. 访问服务根路径 \`/\` 打开前端

详细说明见 \`COZE_DEPLOY.md\`。
`;
fs.writeFileSync(path.join(outDir, 'README.md'), readme, 'utf8');

const ignore = `node_modules/
server/node_modules/
server/.env
.env
*.log
.DS_Store
`;
fs.writeFileSync(path.join(outDir, '.gitignore'), ignore, 'utf8');

const zipPath = path.join(root, 'release', 'collabmatch-coze.zip');
try {
  if (process.platform === 'win32') {
    execSync(
      `powershell -NoProfile -Command "Compress-Archive -Path '${outDir.replace(/'/g, "''")}' -DestinationPath '${zipPath.replace(/'/g, "''")}' -Force"`,
      { stdio: 'inherit' },
    );
    console.log('[pack] ZIP:', zipPath);
  }
} catch (e) {
  console.warn('[pack] ZIP 跳过（可手动压缩 release/collabmatch-coze）:', e.message);
}

console.log('[pack] 完成:', outDir);
