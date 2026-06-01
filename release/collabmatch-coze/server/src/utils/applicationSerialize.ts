import type { IApplication } from '../models/Application.js';
import type { IUser } from '../models/User.js';
import type { IRequirement } from '../models/Requirement.js';
import { toUserJson } from './serialize.js';
import { toRequirementJson } from './serialize.js';

export function toApplicationJson(
  app: IApplication,
  applicant?: IUser | null,
  requirement?: IRequirement | null,
) {
  return {
    id: String(app._id),
    requirementId: String(app.requirementId),
    applicantId: String(app.applicantId),
    message: app.message,
    status: app.status,
    createdAt: app.createdAt,
    applicant: applicant ? toUserJson(applicant) : { id: String(app.applicantId) },
    requirement: requirement ? toRequirementJson(requirement) : undefined,
  };
}
