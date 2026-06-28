"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type { RouteSegment } from "@/lib/mvum";

type LL = { lat: number; lng: number };

// Mirror the static-map access palette (--color-ok-fill / --color-plate-fill).
const SEG_COLOR = { green: "#3f8f3a", plate: "#3a6e92" } as const;

/**
 * Interactive Leaflet map drawing the actual GPX track. Leaflet touches
 * `window`, so it's imported lazily inside the effect (never on the server).
 *
 * When MVUM `segments` are supplied they replace the single rust track line
 * with per-segment access coloring (green-sticker vs plate-only), matching the
 * static thumbnail — so the "partial" specifics are locatable on the big map too.
 */
export function RouteMap({
  points,
  segments = [],
}: {
  points: LL[];
  segments?: RouteSegment[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const hasGreen = segments.some((s) => s.access === "green");
  const hasPlate = segments.some((s) => s.access === "plate");
  const showAccessLegend = hasGreen && hasPlate;

  useEffect(() => {
    if (points.length < 2) return;
    let cancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let map: any;

    (async () => {
      const L = (await import("leaflet")).default;
      const el = ref.current as (HTMLDivElement & { _leaflet_id?: number }) | null;
      if (cancelled || !el || el._leaflet_id) return;

      const latlngs = points.map((p) => [p.lat, p.lng] as [number, number]);
      map = L.map(el, { scrollWheelZoom: true });

      const tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 17,
        attribution: "&copy; OpenStreetMap contributors",
      });
      // Clear the loading state once tiles have painted (with a safety fallback).
      const done = () => {
        if (!cancelled) setLoading(false);
      };
      tiles.on("load", done);
      const fallback = setTimeout(done, 6000);
      tiles.addTo(map);

      // The drawn route: access-colored MVUM segments when available, else the
      // single rust GPX line. Collected in a group to fit bounds to everything.
      const drawn = L.featureGroup().addTo(map);
      if (segments.length > 0) {
        for (const seg of segments) {
          const segll = seg.coords.map((p) => [p.lat, p.lng] as [number, number]);
          // paper casing under the colored access line
          L.polyline(segll, { color: "#f6efdd", weight: 8, opacity: 0.9 }).addTo(drawn);
          L.polyline(segll, { color: SEG_COLOR[seg.access], weight: 4 }).addTo(drawn);
        }
      } else {
        // paper casing under the rust route line
        L.polyline(latlngs, { color: "#f6efdd", weight: 8, opacity: 0.9 }).addTo(drawn);
        L.polyline(latlngs, { color: "#a8492a", weight: 4 }).addTo(drawn);
      }

      L.circleMarker(latlngs[0], {
        radius: 6, color: "#fff", weight: 2, fillColor: "#3f8f3a", fillOpacity: 1,
      })
        .addTo(drawn)
        .bindTooltip("Start");
      L.circleMarker(latlngs[latlngs.length - 1], {
        radius: 6, color: "#fff", weight: 2, fillColor: "#8f2a20", fillOpacity: 1,
      })
        .addTo(drawn)
        .bindTooltip("End");

      map.fitBounds(drawn.getBounds(), { padding: [30, 30] });
      L.control.scale({ imperial: true, metric: false }).addTo(map);

      map.once("remove", () => clearTimeout(fallback));
    })();

    return () => {
      cancelled = true;
      if (map) map.remove();
    };
  }, [points, segments]);

  return (
    <div className="relative h-full w-full">
      <div ref={ref} className="map-vintage h-full w-full bg-manila" />
      {!loading && showAccessLegend && (
        <div className="pointer-events-none absolute right-3 top-3 z-[1000] flex flex-col gap-1 rounded border border-edge bg-paper/90 px-2 py-1.5 text-[0.65rem] font-semibold uppercase tracking-wider text-bistre shadow">
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-3.5 rounded-full bg-ok-fill" aria-hidden />
            Green-sticker
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-3.5 rounded-full bg-plate-fill" aria-hidden />
            Plate only
          </span>
        </div>
      )}
      {loading && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-manila">
          <span className="animate-pulse text-sm font-semibold uppercase tracking-wider text-olive">
            Loading map…
          </span>
        </div>
      )}
    </div>
  );
}
