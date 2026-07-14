import type { Closure } from "@/lib/closures";
import { closedThroughLabel } from "@/lib/closures";

/** "Forest Order … · closed through … · official closure info", non-empty parts only. */
function closureMetaParts(c: Closure): string[] {
  const parts: string[] = [];
  if (c.orderNumber) parts.push(`Forest Order ${c.orderNumber}`);
  const through = closedThroughLabel(c);
  if (through) parts.push(through);
  return parts;
}

/**
 * Hero-region callout listing active closures/advisories for an area. Modeled
 * on RideDisclaimer's rust note styling. Renders nothing when there is
 * nothing active to show.
 */
export function ClosureNotice({ closures }: { closures: Closure[] }) {
  if (closures.length === 0) return null;

  const heading = closures.some((c) => c.kind === "advisory")
    ? "Closures and advisories"
    : "Current closures";

  return (
    <aside
      role="note"
      className="rounded-md border border-rust/40 bg-rust/10 px-5 py-4"
    >
      <p className="flex items-center gap-2 font-display text-base font-bold uppercase tracking-tight text-rust-ink">
        <span aria-hidden className="text-lg leading-none">
          ⚠
        </span>
        {heading}
      </p>
      <div className="mt-2 space-y-3">
        {closures.map((c, i) => {
          const meta = closureMetaParts(c);
          return (
            <p key={i} className="text-sm leading-relaxed text-ink/90">
              <span className="font-semibold text-bistre">{c.title}.</span>{" "}
              {c.summary}
              {meta.length > 0 && (
                <span className="block mt-1 text-xs uppercase tracking-wide text-rust-ink">
                  {meta.join(" · ")}
                </span>
              )}{" "}
              <a
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-bistre underline decoration-rust/50 underline-offset-2 hover:decoration-rust hover:text-rust-ink"
              >
                official closure info
              </a>
            </p>
          );
        })}
      </div>
    </aside>
  );
}
