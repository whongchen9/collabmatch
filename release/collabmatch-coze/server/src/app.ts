import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import api from './routes/index.js';
import { notFound, errorHandler } from './middleware/error.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** 项目根目录（含 index.html、api-bridge.js） */
export const projectRoot = path.resolve(__dirname, '../..');

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);
app.use(express.json({ limit: '12mb' }));

app.use('/api', api);

app.use(express.static(projectRoot));
app.get('/', (_req, res) => {
  res.sendFile(path.join(projectRoot, 'index.html'));
});

app.use(notFound);
app.use(errorHandler);

export default app;
