"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { parseTrackParts } from "@/lib/gpx-parse";
import { routeSegmentsFromGeojson, type RouteSegment } from "@/lib/mvum";
import type { TrackPoint } from "@/lib/track-stats";

// Mirror the static-map access palette (--color-ok-fill / --color-plate-fill).
// "track" is the neutral rust used for a multi-part route with no access split.
const SEG_COLOR = { green: "#3f8f3a", plate: "#3a6e92", track: "#a8492a" } as const;

/**
 * Interactive Leaflet map drawing the actual GPX track. Leaflet touches
 * `window`, so it's imported lazily inside the effect (never on the server).
 * Geometry is fetched on mount (the same `/gpx/<id>.gpx` file that backs the
 * download link, plus the area's overview GeoJSON for access coloring) rather
 * than passed as props, so a card's full-resolution track never has to be
 * serialized into the page unless this dialog is opened.
 *
 * When MVUM `segments` are found (from `geojsonSrc`) they replace the single
 * rust track line with per-segment access coloring (green-sticker vs
 * plate-only), matching the static thumbnail — so the "partial" specifics are
 * locatable on the big map too.
 */
export function RouteMap({
  gpxHref,
  geojsonSrc,
  forestRoad,
}: {
  /** GPX to draw, e.g. `/gpx/holcomb-valley.gpx` (same file as the download link). */
  gpxHref: string;
  /** Area overview GeoJSON for green/plate coloring (MVUM areas only). */
  geojsonSrc?: string;
  /** Road number(s) to select in the GeoJSON, e.g. "3N16" or "29S02.1, 29S02.2". */
  forestRoad?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [segments, setSegments] = useState<RouteSegment[]>([]);
  const hasGreen = segments.some((s) => s.access === "green");
  const hasPlate = segments.some((s) => s.access === "plate");
  const showAccessLegend = hasGreen && hasPlate;

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let map: any;

    (async () => {
      let parts: TrackPoint[][];
      try {
        const res = await fetch(gpxHref);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const xml = await res.text();
        parts = parseTrackParts(xml);
      } catch {
        if (!cancelled) setStatus("error");
        return;
      }
      if (parts.flat().length < 2) {
        if (!cancelled) setStatus("error");
        return;
      }

      let segs: RouteSegment[] = [];
      if (geojsonSrc && forestRoad) {
        try {
          const res = await fetch(geojsonSrc);
          if (res.ok) {
            const json = await res.json();
            segs = routeSegmentsFromGeojson(json, forestRoad);
          }
        } catch {
          // A failed GeoJSON fetch shouldn't block the track from drawing.
          segs = [];
        }
      }
      if (cancelled) return;
      setSegments(segs);

      const L = (await import("leaflet")).default;
      const el = ref.current as (HTMLDivElement & { _leaflet_id?: number }) | null;
      if (cancelled || !el || el._leaflet_id) return;

      map = L.map(el, { scrollWheelZoom: true });

      const tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 17,
        attribution: "&copy; OpenStreetMap contributors",
      });
      // Clear the loading state once tiles have painted (with a safety fallback).
      const done = () => {
        if (!cancelled) setStatus("ready");
      };
      tiles.on("load", done);
      const fallback = setTimeout(done, 6000);
      tiles.addTo(map);

      // The drawn route: access-colored MVUM segments when available, else
      // one rust polyline per GPX part (so disjoint BLM pieces don't get
      // bridged with a straight line).
      const drawn = L.featureGroup().addTo(map);
      if (segs.length > 0) {
        for (const seg of segs) {
          const segll = seg.coords.map((p) => [p.lat, p.lng] as [number, number]);
          // paper casing under the colored access line
          L.polyline(segll, { color: "#f6efdd", weight: 8, opacity: 0.9 }).addTo(drawn);
          L.polyline(segll, { color: SEG_COLOR[seg.access], weight: 4 }).addTo(drawn);
        }
      } else {
        for (const part of parts) {
          const partll = part.map((p) => [p.lat, p.lng] as [number, number]);
          // paper casing under the rust route line
          L.polyline(partll, { color: "#f6efdd", weight: 8, opacity: 0.9 }).addTo(drawn);
          L.polyline(partll, { color: "#a8492a", weight: 4 }).addTo(drawn);
        }
      }

      const firstPart = parts[0];
      const lastPart = parts[parts.length - 1];
      L.circleMarker([firstPart[0].lat, firstPart[0].lng], {
        radius: 6, color: "#fff", weight: 2, fillColor: "#3f8f3a", fillOpacity: 1,
      })
        .addTo(drawn)
        .bindTooltip("Start");
      const lastPt = lastPart[lastPart.length - 1];
      L.circleMarker([lastPt.lat, lastPt.lng], {
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
  }, [gpxHref, geojsonSrc, forestRoad]);

  return (
    <div className="relative h-full w-full">
      <div ref={ref} className="map-vintage h-full w-full bg-manila" />
      {status === "ready" && showAccessLegend && (
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
      {status !== "ready" && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-manila">
          <span
            className={`text-sm font-semibold uppercase tracking-wider text-olive ${status === "loading" ? "animate-pulse" : ""}`}
          >
            {status === "error" ? "Map unavailable" : "Loading map…"}
          </span>
        </div>
      )}
    </div>
  );
}
