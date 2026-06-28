"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AREAS } from "@/lib/areas";

// Group areas by managing forest for the mobile menu — the same mental model
// a rider uses ("which forest am I headed to?"), and it turns one long scroll
// into three short, scannable lists.
const FOREST_GROUPS = AREAS.reduce<{ forest: string; areas: typeof AREAS }[]>(
  (groups, area) => {
    const forest = area.forest.name.replace(/National Forest$/, "N.F.").trim();
    const group = groups.find((g) => g.forest === forest);
    if (group) group.areas.push(area);
    else groups.push({ forest, areas: [area] });
    return groups;
  },
  [],
);

// Does the area have any green-sticker (non-street-legal) riding? Mirrors the
// green/blue pins on the home map so the dot means the same thing everywhere.
const hasGreen = (area: (typeof AREAS)[number]) =>
  area.routes.some(
    (r) => r.access.greenSticker === "yes" || r.access.greenSticker === "partial",
  );

export function AreaNav() {
  const pathname = usePathname();
  const activeRef = useRef<HTMLAnchorElement>(null);
  const [open, setOpen] = useState(false);
  // usePathname() resolves to null on the first client render of a statically
  // exported page, so deriving the button label from it directly mismatches the
  // prerendered HTML. Gate the dynamic label until after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const current = AREAS.find((a) => pathname === `/${a.id}`);
  const triggerLabel = mounted && current ? current.name : "Riding areas";

  // The desktop strip holds more tabs than fit, so it scrolls. Fade whichever
  // edge has more tabs past it, so the overflow reads as "scroll for more"
  // rather than a tab clipped mid-word.
  const stripRef = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });
  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    const update = () =>
      setEdges({
        left: el.scrollLeft > 4,
        right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
      });
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);
  const stripMask = `linear-gradient(to right, ${[
    edges.left ? "transparent 0" : "black 0",
    edges.left ? "black 1.25rem" : null,
    edges.right ? "black calc(100% - 1.5rem)" : null,
    edges.right ? "transparent 100%" : "black 100%",
  ]
    .filter(Boolean)
    .join(", ")})`;

  // With many tabs the active one can start off-screen on the desktop strip —
  // center it.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [pathname]);

  // Close the mobile menu on navigation.
  useEffect(() => setOpen(false), [pathname]);

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
  }, [open]);

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

        {/* Desktop: the full horizontal tab strip. */}
        <ul
          ref={stripRef}
          style={{ maskImage: stripMask, WebkitMaskImage: stripMask }}
          className="-mr-2 hidden items-stretch overflow-x-auto md:flex [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {AREAS.map((area) => {
            const to = `/${area.id}`;
            const active = pathname === to;
            return (
              <li key={area.id} className="flex shrink-0">
                <Link
                  href={to}
                  ref={active ? activeRef : undefined}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex items-center whitespace-nowrap px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors after:absolute after:inset-x-2 after:bottom-0 after:h-[2px] after:transition-colors ${
                    active
                      ? "text-rust-ink after:bg-rust"
                      : "text-olive hover:text-bistre after:bg-transparent"
                  }`}
                >
                  {area.name}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Mobile: a "you are here" button that opens a grouped area menu. */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="area-menu"
          className="-mr-1 flex items-center gap-2 py-1.5 pl-2 text-xs font-semibold uppercase tracking-wide text-bistre md:hidden"
        >
          <span className="max-w-[42vw] truncate">{triggerLabel}</span>
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

        {/* Mobile menu panel + scrim. */}
        {open && (
          <>
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="motion-safe:animate-fade-in fixed inset-x-0 bottom-0 top-12 z-30 cursor-default bg-ink/25 md:hidden"
            />
            <div
              id="area-menu"
              className="motion-safe:animate-menu-in absolute inset-x-0 top-full z-40 max-h-[calc(100vh-3rem)] overflow-y-auto border-b-2 border-bistre/70 bg-paper shadow-[0_18px_30px_-20px_rgba(43,38,29,0.55)] md:hidden"
            >
              {FOREST_GROUPS.map((group) => (
                <div key={group.forest} className="border-t border-edge first:border-t-0">
                  <p className="px-6 pb-1 pt-3 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-olive">
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
                            className={`flex min-h-[44px] items-center gap-3 px-6 py-2 ${
                              active ? "bg-paper-2 text-rust-ink" : "text-ink"
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
                              className={`flex-1 text-[0.95rem] ${
                                active ? "font-semibold" : "font-medium"
                              }`}
                            >
                              {area.name}
                            </span>
                            <span className="text-xs tabular-nums text-olive">
                              {area.routes.length} route
                              {area.routes.length === 1 ? "" : "s"}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
              <p className="flex items-center gap-4 border-t border-edge px-6 py-3 text-[0.7rem] text-olive">
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
