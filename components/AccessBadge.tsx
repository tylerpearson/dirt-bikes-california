import type { GreenStickerStatus } from "@/lib/types";

const STYLES: Record<
  GreenStickerStatus,
  { dot: string; ring: string; label: string }
> = {
  yes: {
    dot: "bg-sticker-green",
    ring: "border-sticker-green/50 bg-sticker-green/10 text-green-text",
    label: "Green sticker OK",
  },
  partial: {
    dot: "bg-trail-bright",
    ring: "border-trail/50 bg-trail/10 text-trail-bright",
    label: "Green sticker: partial",
  },
  no: {
    dot: "bg-plate-blue",
    ring: "border-plate-blue/50 bg-plate-blue/10 text-blue-text",
    label: "Street-legal plate only",
  },
  unconfirmed: {
    dot: "bg-sand/60",
    ring: "border-white/20 bg-white/5 text-sand/80",
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
