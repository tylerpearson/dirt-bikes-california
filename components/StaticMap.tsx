import type { MapRender } from "@/lib/tiles";

export function StaticMap({
  map,
  label,
  href,
  approximate = false,
}: {
  map: MapRender;
  label: string;
  href: string;
  approximate?: boolean;
}) {
  const pathPoints = map.path?.map((p) => `${p.left},${p.top}`).join(" ");

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="group relative block overflow-hidden border-b border-white/10 bg-bark-2"
      aria-label={`Open ${label} in Google Maps`}
    >
      {/* Responsive SVG: viewBox fixes the 600×320 coordinate space while the
          map scales to the full card width. Tiles, the GPX line, and markers
          all live in the same coordinate space, so nothing gets clipped. */}
      <svg
        viewBox={`0 0 ${map.width} ${map.height}`}
        className="block h-auto w-full transition duration-300 group-hover:scale-[1.03]"
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
            {/* white casing under the route line for contrast */}
            <polyline
              points={pathPoints}
              fill="none"
              stroke="#ffffff"
              strokeWidth={7}
              strokeLinejoin="round"
              strokeLinecap="round"
              opacity={0.85}
            />
            <polyline
              points={pathPoints}
              fill="none"
              stroke="var(--color-trail-bright)"
              strokeWidth={4}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </>
        )}

        {map.start && (
          <circle
            cx={map.start.left}
            cy={map.start.top}
            r={6}
            fill="var(--color-sticker-green)"
            stroke="#fff"
            strokeWidth={2}
          />
        )}
        {map.end && (
          <circle
            cx={map.end.left}
            cy={map.end.top}
            r={6}
            fill="var(--color-sticker-red)"
            stroke="#fff"
            strokeWidth={2}
          />
        )}

        {map.pin && (
          <circle
            cx={map.pin.left}
            cy={map.pin.top}
            r={7}
            fill="var(--color-trail)"
            stroke="#fff"
            strokeWidth={3}
          />
        )}
      </svg>

      {approximate && (
        <span className="pointer-events-none absolute right-2 top-2 z-10 rounded bg-bark/80 px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wider text-sand/80">
          © OpenStreetMap
        </span>
      )}

      <span className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-center justify-between bg-gradient-to-t from-bark/90 to-transparent px-3 pb-2 pt-10 text-xs font-semibold uppercase tracking-wide text-bone">
        <span className="truncate">{label}</span>
        <span className="ml-2 shrink-0 text-trail-bright">Open map →</span>
      </span>
    </a>
  );
}
