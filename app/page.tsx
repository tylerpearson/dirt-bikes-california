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
    const stats = hasTrack ? trackStats(track) : null;
    return { route, map, hasTrack, stats };
  });

  return (
    <>
      <header className="relative overflow-hidden border-b border-white/10 bg-bark">
        <HeroTopo />
        <div className="relative mx-auto max-w-6xl px-6 py-16 sm:py-24">
          <h1 className="font-display text-5xl font-bold uppercase leading-[0.95] tracking-wide text-balance text-bone sm:text-7xl">
            Big Bear
            <br />
            Dirt Bike Routes
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-pretty text-sand/85">
            A field guide to the best OHV rides around Big Bear — real route maps
            and elevation pulled from{" "}
            <span className="font-semibold text-bone">OpenStreetMap</span>, the
            details that matter, and exactly where you need a{" "}
            <span className="font-semibold text-blue-text">
              street-legal plate
            </span>{" "}
            versus where{" "}
            <span className="font-semibold text-green-text">green-sticker</span>{" "}
            bikes are allowed.
          </p>
          <p className="mt-4 text-sm text-sand/65">
            San Bernardino National Forest · Big Bear, California
          </p>

          <p className="mt-8 max-w-2xl text-sm leading-relaxed text-sand/75">
            <span className="font-semibold text-bone">
              Plated street-legal bikes are fine on every route here.
            </span>{" "}
            The badges below show where{" "}
            <span className="font-semibold text-bone">green-sticker</span>{" "}
            (non-street-legal) OHVs are allowed — that&apos;s the part that
            varies, sometimes segment by segment.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {LEGEND.map(({ status, meaning }) => (
              <div
                key={status}
                className="rounded-lg border border-white/10 bg-bark-2/60 p-3"
              >
                <AccessBadge status={status} />
                <p className="mt-2 text-xs leading-relaxed text-sand/75">
                  {meaning}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-4 max-w-2xl text-xs leading-relaxed text-sand/65">
            California sticker note: since Jan 1 2025, red and green stickers are
            treated as equally valid year-round in OHV-designated areas; model-year
            2022+ non-compliant bikes now use the new tan sticker. Always carry
            current registration and a working spark arrestor.
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-12">
        <div className="mb-6 flex items-baseline justify-between gap-4">
          <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-bone">
            The Routes
          </h2>
          <span className="text-sm text-sand/60">{cards.length} rides</span>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {cards.map(({ route, map, hasTrack, stats }) => (
            <RouteCard
              key={route.id}
              route={route}
              map={map}
              hasTrack={hasTrack}
              stats={stats}
            />
          ))}
        </div>
      </main>

      <footer className="border-t border-white/10 bg-bark-2">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <h2 className="font-display text-lg font-bold uppercase tracking-wide text-trail-bright">
            Ride responsibly · verify before you go
          </h2>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-sand/70">
            <p>
              Route details, mileage, trailhead locations, and sticker/plate
              requirements on this page are approximate and provided for general
              guidance only. Trail status, seasonal closures, the Red Sticker
              season, and Adventure Pass requirements change frequently.
            </p>
            <p>
              Always confirm current conditions and legal requirements with the{" "}
              <a
                href="https://www.fs.usda.gov/sbnf"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-bone underline decoration-trail/60 underline-offset-2 hover:decoration-trail"
              >
                San Bernardino National Forest
              </a>{" "}
              and the{" "}
              <a
                href="https://www.bigbear.com/things-to-do/recreation/big-bear-discovery-center/"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-bone underline decoration-trail/60 underline-offset-2 hover:decoration-trail"
              >
                Big Bear Discovery Center
              </a>{" "}
              before riding. Check the official Motor Vehicle Use Map (MVUM),
              carry a spark arrestor, pack out what you pack in, and stay on
              designated routes.
            </p>
          </div>
          <p className="mt-6 text-xs text-sand/65">
            Map tiles ©{" "}
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 hover:text-sand/80"
            >
              OpenStreetMap
            </a>{" "}
            contributors.
          </p>
        </div>
      </footer>
    </>
  );
}
