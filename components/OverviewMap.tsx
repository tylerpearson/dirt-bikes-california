"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "leaflet/dist/leaflet.css";

export type AreaPin = {
  id: string;
  name: string;
  regionShort: string;
  tagline: string;
  lat: number;
  lng: number;
  count: number;
  min: number;
  max: number;
  hasGreen: boolean;
};

const COLOR = {
  green: "#3f8f3a", // --color-ok-fill: green-sticker OHV allowed
  plate: "#3a6e92", // --color-plate-fill: street-legal plate only
} as const;

const pinColor = (hasGreen: boolean) => (hasGreen ? COLOR.green : COLOR.plate);
const miles = (a: AreaPin) => (a.min === a.max ? `${a.max}` : `${a.min}–${a.max}`);

/**
 * Statewide index map: each riding area is a pin placed at the centroid of its
 * trailheads, colored by whether any green-sticker riding exists there. The map
 * is the navigation — click a pin to open the area. Hovering a pin or an area
 * link cross-highlights the other and fills the detail panel. The area strip
 * below is the keyboard / no-hover path (a Leaflet map isn't keyboard-operable).
 * Leaflet loads lazily once the section nears the viewport.
 */
export function OverviewMap({ areas }: { areas: AreaPin[] }) {
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<Record<string, any>>({});
  const [inView, setInView] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [active, setActive] = useState<string | null>(null);

  // Defer Leaflet until the map nears the viewport.
  useEffect(() => {
    if (inView) return;
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: "400px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [inView]);

  useEffect(() => {
    if (!inView) return;
    let cancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let map: any;

    (async () => {
      try {
        setStatus("loading");
        const { default: L } = await import("leaflet");
        if (cancelled) return;
        const el = mapRef.current as (HTMLDivElement & { _leaflet_id?: number }) | null;
        if (!el || el._leaflet_id) return;

        map = L.map(el, { scrollWheelZoom: false });
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 16,
          attribution: "&copy; OpenStreetMap contributors · Forest Service travel maps",
        }).addTo(map);

        for (const a of areas) {
          const marker = L.circleMarker([a.lat, a.lng], {
            radius: 7,
            color: "#f6f0df",
            weight: 2,
            fillColor: pinColor(a.hasGreen),
            fillOpacity: 1,
          }).addTo(map);
          // Non-permanent: only the active pin shows its label (toggled in the
          // cross-highlight effect), so clustered areas don't collide at rest.
          marker.bindTooltip(a.name, {
            direction: "top",
            offset: [0, -6],
            className: "overview-pin-label",
          });
          marker.on("mouseover", () => setActive(a.id));
          marker.on("mouseout", () => setActive((cur) => (cur === a.id ? null : cur)));
          marker.on("click", () => router.push(`/${a.id}`));
          markersRef.current[a.id] = marker;
        }

        const bounds = L.latLngBounds(areas.map((a) => [a.lat, a.lng]));
        map.fitBounds(bounds, { padding: [48, 48] });
        L.control.scale({ imperial: true, metric: false }).addTo(map);

        if (!cancelled) setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      markersRef.current = {};
      if (map) map.remove();
    };
  }, [inView, areas, router]);

  // Cross-highlight: bump the active pin, reset the rest.
  useEffect(() => {
    for (const [id, marker] of Object.entries(markersRef.current)) {
      const on = id === active;
      marker.setStyle({ radius: on ? 11 : 7, weight: on ? 3 : 2 });
      if (on) {
        marker.bringToFront();
        marker.openTooltip();
      } else {
        marker.closeTooltip();
      }
    }
  }, [active, status]);

  const activeArea = areas.find((a) => a.id === active) ?? null;

  return (
    <div ref={wrapRef}>
      <div className="relative overflow-hidden rounded-sm border-2 border-bistre/70 shadow-[0_1px_0_var(--color-edge),0_14px_30px_-22px_rgba(60,45,20,0.7)]">
        <div
          ref={mapRef}
          className="area-map h-[58vh] max-h-[600px] min-h-[380px] w-full bg-manila"
          role="img"
          aria-label="Map of Southern California showing all riding areas in this guide as pins, colored by whether green-sticker off-highway motorcycles are allowed. A keyboard-accessible list of the same areas follows below."
        />

        {/* Legend — field-guide card pinned to the map */}
        <div className="pointer-events-none absolute bottom-3 left-3 z-[500] rounded-sm border border-edge-strong/70 bg-paper/95 px-3 py-2.5 text-xs shadow-[0_6px_18px_-12px_rgba(60,45,20,0.7)] backdrop-blur-[1px]">
          <p className="mb-1.5 font-semibold uppercase tracking-wider text-rust-ink">
            What can ride there
          </p>
          <ul className="space-y-1 text-bistre">
            <li className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLOR.green }} />
              Green-sticker OHV riding
            </li>
            <li className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLOR.plate }} />
              Street-legal plate only
            </li>
          </ul>
        </div>

        {status !== "ready" && (
          <div className="pointer-events-none absolute inset-0 z-[400] flex items-center justify-center bg-manila">
            <span className="text-sm font-semibold uppercase tracking-wider text-olive">
              {status === "error" ? "Map unavailable" : "Loading area map…"}
            </span>
          </div>
        )}
      </div>

      {/* Detail panel: fills as you hover a pin or focus an area below. Fixed
          height (sized for the two-line active state) so swapping content never
          shifts the layout below it; the tagline is clamped to one line. */}
      <div className="mt-4 flex h-[4.25rem] flex-col justify-center overflow-hidden border-y border-edge py-2.5 text-sm">
        {activeArea ? (
          <>
            <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-bistre">
              <span className="font-display text-base font-bold uppercase tracking-tight">
                {activeArea.name}
              </span>
              <span className="text-olive">
                {activeArea.count} routes · {miles(activeArea)} mi ·{" "}
                <span className={activeArea.hasGreen ? "text-ok-ink" : "text-plate-ink"}>
                  {activeArea.hasGreen ? "green-sticker" : "plated only"}
                </span>
              </span>
              <Link
                href={`/${activeArea.id}`}
                className="font-semibold text-rust-ink underline decoration-rust/40 underline-offset-2 hover:decoration-rust"
              >
                View routes ›
              </Link>
            </p>
            <p className="mt-0.5 truncate text-olive">{activeArea.tagline}</p>
          </>
        ) : (
          <p className="text-olive">
            Hover a pin, or pick an area below, for routes, distance, and access.
          </p>
        )}
      </div>

      {/* Accessible area strip: keyboard / no-hover path into each area. */}
      <ul className="mt-4 flex flex-wrap gap-2">
        {areas.map((a) => (
          <li key={a.id}>
            <Link
              href={`/${a.id}`}
              onMouseEnter={() => setActive(a.id)}
              onMouseLeave={() => setActive((cur) => (cur === a.id ? null : cur))}
              onFocus={() => setActive(a.id)}
              onBlur={() => setActive((cur) => (cur === a.id ? null : cur))}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${
                active === a.id
                  ? "border-bistre/70 bg-paper text-bistre"
                  : "border-edge bg-paper-2 text-olive hover:text-bistre"
              }`}
            >
              <span
                aria-hidden
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: pinColor(a.hasGreen) }}
              />
              {a.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
