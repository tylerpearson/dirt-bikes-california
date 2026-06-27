"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AREAS } from "@/lib/areas";

const href = (id: string) => (id === "big-bear" ? "/" : `/${id}`);

export function AreaNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-30 border-b-2 border-bistre/70 bg-paper/95 backdrop-blur-sm">
      <div className="mx-auto flex h-12 max-w-6xl items-center justify-between gap-4 px-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-rust-ink"
        >
          <span aria-hidden className="text-base leading-none">
            ◇
          </span>
          <span className="hidden sm:inline">Field Guide</span>
          <span className="text-olive">CA OHV</span>
        </Link>

        <ul className="flex items-stretch -mr-2">
          {AREAS.map((area) => {
            const to = href(area.id);
            const active = pathname === to;
            return (
              <li key={area.id} className="flex">
                <Link
                  href={to}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex items-center px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors after:absolute after:inset-x-2 after:bottom-0 after:h-[2px] after:transition-colors ${
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
      </div>
    </nav>
  );
}
