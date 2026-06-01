import app from './app.js';
import { env, assertProductionSecrets, hasCos, hasTencentSms, useCosStorage, useProductionAuth } from './config/env.js';
import { connectDb } from './db/connect.js';
import { resolveDbDriver } from './db/driver.js';
import { seedIfEmpty } from './services/seed.js';

async function main() {
  assertProductionSecrets();
  await connectDb();
  if (env.seedOnStart) await seedIfEmpty();

  app.listen(env.port, () => {
    console.log(`[server] CollabMatch API http://localhost:${env.port}`);
    console.log(`[server] 前端页面 http://localhost:${env.port}/ （勿用 file:// 直接打开 index.html）`);
    console.log(`[server] health http://localhost:${env.port}/api/health`);
    console.log(`[server] 数据库: ${resolveDbDriver()}`);
    console.log(`[server] LLM: ${env.doubaoApiKey ? '豆包' : '本地模拟'}`);
    console.log(`[server] 认证: ${useProductionAuth() ? '腾讯云短信' : `开发验证码 ${env.devAuthCode}`}`);
    console.log(
      `[server] 文件: ${useCosStorage() ? `COS (${env.cosBucket})` : `Mongo 内联 ≤${env.maxFileBytesInline / 1024 / 1024}MB`}`,
    );
    if (env.fileStorage === 'cos' && !hasCos()) {
      console.warn('[warn] FILE_STORAGE=cos 但未配置 COS_*');
    }
    if (env.authMode === 'production' && !hasTencentSms()) {
      console.warn('[warn] AUTH_MODE=production 但未配置 TENCENT_SMS_*');
    }
  });
}

main().catch((err) => {
  console.error('[server] failed to start:', err);
  process.exit(1);
});
