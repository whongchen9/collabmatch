import { Router } from 'express';
import multer from 'multer';
import { isValidObjectId, newObjectId } from '../db/objectId.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { saveFileBuffer } from '../services/fileStorage.js';
import { env, useCosStorage } from '../config/env.js';

function optionalOid(id?: string) {
  return id && isValidObjectId(id) ? newObjectId(id) : undefined;
}

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: useCosStorage() ? env.maxFileBytesCos : env.maxFileBytesInline,
  },
});

router.get('/config', requireAuth, (_req: AuthRequest, res) => {
  res.json({
    storage: useCosStorage() ? 'cos' : 'inline',
    maxBytes: useCosStorage() ? env.maxFileBytesCos : env.maxFileBytesInline,
    maxMb: Math.round((useCosStorage() ? env.maxFileBytesCos : env.maxFileBytesInline) / 1024 / 1024),
  });
});

router.post('/', requireAuth, upload.single('file'), async (req: AuthRequest, res, next) => {
  try {
    const file = req.file;
    const { fileName, fileData, groupId, conversationId } = req.body as {
      fileName?: string;
      fileData?: string;
      groupId?: string;
      conversationId?: string;
    };

    let result;
    if (file) {
      result = await saveFileBuffer({
        ownerId: req.user!._id,
        fileName: file.originalname || fileName || 'upload.bin',
        buffer: file.buffer,
        mimeType: file.mimetype || 'application/octet-stream',
        groupId: optionalOid(groupId),
        conversationId: optionalOid(conversationId),
      });
    } else if (fileData && fileName) {
      const { saveFileAsset } = await import('../services/fileStorage.js');
      result = await saveFileAsset({
        ownerId: req.user!._id,
        fileName,
        fileData,
        groupId: optionalOid(groupId),
        conversationId: optionalOid(conversationId),
      });
    } else {
      res.status(400).json({ error: '需要 multipart file 或 fileName+fileData' });
      return;
    }

    res.status(201).json({ file: result });
  } catch (e) {
    next(e);
  }
});

export default router;
