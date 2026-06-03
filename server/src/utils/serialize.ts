import type { Types } from 'mongoose';
import type { IUser } from '../models/User.js';
import type { IRequirement } from '../models/Requirement.js';
import { toExternalJson } from './xcdIntegration.js';
import type { IConversation } from '../models/Conversation.js';
import type { IGroup } from '../models/Group.js';
import { toPortfolioJson, publicPortfolio } from './portfolio.js';

export function formatRelativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}天前`;
  return date.toLocaleDateString('zh-CN');
}

const ONLINE_MS = 5 * 60 * 1000;

export function isUserOnline(user: IUser | { lastSeenAt?: Date }): boolean {
  if (!user.lastSeenAt) return false;
  return Date.now() - new Date(user.lastSeenAt).getTime() < ONLINE_MS;
}

export function formatChatTime(date: Date): string {
  const d = new Date(date);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function toUserJson(
  user: IUser | Record<string, unknown>,
  opts?: { includePrivatePortfolio?: boolean; includePhone?: boolean },
) {
  const u = user as IUser;
  const portfolio = opts?.includePrivatePortfolio
    ? (u.portfolio || []).map(toPortfolioJson)
    : publicPortfolio(u);
  const json: Record<string, unknown> = {
    id: String(u._id),
    name: u.name,
    avatar: u.avatar,
    avatarColor: u.avatarColor,
    position: u.position,
    bio: u.bio,
    skills: u.skills,
    skillIds: u.skillIds ?? [],
    domain: u.domain,
    collabScore: u.collabScore,
    projects: u.projects,
    resources: u.resources,
    portfolio,
    portfolioCount: (u.portfolio || []).filter((p) => p.visibility === 'public').length,
    weeklyHours: u.weeklyHours ?? '',
    collabIntent: u.collabIntent ?? '',
    interestedStages: u.interestedStages ?? [],
    online: isUserOnline(u),
    lastSeenAt: u.lastSeenAt,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
  return json;
}

export function toRequirementJson(
  req: IRequirement & { author?: IUser | Types.ObjectId },
  authorDoc?: IUser | null,
) {
  const author =
    authorDoc ||
    (req.author && typeof req.author === 'object' && 'name' in req.author
      ? (req.author as IUser)
      : null);
  return {
    id: String(req._id),
    title: req.title,
    author: author ? toUserJson(author) : { id: String(req.author) },
    time: formatRelativeTime(req.createdAt),
    status: req.status,
    visibility: req.visibility,
    domain: req.domain,
    skills: req.skills,
    keywords: req.keywords,
    background: req.background,
    goal: req.goal,
    timeline: req.timeline,
    outcome: req.outcome,
    desc: req.desc,
    matchProgress: req.matchProgress,
    fulfillmentType: req.fulfillmentType ?? 'project',
    sceneTag: req.sceneTag ?? 'side-project',
    projectStage: req.projectStage ?? 'idea',
    weeklyHours: req.weeklyHours ?? '5-10h',
    collabMode: req.collabMode ?? '联创',
    lookingFor: req.lookingFor ?? [],
    remoteOk: req.remoteOk ?? true,
    external: toExternalJson(req),
    createdAt: req.createdAt,
    updatedAt: req.updatedAt,
  };
}

export async function populateReqAuthor(
  reqs: IRequirement[],
): Promise<ReturnType<typeof toRequirementJson>[]> {
  const { User } = await import('../models/User.js');
  const authorIds = [...new Set(reqs.map((r) => String(r.author)))];
  const authors = await User.find({ _id: { $in: authorIds } });
  const map = new Map(authors.map((a) => [String(a._id), a]));
  return reqs.map((r) => toRequirementJson(r, (map.get(String(r.author)) as import('../models/User.js').IUser | undefined) ?? null));
}

export function toConversationJson(conv: IConversation, reqCards?: Map<string, unknown>) {
  return {
    id: String(conv._id),
    title: conv.title,
    domain: conv.domain,
    createdAt: conv.createdAt.getTime(),
    messages: conv.messages.map((m) => ({
      role: m.role,
      content: m.content,
      time: formatChatTime(m.time),
      reqCard: m.reqCard
        ? reqCards?.get(String(m.reqCard)) ?? { id: String(m.reqCard) }
        : undefined,
      protoCard: m.protoCard,
      attachments: (m.attachments || []).map((a) => ({
        fileId: a.fileId,
        fileName: a.fileName,
        mimeType: a.mimeType,
        url: `/api/files/${a.fileId}`,
      })),
    })),
  };
}

function messageFileUrl(content: string, type: string): string | undefined {
  if (type === 'file' && content.startsWith('/api/files/')) return content;
  return undefined;
}

export function toGroupJson(group: IGroup, memberDocs: IUser[]) {
  const members = memberDocs;
  return {
    id: String(group._id),
    name: group.name,
    emoji: group.emoji,
    avatarColor: group.avatarColor,
    desc: group.desc,
    reqId: String(group.reqId),
    members: members.map((m) => {
      const base = m && m.name ? toUserJson(m) : { id: String(m) };
      return { ...base, online: m && m.name ? isUserOnline(m) : false };
    }),
    messages: group.messages.map((m) => {
      const userDoc = members.find((u) => String(u._id) === String(m.user));
      const fileUrl = messageFileUrl(m.content, m.type);
      return {
        id: String((m as { _id?: Types.ObjectId })._id ?? ''),
        user: userDoc ? toUserJson(userDoc) : { id: String(m.user) },
        type: m.type,
        content: fileUrl ? m.fileName || m.content : m.content,
        fileName: m.fileName,
        fileSize: m.fileSize,
        fileUrl,
        time: formatChatTime(m.time),
      };
    }),
  };
}
