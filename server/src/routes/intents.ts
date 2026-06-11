import { Router, Request, Response } from 'express';
import { Intent, IIntent, IMatchedUser } from '../models/Intent.js';
import { MatchNotice, IMatchNotice } from '../models/MatchNotice.js';
import { User } from '../models/User.js';
import { Group } from '../models/Group.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

// All intent routes require auth
router.use(requireAuth);

/** POST /intents — 一句话创建匹配意图 */
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { rawInput } = req.body as { rawInput: string };
    if (!rawInput?.trim()) return res.status(400).json({ error: '请输入你的需求' });

    const userId = req.user!.id;

    // 1. AI 提取必要因素 + 提示词
    const { essentials, prompts, essentialsComplete } = extractFromInput(rawInput);

    // 2. 匹配用户
    const matchedUsers = await matchUsers(userId, essentials, prompts);

    // 3. 创建 Intent
    const intent = await Intent.create({
      rawInput: rawInput.trim(),
      essentials,
      prompts,
      essentialsComplete,
      status: matchedUsers.length > 0 ? 'matched' : 'matching',
      matchedUsers,
      author: { id: userId, name: req.user!.name || '匿名' },
    });

    // 4. 给匹配到的用户发通知
    if (matchedUsers.length > 0) {
      const notices = matchedUsers
        .filter(mu => mu.matchPct >= 40) // 只通知匹配度 >= 40% 的用户
        .map(mu => ({
          intentId: (intent._id as any).toString(),
          fromUser: { id: userId, name: req.user!.name || '匿名', avatar: req.user!.avatarUrl },
          toUserId: mu.user.id,
          rawInput: rawInput.trim(),
          prompts,
          essentials,
          matchPct: mu.matchPct,
          reason: mu.reason,
          status: 'pending' as const,
        }));
      if (notices.length > 0) {
        await MatchNotice.insertMany(notices);
      }
    }

    res.status(201).json(serializeIntent(intent));
  } catch (err: any) {
    console.error('[intents] create error:', err);
    res.status(500).json({ error: err.message || '创建匹配意图失败' });
  }
});

/** GET /intents/mine — 获取我的意图列表 */
router.get('/mine', async (req: AuthRequest, res: Response) => {
  try {
    const intents = await Intent.find({ 'author.id': req.user!.id })
      .sort({ createdAt: -1 })
      .limit(20);
    res.json(intents.map(serializeIntent));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /intents/notices — 获取我的匹配通知 */
router.get('/notices', async (req: AuthRequest, res: Response) => {
  try {
    const notices = await MatchNotice.find({ toUserId: req.user!.id })
      .sort({ createdAt: -1 })
      .limit(30);
    res.json(notices.map(serializeNotice));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /intents/notices/unread-count — 未读通知数 */
router.get('/notices/unread-count', async (req: AuthRequest, res: Response) => {
  try {
    const count = await MatchNotice.countDocuments({
      toUserId: req.user!.id,
      status: 'pending',
    });
    res.json({ count });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** PUT /intents/notices/:noticeId — 接受/拒绝匹配通知 */
router.put('/notices/:noticeId', async (req: AuthRequest, res: Response) => {
  try {
    const { status, reply } = req.body as { status: 'accepted' | 'rejected'; reply?: string };
    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ error: '状态只能是 accepted 或 rejected' });
    }

    const notice = await MatchNotice.findById(req.params.noticeId);
    if (!notice) return res.status(404).json({ error: '通知不存在' });
    if (notice.toUserId !== req.user!.id) return res.status(403).json({ error: '无权操作' });
    if (notice.status !== 'pending') return res.status(400).json({ error: '该通知已处理' });

    notice.status = status;
    if (reply) notice.reply = reply;
    await notice.save();

    // 如果接受，更新 Intent 的 matchedUsers 中该用户的状态
    if (status === 'accepted') {
      const intent = await Intent.findById(notice.intentId);
      if (intent) {
        const mu = intent.matchedUsers.find(m => m.user.id === req.user!.id);
        if (mu) {
          (mu as any).accepted = true;
          await intent.save();
        }
      }
    }

    res.json(serializeNotice(notice));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /intents/:id — 获取意图详情 */
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const intent = await Intent.findById(req.params.id);
    if (!intent) return res.status(404).json({ error: '意图不存在' });
    if (intent.author.id !== req.user!.id) return res.status(403).json({ error: '无权访问' });
    res.json(serializeIntent(intent));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** PUT /intents/:id — 更新意图 */
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const intent = await Intent.findById(req.params.id);
    if (!intent) return res.status(404).json({ error: '意图不存在' });
    if (intent.author.id !== req.user!.id) return res.status(403).json({ error: '无权修改' });

    const { essentials, prompts } = req.body as { essentials?: any; prompts?: string[] };
    if (essentials) Object.assign(intent.essentials, essentials);
    if (prompts) intent.prompts = prompts;

    intent.essentialsComplete = !!(intent.essentials.location && intent.essentials.date && intent.essentials.groupSize);
    intent.updatedAt = new Date();
    await intent.save();

    res.json(serializeIntent(intent));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /intents/:id/confirm-team — 确认组队 */
router.post('/:id/confirm-team', async (req: AuthRequest, res: Response) => {
  try {
    const { userIds } = req.body as { userIds: string[] };
    if (!userIds?.length) return res.status(400).json({ error: '请选择至少一位队友' });

    const intent = await Intent.findById(req.params.id);
    if (!intent) return res.status(404).json({ error: '意图不存在' });
    if (intent.author.id !== req.user!.id) return res.status(403).json({ error: '无权操作' });

    intent.status = 'confirmed';
    await intent.save();

    // 创建 Group
    const allMemberIds = [req.user!.id, ...userIds];
    const location = intent.essentials.location || '';
    const group = await Group.create({
      name: location ? `${location}徒步队` : 'TrailMate 徒步队',
      emoji: '🥾',
      desc: intent.rawInput,
      intentId: (intent._id as any).toString(),
      meetupLocation: location,
      status: 'forming',
      members: allMemberIds,
      messages: [{
        user: allMemberIds[0],
        type: 'system',
        content: '队伍已组建，开始商量细节吧！',
        time: new Date(),
      }],
    });

    res.json({
      id: intent._id,
      status: 'confirmed',
      groupId: (group._id as any).toString(),
      teamMembers: allMemberIds.length,
      message: '组队成功！可以在队伍中商量细节',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** DELETE /intents/:id — 取消意图 */
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const intent = await Intent.findById(req.params.id);
    if (!intent) return res.status(404).json({ error: '意图不存在' });
    if (intent.author.id !== req.user!.id) return res.status(403).json({ error: '无权删除' });

    intent.status = 'expired';
    await intent.save();

    // 过期相关通知
    await MatchNotice.updateMany(
      { intentId: (intent._id as any).toString(), status: 'pending' },
      { status: 'expired' },
    );

    res.json({ message: '已取消' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /intents/:id/dissolve — 解散队伍 + 从聊天记录总结差异点 + 迭代匹配 */
router.post('/:id/dissolve', async (req: AuthRequest, res: Response) => {
  try {
    const { chatMessages, differencePoints, preview, selectedPreferences } = req.body as {
      chatMessages?: { content: string; userName: string }[];
      differencePoints?: string[];
      preview?: boolean;           // 预览模式：只提取差异点，不解散也不匹配
      selectedPreferences?: string[];  // 用户确认要加入的偏好（从预览结果中选择）
    };

    const intent = await Intent.findById(req.params.id);
    if (!intent) return res.status(404).json({ error: '意图不存在' });
    if (intent.author.id !== req.user!.id) return res.status(403).json({ error: '无权操作' });

    // 从聊天记录中总结差异点（带用户归属）
    const extractedDiffs = differencePoints || [];
    const chatDiffs = chatMessages ? extractDifferencePoints(chatMessages) : [];

    const currentUserName = req.user!.name || '匿名';
    const myDiffs = chatDiffs.filter(d => d.userName === currentUserName);
    const otherDiffs = chatDiffs.filter(d => d.userName !== currentUserName);

    // ── 预览模式：只返回差异点，不解散 ──
    if (preview) {
      const allDiffTopics = [...new Set([...myDiffs.map(d => d.topic), ...otherDiffs.map(d => d.topic), ...extractedDiffs])];
      return res.json({
        preview: true,
        differencePoints: allDiffTopics,
        myPreferences: myDiffs.map(d => ({ topic: d.topic, preference: d.userPreference })),
        otherPreferences: otherDiffs.map(d => ({ topic: d.topic, preference: d.userPreference, userName: d.userName })),
        message: allDiffTopics.length > 0
          ? `发现 ${allDiffTopics.length} 个差异点，请选择要加入匹配条件的偏好`
          : '未发现明显差异点，可以直接重新匹配',
      });
    }

    // ── 正式解散 ──
    // 1. 标记原意图为解散
    intent.status = 'expired';
    await intent.save();

    // 过期相关通知
    await MatchNotice.updateMany(
      { intentId: (intent._id as any).toString(), status: 'pending' },
      { status: 'expired' },
    );

    // 2. 合并提示词：用户选择的偏好 + 手动提供的差异点
    const selectedPrefs = selectedPreferences || [
      ...myDiffs.map(d => d.userPreference),
      ...extractedDiffs.map(d => `排除: ${d}`),
    ];
    const newPrompts = [...new Set([...intent.prompts, ...selectedPrefs])];
    const newEssentials = { ...intent.essentials };

    // 3. 重新匹配
    const matchedUsers = await matchUsers(req.user!.id, newEssentials, newPrompts);

    const newIntent = await Intent.create({
      rawInput: intent.rawInput,
      essentials: newEssentials,
      prompts: newPrompts,
      essentialsComplete: intent.essentialsComplete,
      status: matchedUsers.length > 0 ? 'matched' : 'matching',
      matchedUsers,
      author: { id: req.user!.id, name: req.user!.name || '匿名' },
    });

    // 4. 给新匹配到的用户发通知
    if (matchedUsers.length > 0) {
      const notices = matchedUsers
        .filter(mu => mu.matchPct >= 40)
        .map(mu => ({
          intentId: (newIntent._id as any).toString(),
          fromUser: { id: req.user!.id, name: req.user!.name || '匿名', avatar: req.user!.avatarUrl },
          toUserId: mu.user.id,
          rawInput: intent.rawInput,
          prompts: newPrompts,
          essentials: newEssentials,
          matchPct: mu.matchPct,
          reason: mu.reason,
          status: 'pending' as const,
        }));
      if (notices.length > 0) {
        await MatchNotice.insertMany(notices);
      }
    }

    // 构建差异点摘要（区分双方）
    const allDiffTopics = [...new Set([...myDiffs.map(d => d.topic), ...otherDiffs.map(d => d.topic), ...extractedDiffs])];

    res.json({
      dissolved: true,
      differencePoints: allDiffTopics,
      myPreferences: myDiffs.map(d => ({ topic: d.topic, preference: d.userPreference })),
      otherPreferences: otherDiffs.map(d => ({ topic: d.topic, preference: d.userPreference, userName: d.userName })),
      selectedPreferences,
      newPrompts,
      newIntent: serializeIntent(newIntent),
      message: selectedPrefs.length > 0
        ? `已将你选择的偏好加入新的匹配条件，找到 ${matchedUsers.length} 位新队友`
        : `已重新匹配，找到 ${matchedUsers.length} 位新队友`,
    });
  } catch (err: any) {
    console.error('[intents] dissolve error:', err);
    res.status(500).json({ error: err.message || '解散失败' });
  }
});

/** POST /intents/:id/iterate — 仅迭代匹配（不解散，用户主动要求重新匹配） */
router.post('/:id/iterate', async (req: AuthRequest, res: Response) => {
  try {
    const { additionalPrompts } = req.body as { additionalPrompts?: string[] };

    const intent = await Intent.findById(req.params.id);
    if (!intent) return res.status(404).json({ error: '意图不存在' });
    if (intent.author.id !== req.user!.id) return res.status(403).json({ error: '无权操作' });

    const newPrompts = [...new Set([...intent.prompts, ...(additionalPrompts || [])])];
    const matchedUsers = await matchUsers(req.user!.id, intent.essentials, newPrompts);

    intent.prompts = newPrompts;
    intent.matchedUsers = matchedUsers;
    intent.status = matchedUsers.length > 0 ? 'matched' : 'matching';
    await intent.save();

    res.json(serializeIntent(intent));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* ═══ AI 提取逻辑 ═══ */

interface ExtractedInfo {
  essentials: {
    location?: string;
    date?: string;
    groupSize?: number;
    difficulty?: 'casual' | 'advanced' | 'challenge';
    eventType?: 'dayhike' | 'overnight' | 'longtrail';
  };
  prompts: string[];
  essentialsComplete: boolean;
}

function extractFromInput(raw: string): ExtractedInfo {
  const essentials: ExtractedInfo['essentials'] = {};
  const prompts: string[] = [];

  const locationPatterns = [
    /去(.{2,6}?)(徒步|爬山|走|登|穿越|露营)/,
    /(梧桐山|泰山|华山|黄山|武功山|四姑娘山|稻城|雨崩|虎跳峡|莫干山|千岛湖|张家界|九寨沟|峨眉山|青城山|白云山|帽峰山|排牙山|七娘山|大南山)/,
    /(.{2,4}山|.{2,4}湖|.{2,4}谷|.{2,4}岭|.{2,4}峰)/,
  ];
  for (const p of locationPatterns) {
    const m = raw.match(p);
    if (m) { essentials.location = m[1] || m[0]; break; }
  }

  if (/这周末|本周末/.test(raw)) essentials.date = 'this_weekend';
  else if (/下周末/.test(raw)) essentials.date = 'next_weekend';
  else if (/周末/.test(raw)) essentials.date = 'weekend';
  else if (/周六/.test(raw)) essentials.date = 'saturday';
  else if (/周日|周天/.test(raw)) essentials.date = 'sunday';
  else if (/明天/.test(raw)) essentials.date = 'tomorrow';
  else if (/下周/.test(raw)) essentials.date = 'next_week';
  else if (/五一|十一|国庆|元旦|清明|端午|中秋/.test(raw)) essentials.date = 'holiday';

  const sizeMatch = raw.match(/(\d+)\s*[-~到至]\s*(\d+)\s*人/) || raw.match(/(\d+)\s*人/);
  if (sizeMatch) essentials.groupSize = parseInt(sizeMatch[2] || sizeMatch[1]);

  if (/轻松|休闲|简单|散步|新手|入门/.test(raw)) essentials.difficulty = 'casual';
  else if (/挑战|难度|高强度|进阶|有经验/.test(raw)) essentials.difficulty = 'challenge';
  else if (/中等|一般|正常/.test(raw)) essentials.difficulty = 'advanced';

  if (/日归|当天|一天/.test(raw)) essentials.eventType = 'dayhike';
  else if (/多日|过夜|露营|两天|三天|几天/.test(raw)) essentials.eventType = 'overnight';
  else if (/长线|穿越|远征/.test(raw)) essentials.eventType = 'longtrail';

  if (/不喜欢抽烟|不抽烟|无烟|忌烟/.test(raw)) prompts.push('不喜欢抽烟');
  if (/喜欢拍照|摄影|出片/.test(raw)) prompts.push('喜欢拍照');
  if (/有经验|老驴|老手|资深/.test(raw)) prompts.push('有经验优先');
  if (/新手|小白|第一次|零基础/.test(raw)) prompts.push('新手友好');
  if (/有水|溪流|瀑布|溯溪/.test(raw)) prompts.push('有水路线');
  if (/风景好|景色|日出|云海/.test(raw)) prompts.push('风景优先');
  if (/社交|交友|认识|聊得来/.test(raw)) prompts.push('社交型');
  if (/安静|清静|人少|小众/.test(raw)) prompts.push('安静小众');
  if (/AA|各付各/.test(raw)) prompts.push('AA制');
  if (/开车|自驾|拼车/.test(raw)) prompts.push('可拼车');
  if (/女生|女性|闺蜜/.test(raw)) prompts.push('偏好女生');
  if (/男生|男性|兄弟/.test(raw)) prompts.push('偏好男生');
  if (/带狗|宠物|毛孩子/.test(raw)) prompts.push('可带宠物');
  if (/夜爬|夜徒|星空/.test(raw)) prompts.push('夜间活动');
  if (/亲子|带娃|小孩/.test(raw)) prompts.push('亲子友好');

  if (prompts.length === 0) {
    const simplified = raw.replace(/[我想找去要个人和的了]/g, '').trim();
    if (simplified) prompts.push(simplified.slice(0, 20));
  }

  const essentialsComplete = !!(essentials.location && essentials.date && essentials.groupSize);
  return { essentials, prompts, essentialsComplete };
}

/* ═══ 匹配算法 ═══ */

async function matchUsers(
  authorId: string,
  essentials: ExtractedInfo['essentials'],
  prompts: string[],
): Promise<IMatchedUser[]> {
  const users = await User.find({ _id: { $ne: authorId } }).limit(50);
  if (users.length === 0) return [];

  const results: IMatchedUser[] = [];

  for (const u of users) {
    let essentialsScore = 50;
    let essentialsReasons: string[] = [];

    if (essentials.difficulty) {
      const levelMap: Record<string, number> = { novice: 1, experienced: 2, veteran: 3 };
      const diffMap: Record<string, number> = { casual: 1, advanced: 2, challenge: 3 };
      const userLevel = levelMap[u.experienceLevel] || 1;
      const reqDiff = diffMap[essentials.difficulty] || 2;
      if (userLevel >= reqDiff) { essentialsScore += 25; essentialsReasons.push('体能匹配'); }
      else { essentialsScore -= 15; }
    }

    if (essentials.location && u.city) {
      if (essentials.location.includes(u.city) || u.city.includes(essentials.location)) {
        essentialsScore += 20; essentialsReasons.push('同城');
      }
    }

    let promptsScore = 50;
    let promptsReasons: string[] = [];
    const userPrompts: string[] = (u as any).userPrompts || u.preferences || [];

    for (const prompt of prompts) {
      for (const up of userPrompts) {
        if (prompt.includes(up) || up.includes(prompt)) {
          promptsScore += 15; promptsReasons.push(up);
        }
      }
      if (prompt === '不喜欢抽烟') { promptsScore += 10; promptsReasons.push('无烟偏好'); }
      if (prompt === '新手友好' && u.experienceLevel === 'veteran') { promptsScore -= 10; }
      if (prompt === '有经验优先' && u.experienceLevel !== 'novice') { promptsScore += 15; promptsReasons.push('有经验'); }
      if (prompt === '风景优先' && userPrompts.some(p => /风景|拍照|摄影/.test(p))) { promptsScore += 15; promptsReasons.push('同好风景'); }
    }

    let profileScore = 50;
    if (u.creditScore > 80) profileScore += 15;
    if (u.hikeCount > 5) profileScore += 10;
    if (u.bio && u.bio.length > 10) profileScore += 5;
    if ((u as any).online) profileScore += 10;

    const essentialsNorm = Math.min(100, Math.max(0, essentialsScore));
    const promptsNorm = Math.min(100, Math.max(0, promptsScore));
    const profileNorm = Math.min(100, Math.max(0, profileScore));

    const totalPct = Math.round(promptsNorm * 0.45 + essentialsNorm * 0.35 + profileNorm * 0.20);

    const allReasons = [...essentialsReasons, ...promptsReasons];
    const reason = allReasons.length > 0 ? allReasons.slice(0, 3).join('、') : '综合匹配';

    results.push({
      user: { id: (u._id as any).toString(), name: u.name || '匿名', avatar: u.avatarUrl, avatarColor: (u as any).avatarColor },
      matchPct: totalPct,
      breakdown: { essentials: essentialsNorm, prompts: promptsNorm, profile: profileNorm },
      reason,
    });
  }

  return results.sort((a, b) => b.matchPct - a.matchPct).slice(0, 5);
}

/* ═══ 序列化 ═══ */

function serializeIntent(intent: IIntent) {
  return {
    id: (intent._id as any).toString(),
    rawInput: intent.rawInput,
    essentials: intent.essentials,
    prompts: intent.prompts,
    essentialsComplete: intent.essentialsComplete,
    status: intent.status,
    matchedUsers: intent.matchedUsers,
    author: intent.author,
    createdAt: intent.createdAt?.toISOString(),
    updatedAt: intent.updatedAt?.toISOString(),
  };
}

function serializeNotice(notice: IMatchNotice) {
  return {
    id: (notice._id as any).toString(),
    intentId: notice.intentId,
    fromUser: notice.fromUser,
    rawInput: notice.rawInput,
    prompts: notice.prompts,
    essentials: notice.essentials,
    matchPct: notice.matchPct,
    reason: notice.reason,
    status: notice.status,
    reply: notice.reply,
    createdAt: notice.createdAt?.toISOString(),
  };
}

/* ═══ 从聊天记录中提取差异点（带用户归属） ═══ */

interface DifferencePoint {
  /** 差异主题（如"早起"、"抽烟"） */
  topic: string;
  /** 说话人的偏好（如"排除: 早起"、"排除: 抽烟"） */
  userPreference: string;
  /** 说话人 */
  userName: string;
}

function extractDifferencePoints(messages: { content: string; userName: string }[]): DifferencePoint[] {
  const diffs: DifferencePoint[] = [];

  // 每条消息单独检测，保留说话人归属
  const conflictPatterns = [
    { pattern: /不想?要?太?早|起不来|太早了|不想早起/, topic: '早起', pref: '排除: 早起' },
    { pattern: /想早起|早起好|六点|7点出发|早点出发/, topic: '早起', pref: '偏好: 早起' },
    { pattern: /不想?走?太?快|走慢点|太快了|跟不上/, topic: '快节奏', pref: '排除: 快节奏' },
    { pattern: /不想?走?太?慢|走快点|太慢了|磨叽/, topic: '慢节奏', pref: '排除: 慢节奏' },
    { pattern: /不想?露营|不想住帐篷|要住店|要酒店/, topic: '露营', pref: '排除: 露营' },
    { pattern: /想露营|住帐篷|露营好/, topic: '露营', pref: '偏好: 露营' },
    { pattern: /不想?AA|不想各付各|我请客|你请客/, topic: 'AA制', pref: '排除: AA制' },
    { pattern: /不想?带?太多人|人太多了|人少点/, topic: '大队伍', pref: '排除: 大队伍' },
    { pattern: /不想?带?太少人|人太少了|多叫点/, topic: '小队伍', pref: '排除: 小队伍' },
    { pattern: /不想?走?夜路|不想夜爬|怕黑/, topic: '夜间行走', pref: '排除: 夜间行走' },
    { pattern: /想夜爬|夜爬好|星空/, topic: '夜间行走', pref: '偏好: 夜间行走' },
    { pattern: /不想?背?太重|装备太多|轻装/, topic: '重装', pref: '排除: 重装' },
    { pattern: /不想?做饭|不想自己煮|吃外卖|下馆子/, topic: '自己做饭', pref: '排除: 自己做饭' },
    { pattern: /不想?开车|不想自驾|坐车/, topic: '自驾', pref: '排除: 自驾' },
    { pattern: /不想?带?宠物|怕狗|过敏/, topic: '带宠物', pref: '排除: 带宠物' },
    { pattern: /抽烟|吸烟|忌烟|烟味/, topic: '抽烟', pref: '排除: 抽烟' },
    { pattern: /不想?拍照|不爱拍照|别老拍照/, topic: '频繁拍照', pref: '排除: 频繁拍照' },
    { pattern: /不想?社交|不想聊天|安静走/, topic: '社交型', pref: '排除: 社交型' },
    { pattern: /太贵了|预算不够|不想花太多|便宜点/, topic: '高消费', pref: '排除: 高消费' },
    { pattern: /不想?走?原路|不想走回头路/, topic: '原路返回', pref: '排除: 原路返回' },
  ];

  for (const msg of messages) {
    for (const { pattern, topic, pref } of conflictPatterns) {
      if (pattern.test(msg.content)) {
        diffs.push({ topic, userPreference: pref, userName: msg.userName });
      }
    }
  }

  // 去重（同一用户对同一主题只保留一条）
  const seen = new Set<string>();
  return diffs.filter(d => {
    const key = `${d.userName}:${d.topic}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default router;
