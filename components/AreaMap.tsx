"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

type Access = "green" | "plate";
type Feature = {
  type: "Feature";
  properties: { id: string | null; name: string | null; kind: string; access: Access; seasonal: boolean };
  geometry:
    | { type: "LineString"; coordinates: [number, number][] }
    | { type: "MultiLineString"; coordinates: [number, number][][] };
};
type FC = {
  features: Feature[];
  metadata?: { counts?: Record<string, number>; fetched?: string };
};

const COLOR: Record<Access, string> = {
  green: "#3f8f3a", // --color-ok-fill: green-sticker OHV allowed
  plate: "#3a6e92", // --color-plate-fill: street-legal plated only
};

/**
 * Area overview: every MVUM road/trail in the Big Bear bbox, drawn from a
 * pre-baked GeoJSON and colored by what's allowed to ride it. Green-sticker
 * routes are drawn on top so the (rarer) "you can ride here" set stands out.
 * Leaflet + the ~140 KB (gzip) GeoJSON load lazily, only when the section
 * nears the viewport.
 */
export function AreaMap() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");

  // Defer all work until the section is near the viewport.
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
    setStatus("loading");

    (async () => {
      try {
        const [{ default: L }, res] = await Promise.all([
          import("leaflet"),
          fetch("/data/big-bear-mvum.geojson"),
        ]);
        if (cancelled) return;
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const fc: FC = await res.json();
        const el = mapRef.current as (HTMLDivElement & { _leaflet_id?: number }) | null;
        if (cancelled || !el || el._leaflet_id) return;

        map = L.map(el, { scrollWheelZoom: false });
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 16,
          attribution: "&copy; OpenStreetMap contributors · USFS MVUM",
        }).addTo(map);

        const style = (f?: Feature) => {
          const p = f!.properties;
          return {
            color: COLOR[p.access],
            weight: p.access === "green" ? 3.5 : 2,
            opacity: p.access === "green" ? 0.95 : 0.7,
            dashArray: p.seasonal ? "3 5" : undefined,
            lineCap: "round" as const,
          };
        };
        const onEach = (f: Feature, layer: { bindTooltip: (s: string, o?: object) => void }) => {
          const p = f.properties;
          const label = p.access === "green" ? "Green-sticker OK" : "Plated only";
          const name = p.name
            ? p.name.replace(/\b\w/g, (c) => c.toUpperCase())
            : "Unnamed route";
          layer.bindTooltip(
            `<b>${name}</b>${p.id ? ` · ${p.id}` : ""}<br>${label}${p.seasonal ? " · seasonal" : ""}`,
            { sticky: true },
          );
        };

        // Plate routes underneath, green on top.
        const plate = fc.features.filter((f) => f.properties.access === "plate");
        const green = fc.features.filter((f) => f.properties.access === "green");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const plateLayer = L.geoJSON(plate as any, { style: style as any, onEachFeature: onEach as any }).addTo(map);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const greenLayer = L.geoJSON(green as any, { style: style as any, onEachFeature: onEach as any }).addTo(map);

        const bounds = plateLayer.getBounds().extend(greenLayer.getBounds());
        map.fitBounds(bounds, { padding: [24, 24] });
        L.control.scale({ imperial: true, metric: false }).addTo(map);

        if (!cancelled) setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      if (map) map.remove();
    };
  }, [inView]);

  return (
    <div ref={wrapRef} className="relative">
      <div
        ref={mapRef}
        className="area-map h-[60vh] max-h-[560px] min-h-[360px] w-full bg-manila"
        role="img"
        aria-label="Map of every legal motorized road and trail around Big Bear, colored by whether green-sticker off-highway motorcycles are allowed"
      />

      {/* Legend — field-guide card pinned to the map */}
      <div className="pointer-events-none absolute bottom-3 left-3 z-[500] rounded-sm border border-edge-strong/70 bg-paper/95 px-3 py-2.5 text-xs shadow-[0_6px_18px_-12px_rgba(60,45,20,0.7)] backdrop-blur-[1px]">
        <p className="mb-1.5 font-semibold uppercase tracking-wider text-rust-ink">
          What can ride here
        </p>
        <ul className="space-y-1 text-bistre">
          <li className="flex items-center gap-2">
            <span className="h-[3px] w-6 rounded-full" style={{ background: COLOR.green }} />
            Green-sticker OHV allowed
          </li>
          <li className="flex items-center gap-2">
            <span className="h-[2px] w-6 rounded-full" style={{ background: COLOR.plate }} />
            Street-legal plate only
          </li>
          <li className="flex items-center gap-2 text-olive">
            <span
              className="h-0 w-6 border-t-2 border-dashed"
              style={{ borderColor: "var(--color-olive)" }}
            />
            Dashed = seasonal access
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
  );
}
