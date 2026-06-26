"use client";

import { useEffect, useState } from "react";
import type { MapRender } from "@/lib/tiles";
import { StaticMap } from "./StaticMap";
import { RouteMap } from "./RouteMap";

type LL = { lat: number; lng: number };

export function ExpandableMap({
  map,
  points,
  label,
  routeName,
  gpxHref,
  directionsHref,
}: {
  map: MapRender;
  points: LL[];
  label: string;
  routeName: string;
  gpxHref: string;
  directionsHref: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group block w-full cursor-pointer text-left"
        aria-label={`Expand interactive map for ${routeName}`}
      >
        <StaticMap map={map} label={label} approximate />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-ink/75 p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={`Interactive map — ${routeName}`}
          onClick={() => setOpen(false)}
        >
          <div
            className="mx-auto flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-sm border-2 border-bistre bg-paper shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-edge px-4 py-3">
              <h2 className="font-display text-xl font-bold uppercase tracking-tight text-bistre">
                {routeName}
              </h2>
              <div className="flex items-center gap-2">
                <a
                  href={gpxHref}
                  download
                  className="rounded-sm border border-edge-strong/70 bg-paper-2 px-2.5 py-1.5 text-xs font-semibold text-bistre transition hover:border-rust/60"
                >
                  ↓ GPX
                </a>
                <a
                  href={directionsHref}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-sm border border-edge-strong/70 bg-paper-2 px-2.5 py-1.5 text-xs font-semibold text-bistre transition hover:border-rust/60"
                >
                  Trailhead ↗
                </a>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-sm border border-edge-strong/70 bg-paper-2 px-2.5 py-1.5 text-xs font-semibold text-bistre transition hover:border-rust/60"
                  aria-label="Close map"
                >
                  ✕ Close
                </button>
              </div>
            </div>
            <div className="relative flex-1">
              <RouteMap points={points} />
            </div>
            <p className="border-t border-edge px-4 py-2 text-[0.65rem] text-olive">
              Route line © OpenStreetMap contributors — approximate; verify on the
              official MVUM. Green start dot · red end dot.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
