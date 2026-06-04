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
app.use(helmet());
app.use(express.json({ limit: '12mb' }));

app.use('/api', api);

app.use(express.static(projectRoot));
app.get('/', (_req, res) => {
  res.sendFile(path.join(projectRoot, 'index.html'));
});

app.use(notFound);
app.use(errorHandler);

export default app;
