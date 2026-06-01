import COS from 'cos-nodejs-sdk-v5';
import { env, hasCos } from '../config/env.js';

let client: COS | null = null;

function getClient(): COS {
  if (!hasCos()) throw new Error('未配置腾讯云 COS');
  if (!client) {
    client = new COS({
      SecretId: env.cosSecretId,
      SecretKey: env.cosSecretKey,
    });
  }
  return client;
}

export function buildCosKey(ownerId: string, fileName: string): string {
  const safe = fileName.replace(/[^\w.\-()\u4e00-\u9fa5]/g, '_').slice(0, 120);
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 10);
  return `${env.cosPrefix}/${ownerId}/${ts}-${rand}-${safe}`;
}

export function getCosPublicUrl(key: string): string {
  if (env.cosPublicBaseUrl) {
    return `${env.cosPublicBaseUrl.replace(/\/$/, '')}/${key}`;
  }
  return `https://${env.cosBucket}.cos.${env.cosRegion}.myqcloud.com/${key}`;
}

export async function uploadToCos(opts: {
  key: string;
  body: Buffer;
  mimeType: string;
}): Promise<{ key: string; publicUrl: string }> {
  const cos = getClient();
  await cos.putObject({
    Bucket: env.cosBucket,
    Region: env.cosRegion,
    Key: opts.key,
    Body: opts.body,
    ContentType: opts.mimeType,
  });
  return { key: opts.key, publicUrl: getCosPublicUrl(opts.key) };
}

export async function getCosSignedDownloadUrl(key: string, expiresSec = 3600): Promise<string> {
  const cos = getClient();
  return new Promise((resolve, reject) => {
    cos.getObjectUrl(
      {
        Bucket: env.cosBucket,
        Region: env.cosRegion,
        Key: key,
        Sign: true,
        Expires: expiresSec,
      },
      (err, data) => {
        if (err) reject(err);
        else resolve(data.Url);
      },
    );
  });
}
