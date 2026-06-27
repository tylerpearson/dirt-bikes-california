import { routes } from "@/lib/routes";
import { loadTrack } from "@/lib/gpx";
import { centeredMap, trackMap } from "@/lib/tiles";
import { trackStats } from "@/lib/track-stats";
import { RouteCard } from "@/components/RouteCard";
import { AccessBadge } from "@/components/AccessBadge";
import { HeroTopo } from "@/components/HeroTopo";
import type { GreenStickerStatus } from "@/lib/types";

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

export default function Home() {
  // Build each route's map at request/build time (GPX parsing needs fs).
  // A track at /data/gpx/<id>.gpx draws a fitted route line; otherwise we fall
  // back to a pin centered on the trailhead.
  const cards = routes.map((route) => {
    const track = loadTrack(`${route.id}.gpx`);
    const hasTrack = track.length > 1;
    const map = hasTrack
      ? trackMap(track)
      : centeredMap(route.trailhead.lat, route.trailhead.lng, { zoom: 12 });
    const points = track.map((p) => ({ lat: p.lat, lng: p.lng }));
    const stats = hasTrack ? trackStats(track) : null;
    return { route, map, points, stats };
  });

  return (
    <>
      <header className="relative overflow-hidden border-b-2 border-bistre/70 bg-paper">
        <HeroTopo />
        <div className="relative mx-auto max-w-6xl px-6 py-14 sm:py-20">
          {/* map-sheet collar / title block */}
          <div className="flex items-center gap-3 text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-rust-ink">
            <span>Field Guide</span>
            <span className="h-px flex-1 bg-edge-strong/60" aria-hidden />
            <span className="text-olive">San Bernardino N.F.</span>
          </div>

          <h1 className="mt-5 font-display text-5xl font-bold uppercase leading-[0.95] tracking-tight text-balance text-bistre sm:text-7xl">
            Big Bear
            <br />
            Dirt Bike Routes
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-pretty text-ink/90">
            A field guide to the best OHV rides around Big Bear — real route maps
            and elevation pulled from{" "}
            <span className="font-semibold text-bistre">OpenStreetMap</span>, the
            details that matter, and exactly where you need a{" "}
            <span className="font-semibold text-plate-ink">
              street-legal plate
            </span>{" "}
            versus where{" "}
            <span className="font-semibold text-ok-ink">green-sticker</span> bikes
            are allowed.
          </p>
          <p className="mt-3 text-sm text-olive">
            Big Bear, California · {routes.length} routes
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
                roads like Arrastre Creek.
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
              lines come from OpenStreetMap, not a surveyed legal boundary. Trail
              status, seasonal closures, and Adventure Pass requirements change
              frequently.
            </p>
            <p>
              Always confirm current conditions and legal requirements with the{" "}
              <a
                href="https://www.fs.usda.gov/sbnf"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-rust-ink underline decoration-rust/50 underline-offset-2 hover:decoration-rust"
              >
                San Bernardino National Forest
              </a>{" "}
              and the{" "}
              <a
                href="https://www.bigbear.com/things-to-do/recreation/big-bear-discovery-center/"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-rust-ink underline decoration-rust/50 underline-offset-2 hover:decoration-rust"
              >
                Big Bear Discovery Center
              </a>{" "}
              before riding. Check the official Motor Vehicle Use Map (MVUM),
              carry a spark arrestor, pack out what you pack in, and stay on
              designated routes.
            </p>
          </div>
          <p className="mt-6 text-xs text-olive">
            Map data ©{" "}
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
