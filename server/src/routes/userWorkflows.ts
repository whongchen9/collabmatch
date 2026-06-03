import { Router } from 'express';
import { asOne } from '../db/helpers.js';
import { UserWorkflow } from '../models/UserWorkflow.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { userWorkflowToConfig } from '../services/workflowResolve.js';
import { resolveSkill } from '../services/skillResolve.js';

const router = Router();

router.get('/', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const docs = await UserWorkflow.find({ userId: req.user!._id }).sort({ createdAt: -1 });
    res.json({ workflows: docs.map((d) => userWorkflowToConfig(d)) });
  } catch (e) {
    next(e);
  }
});

router.post('/', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { name, steps, desc } = req.body as {
      name?: string;
      steps?: { skillId?: string; action?: string; title?: string; icon?: string }[];
      desc?: string;
    };
    if (!name?.trim() || !Array.isArray(steps) || steps.length === 0) {
      res.status(400).json({ error: '名称和步骤不能为空' });
      return;
    }

    const normalized: { skillId?: string; action?: string; title: string; icon: string }[] = [];
    for (const step of steps) {
      const action = step.action as string | undefined;
      if (action === 'match_forward' || action === 'match_reverse') {
        normalized.push({
          action,
          skillId:
            action === 'match_forward' ? '__action_match_forward__' : '__action_match_reverse__',
          title: step.title?.trim() || (action === 'match_forward' ? '智能匹配' : '推荐需求'),
          icon: step.icon?.trim() || '🔍',
        });
        continue;
      }
      if (!step.skillId) {
        res.status(400).json({ error: '步骤缺少 skillId' });
        return;
      }
      const skill = await resolveSkill(step.skillId, req.user!._id);
      if (!skill) {
        res.status(400).json({ error: `未知技能: ${step.skillId}` });
        return;
      }
      normalized.push({
        skillId: step.skillId,
        title: step.title?.trim() || skill.name,
        icon: step.icon?.trim() || skill.icon,
      });
    }

    const workflowId = `uwf_${Date.now().toString(36)}`;
    const doc = asOne(
      await UserWorkflow.create({
        userId: req.user!._id,
        workflowId,
        name: name.trim(),
        desc: desc?.trim() || '自定义流程',
        steps: normalized,
        tags: ['自定义'],
      }),
    );

    res.status(201).json({ workflow: userWorkflowToConfig(doc) });
  } catch (e) {
    next(e);
  }
});

router.delete('/:workflowId', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const deleted = await UserWorkflow.findOneAndDelete({
      userId: req.user!._id,
      workflowId: req.params.workflowId,
    });
    if (!deleted) {
      res.status(404).json({ error: '自定义工作流不存在' });
      return;
    }
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

export default router;
