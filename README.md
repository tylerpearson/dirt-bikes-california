# SoCal Dirt Bike Routes — Field Guide

A field guide to the best OHV and dual-sport dirt bike routes across Southern
California's national forests. Each riding area gets real route maps, elevation
profiles, ride details, and — the part that actually matters — exactly where you
need a street-legal plate versus where green-sticker (non-street-legal) bikes are
allowed.

The guiding principle: **facts are derived from authoritative sources and only
prose is hand-written.** Route geometry and legal access come from the U.S.
Forest Service Motor Vehicle Use Map (MVUM); elevation from SRTM; some geometry
from OpenStreetMap. Distance, access, and difficulty aren't guessed — they're
pulled from the data and committed at build time, so every area holds the same
accuracy bar.

> ⚠️ **Verify before you go.** MVUM data and seasonal closures change. Always
> confirm current access with the managing forest. This is a field guide, not a
> legal authority.

## Riding areas

Seven areas across the San Bernardino, Los Padres, and Cleveland national
forests:

- **Big Bear** — forest roads and OHV trails ringing Big Bear Lake at 7,000 ft
- **San Jacinto** — green-sticker OHV roads above Palm Springs, plated
  dual-sport up at Idyllwild
- **Santa Ana Mtns** — the Main Divide over Saddleback, about an hour from LA
- **Laguna Mtns**
- **Mt Pinos**
- **Santa Barbara**
- **San Luis Obispo**

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
npm run dev      # start the dev server
npm run build    # production build
npm run start    # serve the production build
npm run lint     # eslint
```

### Regenerating area data

Data is fetched once and committed — no live calls per visitor. Re-run these
when curated routes change or to refresh against the latest MVUM:

```bash
node scripts/fetch-mvum-area.mjs           # overview-map GeoJSON (per area)
node scripts/build-area-routes.mjs [area]  # featured-route data + GPX from MVUM + SRTM
node scripts/fetch-osm-gpx.mjs             # route geometry from OpenStreetMap (Big Bear)
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

- **Route geometry & legal access:** USFS Motor Vehicle Use Map (MVUM), EDW
  MVUM MapServer
- **Elevation:** SRTM 30m via [opentopodata.org](https://www.opentopodata.org)
- **Some route geometry:** © OpenStreetMap contributors (ODbL)

## License

[MIT](LICENSE) © Tyler Pearson. Note that the underlying data carries its own
terms: OpenStreetMap geometry is © OpenStreetMap contributors (ODbL), and MVUM /
SRTM data are U.S. government works.
