/** CollabMatch 前端 API 桥接（对接 server/） */
(function (global) {
  // 预定义所有函数引用，确保即使内部出错 CollabApi 仍可用
  let _API_BASE = '';
  let _getToken, _setToken, _setUnauthorizedHandler, _api, _normalizeUser;
  let _loadConfig, _fetchAuthConfig, _sendSmsCode, _login, _emailLogin, _register;
  let _fetchMe, _fetchUploadConfig, _uploadFile, _uploadFileForChat;
  let _loadRequirements, _loadSquareRequirements, _loadConversations, _loadGroups;
  let _createConversation, _streamAiChat, _runSkill;
  let _matchForward, _matchReverse;
  let _publishRequirement, _createRequirement, _updateRequirement, _applyRequirement;
  let _saveUserProfile, _saveUserSkills, _saveUserResources;
  let _createGroup, _sendGroupMessage, _fetchGroup;
  let _fetchReqApplications, _reviewApplication, _fetchMyApplications;
  let _fetchMyPortfolio, _createPortfolioItem, _updatePortfolioItem, _deletePortfolioItem;
  let _aiEnhanceProfile, _deleteConversation, _deleteRequirement;
  let _resolveFileUrl, _uploadChatAttachment, _forwardMessage, _createGroupMeeting;
  let _pingPresence, _mergeRequirements;

  try {
  function resolveApiBase() {
    if (global.COLLABMATCH_API) return global.COLLABMATCH_API;
    const host = location.hostname;
    const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '';
    if (isLocal && location.port === '3001') {
      return `${location.origin}/api`;
    }
    if (isLocal) {
      return `http://127.0.0.1:3001/api`;
    }
    // CloudBase HTTP 访问服务（使用独立域名）
    if (host.includes('tcloudbaseapp.com')) {
      return 'https://cloudbase-d6g8yog0ub3e56efe.service.tcloudbase.com/api';
    }
    return `${location.origin}/api`;
  }

  const API_BASE = resolveApiBase();

  const TOKEN_KEY = 'collabmatch_token';
  let onUnauthorized = null;

  function setUnauthorizedHandler(fn) {
    onUnauthorized = typeof fn === 'function' ? fn : null;
  }

  function handleUnauthorized(auth) {
    if (auth === false) return;
    setToken(null);
    if (onUnauthorized) {
      try {
        onUnauthorized();
      } catch (_) {
        /* ignore */
      }
    }
  }

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function setToken(token) {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  }

  /** 全局 loading 计数器 */
  let loadingCount = 0;
  function showLoading() {
    loadingCount++;
    if (loadingCount === 1 && typeof global.setAppLoading === 'function') {
      global.setAppLoading(true);
    }
  }
  function hideLoading() {
    if (loadingCount > 0) loadingCount--;
    if (loadingCount === 0 && typeof global.setAppLoading === 'function') {
      global.setAppLoading(false);
    }
  }

  async function api(path, options = {}) {
    const { method = 'GET', body, auth = true } = options;
    const headers = { 'Content-Type': 'application/json' };
    if (auth && getToken()) headers.Authorization = `Bearer ${getToken()}`;
    showLoading();
    let res;
    try {
      try {
        res = await fetch(`${API_BASE}${path}`, {
          method,
          headers,
          body: body !== undefined ? JSON.stringify(body) : undefined,
        });
      } catch (err) {
        throw wrapFetchError(err);
      }
      const text = await res.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(text || res.statusText);
      }
      if (!res.ok) {
        if (res.status === 401 && auth !== false && auth !== 'silent') {
          handleUnauthorized(auth);
          throw new Error(data.error || '登录已过期，请重新登录');
        }
        if (res.status === 401 && auth === 'silent') {
          throw new Error(data.error || '登录已过期');
        }
        throw new Error(data.error || `请求失败 ${res.status}`);
      }
      return data;
    } finally {
      hideLoading();
    }
  }

  function wrapFetchError(err) {
    const msg = err && err.message ? err.message : String(err);
    if (msg === 'Failed to fetch' || msg.includes('NetworkError') || msg.includes('Failed to fetch')) {
      if (location.protocol === 'file:') {
        return new Error(
          '无法从本地文件访问 API。请先执行 cd server && npm run dev，再在浏览器打开 http://localhost:3001/',
        );
      }
      return new Error(
        '无法连接后端 API。请先启动：cd server && npm run dev，然后打开 http://localhost:3001/（当前目标 ' +
          API_BASE +
          '）',
      );
    }
    return err instanceof Error ? err : new Error(msg);
  }

  function normalizeUser(u) {
    if (!u) return u;
    return {
      ...u,
      portfolio: u.portfolio || [],
      resources: u.resources || [],
      skills: u.skills || [],
      avatar: u.avatar || (u.name && u.name[0]) || '?',
      avatarColor: u.avatarColor || 'linear-gradient(135deg, #8b7bf7, #6c5ce7)',
      avatarUrl: u.avatarUrl || '',
    };
  }

  function mergeRequirements(lists) {
    const map = new Map();
    for (const list of lists) {
      const items = Array.isArray(list) ? list : [];
      for (const r of items) map.set(r.id, r);
    }
    return [...map.values()];
  }

  function normalizeDomainTemplates(domains) {
    Object.keys(domains).forEach((k) => {
      const d = domains[k];
      if (d.templates && d.templates.length && !Array.isArray(d.templates[0])) {
        d.templates = d.templates.map((t) => [t.label, t.text]);
      }
    });
    return domains;
  }

  async function loadConfig(DOMAINS, SKILLS, DOMAIN_SKILL_MAP) {
    try {
      const { domains } = await api('/config/domains', { auth: false });
      Object.assign(DOMAINS, normalizeDomainTemplates(domains));
      const cfg = await api('/config/skills', { auth: false });
      Object.assign(SKILLS, cfg.skills);
      Object.assign(DOMAIN_SKILL_MAP, cfg.domainSkillMap);
    } catch (e) {
      console.warn('[config] 使用本地默认配置', e.message);
    }
  }

  async function fetchAuthConfig() {
    return api('/auth/config', { auth: false });
  }

  async function sendSmsCode(phone) {
    return api('/auth/sms/send', { method: 'POST', body: { phone }, auth: false });
  }

  async function login(phone, code) {
    const data = await api('/auth/login', { method: 'POST', body: { phone, code }, auth: false });
    setToken(data.token);
    return normalizeUser(data.user);
  }

  async function emailLogin(email, password) {
    const data = await api('/auth/email-login', { method: 'POST', body: { email, password }, auth: false });
    return { token: data.token, user: normalizeUser(data.user) };
  }

  async function register(email, password, name) {
    const data = await api('/auth/register', { method: 'POST', body: { email, password, name }, auth: false });
    return { token: data.token, user: normalizeUser(data.user) };
  }

  let uploadLimitsCache = null;
  async function fetchUploadConfig() {
    if (uploadLimitsCache) return uploadLimitsCache;
    uploadLimitsCache = await api('/upload/config');
    return uploadLimitsCache;
  }

  async function uploadFile(file, opts = {}) {
    const fd = new FormData();
    fd.append('file', file);
    if (opts.groupId) fd.append('groupId', opts.groupId);
    if (opts.conversationId) fd.append('conversationId', opts.conversationId);
    const headers = {};
    if (getToken()) headers.Authorization = 'Bearer ' + getToken();
    let res;
    try {
      res = await fetch(API_BASE + '/upload', { method: 'POST', headers, body: fd });
    } catch (err) {
      throw wrapFetchError(err);
    }
    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      throw new Error(text || res.statusText);
    }
    if (!res.ok) {
      if (res.status === 401) {
        handleUnauthorized(true);
        throw new Error(data.error || '登录已过期，请重新登录');
      }
      throw new Error(data.error || '上传失败 ' + res.status);
    }
    return data.file;
  }

  const INLINE_FILE_MAX = 2 * 1024 * 1024;

  async function uploadFileForChat(file, opts = {}) {
    const limits = await fetchUploadConfig().catch(() => ({
      maxBytes: INLINE_FILE_MAX,
      storage: 'inline',
    }));
    if (file.size > limits.maxBytes) {
      throw new Error('文件过大，最大 ' + (limits.maxMb || Math.round(limits.maxBytes / 1024 / 1024)) + 'MB');
    }
    if (file.size > INLINE_FILE_MAX || limits.storage === 'cos') {
      return uploadFile(file, opts);
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () =>
        resolve({ fileName: file.name, fileData: reader.result, inline: true });
      reader.onerror = () => reject(new Error('读取文件失败'));
      reader.readAsDataURL(file);
    });
  }

  async function fetchMe() {
    const data = await api('/auth/me');
    return normalizeUser(data.user);
  }

  async function loadRequirements() {
    const [pubRaw, mineRaw] = await Promise.all([
      api('/requirements', { auth: false }).catch(() => ({ items: [] })),
      api('/requirements/mine').catch(() => ({ items: [] })),
    ]);
    // Handle paginated response format { items, total, ... }
    const pub = Array.isArray(pubRaw) ? pubRaw : (pubRaw.items || []);
    const mine = Array.isArray(mineRaw) ? mineRaw : (mineRaw.items || []);
    return mergeRequirements([pub, mine]);
  }

  async function loadSquareRequirements(filters = {}) {
    const params = new URLSearchParams();
    if (filters.sceneTag && filters.sceneTag !== 'all') params.set('sceneTag', filters.sceneTag);
    if (filters.domain && filters.domain !== 'all') params.set('domain', filters.domain);
    if (filters.weeklyHours) params.set('weeklyHours', filters.weeklyHours);
    if (filters.lookingFor) params.set('lookingFor', filters.lookingFor);
    const qs = params.toString();
    // M-02: Handle paginated response — extract items array
    const result = await api(`/requirements${qs ? '?' + qs : ''}`, { auth: false }).catch(() => ({ items: [] }));
    return Array.isArray(result) ? result : (result.items || []);
  }

  async function loadConversations() {
    const data = await api('/conversations');
    return Array.isArray(data) ? data : (data.items || []);
  }

  async function loadGroups() {
    const data = await api('/groups');
    return Array.isArray(data) ? data : (data.items || []);
  }

  async function createConversation(domain) {
    const data = await api('/conversations', { method: 'POST', body: { domain } });
    return data.conversation;
  }

  async function streamAiChat(conversationId, message, onChunk, fileIds, domain, llmConfig) {
    const body = { conversationId, message };
    if (fileIds?.length) body.fileIds = fileIds;
    if (domain) body.domain = domain;
    if (llmConfig) body.llmConfig = llmConfig;
    const res = await fetch(`${API_BASE}/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `AI 请求失败 ${res.status}`);
    }
    const ct = res.headers.get('content-type') || '';
    // SSE streaming (Express)
    if (ct.includes('text/event-stream')) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let result = { message: null, conversation: null, userMessage: null };
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.chunk && onChunk) onChunk(data.chunk);
            if (data.done) {
              result.message = data.message;
              result.conversation = data.conversation;
              result.userMessage = data.userMessage;
            }
          } catch { /* ignore */ }
        }
      }
      return result;
    }
    // Plain JSON (cloud function)
    const data = await res.json();
    if (onChunk) onChunk(data.message?.content || '');
    return {
      message: data.message || null,
      conversation: data.conversation || null,
      userMessage: data.userMessage || null,
    };
  }

  async function runSkill(conversationId, skillId, context) {
    const data = await api('/ai/skill', {
      method: 'POST',
      body: { conversationId, skillId, context },
    });
    return data.message;
  }

  async function matchForward(requirementId) {
    const data = await api(`/match/forward?requirementId=${encodeURIComponent(requirementId)}`);
    return Array.isArray(data) ? data : (data.items || []);
  }

  async function matchReverse(limit) {
    const data = await api(`/match/reverse?limit=${limit || 3}`);
    const list = Array.isArray(data) ? data : (data.items || []);
    return list.map((item) => ({
      ...item.requirement,
      userMatchPct: item.matchPct ?? item.requirement?.userMatchPct,
    }));
  }


  async function publishRequirement(id, visibility) {
    const data = await api(`/requirements/${id}/publish`, { method: 'PUT', body: { visibility } });
    return data.requirement;
  }

  async function createRequirement(body) {
    const data = await api('/requirements', { method: 'POST', body });
    return data.requirement;
  }

  async function updateRequirement(id, body) {
    const data = await api(`/requirements/${id}`, { method: 'PUT', body });
    return data.requirement;
  }

  async function applyRequirement(id, opts) {
    const body = opts && opts.message ? { message: opts.message } : undefined;
    return api(`/requirements/${id}/apply`, { method: 'PUT', body });
  }

  async function saveUserProfile(body) {
    const data = await api('/users/me', { method: 'PUT', body });
    return normalizeUser(data.user);
  }

  async function saveUserSkills(skills) {
    const data = await api('/users/me/skills', { method: 'PUT', body: { skills } });
    return normalizeUser(data.user);
  }

  async function saveUserResources(resources) {
    const data = await api('/users/me/resources', { method: 'PUT', body: { resources } });
    return normalizeUser(data.user);
  }

  async function createGroup(reqId, invitedUserId, inviteMessage) {
    const body = { reqId, invitedUserId };
    if (inviteMessage) body.inviteMessage = inviteMessage;
    const data = await api('/groups', { method: 'POST', body });
    return data.group;
  }

  async function sendGroupMessage(groupId, content, fileMeta) {
    const body = { content };
    if (fileMeta) Object.assign(body, fileMeta);
    const data = await api(`/groups/${groupId}/messages`, { method: 'POST', body });
    return data.message;
  }

  async function fetchGroup(groupId) {
    const data = await api(`/groups/${groupId}`);
    return data.group;
  }

  async function fetchReqApplications(reqId) {
    const data = await api(`/requirements/${reqId}/applications`);
    return Array.isArray(data) ? data : (data.items || data.applications || []);
  }
  async function reviewApplication(reqId, appId, status) {
    const data = await api(`/requirements/${reqId}/applications/${appId}`, { method: 'PUT', body: { status } });
    return data.application;
  }
  async function fetchMyPortfolio() {
    const data = await api('/users/me/portfolio');
    return data.portfolio || [];
  }
  async function createPortfolioItem(body) {
    const data = await api('/users/me/portfolio', { method: 'POST', body });
    return data.item;
  }
  async function updatePortfolioItem(itemId, body) {
    const data = await api(`/users/me/portfolio/${itemId}`, { method: 'PUT', body });
    return data.item;
  }
  async function deletePortfolioItem(itemId) {
    await api(`/users/me/portfolio/${itemId}`, { method: 'DELETE' });
  }
  async function aiEnhanceProfile() {
    const data = await api('/users/me/ai-enhance-profile', { method: 'POST' });
    return data.user;
  }
  async function deleteConversation(id) {
    await api(`/conversations/${id}`, { method: 'DELETE' });
  }
  async function deleteRequirement(id) {
    await api(`/requirements/${id}`, { method: 'DELETE' });
  }
  async function fetchMyApplications() {
    const data = await api('/users/me/applications');
    return Array.isArray(data) ? data : (data.items || data.applications || []);
  }

  function resolveFileUrl(fileUrl) {
    if (!fileUrl) return '';
    if (fileUrl.startsWith('http')) return fileUrl;
    const origin = API_BASE.replace(/\/api\/?$/, '');
    return origin + fileUrl;
  }

  async function uploadChatAttachment(conversationId, fileName, fileData, fileId) {
    const body = { fileName };
    if (fileId) body.fileId = fileId;
    else body.fileData = fileData;
    const data = await api(`/conversations/${conversationId}/attachments`, {
      method: 'POST',
      body,
    });
    return data;
  }

  async function forwardMessage(conversationId, messageIndex, targetConversationId) {
    const data = await api(`/conversations/${conversationId}/forward`, {
      method: 'POST',
      body: { messageIndex, targetConversationId },
    });
    return data.conversation;
  }

  async function createGroupMeeting(groupId) {
    const data = await api(`/groups/${groupId}/meeting`, { method: 'POST' });
    return data;
  }

  async function pingPresence() {
    return api('/users/me/presence', { method: 'POST', auth: 'silent' }).catch(() => {});
  }

  global.escapeHtml = function escapeHtml(str) {
    return String(str)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#39;');
  };

  // 赋值给外层变量，确保 catch 中也能访问
  _API_BASE = API_BASE;
  _getToken = getToken; _setToken = setToken; _setUnauthorizedHandler = setUnauthorizedHandler;
  _api = api; _normalizeUser = normalizeUser;
  _loadConfig = loadConfig; _fetchAuthConfig = fetchAuthConfig; _sendSmsCode = sendSmsCode;
  _login = login; _emailLogin = emailLogin; _register = register;
  _fetchMe = fetchMe; _fetchUploadConfig = fetchUploadConfig; _uploadFile = uploadFile;
  _uploadFileForChat = uploadFileForChat;
  _loadRequirements = loadRequirements; _loadSquareRequirements = loadSquareRequirements;
  _loadConversations = loadConversations; _loadGroups = loadGroups;
  _createConversation = createConversation; _streamAiChat = streamAiChat; _runSkill = runSkill;
  _matchForward = matchForward; _matchReverse = matchReverse;
  _publishRequirement = publishRequirement; _createRequirement = createRequirement;
  _updateRequirement = updateRequirement; _applyRequirement = applyRequirement;
  _saveUserProfile = saveUserProfile; _saveUserSkills = saveUserSkills;
  _saveUserResources = saveUserResources;
  _createGroup = createGroup; _sendGroupMessage = sendGroupMessage; _fetchGroup = fetchGroup;
  _fetchReqApplications = fetchReqApplications; _reviewApplication = reviewApplication;
  _fetchMyApplications = fetchMyApplications;
  _fetchMyPortfolio = fetchMyPortfolio; _createPortfolioItem = createPortfolioItem;
  _updatePortfolioItem = updatePortfolioItem; _deletePortfolioItem = deletePortfolioItem;
  _aiEnhanceProfile = aiEnhanceProfile; _deleteConversation = deleteConversation;
  _deleteRequirement = deleteRequirement;
  _resolveFileUrl = resolveFileUrl; _uploadChatAttachment = uploadChatAttachment;
  _forwardMessage = forwardMessage; _createGroupMeeting = createGroupMeeting;
  _pingPresence = pingPresence; _mergeRequirements = mergeRequirements;

  } catch (initErr) {
    console.error('[api-bridge] 初始化失败:', initErr);
  }

  // 无论 try 是否成功，都确保 CollabApi 存在
  global.CollabApi = {
    API_BASE: _API_BASE,
    getToken: _getToken || (() => localStorage.getItem('collabmatch_token')),
    setToken: _setToken || ((t) => t ? localStorage.setItem('collabmatch_token', t) : localStorage.removeItem('collabmatch_token')),
    setUnauthorizedHandler: _setUnauthorizedHandler || (() => {}),
    api: _api,
    normalizeUser: _normalizeUser || ((u) => u),
    loadConfig: _loadConfig,
    fetchAuthConfig: _fetchAuthConfig,
    sendSmsCode: _sendSmsCode,
    login: _login,
    emailLogin: _emailLogin,
    register: _register,
    fetchMe: _fetchMe,
    fetchUploadConfig: _fetchUploadConfig,
    uploadFile: _uploadFile,
    uploadFileForChat: _uploadFileForChat,
    loadRequirements: _loadRequirements,
    loadSquareRequirements: _loadSquareRequirements,
    loadConversations: _loadConversations,
    loadGroups: _loadGroups,
    createConversation: _createConversation,
    streamAiChat: _streamAiChat,
    runSkill: _runSkill,
    matchForward: _matchForward,
    matchReverse: _matchReverse,
    publishRequirement: _publishRequirement,
    createRequirement: _createRequirement,
    updateRequirement: _updateRequirement,
    applyRequirement: _applyRequirement,
    saveUserProfile: _saveUserProfile,
    saveUserSkills: _saveUserSkills,
    saveUserResources: _saveUserResources,
    createGroup: _createGroup,
    sendGroupMessage: _sendGroupMessage,
    fetchGroup: _fetchGroup,
    fetchReqApplications: _fetchReqApplications,
    reviewApplication: _reviewApplication,
    fetchMyApplications: _fetchMyApplications,
    fetchMyPortfolio: _fetchMyPortfolio,
    createPortfolioItem: _createPortfolioItem,
    updatePortfolioItem: _updatePortfolioItem,
    deletePortfolioItem: _deletePortfolioItem,
    aiEnhanceProfile: _aiEnhanceProfile,
    deleteConversation: _deleteConversation,
    deleteRequirement: _deleteRequirement,
    resolveFileUrl: _resolveFileUrl || ((u) => u || ''),
    uploadChatAttachment: _uploadChatAttachment,
    forwardMessage: _forwardMessage,
    createGroupMeeting: _createGroupMeeting,
    pingPresence: _pingPresence || (() => Promise.resolve()),
    mergeRequirements: _mergeRequirements || ((lists) => []),
  };
})(window);
