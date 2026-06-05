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
          /^https?:\/\/(localhost|127\.0\.0\.1)/.test(origin)
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
        'script-src': ["'self'", "'unsafe-inline'"],
        'script-src-attr': ["'unsafe-inline'"],
      },
    },
  }),
);
app.use(express.json({ limit: '12mb' }));

// SEC-13: 仅允许访问前端白名单文件，防止暴露 server/、node_modules/ 等目录
const ALLOWED_STATIC_FILES = new Set([
  'index.html',
  'api-bridge.js',
  'favicon.ico',
]);

app.use('/api', api);

// 静态文件：仅允许白名单中的文件 + dist/ 目录
app.use(express.static(projectRoot, {
  setHeaders(res, filePath) {
    const relative = path.relative(projectRoot, filePath).replace(/\\/g, '/');
    // 允许 dist/ 目录下的所有文件
    if (relative.startsWith('dist/')) return;
    // 允许白名单中的根目录文件
    const filename = path.basename(filePath);
    if (!ALLOWED_STATIC_FILES.has(filename)) {
      res.status(403).end();
    }
  },
}));
app.get('/', (_req, res) => {
  res.sendFile(path.join(projectRoot, 'index.html'));
});

app.use(notFound);
app.use(errorHandler);

export default app;
