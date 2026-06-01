import type { Types } from 'mongoose';
import { WORKFLOWS, getWorkflow, type WorkflowConfig } from '../config/workflows.js';
import { UserWorkflow } from '../models/UserWorkflow.js';

export function userWorkflowToConfig(doc: {
  workflowId: string;
  name: string;
  desc: string;
  steps: { skillId?: string; action?: string; title: string; icon: string }[];
  tags?: string[];
}): WorkflowConfig {
  return {
    id: doc.workflowId,
    name: doc.name,
    desc: doc.desc,
    steps: doc.steps.map((s) => ({
      skillId: s.skillId,
      action: s.action as WorkflowConfig['steps'][0]['action'],
      title: s.title,
      icon: s.icon || '⚡',
    })),
    tags: doc.tags || ['自定义'],
  };
}

export async function resolveWorkflow(
  workflowId: string,
  userId?: Types.ObjectId,
): Promise<WorkflowConfig | undefined> {
  const builtin = getWorkflow(workflowId);
  if (builtin) return builtin;
  if (!userId) return undefined;
  const doc = await UserWorkflow.findOne({ userId, workflowId });
  return doc ? userWorkflowToConfig(doc) : undefined;
}

export async function listUserWorkflows(userId: Types.ObjectId): Promise<WorkflowConfig[]> {
  const docs = await UserWorkflow.find({ userId }).sort({ createdAt: -1 });
  return docs.map((d) => userWorkflowToConfig(d));
}

export function listBuiltinWorkflows(): WorkflowConfig[] {
  return WORKFLOWS;
}
