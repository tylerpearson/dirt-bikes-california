# SoCal Dirt Bike Routes — Field Guide

A field guide to the best OHV and dual-sport dirt bike routes across Southern
California's national forests. Each riding area gets real route maps, elevation
profiles, ride details, and — the part that actually matters — exactly where you
need a street-legal plate versus where green-sticker (non-street-legal) bikes are
allowed.

The guiding principle: **facts are derived from authoritative sources and only
prose is hand-written.** Route geometry and legal access come from the U.S.
Forest Service Motor Vehicle Use Map (MVUM) for the national forest areas, or
the BLM Ground Transportation Linear Features (GTLF) travel network for the
BLM desert areas; elevation from SRTM. Distance, access, and difficulty aren't
guessed, they're pulled from the data and committed at build time, so every
area holds the same accuracy bar.

> ⚠️ **Verify before you go.** MVUM data and seasonal closures change. Always
> confirm current access with the managing forest. This is a field guide, not a
> legal authority.

## Riding areas

Thirteen areas across four national forests (San Bernardino, Los Padres,
Cleveland, Angeles) plus BLM desert (Ridgecrest Field Office):

**San Bernardino National Forest**
- **Big Bear**: forest roads and OHV trails ringing Big Bear Lake at 7,000 feet
- **Lake Arrowhead**: green-sticker OHV roads and Deep Creek singletrack, just
  west of Big Bear
- **San Gorgonio**: plated dual-sport in the Santa Ana River and Barton Flats
  high country below San Gorgonio
- **San Jacinto**: one range, two sides, green-sticker OHV roads above Palm
  Springs and plated dual-sport up at Idyllwild

**Los Padres National Forest**
- **Mt Pinos**: the guide's strongest green-sticker complex, with pine roads,
  Cuyama badlands, and Ballinger Canyon OHV
- **Santa Barbara**: Camuesa OHV roads and the East Camino Cielo crest in the
  backcountry above the city
- **San Luis Obispo**: the Pozo and La Panza OHV area, with green-sticker
  roads, singletrack, and the long Sierra Madre Ridge

**Cleveland National Forest**
- **Santa Ana Mtns**: mostly plated Main Divide country, headlined by the
  35-mile run over Saddleback
- **Laguna Mtns**: Corral Canyon's green-sticker network plus the Mount Laguna
  forest roads, the guide's southernmost riding
- **Palomar**: a compact, all-plate district headlined by the long Palomar
  Divide ridge

**Angeles National Forest**
- **Rowher Flats**: the closest green-sticker trails to LA, the Rowher Flat OHV
  system plus the plated Santa Clara Divide country

**BLM Ridgecrest Field Office (Mojave Desert)**
- **Jawbone Canyon**: open Mojave OHV desert off Highway 14, with designated
  routes and moto singletrack, almost all green-sticker
- **El Paso Mountains**: volcanic badlands and real moto singletrack east of
  Jawbone, around Last Chance Canyon and Randsburg

The home page is a statewide map; each area lives at its own route (e.g.
`/big-bear`).

## How it's built

| Concern | Lives in |
|---|---|
| Area registry (metadata + which routes) | `lib/areas.ts` → `AREAS[]` |
| Per-area featured-route data (auto-generated) | `lib/routes/<area>.generated.ts` |
| Shared page body, identical for every area | `components/AreaGuide.tsx` |
| Per-area page route | `app/<area>/page.tsx` |
| Overview-map data (auto-generated) | `public/data/<area>-mvum.geojson` |
| Featured-route tracks (auto-generated) | `public/gpx/<route-id>.gpx` |

Adding an area is mostly a data pipeline plus a paragraph of prose. The full
end-to-end process — bounding box → MVUM overview map → curated routes → GPX →
register → verify — is documented in
[`docs/adding-an-area.md`](docs/adding-an-area.md), including the gotchas we
already hit (national road-number collisions, editorial-vs-derived access drift,
overlapping areas).

### Tech stack

- [Next.js 16](https://nextjs.org) (App Router) + React 19
- [Tailwind CSS 4](https://tailwindcss.com)
- [Leaflet](https://leafletjs.com) for interactive maps

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Scripts

```bash
npm run dev        # start the dev server
npm run build      # production build
npm run start      # serve the production build
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
npm test           # vitest (registry invariants + unit tests)
```

CI runs typecheck, lint, build, and test on every PR.

### Regenerating area data

Data is fetched once and committed, so there are no live calls per visitor.
Re-run these when curated routes change or to refresh against the latest MVUM
or BLM GTLF:

```bash
node scripts/fetch-mvum-area.mjs             # USFS overview-map GeoJSON (per area)
node scripts/build-area-routes.mjs [area]    # USFS featured-route data + GPX from MVUM + SRTM
node scripts/fetch-blm-area.mjs [area ...]   # BLM overview-map GeoJSON (per area)
node scripts/build-blm-routes.mjs [area ...] # BLM featured-route data + GPX from GTLF + SRTM
node scripts/fetch-angeles-area.mjs          # Angeles overview-map GeoJSON (USFS TrailNFS + RoadBasic; no MVUM GIS)
node scripts/build-angeles-routes.mjs [area] # Angeles featured-route data + GPX from the USFS inventories + SRTM
```

## Deployment

The app is a fully static Next.js export (`output: "export"` in
`next.config.ts`) — no server runtime. `next build` writes plain HTML/CSS/JS to
`./out`, which is served from **Cloudflare Workers static assets**. The Worker
config (asset directory, clean-URL handling, 404 fallback, and the custom-domain
route) lives in `wrangler.jsonc`.

- **Production URL:** [dirtbikes.typearson.dev](https://dirtbikes.typearson.dev)
- **Worker name:** `dirt-bikes-california`
- **Hosting:** Cloudflare Workers static assets (no server/edge functions)

### Automatic deploys (default)

Pushing to `main` deploys automatically via **Cloudflare Workers Builds**, which
is connected to the GitHub repo. On every push, Cloudflare:

1. Installs dependencies,
2. runs the build command `npm run build` (writes `./out`),
3. runs the deploy command `npx wrangler deploy` (uploads `./out` per
   `wrangler.jsonc`).

```
git push origin main   →   Cloudflare builds + deploys   →   dirtbikes.typearson.dev
```

Pull requests get their own preview URL automatically. The build/deploy commands
are configured in the Cloudflare dashboard under the Worker's **Settings →
Builds**; the connection itself is a one-time GitHub-app authorization done in
the dashboard (there's no CLI for connecting Workers Builds).

### Manual deploy (fallback)

To deploy from your machine instead — e.g. to push without committing — you need
[Wrangler](https://developers.cloudflare.com/workers/wrangler/) authenticated to
the Cloudflare account (`npx wrangler login`):

```bash
npm run deploy   # next build (writes ./out) + wrangler deploy
```

### Custom domain

`dirtbikes.typearson.dev` is attached via the `routes` entry in `wrangler.jsonc`
(`custom_domain: true`). Because the `typearson.dev` zone lives in the same
Cloudflare account, the DNS record and TLS cert are provisioned automatically on
deploy. The `*.workers.dev` URL is disabled for this Worker; enable it under the
Worker's **Settings → Domains & Routes** if you want it as a fallback.

## Data sources & credits

- **Route geometry & legal access (national forests):** USFS Motor Vehicle Use
  Map (MVUM), EDW MVUM MapServer
- **Route geometry & legal access (BLM areas):** BLM Ground Transportation
  Linear Features (GTLF), BLM National GTLF Public Display MapServer
- **Route geometry (Angeles N.F.):** USFS trail (TrailNFS) and road (RoadBasic)
  inventories, EDW MapServers — the Angeles publishes its MVUM only as a
  printed map, so trail access derives from the inventory's MVUM symbol codes
- **Elevation:** SRTM 30m via [opentopodata.org](https://www.opentopodata.org)
- **Basemap map tiles:** © OpenStreetMap contributors (ODbL)

## License

[MIT](LICENSE) © Tyler Pearson. Note that the underlying data carries its own
terms: OpenStreetMap basemap tiles are © OpenStreetMap contributors (ODbL), and
MVUM / SRTM data are U.S. government works.

---

*A personal project, shared as-is — built for my own use, with no warranty or
support.*
