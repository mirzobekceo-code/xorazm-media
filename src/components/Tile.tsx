/**
 * Xiva koshinlaridan ilhomlangan naqsh (sakkiz qirrali yulduz va romb).
 * Rasmi yo'q profillar va bosh sahifa kollajida o'rinbosar sifatida ishlatiladi.
 */
const VARIANTS = [
  { bg: "#0e7c86", star: "#f5efe5", mid: "#1f3f8f", dot: "#e9d8bd" },
  { bg: "#1f3f8f", star: "#7fd0d6", mid: "#f5efe5", dot: "#0e7c86" },
  { bg: "#e9d8bd", star: "#0e7c86", mid: "#b4532c", dot: "#1f3f8f" },
  { bg: "#b4532c", star: "#f2d9bf", mid: "#0e7c86", dot: "#1f3f8f" },
  { bg: "#10201f", star: "#3cc2cb", mid: "#e9d8bd", dot: "#b4532c" },
  { bg: "#cfe9e8", star: "#1f3f8f", mid: "#0e7c86", dot: "#b4532c" },
];

/** 16 nuqtali yulduz (tashqi va ichki radius almashadi), 40×40 katak markazida. */
function star(cx: number, cy: number, ro: number, ri: number) {
  return Array.from({ length: 16 }, (_, i) => {
    const r = i % 2 ? ri : ro;
    const a = (Math.PI / 8) * i - Math.PI / 2;
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
  }).join(" ");
}
const STAR = star(20, 20, 15, 9.5);
const MID = star(20, 20, 7, 4.5);

export function tileVariant(seed: number) {
  return ((seed % VARIANTS.length) + VARIANTS.length) % VARIANTS.length;
}

export default function Tile({ seed, scale = 1, className }: { seed: number; scale?: number; className?: string }) {
  const v = VARIANTS[tileVariant(seed)];
  const id = `xt${tileVariant(seed)}s${Math.round(scale * 10)}`;
  return (
    <svg className={className} aria-hidden="true" width="100%" height="100%" preserveAspectRatio="xMidYMid slice"
      style={{ position: "absolute", inset: 0, display: "block" }}>
      <defs>
        <pattern id={id} width="40" height="40" patternUnits="userSpaceOnUse" patternTransform={`scale(${scale})`}>
          <rect width="40" height="40" fill={v.bg} />
          <polygon points={STAR} fill={v.star} />
          <polygon points={MID} fill={v.mid} />
          <circle cx="20" cy="20" r="1.8" fill={v.dot} />
          {/* burchaklardagi romblar qo'shni kataklarni tutashtiradi */}
          {[[0, 0], [40, 0], [0, 40], [40, 40]].map(([x, y]) => (
            <polygon key={`${x}${y}`} points={`${x},${y - 4} ${x + 4},${y} ${x},${y + 4} ${x - 4},${y}`} fill={v.mid} />
          ))}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}
