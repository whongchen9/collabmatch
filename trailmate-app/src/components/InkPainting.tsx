// 水墨山水画 SVG — 用作路线卡片和 Hero 背景
// 使用标准 SVG，通过 style/className 控制透明度融入卡片

const InkPainting = ({ className, opacity = 1, style }: { className?: string; opacity?: number; style?: React.CSSProperties }) => (
  <svg
    viewBox="0 0 400 200"
    preserveAspectRatio="xMidYMid slice"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ opacity, ...style }}
  >
    {/* 天空 / 留白 top half */}
    <defs>
      {/* 水墨渐变 — 远山淡墨 */}
      <linearGradient id="far-mountain" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#d4d4d8" stopOpacity="0.4" />
        <stop offset="100%" stopColor="#a1a1aa" stopOpacity="0.15" />
      </linearGradient>
      {/* 中景山 */}
      <linearGradient id="mid-mountain" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#a1a1aa" stopOpacity="0.5" />
        <stop offset="100%" stopColor="#71717a" stopOpacity="0.25" />
      </linearGradient>
      {/* 近山 */}
      <linearGradient id="near-mountain" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#71717a" stopOpacity="0.6" />
        <stop offset="100%" stopColor="#3f3f46" stopOpacity="0.35" />
      </linearGradient>
      {/* 雾 */}
      <filter id="mist-blur">
        <feGaussianBlur stdDeviation="6" />
      </filter>
      <filter id="cloud-blur">
        <feGaussianBlur stdDeviation="3" />
      </filter>
    </defs>

    {/* ── 远山（最淡） ── */}
    <path d="M0,100 Q40,40 80,70 Q100,50 130,35 Q160,55 190,30 Q220,50 250,25 Q280,45 310,20 Q340,40 370,25 Q390,35 400,30 L400,140 Q350,120 300,130 Q250,115 200,125 Q150,110 100,120 Q50,105 0,115 Z"
      fill="url(#far-mountain)" />

    {/* ── 远山云雾 ── */}
    <ellipse cx="200" cy="80" rx="180" ry="18" fill="#d4d4d8" opacity="0.12" filter="url(#mist-blur)" />
    <ellipse cx="120" cy="70" rx="100" ry="12" fill="#d4d4d8" opacity="0.08" filter="url(#mist-blur)" />

    {/* ── 中景山 ── */}
    <path d="M0,120 Q60,70 110,90 Q140,65 180,80 Q210,55 250,75 Q280,60 310,70 Q330,55 360,65 Q380,60 400,55 L400,160 Q350,145 300,150 Q250,140 200,148 Q150,135 100,142 Q50,130 0,140 Z"
      fill="url(#mid-mountain)" />

    {/* ── 中景云雾 ── */}
    <ellipse cx="300" cy="100" rx="90" ry="14" fill="#d4d4d8" opacity="0.10" filter="url(#mist-blur)" />
    <ellipse cx="80" cy="105" rx="70" ry="10" fill="#d4d4d8" opacity="0.10" filter="url(#mist-blur)" />

    {/* ── 近山（左边） ── */}
    <path d="M-10,200 Q10,120 30,130 Q50,100 70,110 Q90,85 110,95 Q130,70 150,80 Q170,60 180,75 Q195,55 210,70 L220,200 Z"
      fill="url(#near-mountain)" />

    {/* ── 近山（右边） ── */}
    <path d="M410,200 Q390,130 370,140 Q350,110 330,120 Q310,95 290,105 Q270,80 250,90 Q230,70 210,85 Q195,65 180,80 L180,200 Z"
      fill="url(#near-mountain)" />

    {/* ── 松树（右上近山） ── */}
    <g stroke="#52525b" strokeWidth="0.8" opacity="0.7">
      {/* 树干 */}
      <line x1="320" y1="130" x2="318" y2="95" />
      {/* 树枝 */}
      <path d="M318,110 Q310,100 305,105" fill="none" />
      <path d="M318,105 Q325,95 328,100" fill="none" />
      <path d="M318,100 Q312,90 308,92" fill="none" />
      {/* 松针团 */}
      <ellipse cx="305" cy="104" rx="8" ry="5" fill="#71717a" opacity="0.5" />
      <ellipse cx="328" cy="99" rx="7" ry="4" fill="#71717a" opacity="0.5" />
      <ellipse cx="310" cy="91" rx="6" ry="4" fill="#71717a" opacity="0.4" />
      <ellipse cx="318" cy="92" rx="7" ry="5" fill="#52525b" opacity="0.4" />
    </g>

    {/* ── 水面 ── */}
    <rect x="0" y="170" width="400" height="30" fill="#d4d4d8" opacity="0.08" />
    {/* 水波纹 */}
    <g stroke="#a1a1aa" strokeWidth="0.5" opacity="0.3">
      <path d="M50,178 Q100,174 150,178 Q200,182 250,178 Q300,174 350,178" fill="none" />
      <path d="M30,185 Q80,181 130,185 Q180,189 230,185 Q280,181 330,185 Q370,189 400,185" fill="none" />
      <path d="M60,192 Q110,188 160,192 Q210,196 260,192 Q310,188 360,192" fill="none" />
    </g>

    {/* ── 小路 ── */}
    <g stroke="#52525b" strokeWidth="0.6" opacity="0.5" fill="none" strokeDasharray="2,3">
      <path d="M180,96 Q190,104 195,112 Q200,120 198,130 Q195,140 200,150 Q205,155 210,158 Q218,162 225,167 Q232,172 235,180" />
    </g>

    {/* ── 行者（简约小人） ── */}
    <g transform="translate(210, 130) scale(0.7)" opacity="0.6">
      {/* 头 */}
      <circle cx="0" cy="-8" r="3" fill="#3f3f46" />
      {/* 身体 */}
      <line x1="0" y1="-5" x2="0" y2="5" stroke="#3f3f46" strokeWidth="2" strokeLinecap="round" />
      {/* 腿 */}
      <line x1="0" y1="5" x2="-4" y2="12" stroke="#3f3f46" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="0" y1="5" x2="4" y2="12" stroke="#3f3f46" strokeWidth="1.5" strokeLinecap="round" />
      {/* 手杖 */}
      <line x1="-4" y1="-3" x2="-8" y2="12" stroke="#3f3f46" strokeWidth="1.2" strokeLinecap="round" />
      {/* 斗笠 */}
      <path d="M-5,-9 Q0,-14 5,-9" stroke="#3f3f46" strokeWidth="1" fill="none" />
    </g>
  </svg>
);

export default InkPainting;
