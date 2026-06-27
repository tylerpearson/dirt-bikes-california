"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

type LL = { lat: number; lng: number };

/**
 * Interactive Leaflet map drawing the actual GPX track. Leaflet touches
 * `window`, so it's imported lazily inside the effect (never on the server).
 */
export function RouteMap({ points }: { points: LL[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);

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

      // paper casing under the rust route line
      L.polyline(latlngs, { color: "#f6efdd", weight: 8, opacity: 0.9 }).addTo(map);
      const line = L.polyline(latlngs, { color: "#a8492a", weight: 4 }).addTo(map);

      L.circleMarker(latlngs[0], {
        radius: 6, color: "#fff", weight: 2, fillColor: "#3f8f3a", fillOpacity: 1,
      })
        .addTo(map)
        .bindTooltip("Start");
      L.circleMarker(latlngs[latlngs.length - 1], {
        radius: 6, color: "#fff", weight: 2, fillColor: "#8f2a20", fillOpacity: 1,
      })
        .addTo(map)
        .bindTooltip("End");

      map.fitBounds(line.getBounds(), { padding: [30, 30] });
      L.control.scale({ imperial: true, metric: false }).addTo(map);

      map.once("remove", () => clearTimeout(fallback));
    })();

    return () => {
      cancelled = true;
      if (map) map.remove();
    };
  }, [points]);

  return (
    <div className="relative h-full w-full">
      <div ref={ref} className="map-vintage h-full w-full bg-manila" />
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
