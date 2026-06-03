import { Router } from 'express';
import { executeWorkflowStep } from '../services/workflowRunner.js';
import { Conversation } from '../models/Conversation.js';
import { enrichConversation } from './conversations.js';
import { requireAuth, optionalAuth, type AuthRequest } from '../middleware/auth.js';
import { listBuiltinWorkflows, listUserWorkflows, resolveWorkflow } from '../services/workflowResolve.js';

const router = Router();

router.get('/', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const builtins = listBuiltinWorkflows();
    const custom = req.user ? await listUserWorkflows(req.user._id) : [];
    res.json({ workflows: [...builtins, ...custom] });
  } catch (e) {
    next(e);
  }
});

router.post('/run', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { workflowId, conversationId, context } = req.body as {
      workflowId?: string;
      conversationId?: string;
      context?: string;
    };

    if (!workflowId || !conversationId) {
      res.status(400).json({ error: '需要 workflowId 和 conversationId' });
      return;
    }

    const wf = await resolveWorkflow(workflowId, req.user!._id);
    if (!wf) {
      res.status(404).json({ error: '工作流不存在' });
      return;
    }

    const conv = await Conversation.findOne({
      _id: conversationId,
      userId: req.user!._id,
    });
    if (!conv) {
      res.status(404).json({ error: '对话不存在' });
      return;
    }

    let ctx =
      context?.trim() ||
      [...conv.messages].reverse().find((m) => m.role === 'user')?.content ||
      conv.messages[conv.messages.length - 1]?.content ||
      '';

    const messages: import('../services/skillRunner.js').SkillRunResult[] = [];
    const completedSteps: string[] = [];

    try {
      for (const step of wf.steps) {
        const msg = await executeWorkflowStep(conversationId, step, ctx, req.user!);
        messages.push(msg);
        completedSteps.push(step.skillId || step.action || 'step');
        ctx = msg.content;
      }
    } catch (stepErr) {
      const updated = await Conversation.findById(conversationId);
      const conversation = updated ? await enrichConversation(updated) : null;
      const errMsg = stepErr instanceof Error ? stepErr.message : '工作流执行失败';
      res.json({
        error: errMsg,
        partial: true,
        completedSteps,
        conversation,
        messages,
      });
      return;
    }

    const updated = await Conversation.findById(conversationId);
    const conversation = updated ? await enrichConversation(updated) : null;

    res.json({ conversation, messages });
  } catch (e) {
    next(e);
  }
});

export default router;
