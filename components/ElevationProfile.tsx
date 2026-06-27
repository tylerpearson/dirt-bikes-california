import type { TrackStats } from "@/lib/track-stats";

const W = 600;
const H = 120;
const TOP_PAD = 10;
const BOTTOM_PAD = 6;

export function ElevationProfile({ stats }: { stats: TrackStats }) {
  if (!stats.hasElevation || stats.profile.length < 2) return null;

  const maxDist = stats.profile[stats.profile.length - 1].distMi || 1;
  const range = stats.maxFt - stats.minFt || 1;
  const usableH = H - TOP_PAD - BOTTOM_PAD;

  const toXY = (distMi: number, eleFt: number): [number, number] => [
    (distMi / maxDist) * W,
    TOP_PAD + (1 - (eleFt - stats.minFt) / range) * usableH,
  ];

  const line = stats.profile
    .map((p, i) => {
      const [x, y] = toXY(p.distMi, p.eleFt);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const area = `${line} L${W},${H} L0,${H} Z`;

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="block h-16 w-full"
        role="img"
        aria-label={`Elevation profile: ${Math.round(stats.minFt)} to ${Math.round(
          stats.maxFt,
        )} feet over ${stats.distanceMiles.toFixed(1)} miles`}
      >
        <defs>
          <linearGradient id="ele-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-rust)" stopOpacity="0.32" />
            <stop offset="100%" stopColor="var(--color-rust)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#ele-fill)" />
        <path
          d={line}
          fill="none"
          stroke="var(--color-rust)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="mt-1 flex justify-between text-[0.6rem] font-medium uppercase tracking-wider text-olive">
        <span>{Math.round(stats.minFt).toLocaleString()} ft</span>
        <span>{Math.round(stats.maxFt).toLocaleString()} ft</span>
      </div>
    </div>
  );
}
