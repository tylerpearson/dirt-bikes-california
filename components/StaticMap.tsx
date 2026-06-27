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
}: {
  map: MapRender;
  label: string;
  approximate?: boolean;
}) {
  const pathPoints = map.path?.map((p) => `${p.left},${p.top}`).join(" ");

  return (
    <span className="relative block h-full w-full overflow-hidden border-b border-edge bg-manila">
      <svg
        viewBox={`0 0 ${map.width} ${map.height}`}
        preserveAspectRatio="xMidYMid meet"
        className="map-vintage block h-full w-full transition duration-300 group-hover:scale-[1.03]"
        role="img"
        aria-label={`Map of ${label}`}
      >
        {map.tiles.map((t) => (
          <image
            key={`${t.left},${t.top}`}
            href={t.src}
            x={t.left}
            y={t.top}
            width={256}
            height={256}
          />
        ))}

        {pathPoints && (
          <>
            <polyline
              points={pathPoints}
              fill="none"
              stroke="#f6efdd"
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
          <circle cx={map.start.left} cy={map.start.top} r={6} fill="var(--color-ok-fill)" stroke="#f6efdd" strokeWidth={2} />
        )}
        {map.end && (
          <circle cx={map.end.left} cy={map.end.top} r={6} fill="var(--color-diff-exp)" stroke="#f6efdd" strokeWidth={2} />
        )}
        {map.pin && (
          <circle cx={map.pin.left} cy={map.pin.top} r={7} fill="var(--color-rust)" stroke="#f6efdd" strokeWidth={3} />
        )}
      </svg>

      {approximate && (
        <span className="pointer-events-none absolute right-2 top-2 z-10 rounded border border-edge bg-paper/85 px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wider text-olive">
          © OpenStreetMap
        </span>
      )}

      <span className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-center justify-between bg-gradient-to-t from-ink/85 to-transparent px-3 pb-2 pt-10 text-xs font-semibold uppercase tracking-wide text-paper">
        <span className="truncate">{label}</span>
        <span className="ml-2 shrink-0">⤢ Expand map</span>
      </span>
    </span>
  );
}
