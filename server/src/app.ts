import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import api from './routes/index.js';
import { notFound, errorHandler } from './middleware/error.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** 项目根目录（含 index.html、api-bridge.js） */
export const projectRoot = path.resolve(__dirname, '../..');

const app = express();

const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, cb) {
      // 允许同页请求（无 Origin）和开发环境 localhost
      if (!origin) return cb(null, true);
      if (ALLOWED_ORIGINS.length === 0) {
        // 未配置白名单时，开发环境放行 localhost，生产环境拒绝
        if (
          process.env.NODE_ENV !== 'production' &&
          /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
        ) {
          return cb(null, true);
        }
        return cb(null, false);
      }
      cb(null, ALLOWED_ORIGINS.includes(origin));
    },
    credentials: true,
  }),
);
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        // index.html 大量使用内联 <script> 和 onclick 属性，需要放行
        'script-src': ["'self'", "'unsafe-inline'", "https://unpkg.com"],
        'script-src-attr': ["'unsafe-inline'"],
        'style-src': ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        'font-src': ["'self'", "https://fonts.gstatic.com"],
        'connect-src': ["'self'", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
      },
    },
  }),
);
app.use(express.json({ limit: '12mb' }));

// SEC-13: 仅允许访问前端白名单文件，防止暴露 server/、node_modules/ 等目录
const ALLOWED_STATIC_PREFIXES = [
  'dist/',
];
const ALLOWED_STATIC_FILES = new Set([
  'index.html',
  'api-bridge.js',
  'favicon.ico',
]);

function isStaticAllowed(relative: string): boolean {
  // 允许白名单前缀目录下的所有文件
  for (const prefix of ALLOWED_STATIC_PREFIXES) {
    if (relative.startsWith(prefix)) return true;
  }
  // 非根目录文件一律拒绝（防止 path.basename 绕过）
  if (relative.includes('/')) return false;
  // 允许白名单中的根目录文件
  return ALLOWED_STATIC_FILES.has(relative);
}

app.use('/api', api);

// SEC-13: 静态文件访问控制中间件（在 express.static 之前拦截）
app.use((req, res, next) => {
  // 只拦截 GET 请求（静态文件都是 GET）
  if (req.method !== 'GET') return next();
  const relative = req.path.replace(/^\//, '');
  if (!relative) return next(); // 根路径由后面的路由处理
  if (isStaticAllowed(relative)) return next();
  res.status(403).send('Forbidden');
});

// 静态文件服务
app.use(express.static(projectRoot));
app.get('/', (_req, res) => {
  res.sendFile(path.join(projectRoot, 'index.html'));
});

app.use(notFound);
app.use(errorHandler);

export default app;
