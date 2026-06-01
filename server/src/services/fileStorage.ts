import { asOne } from '../db/helpers.js';
import type { AnyObjectId } from '../db/objectId.js';
import { env, useCosStorage } from '../config/env.js';
import { FileAsset, type IFileAsset } from '../models/FileAsset.js';
import { Group } from '../models/Group.js';
import { Conversation } from '../models/Conversation.js';
import { buildCosKey, uploadToCos } from './cosStorage.js';

export function parseDataUrl(input: string): { mime: string; buffer: Buffer } | null {
  const m = input.match(/^data:([^;]+);base64,(.+)$/s);
  if (m) {
    return { mime: m[1], buffer: Buffer.from(m[2], 'base64') };
  }
  try {
    return { mime: 'application/octet-stream', buffer: Buffer.from(input, 'base64') };
  } catch {
    return null;
  }
}

function maxBytesForMode(useCos: boolean): number {
  return useCos ? env.maxFileBytesCos : env.maxFileBytesInline;
}

export async function saveFileBuffer(opts: {
  ownerId: AnyObjectId;
  fileName: string;
  buffer: Buffer;
  mimeType: string;
  groupId?: AnyObjectId;
  conversationId?: AnyObjectId;
}): Promise<{ id: string; url: string; publicUrl?: string; mimeType: string; size: number }> {
  const useCos = useCosStorage();
  const maxBytes = maxBytesForMode(useCos);
  if (opts.buffer.length > maxBytes) {
    throw new Error(`文件过大，最大 ${Math.round(maxBytes / 1024 / 1024)}MB`);
  }

  if (useCos) {
    const key = buildCosKey(String(opts.ownerId), opts.fileName);
    const { publicUrl, key: cosKey } = await uploadToCos({
      key,
      body: opts.buffer,
      mimeType: opts.mimeType,
    });
    const doc = asOne(
      await FileAsset.create({
        ownerId: opts.ownerId,
        fileName: opts.fileName,
        mimeType: opts.mimeType,
        size: opts.buffer.length,
        storage: 'cos',
        cosKey,
        publicUrl,
        groupId: opts.groupId,
        conversationId: opts.conversationId,
      }),
    );
    return {
      id: String(doc._id),
      url: `/api/files/${doc._id}`,
      publicUrl,
      mimeType: opts.mimeType,
      size: opts.buffer.length,
    };
  }

  const doc = asOne(
    await FileAsset.create({
      ownerId: opts.ownerId,
      fileName: opts.fileName,
      mimeType: opts.mimeType,
      size: opts.buffer.length,
      storage: 'inline',
      data: opts.buffer.toString('base64'),
      groupId: opts.groupId,
      conversationId: opts.conversationId,
    }),
  );

  return {
    id: String(doc._id),
    url: `/api/files/${doc._id}`,
    mimeType: opts.mimeType,
    size: opts.buffer.length,
  };
}

export async function saveFileAsset(opts: {
  ownerId: AnyObjectId;
  fileName: string;
  fileData: string;
  groupId?: AnyObjectId;
  conversationId?: AnyObjectId;
}): Promise<{ id: string; url: string; publicUrl?: string; mimeType: string; size: number }> {
  const parsed = parseDataUrl(opts.fileData);
  if (!parsed) throw new Error('无效的文件数据');
  return saveFileBuffer({
    ownerId: opts.ownerId,
    fileName: opts.fileName,
    buffer: parsed.buffer,
    mimeType: parsed.mime,
    groupId: opts.groupId,
    conversationId: opts.conversationId,
  });
}

export async function canAccessFile(
  fileId: string,
  userId: AnyObjectId,
): Promise<IFileAsset | null> {
  const file = await FileAsset.findById(fileId);
  if (!file) return null;
  if (String(file.ownerId) === String(userId)) return file;

  if (file.groupId) {
    const group = await Group.findById(file.groupId);
    if (group?.members.some((m) => String(m) === String(userId))) return file;
  }

  if (file.conversationId) {
    const conv = await Conversation.findOne({ _id: file.conversationId, userId });
    if (conv) return file;
  }

  return null;
}

/** 供多模态 LLM 使用的图片 URL（优先 base64 data URL） */
export async function getFileVisionUrl(file: IFileAsset): Promise<string | null> {
  if (!file.mimeType.startsWith('image/')) return null;
  if (file.storage === 'inline' && file.data) {
    return `data:${file.mimeType};base64,${file.data}`;
  }
  if (file.publicUrl) return file.publicUrl;
  if (file.storage === 'cos' && file.cosKey) {
    const { getCosSignedDownloadUrl } = await import('./cosStorage.js');
    return getCosSignedDownloadUrl(file.cosKey, 7200);
  }
  return null;
}

export async function loadVisionImages(
  fileIds: string[],
  userId: AnyObjectId,
): Promise<{ fileId: string; fileName: string; mimeType: string; url: string }[]> {
  const out: { fileId: string; fileName: string; mimeType: string; url: string }[] = [];
  for (const id of fileIds) {
    const file = await canAccessFile(id, userId);
    if (!file) continue;
    const url = await getFileVisionUrl(file);
    if (url) {
      out.push({
        fileId: String(file._id),
        fileName: file.fileName,
        mimeType: file.mimeType,
        url,
      });
    }
  }
  return out;
}

export async function resolveChatFileAttachments(
  fileIds: string[],
  userId: AnyObjectId,
): Promise<{
  attachments: { fileId: string; fileName: string; mimeType: string }[];
  imageUrls: string[];
}> {
  const attachments: { fileId: string; fileName: string; mimeType: string }[] = [];
  const imageUrls: string[] = [];
  for (const id of fileIds) {
    const file = await canAccessFile(id, userId);
    if (!file) continue;
    attachments.push({
      fileId: String(file._id),
      fileName: file.fileName,
      mimeType: file.mimeType,
    });
    const visionUrl = await getFileVisionUrl(file);
    if (visionUrl) imageUrls.push(visionUrl);
  }
  return { attachments, imageUrls };
}
