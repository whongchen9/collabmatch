import { Router } from 'express';
import auth from './auth.js';
import users from './users.js';
import requirements from './requirements.js';
import match from './match.js';
import conversations from './conversations.js';
import ai from './ai.js';
import groups from './groups.js';
import config from './config.js';
import files from './files.js';
import upload from './upload.js';
import integrationsXcd from './integrationsXcd.js';
import publicApi from './publicApi.js';

const router = Router();

router.use('/auth', auth);
router.use('/users', users);
router.use('/requirements', requirements);
router.use('/match', match);
router.use('/conversations', conversations);
router.use('/ai', ai);
router.use('/groups', groups);
router.use('/config', config);
router.use('/files', files);
router.use('/upload', upload);
router.use('/integrations/xcd', integrationsXcd);
router.use('/public', publicApi);

router.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'collabmatch-api' });
});

export default router;
