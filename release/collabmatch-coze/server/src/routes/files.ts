import { Router } from 'express';
import { canAccessFile } from '../services/fileStorage.js';
import { getCosSignedDownloadUrl } from '../services/cosStorage.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/:fileId', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const file = await canAccessFile(req.params.fileId, req.user!._id);
    if (!file) {
      res.status(404).json({ error: '文件不存在或无权访问' });
      return;
    }

    if (file.storage === 'cos' && file.cosKey) {
      const signed = await getCosSignedDownloadUrl(file.cosKey);
      res.redirect(302, signed);
      return;
    }

    if (!file.data) {
      res.status(404).json({ error: '文件内容不存在' });
      return;
    }

    const buf = Buffer.from(file.data, 'base64');
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.fileName)}"`);
    res.send(buf);
  } catch (e) {
    next(e);
  }
});

export default router;
