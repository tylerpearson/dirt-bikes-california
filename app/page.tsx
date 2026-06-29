import type { Metadata } from "next";
import Link from "next/link";
import { AREAS } from "@/lib/areas";
import { HeroTopo } from "@/components/HeroTopo";
import { OverviewMap, type AreaPin } from "@/components/OverviewMap";
import { StickerGuide } from "@/components/StickerGuide";
import { JsonLd } from "@/components/JsonLd";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

/** Build the statewide map pins: one per area, placed at its trailhead centroid. */
function areaPins(): AreaPin[] {
  return AREAS.map((area) => {
    const ths = area.routes.map((r) => r.trailhead);
    const dist = area.routes.map((r) => r.distanceMiles);
    const greenSticker = area.routes.filter(
      (r) => r.access.greenSticker === "yes" || r.access.greenSticker === "partial",
    ).length;
    return {
      id: area.id,
      name: area.name,
      regionShort: area.regionShort,
      tagline: area.tagline,
      lat: ths.reduce((s, t) => s + t.lat, 0) / ths.length,
      lng: ths.reduce((s, t) => s + t.lng, 0) / ths.length,
      count: area.routes.length,
      min: Math.round(Math.min(...dist)),
      max: Math.round(Math.max(...dist)),
      hasGreen: greenSticker > 0,
    };
  });
}

export const metadata: Metadata = {
  title: { absolute: "SoCal Dirt Bike & OHV Routes · Field Guide" },
  description:
    "A field guide to the best dirt bike and OHV routes across Southern California: ride details, real route maps, elevation, and whether you need a green sticker or a street-legal plate. Pick an area to start.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "SoCal Dirt Bike & OHV Routes · Field Guide",
    description:
      "The best OHV and dual-sport dirt bike routes across Southern California: real route maps, elevation, and green-sticker vs. plate-only access.",
    url: "/",
    type: "website",
  },
};

/** WebSite + an ItemList of every riding area, for richer search/AI results. */
function homeJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: SITE_NAME,
        url: SITE_URL,
        description:
          "A field guide to dirt bike and OHV routes across Southern California's national forests and BLM desert.",
      },
      {
        "@type": "ItemList",
        name: "Southern California dirt bike riding areas",
        numberOfItems: AREAS.length,
        itemListElement: AREAS.map((area, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: `${area.name}, ${area.region}`,
          url: `${SITE_URL}/${area.id}`,
        })),
      },
    ],
  };
}

export default function Home() {
  return (
    <>
      <JsonLd data={homeJsonLd()} />
      <header className="relative overflow-hidden border-b-2 border-bistre/70 bg-paper">
        <HeroTopo />
        <div className="relative mx-auto max-w-6xl px-6 py-14 sm:py-20">
          <div className="flex items-center gap-3 text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-rust-ink">
            <span>Field Guide</span>
            <span className="h-px flex-1 bg-edge-strong/60" aria-hidden />
            <span className="text-olive">Southern California</span>
          </div>

          <h1 className="mt-5 font-display text-5xl font-bold uppercase leading-[0.95] tracking-tight text-balance text-bistre sm:text-7xl">
            SoCal
            <br />
            Dirt Bike Routes
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-pretty text-ink/90">
            The best OHV and dual-sport rides across Southern California&apos;s
            national forests and BLM desert, with real route maps and elevation
            built from the Forest Service and BLM travel maps plus public terrain
            data, the details that matter, and exactly where you need a
            street-legal plate versus where green-sticker bikes are allowed.
          </p>
          <p className="mt-3 text-sm text-olive">
            {AREAS.length} riding areas ·{" "}
            {AREAS.reduce((n, a) => n + a.routes.length, 0)} curated routes
          </p>

          <p className="mt-8 max-w-2xl rounded-sm border border-edge bg-paper-2/70 px-4 py-3 text-sm leading-relaxed text-bistre">
            <span className="font-semibold text-rust-ink">New to this?</span>{" "}
            Where you can ride comes down to how your bike is registered. A{" "}
            <span className="font-semibold text-bistre">street-legal (plated)</span>{" "}
            bike rides every route here. A{" "}
            <span className="font-semibold text-bistre">green-sticker</span> bike
            (dirt only, now including electric bikes like a Sur-Ron) rides only
            the routes flagged for it.{" "}
            <Link
              href="#stickers"
              className="font-semibold text-rust-ink underline decoration-rust/50 underline-offset-2 hover:decoration-rust"
            >
              Full sticker &amp; access guide ↓
            </Link>
          </p>

          <p className="mt-4 max-w-2xl rounded-sm border border-edge bg-paper-2/70 px-4 py-3 text-sm leading-relaxed text-bistre">
            <span className="font-semibold text-rust-ink">Scope:</span> federal
            public land only.{" "}
            <span className="font-semibold text-bistre">National forests</span>{" "}
            are mostly designated roads where access flips between plated and
            green-sticker route by route.{" "}
            <span className="font-semibold text-bistre">BLM desert</span>{" "}
            like Jawbone Canyon is open green-sticker country. Federal OHV areas like
            Rowher Flats count too. It does not cover California&apos;s state-run
            OHV parks (Ocotillo Wells, Hungry Valley), which charge a fee and run
            on their own maps and rules.
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-12">
        <div className="mb-6 flex items-baseline justify-between gap-4 border-b border-edge-strong/50 pb-3">
          <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-bistre">
            Where to ride
          </h2>
          <span className="text-sm text-olive">{AREAS.length} areas</span>
        </div>

        <OverviewMap areas={areaPins()} />
      </main>

      <StickerGuide />

      <footer className="border-t-2 border-bistre/70 bg-manila">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <h2 className="font-display text-lg font-bold uppercase tracking-tight text-rust-ink">
            Ride responsibly · verify before you go
          </h2>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-ink/90">
            <p>
              Route details, mileage, trailhead locations, and access info in
              this guide are approximate and provided for general guidance only.
              Route lines come from official agency travel maps and elevation
              from public terrain data, not a surveyed legal boundary. Trail
              status, seasonal
              closures, and permit or pass requirements change frequently.
            </p>
            <p>
              Always confirm current conditions and legal requirements with the
              managing agency (the national forest or BLM field office) before
              riding. Carry a spark arrestor, pack out what you pack in, and stay
              on designated routes.
            </p>
          </div>
          <p className="mt-6 text-xs text-olive">
            Access data from US Forest Service and BLM travel maps · map data ©{" "}
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 hover:text-bistre"
            >
              OpenStreetMap
            </a>{" "}
            contributors · elevation data from NASA.
          </p>
        </div>
      </footer>
    </>
  );
}
