import dotenv from 'dotenv';

dotenv.config();

function envStr(key: string, fallback = ''): string {
  return process.env[key]?.trim() || fallback;
}

export type AuthMode = 'dev' | 'production' | 'auto';
export type DbDriverSetting = '' | 'mongo' | 'postgres' | 'cloudbase';

export const env = {
  port: Number(process.env.PORT) || 3001,
  nodeEnv: envStr('NODE_ENV', 'development'),
  /** mongo | postgres；留空则 DATABASE_URL 为 postgres 时用 postgres，否则 mongo */
  dbDriver: envStr('DB_DRIVER', '') as DbDriverSetting,
  /** Coze 部署时平台注入的 Supabase/PostgreSQL 连接串 */
  databaseUrl: envStr('DATABASE_URL', ''),
  pgSsl: process.env.PG_SSL !== 'false',
  useMemoryDb: process.env.USE_MEMORY_DB === 'true',
  mongoUri: envStr('MONGODB_URI', 'mongodb://127.0.0.1:27017/collabmatch'),
  jwtSecret: envStr('JWT_SECRET', 'collabmatch-dev-secret'),
  jwtExpiresIn: envStr('JWT_EXPIRES_IN', '7d'),
  devAuthCode: envStr('DEV_AUTH_CODE', '123456'),
  authMode: envStr('AUTH_MODE', 'auto') as AuthMode,
  doubaoApiKey: envStr('DOUBAO_API_KEY'),
  doubaoModel: envStr('DOUBAO_MODEL', 'doubao-pro-32k'),
  doubaoVisionModel: envStr('DOUBAO_VISION_MODEL', ''),
  doubaoBaseUrl: envStr('DOUBAO_BASE_URL', 'https://ark.cn-beijing.volces.com/api/v3'),
  seedOnStart: process.env.SEED_ON_START !== 'false',

  /** 腾讯云短信 */
  tencentSmsSecretId: envStr('TENCENT_SMS_SECRET_ID'),
  tencentSmsSecretKey: envStr('TENCENT_SMS_SECRET_KEY'),
  tencentSmsAppId: envStr('TENCENT_SMS_SDK_APP_ID'),
  tencentSmsSignName: envStr('TENCENT_SMS_SIGN_NAME'),
  tencentSmsTemplateId: envStr('TENCENT_SMS_TEMPLATE_ID'),
  smsCodeTtlSec: Number(process.env.SMS_CODE_TTL_SEC) || 300,
  smsResendIntervalSec: Number(process.env.SMS_RESEND_INTERVAL_SEC) || 60,

  /** 文件存储：inline（Mongo base64）| cos */
  fileStorage: envStr('FILE_STORAGE', 'auto') as 'inline' | 'cos' | 'auto',
  maxFileBytesInline: Number(process.env.MAX_FILE_BYTES_INLINE) || 2 * 1024 * 1024,
  maxFileBytesCos: Number(process.env.MAX_FILE_BYTES_COS) || 50 * 1024 * 1024,

  /** 腾讯云 COS */
  cosSecretId: envStr('COS_SECRET_ID'),
  cosSecretKey: envStr('COS_SECRET_KEY'),
  cosBucket: envStr('COS_BUCKET'),
  cosRegion: envStr('COS_REGION', 'ap-guangzhou'),
  cosPrefix: envStr('COS_PREFIX', 'collabmatch'),
  cosPublicBaseUrl: envStr('COS_PUBLIC_BASE_URL'),

  /** 即DAO（小陈即到 / xiaoChen-dao）云开发对接 */
  xcdInvokeUrl: envStr('XCD_INVOKE_URL'),
  xcdApiBaseUrl: envStr('XCD_API_BASE_URL'),
  xcdApiKey: envStr('XCD_API_KEY'),
  xcdWebhookSecret: envStr('XCD_WEBHOOK_SECRET'),
  xcdPlatform: envStr('XCD_PLATFORM', 'xiaoChen-dao'),

  /** CloudBase 云开发（与 xiaoChen-dao 共用环境） */
  cloudbaseEnvId: envStr('TCB_ENV_ID'),
  cloudbaseSecretId: envStr('TCB_SECRET_ID'),
  cloudbaseSecretKey: envStr('TCB_SECRET_KEY'),
};

export function hasTencentSms(): boolean {
  return Boolean(
    env.tencentSmsSecretId &&
      env.tencentSmsSecretKey &&
      env.tencentSmsAppId &&
      env.tencentSmsSignName &&
      env.tencentSmsTemplateId,
  );
}

export function hasCos(): boolean {
  return Boolean(env.cosSecretId && env.cosSecretKey && env.cosBucket && env.cosRegion);
}

export function useCosStorage(): boolean {
  if (env.fileStorage === 'cos') return hasCos();
  if (env.fileStorage === 'inline') return false;
  return hasCos();
}

export function useProductionAuth(): boolean {
  if (env.authMode === 'production') return true;
  if (env.authMode === 'dev') return false;
  return hasTencentSms();
}

export function assertProductionSecrets(): void {
  if (env.nodeEnv !== 'production') return;
  if (env.jwtSecret === 'collabmatch-dev-secret' || env.jwtSecret.length < 16) {
    console.warn('[warn] 生产环境请设置足够长的 JWT_SECRET');
  }
  if (useProductionAuth() && !hasTencentSms()) {
    console.warn('[warn] AUTH_MODE=production 但未配置腾讯云短信');
  }
}
