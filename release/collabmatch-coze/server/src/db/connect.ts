import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { env } from '../config/env.js';
import { usePostgres, useMongo } from './driver.js';

let memoryServer: MongoMemoryServer | null = null;

export async function connectDb(): Promise<void> {
  if (usePostgres()) {
    const { initPostgres } = await import('./postgres/docModel.js');
    await initPostgres();
    console.log('[db] PostgreSQL (Coze/Supabase, DATABASE_URL)');
    return;
  }

  if (!useMongo()) {
    throw new Error('[db] 未配置有效数据库：设置 DATABASE_URL(postgres) 或 MONGODB_URI / USE_MEMORY_DB');
  }

  let uri = env.mongoUri;
  if (env.useMemoryDb) {
    memoryServer = await MongoMemoryServer.create();
    uri = memoryServer.getUri('collabmatch');
    console.log('[db] in-memory MongoDB (USE_MEMORY_DB=true)');
  }
  await mongoose.connect(uri);
  console.log('[db] MongoDB connected');
}

export async function disconnectDb(): Promise<void> {
  if (usePostgres()) {
    const { closePgPool } = await import('./postgres/pool.js');
    await closePgPool();
    return;
  }
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}
