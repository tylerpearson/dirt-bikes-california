import type { Difficulty, Route } from "@/lib/types";
import type { MapRender } from "@/lib/tiles";
import type { TrackStats } from "@/lib/track-stats";
import { fullMapUrl } from "@/lib/routes";
import { AccessBadge } from "./AccessBadge";
import { StaticMap } from "./StaticMap";
import { ElevationProfile } from "./ElevationProfile";

const DIFFICULTY_COLOR: Record<Difficulty, string> = {
  Easy: "text-green-text",
  Moderate: "text-teal-text",
  Difficult: "text-trail-bright",
  Expert: "text-red-text",
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[0.65rem] font-semibold uppercase tracking-wider text-sand/70">
        {label}
      </dt>
      <dd className="text-sm text-bone">{value}</dd>
    </div>
  );
}

export function RouteCard({
  route,
  map,
  hasTrack,
  stats,
}: {
  route: Route;
  map: MapRender;
  hasTrack: boolean;
  stats: TrackStats | null;
}) {
  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-white/10 bg-bark-2 shadow-lg shadow-black/30 transition hover:border-trail/40">
      <StaticMap
        map={map}
        label={route.trailhead.name}
        href={fullMapUrl(route.trailhead)}
        approximate={hasTrack}
      />

      {stats && (
        <div className="border-b border-white/10 bg-bark/40 px-5 py-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold uppercase tracking-wider text-sand/70">
              GPX Track
            </span>
            <span className="flex items-center gap-4 text-sand/80">
              <span>
                <b className="text-bone">{stats.distanceMiles.toFixed(1)}</b> mi
              </span>
              {stats.hasElevation && (
                <>
                  <span>
                    ↑ <b className="text-bone">
                      {Math.round(stats.gainFt).toLocaleString()}
                    </b>{" "}
                    ft
                  </span>
                  <span>
                    ↓ <b className="text-bone">
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

      <div className="flex flex-1 flex-col gap-4 p-5">
        <header className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-display text-2xl font-bold leading-tight tracking-wide text-bone">
              {route.name}
            </h3>
            {route.forestRoad && (
              <span className="mt-1 shrink-0 rounded border border-white/15 px-1.5 py-0.5 font-mono text-xs text-sand/70">
                {route.forestRoad}
              </span>
            )}
          </div>
          <AccessBadge status={route.access.greenSticker} className="self-start" />
        </header>

        <div className="rounded-lg border border-white/10 bg-bark/40 p-3">
          <p className="text-xs leading-relaxed text-sand/80">
            {route.access.note}
          </p>
          <p className="mt-1.5 text-[0.65rem] uppercase tracking-wider text-sand/60">
            Source: {route.access.source}
          </p>
        </div>

        <p className="text-sm font-medium text-trail-bright">{route.summary}</p>

        <p className="text-sm leading-relaxed text-sand/80">
          {route.description}
        </p>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-white/10 pt-4">
          <Stat label="Distance" value={`${route.distanceMiles} mi`} />
          <div>
            <dt className="text-[0.65rem] font-semibold uppercase tracking-wider text-sand/70">
              Difficulty
            </dt>
            <dd
              className={`text-sm font-semibold ${DIFFICULTY_COLOR[route.difficulty]}`}
            >
              {route.difficulty}
            </dd>
          </div>
          {route.elevationFt && (
            <Stat label="Elevation" value={route.elevationFt} />
          )}
          <Stat label="Best season" value={route.bestSeason} />
          <div className="col-span-2">
            <Stat label="Surface" value={route.surface} />
          </div>
        </dl>

        {route.highlights.length > 0 && (
          <ul className="mt-auto space-y-1.5 border-t border-white/10 pt-4">
            {route.highlights.map((h) => (
              <li
                key={h}
                className="flex gap-2 text-sm text-sand/80 before:mt-1.5 before:h-1.5 before:w-1.5 before:shrink-0 before:rounded-full before:bg-pine"
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
