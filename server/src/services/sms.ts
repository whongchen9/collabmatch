import tencentcloud from 'tencentcloud-sdk-nodejs';
import { env, hasTencentSms, useProductionAuth } from '../config/env.js';
import { SmsCode } from '../models/SmsCode.js';

const SmsClient = tencentcloud.sms.v20210111.Client;

const phoneRe = /^1[3-9]\d{9}$/;

export function normalizePhone(phone: string): string {
  const p = phone.replace(/\s+/g, '').replace(/^\+86/, '');
  if (!phoneRe.test(p)) throw new Error('手机号格式不正确');
  return p;
}

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function sendLoginSms(phone: string): Promise<{ expiresIn: number }> {
  const normalized = normalizePhone(phone);

  if (!useProductionAuth()) {
    await SmsCode.findOneAndUpdate(
      { phone: normalized },
      {
        code: env.devAuthCode,
        expiresAt: new Date(Date.now() + env.smsCodeTtlSec * 1000),
        sentAt: new Date(),
      },
      { upsert: true },
    );
    return { expiresIn: env.smsCodeTtlSec };
  }

  if (!hasTencentSms()) {
    throw new Error('未配置腾讯云短信，请设置 TENCENT_SMS_* 环境变量或 AUTH_MODE=dev');
  }

  const existing = await SmsCode.findOne({ phone: normalized });
  if (existing) {
    const elapsed = Date.now() - existing.sentAt.getTime();
    if (elapsed < env.smsResendIntervalSec * 1000) {
      throw new Error(`请 ${Math.ceil((env.smsResendIntervalSec * 1000 - elapsed) / 1000)} 秒后再试`);
    }
  }

  const code = generateCode();

  const client = new SmsClient({
    credential: {
      secretId: env.tencentSmsSecretId,
      secretKey: env.tencentSmsSecretKey,
    },
    region: 'ap-guangzhou',
    profile: { httpProfile: { endpoint: 'sms.tencentcloudapi.com' } },
  });

  await client.SendSms({
    PhoneNumberSet: [`+86${normalized}`],
    SmsSdkAppId: env.tencentSmsAppId,
    SignName: env.tencentSmsSignName,
    TemplateId: env.tencentSmsTemplateId,
    TemplateParamSet: [code, String(Math.floor(env.smsCodeTtlSec / 60))],
  });

  await SmsCode.findOneAndUpdate(
    { phone: normalized },
    {
      code,
      expiresAt: new Date(Date.now() + env.smsCodeTtlSec * 1000),
      sentAt: new Date(),
    },
    { upsert: true },
  );

  return { expiresIn: env.smsCodeTtlSec };
}

export async function verifyLoginCode(phone: string, code: string): Promise<boolean> {
  const normalized = normalizePhone(phone);

  if (!useProductionAuth()) {
    return code === env.devAuthCode;
  }

  const record = await SmsCode.findOne({ phone: normalized });
  if (!record) return false;
  if (record.expiresAt.getTime() < Date.now()) return false;
  if (record.code !== code.trim()) return false;

  await SmsCode.deleteOne({ _id: record._id });
  return true;
}
