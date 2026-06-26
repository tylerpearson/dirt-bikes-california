/**
 * Generated topographic hero scene: irregular contour rings around a peak with
 * a dashed trail threading up to a summit marker. Pure SVG (no external image,
 * no broken-image risk), themed from the palette, decorative (aria-hidden).
 */

const CX = 840;
const CY = 250;

function contourPath(cx: number, cy: number, r: number, seed: number): string {
  const N = 40;
  let d = "";
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2;
    const wob =
      1 + 0.13 * Math.sin(a * 3 + seed) + 0.07 * Math.sin(a * 5 + seed * 1.7);
    const x = cx + r * 1.4 * wob * Math.cos(a);
    const y = cy + r * wob * Math.sin(a);
    d += `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)} `;
  }
  return `${d}Z`;
}

const RINGS = [38, 74, 116, 164, 218, 278, 344];

// Hand-placed trail winding from lower-left up toward the summit.
const TRAIL =
  "M70,560 C220,520 250,430 360,420 C470,410 470,330 560,322 C650,314 690,300 760,272";

export function HeroTopo() {
  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 1200 600"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <defs>
        <radialGradient id="hero-glow" cx="68%" cy="42%" r="60%">
          <stop offset="0%" stopColor="var(--color-trail-bright)" stopOpacity="0.22" />
          <stop offset="55%" stopColor="var(--color-trail)" stopOpacity="0.05" />
          <stop offset="100%" stopColor="var(--color-bark)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="hero-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-bark)" stopOpacity="0" />
          <stop offset="100%" stopColor="var(--color-bark)" stopOpacity="0.85" />
        </linearGradient>
      </defs>

      <rect width="1200" height="600" fill="url(#hero-glow)" />

      {/* contour rings, faint outer → stronger inner */}
      <g fill="none">
        {RINGS.map((r, i) => (
          <path
            key={r}
            d={contourPath(CX, CY, r, i * 1.3)}
            stroke="var(--color-pine)"
            strokeWidth={1.25}
            opacity={0.1 + (RINGS.length - i) * 0.045}
          />
        ))}
      </g>

      {/* trail: white casing + orange dashed line */}
      <path d={TRAIL} fill="none" stroke="var(--color-bone)" strokeWidth={5} opacity={0.12} />
      <path
        d={TRAIL}
        fill="none"
        stroke="var(--color-trail-bright)"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeDasharray="2 9"
        opacity={0.75}
      />

      {/* summit marker */}
      <g>
        <path
          d={`M${CX - 11},${CY + 7} L${CX},${CY - 13} L${CX + 11},${CY + 7} Z`}
          fill="var(--color-trail-bright)"
        />
        <circle cx={70} cy={560} r={4} fill="var(--color-sticker-green)" />
      </g>

      {/* bottom fade so body text stays legible */}
      <rect width="1200" height="600" fill="url(#hero-fade)" />
    </svg>
  );
}
