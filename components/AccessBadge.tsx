import type { GreenStickerStatus } from "@/lib/types";

const STYLES: Record<
  GreenStickerStatus,
  { dot: string; ring: string; label: string }
> = {
  yes: {
    dot: "bg-ok-fill",
    ring: "border-ok-fill/40 bg-ok-fill/12 text-ok-ink",
    label: "Green sticker OK",
  },
  partial: {
    dot: "bg-partial-fill",
    ring: "border-partial-fill/40 bg-partial-fill/12 text-partial-ink",
    label: "Green sticker: partial",
  },
  no: {
    dot: "bg-plate-fill",
    ring: "border-plate-fill/40 bg-plate-fill/12 text-plate-ink",
    label: "Street-legal plate only",
  },
  unconfirmed: {
    dot: "bg-unsure-fill",
    ring: "border-unsure-fill/40 bg-unsure-fill/12 text-unsure-ink",
    label: "Access unverified",
  },
};

export function AccessBadge({
  status,
  className = "",
}: {
  status: GreenStickerStatus;
  className?: string;
}) {
  const s = STYLES[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${s.ring} ${className}`}
    >
      <span className={`h-2 w-2 rounded-full ${s.dot}`} aria-hidden />
      {s.label}
    </span>
  );
}
