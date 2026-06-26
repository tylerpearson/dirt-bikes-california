"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

type LL = { lat: number; lng: number };

/**
 * Interactive Leaflet map drawing the actual GPX track. Leaflet touches
 * `window`, so it's imported lazily inside the effect (never on the server).
 */
export function RouteMap({ points }: { points: LL[] }) {
  const ref = useRef<HTMLDivElement>(null);

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
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 17,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);

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
    })();

    return () => {
      cancelled = true;
      if (map) map.remove();
    };
  }, [points]);

  return <div ref={ref} className="map-vintage h-full w-full bg-manila" />;
}
