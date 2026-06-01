/**
 * CloudBase SDK 初始化（与 xiaoChen-dao 共用同一个环境）
 */
import type { CloudBase } from '@cloudbase/node-sdk';

let tcbApp: CloudBase | null = null;

export interface CloudBaseConfig {
  envId: string;
  secretId: string;
  secretKey: string;
}

export function getCloudBase(config?: CloudBaseConfig): CloudBase {
  if (tcbApp) return tcbApp;

  const envId = config?.envId || process.env.TCB_ENV_ID || '';
  const secretId = config?.secretId || process.env.TCB_SECRET_ID || '';
  const secretKey = config?.secretKey || process.env.TCB_SECRET_KEY || '';

  if (!envId) {
    throw new Error('[cloudbase] 缺少 TCB_ENV_ID。请在 .env 中配置 TCB_ENV_ID, TCB_SECRET_ID, TCB_SECRET_KEY');
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const cloudbase = require('@cloudbase/node-sdk');
  tcbApp = cloudbase.init({
    env: envId,
    secretId: secretId || undefined,
    secretKey: secretKey || undefined,
  });

  console.log(`[cloudbase] 已连接环境: ${envId}`);
  return tcbApp;
}

export function getDb(config?: CloudBaseConfig) {
  return getCloudBase(config).database();
}
