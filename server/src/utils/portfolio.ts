import type { IPortfolioItem, IUser } from '../models/User.js';

export function toPortfolioJson(item: IPortfolioItem) {
  return {
    id: item._id ? String(item._id) : '',
    title: item.title,
    role: item.role,
    desc: item.desc,
    collaborators: item.collaborators,
    visibility: item.visibility,
    color: item.color,
    imageUrl: item.imageUrl,
    createdAt: item.createdAt,
  };
}

export function publicPortfolio(user: IUser) {
  return (user.portfolio || [])
    .filter((p) => p.visibility === 'public')
    .map(toPortfolioJson);
}
