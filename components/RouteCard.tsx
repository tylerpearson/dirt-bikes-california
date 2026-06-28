import type { Difficulty, Route } from "@/lib/types";
import type { MapRender } from "@/lib/tiles";
import type { RouteSegment } from "@/lib/mvum";
import type { TrackStats } from "@/lib/track-stats";
import { fullMapUrl } from "@/lib/areas";
import { AccessBadge } from "./AccessBadge";
import { ExpandableMap } from "./ExpandableMap";
import { ElevationProfile } from "./ElevationProfile";

type LL = { lat: number; lng: number };

const DIFFICULTY_COLOR: Record<Difficulty, string> = {
  Easy: "text-diff-easy",
  Moderate: "text-diff-mod",
  Difficult: "text-diff-hard",
  Expert: "text-diff-exp",
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[0.65rem] font-semibold uppercase tracking-wider text-olive">
        {label}
      </dt>
      <dd className="text-sm text-ink">{value}</dd>
    </div>
  );
}

export function RouteCard({
  route,
  map,
  points,
  segments,
  stats,
  priority = false,
}: {
  route: Route;
  map: MapRender;
  points: LL[];
  segments: RouteSegment[];
  stats: TrackStats | null;
  priority?: boolean;
}) {
  return (
    <article
      id={route.id}
      className="flex scroll-mt-6 flex-col overflow-hidden rounded-sm border border-edge-strong/60 bg-paper-2 shadow-[0_1px_0_var(--color-edge),0_10px_24px_-18px_rgba(60,45,20,0.6)] lg:flex-row"
    >
      {/* Map side */}
      <div className="flex flex-col lg:w-[56%] lg:shrink-0 lg:border-r lg:border-edge">
        <div className="relative aspect-[3/2] lg:aspect-auto lg:flex-1">
          <ExpandableMap
            map={map}
            points={points}
            segments={segments}
            label={route.trailhead.name}
            routeName={route.name}
            gpxHref={`/gpx/${route.id}.gpx`}
            directionsHref={fullMapUrl(route.trailhead)}
            className="absolute inset-0"
            priority={priority}
          />
        </div>

        {stats && (
          <div className="border-t border-edge bg-manila/50 px-5 py-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold uppercase tracking-wider text-olive">
                GPX Track
              </span>
              <span className="flex items-center gap-4 text-bistre">
                {stats.hasElevation && (
                  <>
                    <span>
                      ↑ <b className="text-ink">
                        {Math.round(stats.gainFt).toLocaleString()}
                      </b>{" "}
                      ft
                    </span>
                    <span>
                      ↓ <b className="text-ink">
                        {Math.round(stats.lossFt).toLocaleString()}
                      </b>{" "}
                      ft
                    </span>
                  </>
                )}
              </span>
            </div>
            {stats.hasElevation && (
              <div className="mt-2">
                <ElevationProfile stats={stats} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Details side */}
      <div className="flex flex-1 flex-col gap-4 p-5">
        <header className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-display text-2xl font-bold leading-tight tracking-tight text-bistre">
              {route.name}
            </h3>
            {route.forestRoad && (
              <span className="mt-1 shrink-0 rounded-sm border border-edge-strong/70 bg-paper px-1.5 py-0.5 font-mono text-xs font-semibold text-rust-ink">
                No. {route.forestRoad}
              </span>
            )}
          </div>
          <AccessBadge status={route.access.greenSticker} className="self-start" />
        </header>

        {/* Headline spec line — the two numbers a rider scans first */}
        <dl className="flex items-stretch gap-5 border-y border-edge-strong/40 py-3">
          <div>
            <dt className="text-[0.65rem] font-semibold uppercase tracking-wider text-olive">
              Distance
            </dt>
            <dd className="flex items-baseline gap-1 leading-none">
              <span className="font-display text-4xl font-bold tracking-tight text-rust-ink">
                {(stats?.distanceMiles ?? route.distanceMiles).toFixed(1)}
              </span>
              <span className="text-sm font-semibold uppercase tracking-wider text-olive">
                mi
              </span>
            </dd>
          </div>
          <div className="w-px self-stretch bg-edge" aria-hidden />
          <div className="flex flex-col justify-center">
            <dt className="text-[0.65rem] font-semibold uppercase tracking-wider text-olive">
              Difficulty
            </dt>
            <dd
              className={`text-lg font-semibold leading-tight ${DIFFICULTY_COLOR[route.difficulty]}`}
            >
              {route.difficulty}
            </dd>
          </div>
        </dl>

        <div className="rounded-sm border border-edge bg-manila/40 p-3">
          <p className="text-xs leading-relaxed text-bistre">
            {route.access.note}
          </p>
          <p className="mt-1.5 text-[0.65rem] uppercase tracking-wider text-olive">
            Source: {route.access.source}
          </p>
        </div>

        <p className="text-sm font-semibold text-rust-ink">{route.summary}</p>

        <p className="text-pretty text-sm leading-relaxed text-ink/90">
          {route.description}
        </p>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-edge pt-4 sm:grid-cols-3">
          {route.elevationFt && (
            <Stat label="Elevation" value={route.elevationFt} />
          )}
          <Stat label="Best season" value={route.bestSeason} />
          <div className="col-span-2 sm:col-span-1">
            <Stat label="Surface" value={route.surface} />
          </div>
        </dl>

        {route.highlights.length > 0 && (
          <ul className="mt-auto space-y-1.5 border-t border-edge pt-4">
            {route.highlights.map((h) => (
              <li
                key={h}
                className="flex gap-2 text-sm text-ink/90 before:mt-1.5 before:h-1.5 before:w-1.5 before:shrink-0 before:rounded-full before:bg-sage"
              >
                <span>{h}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
