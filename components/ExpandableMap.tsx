"use client";

import { useEffect, useRef, useState } from "react";
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
  className = "",
}: {
  map: MapRender;
  points: LL[];
  label: string;
  routeName: string;
  gpxHref: string;
  directionsHref: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;

    const focusables = () =>
      Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button, [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key === "Tab") {
        const items = focusables();
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    // Move focus into the dialog once it's painted.
    const raf = requestAnimationFrame(() => focusables()[0]?.focus());

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      // Restore focus to the trigger that opened the dialog.
      trigger?.focus();
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className={`group block h-full w-full cursor-pointer text-left ${className}`}
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
            ref={dialogRef}
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
