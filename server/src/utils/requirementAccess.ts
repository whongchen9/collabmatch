import type { Types } from 'mongoose';
import { Application } from '../models/Application.js';
import type { IRequirement } from '../models/Requirement.js';

export async function canViewRequirement(
  req: IRequirement,
  userId?: Types.ObjectId,
): Promise<boolean> {
  if (req.status === 'open' && req.visibility === 'public') return true;
  if (!userId) return false;
  if (String(req.author) === String(userId)) return true;

  const isInvitee = (req.invitees || []).some((id) => String(id) === String(userId));
  if (isInvitee) return true;

  const app = await Application.findOne({ requirementId: req._id, applicantId: userId });
  if (app?.status === 'accepted') return true;

  if (req.visibility === 'invite_only' && app) return true;

  if (req.visibility === 'match_only' && app) return true;

  return false;
}
