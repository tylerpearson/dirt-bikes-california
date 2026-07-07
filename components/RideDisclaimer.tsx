// A deliberately prominent "ride at your own risk" callout. The routes in this
// guide are assembled from public agency data and our own judgment, not
// surveyed or ridden end to end, so this states plainly that the guide is a
// best effort and the rider owns the consequences. Shared by the home footer
// and every area footer so the wording stays identical everywhere.
export function RideDisclaimer() {
  return (
    <aside
      role="note"
      className="rounded-md border border-rust/40 bg-rust/10 px-5 py-4"
    >
      <p className="flex items-center gap-2 font-display text-base font-bold uppercase tracking-tight text-rust-ink">
        <span aria-hidden className="text-lg leading-none">
          ⚠
        </span>
        Ride at your own risk
      </p>
      <p className="mt-2 text-sm leading-relaxed text-ink/90">
        These routes are our best attempt at mapping legal, rideable dirt, built
        from public agency travel maps and our own judgment. We have not surveyed
        or ridden every mile, and conditions, closures, and access change without
        notice. You are responsible for your own safety and for confirming a
        route is open and legal before you go.
      </p>
    </aside>
  );
}
