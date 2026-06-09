/** CollabMatch 前端 API 桥接（对接 server/） */
(function (global) {
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
    // CloudBase HTTP 访问服务（静态托管和云接入域名不同）
    if (host.includes('tcloudbaseapp.com')) {
      const envId = host.split('.')[0];
      return `https://${envId}.ap-shanghai.app.tcloudbase.com/api`;
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
    if (msg === 'Failed to fetch' || msg.includes('NetworkError') || msg.includes('fetch')) {
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

  global.CollabApi = {
    API_BASE,
    getToken,
    setToken,
    setUnauthorizedHandler,
    api,
    normalizeUser,
    loadConfig,
    fetchAuthConfig,
    sendSmsCode,
    login,
    emailLogin,
    register,
    fetchMe,
    fetchUploadConfig,
    uploadFile,
    uploadFileForChat,
    loadRequirements,
    loadSquareRequirements,
    loadConversations,
    loadGroups,
    createConversation,
    streamAiChat,
    runSkill,
    matchForward,
    matchReverse,
    publishRequirement,
    createRequirement,
    updateRequirement,
    applyRequirement,
    saveUserProfile,
    saveUserSkills,
    saveUserResources,
    createGroup,
    sendGroupMessage,
    fetchGroup,
    // P0 new
    fetchReqApplications,
    reviewApplication,
    fetchMyApplications,
    fetchMyPortfolio,
    createPortfolioItem,
    updatePortfolioItem,
    deletePortfolioItem,
    aiEnhanceProfile,
    deleteConversation,
    deleteRequirement,
    resolveFileUrl,
    uploadChatAttachment,
    forwardMessage,
    createGroupMeeting,
    pingPresence,
    mergeRequirements,
  };
})(window);
