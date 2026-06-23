// 路线背景: 优先用户上传的真实图片，无则回落到 coverGradient(色彩) + SVG图案(风景剪影)
// 用法: import { getRouteCover } from '@/data/routeImages';
//       const cover = getRouteCover(route);
//       cover.hasImage && <img src={cover.imageUrl} /> 或 <div style={cover.gradientBackground} />
import { getPattern, DEFAULT_PATTERN } from './routePatterns';
import type { RouteCoverAuthor } from '@/types';

// ===== 路线 → 景观类型 =====
const LANDSCAPE_BY_ROUTE: Record<string, string> = {
  'wutongshan-dayhike': 'forest',
  'qiniangshan': 'coastal',
  'tanglangshan': 'forest-gentle',
  'yubeng-trek': 'snow-village',
  'tiger-leaping-gorge': 'canyon',
  'cangshan': 'cloudy-mountains',
  'siguniangshan': 'snow-peaks',
  'emeishan': 'mountain-temple',
  'gongga': 'giant-snow',
  'huihang-gudao': 'stone-path',
  'huangshan': 'pine-pinnacle',
  'wugongshan': 'meadow',
  'huashan': 'steep-cliff',
  'wuyishan': 'danxia',
  'kailash': 'sacred-peak',
  'jiankou-greatwall': 'great-wall',
  'lijiang-rivertrek': 'karst-river',
  'zhangjiajie': 'sandstone',
  'qianshan': 'autumn-forest',
  'yangshan-trail': 'volcanic',
  'qinghai-lake': 'plateau-lake',
  'kanas-trek': 'autumn-lake',
  'shangrila-pudacuo': 'plateau-lake',
  'jiuzhaigou': 'waterfall',
  'xihu-qunshan': 'forest-gentle',
  'lingshan': 'meadow',
  'longji-terraces': 'terrace',
  'lushan': 'cloudy-mountains',
  'everest-basecamp': 'giant-snow',
  'hengshan': 'mountain-temple',
  'taibaishan': 'snow-peaks',
  'wudangshan': 'mountain-temple',
  'songshan': 'mountain-temple',
  'taishan': 'sunrise-peak',
  'changbaishan': 'tianchi',
  'ming-sha-mountain': 'desert',
  // 简写兼容
  'emeishan-jinding': 'mountain-temple',
  'emeishan-cloud': 'cloudy-mountains',
  'emeishan-sunrise': 'mountain-temple',
  'emeishan-monkey': 'forest',
  'emeishan-winter': 'snow-peaks',
  'taishan-sunrise': 'sunrise-peak',
  'taishan-peak': 'sunrise-peak',
  'taishan-cloud': 'cloudy-mountains',
  'taishan-temple': 'mountain-temple',
  'taishan-emperor': 'sunrise-peak',
  'wuyishan-rafting': 'danxia',
  'wuyishan-danxia': 'danxia',
  'wuyishan-tianyou': 'danxia',
  'wuyishan-jiuqu': 'danxia',
  'wuyishan-tianmu': 'danxia',
  'lushan-jiujiang': 'cloudy-mountains',
  'lushan-waterfall': 'waterfall',
  'lushan-river': 'karst-river',
  'lushan-flower': 'meadow',
  'huangshan-cloud': 'cloudy-mountains',
  'huangshan-pine': 'pine-pinnacle',
  'huangshan-sunrise': 'pine-pinnacle',
  'changbaishan-tianchi': 'tianchi',
  'changbaishan-waterfall': 'waterfall',
  'changbaishan-winter': 'snow-peaks',
  'changbaishan-flower': 'meadow',
  'wudangshan-pagoda': 'mountain-temple',
  'wudangshan-temple': 'mountain-temple',
  'wudangshan-cloud': 'cloudy-mountains',
  'emeishan-cloudsea': 'cloudy-mountains',
};

// ===== tailwind coverGradient → CSS linear-gradient =====
const GRADIENT_TO_CSS: Record<string, string> = {
  'from-emerald-900 via-green-800 to-lime-500': 'linear-gradient(180deg,#064e3b 0%,#166534 55%,#84cc16 100%)',
  'from-blue-900 via-cyan-800 to-sky-400': 'linear-gradient(180deg,#1e3a8a 0%,#155e75 55%,#38bdf8 100%)',
  'from-green-800 via-teal-700 to-emerald-400': 'linear-gradient(180deg,#166534 0%,#0f766e 55%,#34d399 100%)',
  'from-indigo-900 via-purple-800 to-rose-500': 'linear-gradient(180deg,#312e81 0%,#6b21a8 55%,#f43f5e 100%)',
  'from-amber-900 via-orange-800 to-yellow-500': 'linear-gradient(180deg,#78350f 0%,#9a3412 55%,#eab308 100%)',
  'from-sky-800 via-blue-700 to-cyan-400': 'linear-gradient(180deg,#075985 0%,#1d4ed8 55%,#22d3ee 100%)',
  'from-slate-800 via-gray-700 to-zinc-400': 'linear-gradient(180deg,#1e293b 0%,#374151 55%,#a1a1aa 100%)',
  'from-rose-800 via-red-700 to-orange-400': 'linear-gradient(180deg,#9f1239 0%,#b91c1c 55%,#fb923c 100%)',
  'from-blue-900 via-indigo-800 to-sky-500': 'linear-gradient(180deg,#1e3a8a 0%,#3730a3 55%,#0ea5e9 100%)',
  'from-emerald-900 via-green-700 to-lime-400': 'linear-gradient(180deg,#064e3b 0%,#15803d 55%,#a3e635 100%)',
  'from-slate-800 via-stone-700 to-amber-500': 'linear-gradient(180deg,#1e293b 0%,#57534e 55%,#f59e0b 100%)',
  'from-green-800 via-teal-600 to-lime-300': 'linear-gradient(180deg,#166534 0%,#0d9488 55%,#bef264 100%)',
  'from-red-900 via-rose-800 to-orange-500': 'linear-gradient(180deg,#7f1d1d 0%,#9f1239 55%,#f97316 100%)',
  'from-teal-800 via-emerald-700 to-green-400': 'linear-gradient(180deg,#115e59 0%,#047857 55%,#4ade80 100%)',
  'from-violet-900 via-purple-800 to-fuchsia-500': 'linear-gradient(180deg,#4c1d95 0%,#6b21a8 55%,#d946ef 100%)',
  'from-amber-800 via-stone-700 to-orange-500': 'linear-gradient(180deg,#92400e 0%,#57534e 55%,#f97316 100%)',
  'from-emerald-800 via-teal-600 to-cyan-400': 'linear-gradient(180deg,#065f46 0%,#0d9488 55%,#22d3ee 100%)',
  'from-emerald-800 via-teal-600 to-amber-400': 'linear-gradient(180deg,#065f46 0%,#0d9488 55%,#fbbf24 100%)',
  'from-indigo-800 via-blue-700 to-cyan-500': 'linear-gradient(180deg,#3730a3 0%,#1d4ed8 55%,#06b6d4 100%)',
  'from-stone-700 via-gray-600 to-zinc-400': 'linear-gradient(180deg,#44403c 0%,#4b5563 55%,#a1a1aa 100%)',
  'from-cyan-800 via-sky-700 to-blue-400': 'linear-gradient(180deg,#155e75 0%,#0369a1 55%,#60a5fa 100%)',
  // routes-extra.ts
  'from-cyan-800 via-blue-600 to-teal-300': 'linear-gradient(180deg,#155e75 0%,#2563eb 55%,#5eead4 100%)',
  'from-emerald-700 via-green-600 to-lime-300': 'linear-gradient(180deg,#047857 0%,#16a34a 55%,#bef264 100%)',
  'from-slate-900 via-gray-800 to-zinc-600': 'linear-gradient(180deg,#0f172a 0%,#1f2937 55%,#52525b 100%)',
  'from-green-800 via-emerald-700 to-lime-400': 'linear-gradient(180deg,#166534 0%,#047857 55%,#a3e635 100%)',
  'from-indigo-900 via-blue-800 to-sky-500': 'linear-gradient(180deg,#312e81 0%,#1e40af 55%,#0ea5e9 100%)',
  'from-red-800 via-rose-700 to-amber-500': 'linear-gradient(180deg,#991b1b 0%,#be123c 55%,#f59e0b 100%)',
  'from-stone-700 via-gray-600 to-amber-500': 'linear-gradient(180deg,#44403c 0%,#4b5563 55%,#f59e0b 100%)',
  'from-stone-800 via-gray-700 to-amber-500': 'linear-gradient(180deg,#292524 0%,#374151 55%,#f59e0b 100%)',
  'from-amber-800 via-yellow-700 to-orange-400': 'linear-gradient(180deg,#92400e 0%,#a16207 55%,#fb923c 100%)',
};

const DEFAULT_GRADIENT = 'linear-gradient(180deg,#0f172a 0%,#334155 55%,#94a3b8 100%)';

// ===== 返回类型 =====
export interface RouteCoverResult {
  hasImage: boolean;
  imageUrl?: string;
  author?: RouteCoverAuthor;
  gradientBackground: React.CSSProperties;
}

// ===== 内部工具: 生成渐变+SVG背景 (兜底) =====
function buildGradientBackground(routeId: string, coverGradient?: string): React.CSSProperties {
  const landscapeId = LANDSCAPE_BY_ROUTE[routeId];
  const pattern = landscapeId ? getPattern(landscapeId) : DEFAULT_PATTERN;
  const gradient = (coverGradient && GRADIENT_TO_CSS[coverGradient]) || DEFAULT_GRADIENT;
  return {
    background: gradient,
    backgroundImage: `${gradient}, url("${pattern}")`,
    backgroundSize: 'auto, cover',
    backgroundPosition: 'center top, center bottom',
    backgroundRepeat: 'no-repeat, no-repeat',
  };
}

// ===== 公共 API: 方案D =====
// 有用户上传的 coverImage → 返回图片+作者，可显示水印
// 无 coverImage → 回落到渐变+SVG剪影背景
export function getRouteCover(params: {
  id: string;
  coverImage?: string;
  coverImageAuthor?: RouteCoverAuthor;
  coverGradient?: string;
}): RouteCoverResult {
  const gradientBackground = buildGradientBackground(params.id, params.coverGradient);
  if (params.coverImage) {
    return {
      hasImage: true,
      imageUrl: params.coverImage,
      author: params.coverImageAuthor,
      gradientBackground,
    };
  }
  return { hasImage: false, gradientBackground };
}

// 兼容原有调用: getRouteBackground(id, coverGradient) → 返回 CSSProperties
export function getRouteBackground(
  routeId: string,
  coverGradient?: string
): React.CSSProperties {
  return buildGradientBackground(routeId, coverGradient);
}

export default function routeCoverStyle(routeId: string, coverGradient?: string): React.CSSProperties {
  return buildGradientBackground(routeId, coverGradient);
}
