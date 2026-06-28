import type { Area } from "@/lib/areas";
import type { GreenStickerStatus } from "@/lib/types";
import { loadTrack } from "@/lib/gpx";
import { loadRouteSegments } from "@/lib/mvum";
import { centeredMap, trackMap } from "@/lib/tiles";
import { trackStats } from "@/lib/track-stats";
import { RouteCard } from "@/components/RouteCard";
import { AccessBadge } from "@/components/AccessBadge";
import { AreaMap } from "@/components/AreaMap";
import { HeroTopo } from "@/components/HeroTopo";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL } from "@/lib/seo";

/** Home → Area breadcrumb trail for richer search results. */
function breadcrumbJsonLd(area: Area) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: `${area.name} Dirt Bike & OHV Routes`,
        item: `${SITE_URL}/${area.id}`,
      },
    ],
  };
}

const LEGEND: { status: GreenStickerStatus; meaning: string }[] = [
  {
    status: "yes",
    meaning: "Non-street-legal (green-sticker) OHVs allowed on the route.",
  },
  {
    status: "partial",
    meaning: "Green-sticker allowed on some segments only — read the note.",
  },
  {
    status: "no",
    meaning: "Street-legal, plated vehicles only — no green-sticker OHVs.",
  },
  {
    status: "unconfirmed",
    meaning: "Couldn't verify green-sticker access — confirm on the MVUM.",
  },
];

export function AreaGuide({ area }: { area: Area }) {
  // Build each route's map at request/build time (GPX parsing needs fs).
  const cards = area.routes.map((route) => {
    const track = loadTrack(`${route.id}.gpx`);
    const hasTrack = track.length > 1;
    const segments = loadRouteSegments(area.mvumGeojson, route.forestRoad);
    const map = hasTrack
      ? trackMap(track, { segments })
      : centeredMap(route.trailhead.lat, route.trailhead.lng, { zoom: 12 });
    const points = track.map((p) => ({ lat: p.lat, lng: p.lng }));
    const stats = hasTrack ? trackStats(track) : null;
    return { route, map, points, stats };
  });

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(area)} />
      <header className="relative overflow-hidden border-b-2 border-bistre/70 bg-paper">
        <HeroTopo />
        <div className="relative mx-auto max-w-6xl px-6 py-14 sm:py-20">
          <div className="flex items-center gap-3 text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-rust-ink">
            <span>Field Guide</span>
            <span className="h-px flex-1 bg-edge-strong/60" aria-hidden />
            <span className="text-olive">{area.regionShort}</span>
          </div>

          <h1 className="mt-5 font-display text-5xl font-bold uppercase leading-[0.95] tracking-tight text-balance text-bistre sm:text-7xl">
            {area.name}
            <br />
            Dirt Bike Routes
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-pretty text-ink/90">
            {area.blurb}
          </p>
          <p className="mt-3 text-sm text-olive">
            {area.name}, {area.state} · {area.region} · {area.routes.length}{" "}
            routes
          </p>

          <p className="mt-8 max-w-2xl text-sm leading-relaxed text-ink/90">
            <span className="font-semibold text-bistre">
              Plated street-legal bikes are fine on every route here.
            </span>{" "}
            The badges below show where{" "}
            <span className="font-semibold text-bistre">green-sticker</span>{" "}
            (non-street-legal) OHVs are allowed — that&apos;s the part that
            varies, sometimes segment by segment.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {LEGEND.map(({ status, meaning }) => (
              <div
                key={status}
                className="rounded-sm border border-edge bg-paper-2/70 p-3"
              >
                <AccessBadge status={status} />
                <p className="mt-2 text-xs leading-relaxed text-bistre">
                  {meaning}
                </p>
              </div>
            ))}
          </div>

          <details className="group mt-5 max-w-2xl overflow-hidden rounded-sm border border-edge bg-paper-2/50">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-bistre [&::-webkit-details-marker]:hidden">
              <span>Sticker rules &amp; the 2026 e-bike law (SB 586)</span>
              <span
                aria-hidden
                className="text-rust-ink transition-transform duration-200 group-open:rotate-90"
              >
                ›
              </span>
            </summary>
            <div className="space-y-2 border-t border-edge px-4 pb-4 pt-3 text-xs leading-relaxed text-olive">
              <p>
                <span className="font-semibold text-rust-ink">
                  Electric bikes are OHVs now:
                </span>{" "}
                under California&apos;s SB 586, off-road electric motorcycles
                count as OHVs. A{" "}
                <span className="font-semibold text-bistre">Sur-Ron</span> or a
                race-bred{" "}
                <span className="font-semibold text-bistre">Stark Varg (MX)</span>{" "}
                needs a green sticker, a helmet, and visible ID — and like any
                green-sticker bike, it&apos;s restricted to OHV-designated areas.
                So they follow the same green-sticker access shown on each route,
                and they can&apos;t be plated.
              </p>
              <p>
                The exception is the road-going{" "}
                <span className="font-semibold text-bistre">Stark Varg EX</span>:
                it&apos;s fully road-homologated in the US (lights, indicators,
                foot rear brake), so it registers and plates like a street-legal
                dual-sport — and can ride every route here, including plate-only
                roads.
              </p>
              <p>
                Sticker note: since Jan 1 2025, red and green stickers are treated
                as equally valid year-round in OHV-designated areas; model-year
                2022+ non-compliant gas bikes use the new tan sticker. Always
                carry current registration and a working spark arrestor.
              </p>
            </div>
          </details>
        </div>
      </header>

      <section className="border-b-2 border-bistre/70 bg-paper-2">
        <div className="mx-auto max-w-6xl px-6 pt-12">
          <div className="flex items-baseline justify-between gap-4 border-b border-edge-strong/50 pb-3">
            <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-bistre">
              Where can I ride?
            </h2>
            <span className="text-sm text-olive">{area.region} MVUM</span>
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink/90">
            Every legal motorized road and trail in the {area.name}
            {" "}area,
            straight from the Forest Service&apos;s{" "}
            <span className="font-semibold text-bistre">
              Motor Vehicle Use Map
            </span>
            . Most numbered roads are open to{" "}
            <span className="font-semibold text-plate-ink">
              street-legal plated
            </span>{" "}
            bikes only — the{" "}
            <span className="font-semibold text-ok-ink">green</span> routes are
            the comparatively few where a{" "}
            <span className="font-semibold text-ok-ink">green-sticker</span>{" "}
            (non-street-legal) bike is allowed. Hover any line for its road
            number and access.
          </p>
        </div>
        <div className="mx-auto mt-6 max-w-6xl px-6 pb-12">
          <div className="overflow-hidden rounded-sm border-2 border-bistre/70 shadow-[0_1px_0_var(--color-edge),0_14px_30px_-22px_rgba(60,45,20,0.7)]">
            <AreaMap src={area.mvumGeojson} />
          </div>
        </div>
      </section>

      {area.loops && area.loops.length > 0 && (
        <section className="border-b-2 border-bistre/70 bg-paper">
          <div className="mx-auto max-w-6xl px-6 py-12">
            <div className="flex items-baseline justify-between gap-4 border-b border-edge-strong/50 pb-3">
              <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-bistre">
                Make a day of it
              </h2>
              <span className="text-sm text-olive">
                {area.loops.length} suggested loop
                {area.loops.length > 1 ? "s" : ""}
              </span>
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink/90">
              Ways to string these routes into a full ride instead of a single
              road. Mileage is a rough composite — segments overlap and connect —
              so plan time and fuel with a margin.
            </p>

            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              {area.loops.map((loop) => (
                <article
                  key={loop.name}
                  className="flex flex-col gap-3 rounded-sm border border-edge-strong/60 bg-paper-2 p-5 shadow-[0_1px_0_var(--color-edge),0_10px_24px_-18px_rgba(60,45,20,0.6)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-display text-xl font-bold leading-tight tracking-tight text-bistre">
                      {loop.name}
                    </h3>
                    <span className="mt-1 flex shrink-0 items-baseline gap-1 leading-none">
                      <span className="font-display text-2xl font-bold tracking-tight text-rust-ink">
                        ~{loop.distanceMiles}
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-wider text-olive">
                        mi
                      </span>
                    </span>
                  </div>

                  <p className="text-sm font-semibold text-rust-ink">
                    {loop.summary}
                  </p>
                  <p className="text-pretty text-sm leading-relaxed text-ink/90">
                    {loop.description}
                  </p>

                  <div className="mt-auto flex flex-wrap items-center gap-x-1.5 gap-y-2 border-t border-edge pt-4 text-sm">
                    {loop.routeIds.map((id, i) => {
                      const r = area.routes.find((x) => x.id === id);
                      if (!r) return null;
                      return (
                        <span key={id} className="flex items-center gap-1.5">
                          {i > 0 && (
                            <span aria-hidden className="text-rust-ink">
                              →
                            </span>
                          )}
                          <a
                            href={`#${id}`}
                            className="font-semibold text-bistre underline decoration-rust/40 underline-offset-2 hover:decoration-rust"
                          >
                            {r.name}
                          </a>
                        </span>
                      );
                    })}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-12">
        <div className="mb-6 flex items-baseline justify-between gap-4 border-b border-edge-strong/50 pb-3">
          <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-bistre">
            The Routes
          </h2>
          <span className="text-sm text-olive">{cards.length} rides</span>
        </div>

        <div className="flex flex-col gap-6">
          {cards.map(({ route, map, points, stats }, i) => (
            <RouteCard
              key={route.id}
              route={route}
              map={map}
              points={points}
              stats={stats}
              priority={i < 2}
            />
          ))}
        </div>
      </main>

      <footer className="border-t-2 border-bistre/70 bg-manila">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <h2 className="font-display text-lg font-bold uppercase tracking-tight text-rust-ink">
            Ride responsibly · verify before you go
          </h2>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-ink/90">
            <p>
              Route details, mileage, trailhead locations, and access info on this
              page are approximate and provided for general guidance only. Route
              lines and elevation come from the MVUM, OpenStreetMap, and SRTM —
              not a surveyed legal boundary. Trail status, seasonal closures, and
              Adventure Pass requirements change frequently.
            </p>
            <p>
              Always confirm current conditions and legal requirements with the{" "}
              <a
                href={area.forest.url}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-rust-ink underline decoration-rust/50 underline-offset-2 hover:decoration-rust"
              >
                {area.forest.name}
              </a>{" "}
              before riding. Check the official Motor Vehicle Use Map (MVUM),
              carry a spark arrestor, pack out what you pack in, and stay on
              designated routes.
            </p>
          </div>
          <p className="mt-6 text-xs text-olive">
            Access data © USFS MVUM (EDW_MVUM_01) · map data ©{" "}
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 hover:text-bistre"
            >
              OpenStreetMap
            </a>{" "}
            contributors · elevation from SRTM.
          </p>
        </div>
      </footer>
    </>
  );
}
