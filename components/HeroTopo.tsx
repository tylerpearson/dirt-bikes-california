/**
 * Light field-guide map-sheet backdrop: faint topographic contour rings around
 * a peak with a dashed trail to a summit marker, drawn in brown ink on paper.
 * Pure SVG, decorative (aria-hidden).
 */

const CX = 860;
const CY = 250;

function contourPath(cx: number, cy: number, r: number, seed: number): string {
  const N = 44;
  let d = "";
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2;
    const wob =
      1 + 0.13 * Math.sin(a * 3 + seed) + 0.07 * Math.sin(a * 5 + seed * 1.7);
    const x = cx + r * 1.45 * wob * Math.cos(a);
    const y = cy + r * wob * Math.sin(a);
    d += `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)} `;
  }
  return `${d}Z`;
}

const RINGS = [40, 80, 124, 174, 230, 292, 360, 434];

const TRAIL =
  "M60,560 C220,520 250,430 360,420 C470,410 470,330 560,322 C660,314 705,300 778,268";

export function HeroTopo() {
  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 1200 600"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      {/* contour rings — fainter outer, stronger inner */}
      <g fill="none" stroke="var(--color-bistre)">
        {RINGS.map((r, i) => (
          <path
            key={r}
            d={contourPath(CX, CY, r, i * 1.3)}
            strokeWidth={1.1}
            opacity={0.05 + (RINGS.length - i) * 0.018}
          />
        ))}
      </g>

      {/* dashed trail + summit */}
      <path
        d={TRAIL}
        fill="none"
        stroke="var(--color-rust)"
        strokeWidth={2.25}
        strokeLinecap="round"
        strokeDasharray="2 8"
        opacity={0.65}
      />
      <path
        d={`M${CX - 11},${CY + 7} L${CX},${CY - 13} L${CX + 11},${CY + 7} Z`}
        fill="var(--color-rust)"
        opacity={0.7}
      />
      <circle cx={60} cy={560} r={4} fill="var(--color-sage-ink)" opacity={0.8} />

      {/* right-to-left paper fade so title text stays clean on the left */}
      <defs>
        <linearGradient id="hero-clean" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--color-paper)" stopOpacity="0.85" />
          <stop offset="55%" stopColor="var(--color-paper)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--color-paper)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="1200" height="600" fill="url(#hero-clean)" />
    </svg>
  );
}
