import type { MapRender } from "@/lib/tiles";

/**
 * Presentational static-map thumbnail (no link of its own, so it can be wrapped
 * in a button). Composes OSM tiles with the GPX line drawn on top; .map-vintage
 * gives the tiles an aged-topo / sepia treatment.
 */
export function StaticMap({
  map,
  label,
  approximate = false,
  showTiles = true,
}: {
  map: MapRender;
  label: string;
  approximate?: boolean;
  /** Gate the OSM tile <image>s for lazy-loading below-fold maps. */
  showTiles?: boolean;
}) {
  const pathPoints = map.path?.map((p) => `${p.left},${p.top}`).join(" ");
  const segments = map.segments ?? [];
  const SEG_COLOR = {
    green: "var(--color-ok-fill)",
    plate: "var(--color-plate-fill)",
    track: "var(--color-rust)", // neutral: a multi-part route, no access split
  } as const;
  // Show a legend only when access is mixed along the route (the "partial" case).
  const hasGreen = segments.some((s) => s.access === "green");
  const hasPlate = segments.some((s) => s.access === "plate");
  const showAccessLegend = hasGreen && hasPlate;

  return (
    <span className="relative block h-full w-full overflow-hidden border-b border-edge bg-manila">
      <svg
        viewBox={`0 0 ${map.width} ${map.height}`}
        preserveAspectRatio="xMidYMid meet"
        className="map-vintage block h-full w-full transition duration-300 group-hover:scale-[1.03]"
        role="img"
        aria-label={`Map of ${label}`}
      >
        {showTiles &&
          map.tiles.map((t) => (
            <image
              key={`${t.left},${t.top}`}
              href={t.src}
              x={t.left}
              y={t.top}
              width={256}
              height={256}
            />
          ))}

        {/* MVUM segments colored by access (green-sticker vs plate-only). When
            present these replace the single GPX line so "partial" roads show
            exactly where green-sticker is and isn't allowed. */}
        {segments.length > 0
          ? segments.map((seg, i) => {
              const pts = seg.points.map((p) => `${p.left},${p.top}`).join(" ");
              return (
                <g key={i}>
                  <polyline
                    points={pts}
                    fill="none"
                    stroke="var(--color-paper-2)"
                    strokeWidth={7}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    opacity={0.9}
                  />
                  <polyline
                    points={pts}
                    fill="none"
                    stroke={SEG_COLOR[seg.access]}
                    strokeWidth={3.5}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                </g>
              );
            })
          : pathPoints && (
              <>
                <polyline
                  points={pathPoints}
                  fill="none"
                  stroke="var(--color-paper-2)"
                  strokeWidth={7}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  opacity={0.9}
                />
                <polyline
                  points={pathPoints}
                  fill="none"
                  stroke="var(--color-rust)"
                  strokeWidth={3.5}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </>
            )}

        {map.start && (
          <circle cx={map.start.left} cy={map.start.top} r={6} fill="var(--color-ok-fill)" stroke="var(--color-paper-2)" strokeWidth={2} />
        )}
        {map.end && (
          <circle cx={map.end.left} cy={map.end.top} r={6} fill="var(--color-diff-exp)" stroke="var(--color-paper-2)" strokeWidth={2} />
        )}
        {map.pin && (
          <circle cx={map.pin.left} cy={map.pin.top} r={7} fill="var(--color-rust)" stroke="var(--color-paper-2)" strokeWidth={3} />
        )}
      </svg>

      {approximate && (
        <span className="pointer-events-none absolute right-2 top-2 z-10 rounded border border-edge bg-paper/85 px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wider text-olive">
          © OpenStreetMap
        </span>
      )}

      {showAccessLegend && (
        <span className="pointer-events-none absolute left-2 top-2 z-10 flex flex-col gap-1 rounded border border-edge bg-paper/85 px-1.5 py-1 text-[0.6rem] font-semibold uppercase tracking-wider text-bistre">
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-3 rounded-full bg-ok-fill" aria-hidden />
            Green-sticker
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-3 rounded-full bg-plate-fill" aria-hidden />
            Plate only
          </span>
        </span>
      )}

      <span className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-center justify-between bg-gradient-to-t from-ink/85 to-transparent px-3 pb-2 pt-10 text-xs font-semibold uppercase tracking-wide text-paper">
        <span className="truncate">{label}</span>
        <span className="ml-2 shrink-0">⤢ Expand map</span>
      </span>
    </span>
  );
}
