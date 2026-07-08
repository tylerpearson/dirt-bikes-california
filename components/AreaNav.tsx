"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AREAS } from "@/lib/areas";

// Group areas by managing forest — the same mental model a rider uses ("which
// forest am I headed to?"). On mobile the groups stack into one scannable list;
// on desktop they become the columns of a mega-menu. Within each forest the
// areas are alphabetical, the most predictable order for scanning a menu.
const FOREST_GROUPS = AREAS.reduce<{ forest: string; areas: typeof AREAS }[]>(
  (groups, area) => {
    const forest = area.forest.name
      .replace(/National Forest$/, "N.F.")
      .replace(/ Field Office$/, "")
      .trim();
    const group = groups.find((g) => g.forest === forest);
    if (group) group.areas.push(area);
    else groups.push({ forest, areas: [area] });
    return groups;
  },
  [],
);
for (const group of FOREST_GROUPS) {
  group.areas.sort((a, b) => a.name.localeCompare(b.name));
}

// Pack the groups into balanced desktop columns. With COLUMN_COUNT == the
// current group count each forest gets its own column; if a future area adds a
// group beyond that, dropping each group into the currently-shortest column
// keeps the leftover tucked under an existing column instead of stranding it in
// a lopsided new row with a dead void beside it. Source order is kept for the
// single-column mobile list.
const COLUMN_COUNT = 4;
const FOREST_COLUMNS = (() => {
  const cols = Array.from({ length: COLUMN_COUNT }, () => ({
    groups: [] as typeof FOREST_GROUPS,
    weight: 0,
  }));
  for (const group of FOREST_GROUPS) {
    const target = cols.reduce((a, b) => (b.weight < a.weight ? b : a));
    target.groups.push(group);
    target.weight += group.areas.length + 1; // +1 for the header row
  }
  return cols;
})();

// Does the area have any green-sticker (non-street-legal) riding? Mirrors the
// green/blue pins on the home map so the dot means the same thing everywhere.
const hasGreen = (area: (typeof AREAS)[number]) =>
  area.routes.some(
    (r) => r.access.greenSticker === "yes" || r.access.greenSticker === "partial",
  );

// One forest group: its header plus the list of areas in it. Shared by the
// mobile stacked list and the desktop packed columns.
function AreaGroup({
  group,
  pathname,
}: {
  group: (typeof FOREST_GROUPS)[number];
  pathname: string | null;
}) {
  return (
    <>
      <p className="px-6 pb-1 pt-3 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-olive md:px-4">
        {group.forest}
      </p>
      <ul>
        {group.areas.map((area) => {
          const to = `/${area.id}`;
          const active = pathname === to;
          const green = hasGreen(area);
          return (
            <li key={area.id}>
              <Link
                href={to}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-[44px] items-center gap-3 px-6 py-2 md:min-h-0 md:px-4 md:py-1.5 ${
                  active ? "bg-paper-2 text-rust-ink" : "text-ink hover:bg-paper-2"
                }`}
              >
                <span
                  aria-hidden
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{
                    backgroundColor: green
                      ? "var(--color-sage)"
                      : "var(--color-plate-fill)",
                  }}
                />
                <span
                  className={`flex-1 text-[0.95rem] md:text-sm ${
                    active ? "font-semibold" : "font-medium"
                  }`}
                >
                  {area.name}
                </span>
                <span className="text-xs tabular-nums text-olive">
                  {area.routes.length} route{area.routes.length === 1 ? "" : "s"}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}

export function AreaNav() {
  const pathname = usePathname();
  // The pathname the menu was opened on; deriving `open` from it means
  // navigation (pathname change) closes the menu without an effect.
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const open = openedAt !== null && openedAt === pathname;
  const setOpen = useCallback(
    (v: boolean | ((prev: boolean) => boolean)) => {
      setOpenedAt((prevOpenedAt) => {
        const prevOpen = prevOpenedAt !== null && prevOpenedAt === pathname;
        const next = typeof v === "function" ? v(prevOpen) : v;
        return next ? pathname : null;
      });
    },
    [pathname],
  );
  // usePathname() resolves to null on the first client render of a statically
  // exported page, so deriving the button label from it directly mismatches the
  // prerendered HTML. Gate the dynamic label until after mount.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const current = AREAS.find((a) => pathname === `/${a.id}`);
  const triggerLabel = mounted && current ? current.name : "Riding areas";

  // Close on Escape; lock body scroll while the panel is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, setOpen]);

  return (
    <nav className="sticky top-0 z-40 border-b-2 border-bistre/70 bg-paper/95 backdrop-blur-sm">
      <div className="relative mx-auto flex h-12 max-w-6xl items-center justify-between gap-4 px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 whitespace-nowrap text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-rust-ink"
        >
          <span aria-hidden className="text-base leading-none">
            ◇
          </span>
          <span>Dirt Bike Routes</span>
          <span className="hidden text-olive sm:inline">· SoCal</span>
        </Link>

        {/* A single "you are here" trigger that opens the forest-grouped menu. */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="area-menu"
          className={`-mr-1 flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full border py-1.5 pl-3.5 pr-2.5 text-xs font-semibold uppercase tracking-wide transition-colors md:min-h-0 ${
            open
              ? "border-bistre/40 bg-paper-2"
              : "border-bistre/25 bg-paper-2/70 hover:border-bistre/40 hover:bg-paper-2"
          } ${open || current ? "text-rust-ink" : "text-bistre"}`}
        >
          <span className="max-w-[42vw] truncate md:max-w-none">{triggerLabel}</span>
          <svg
            viewBox="0 0 24 24"
            aria-hidden
            className={`h-3.5 w-3.5 shrink-0 text-rust transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        {/* Menu panel + scrim. Full-bleed single column on mobile; a right-aligned
            mega-menu with one column per forest on desktop. */}
        {open && (
          <>
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="motion-safe:animate-fade-in fixed inset-x-0 bottom-0 top-12 z-30 cursor-default bg-ink/25"
            />
            <div
              id="area-menu"
              className="motion-safe:animate-menu-in absolute inset-x-0 top-full z-40 max-h-[calc(100vh-3rem)] overflow-y-auto border-b-2 border-bistre/70 bg-paper shadow-[0_18px_30px_-20px_rgba(43,38,29,0.55)] md:inset-x-auto md:right-6 md:mt-2 md:w-[56rem] md:max-w-[calc(100vw-3rem)] md:rounded-md md:border md:border-bistre/40"
            >
              {/* New-rider entry point: the registration explainer, ahead of the
                  area list so first-timers see it before picking a place. */}
              <Link
                href="/#stickers"
                className="flex min-h-[44px] items-center justify-between gap-3 border-b border-edge bg-paper-2/60 px-6 py-3 text-sm text-bistre hover:bg-paper-2 md:min-h-0 md:px-4"
              >
                <span className="font-semibold">
                  New to dirt bikes? Sticker &amp; access guide
                </span>
                <span aria-hidden className="shrink-0 text-rust-ink">
                  →
                </span>
              </Link>

              {/* Mobile: a single stacked list in source order. */}
              <div className="md:hidden">
                {FOREST_GROUPS.map((group, i) => (
                  <div key={group.forest} className={i ? "border-t border-edge" : ""}>
                    <AreaGroup group={group} pathname={pathname} />
                  </div>
                ))}
              </div>

              {/* Desktop: groups packed into balanced columns. Grid stretches the
                  columns to equal height so the hairline dividers run full length. */}
              <div className="hidden md:grid md:grid-cols-4">
                {FOREST_COLUMNS.map((col, ci) => (
                  <div key={ci} className={ci ? "border-l border-edge" : ""}>
                    {col.groups.map((group, gi) => (
                      <div
                        key={group.forest}
                        className={gi ? "border-t border-edge" : ""}
                      >
                        <AreaGroup group={group} pathname={pathname} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <p className="flex items-center gap-4 border-t border-edge px-6 py-3 text-[0.7rem] text-olive md:px-4">
                <span className="flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: "var(--color-sage)" }}
                  />
                  green-sticker riding
                </span>
                <span className="flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: "var(--color-plate-fill)" }}
                  />
                  plated only
                </span>
              </p>
            </div>
          </>
        )}
      </div>
    </nav>
  );
}
