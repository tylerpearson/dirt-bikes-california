# Playbook: Adding a BLM Riding Area

This is the BLM counterpart to [`adding-an-area.md`](adding-an-area.md) (which
covers USFS national-forest areas). Jawbone Canyon was the first BLM area and
the proof that the pipeline ports. Same idea as the USFS flow: **facts are
derived from an authoritative source and only prose is hand-written.** The
source and a few conventions differ; the rendering is almost entirely shared.

> TL;DR: pick a bbox on BLM OHV land → confirm GTLF coverage → fetch the overview
> network (`fetch-blm-area.mjs`) → curate featured routes by name / designation /
> singletrack tag (`build-blm-routes.mjs`) → register the area with a `source`
> descriptor → add day loops → add the page → build & eyeball it.

---

## 1. Land managers: USFS vs BLM vs State (what riders need to know)

This guide covers two kinds of **federal** public land, and deliberately
excludes a third **state** kind. The distinction drives both the copy and the
access model, so keep it straight:

| Land | Manager | Access model | In this guide? |
|---|---|---|---|
| **National forest** | USFS | Designated roads/trails; green-sticker vs street-legal-only **flips route by route** (the MVUM `motorcycle`/`atv` columns). Most roads are plate-only; green-sticker access is the exception. | Yes (MVUM pipeline) |
| **BLM land** | BLM | **Open OHV country.** Almost every *designated* route is open to green-sticker bikes; you just stay on the designated routes (cross-country is closed). A few are genuinely plated-only, and admin/county roads aren't open to recreation at all. | Yes (this pipeline) |
| **State Vehicular Recreation Area (SVRA)** | CA State Parks (OHMVR) | State OHV parks (Ocotillo Wells, Hungry Valley, Carnegie…). Charge an entry fee, run on their own maps and rules. | **No** — different agency, fee, and data |

The home-page "Scope" callout says this in rider language; keep it accurate if
the mix of areas changes. The BLM area's hero and footer say "open OHV land" and
link the managing BLM field office rather than a national forest.

---

## 2. Data source — BLM GTLF (geometry + designation)

ArcGIS REST service, **national** (window into it with a bbox), the BLM analog
of the EDW MVUM service:

```
https://gis.blm.gov/arcgis/rest/services/transportation/BLM_Natl_GTLF_Public_Display/MapServer
  Layer 0 = Roads Managed for Public Motorized Use          -> open
  Layer 1 = Roads Managed for Limited Public Motorized Use  -> limited
  Layer 2 = Trails Managed for Public Motorized Use          -> open
  Layer 3 = Trails Managed for Limited Public Motorized Use  -> limited
```

`f=geojson` is supported; coordinates are lon/lat (`outSR=4326`); page with
`resultOffset`/`resultRecordCount` (maxRecordCount 2000). Always send a
`User-Agent`.

Fields we use:

| Field | Meaning |
|---|---|
| `PLAN_OHV_ROUTE_DSGNTN` | `Open` / `Limited` / `Closed` — the core designation |
| `OHV_DSGNTN_LIM_EXPLAIN` | why a route is limited, e.g. `ATV\UTV`, `Authorized/Permitted`, **`Motorized Single Track`** |
| `ROUTE_PRMRY_NM` | route name (mostly null; see gotcha 1) |
| `FAMS_ID` | BLM asset id (mostly null) |
| `OBSRVE_SRFCE_TYPE` | `NATURAL` (dirt), `NATURAL IMPROVED`, … |
| `GIS_MILES` | segment length |

**Access classification — key on `OHV_DSGNTN_LIM_EXPLAIN`, not the layer.**
"Limited" in GTLF does *not* mean "plate only"; it means "stay on designated
routes," and most of it is green-sticker terrain. The honest signal is the
explain field, which `classify()` in `fetch-blm-area.mjs` sorts into three
buckets so green/plate mean exactly what they do on the USFS pages:

| `OHV_DSGNTN_LIM_EXPLAIN` (or designation) | Result |
|---|---|
| `Motorized…`, `Motorized Single Track`, `ATV\UTV`, blank/open | **green** (green-sticker OK) |
| `Street Legal Only` | **plate** (genuine plated-only route, rare) |
| `Closed to OHV recreation…`, `Authorized/Permitted`, `PLAN…=Closed` | **dropped** (admin/easement/county or permit access, not general rec — not drawn) |

This matters: an area can be ~all "Limited" yet almost entirely green-sticker
(El Paso), while another mixes in real plated-only routes (Stoddard had 9) and
hundreds of closed admin roads that must not be drawn as ridable. Every
*featured* route is still `greenSticker: "yes"` with a BLM-worded note. Elevation
is SRTM via opentopodata, same as the USFS flow.

---

## 3. Step-by-step

### Step 0 — Pick a bbox and confirm coverage

Find the OHV area, draw a bbox, and check it has GTLF routes:

```bash
UA="Mozilla/5.0 (research)"
BASE="https://gis.blm.gov/arcgis/rest/services/transportation/BLM_Natl_GTLF_Public_Display/MapServer"
BBOX="-118.30,35.18,-118.02,35.46"   # xmin,ymin,xmax,ymax
for L in 0 1; do
  curl -s -A "$UA" "$BASE/$L/query?geometry=$BBOX&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects&returnCountOnly=true&f=json"
done
```

### Step 1 — Generate the overview map

Add the bbox to `AREAS` in `scripts/fetch-blm-area.mjs`, then:

```bash
node scripts/fetch-blm-area.mjs <area-id>
```

Writes `public/data/<area-id>-blm.geojson` (open + limited, classified). Note the
printed `counts` (green / plate) and how many features were dropped as
closed-to-recreation or permit-only.

### Step 2 — Curate featured routes

BLM geometry is mostly anonymous, so you can't curate by road number. Select by:

- `names`: exact `ROUTE_PRMRY_NM` (one or more), for the few named roads, **or**
- `singletrack: true`: every `Motorized Single Track` segment in the bbox.

Add a `<area-id>` entry to `CONFIG` **and** `BBOX` in
`scripts/build-blm-routes.mjs`. Each route is editorial prose plus a selector;
optionally a clean `designation` (e.g. `SC-103`) for the route-number badge:

```js
{
  id: "sc-103-east", name: "SC-103 East",
  select: { names: ["65014: SC-103 EAST"] }, designation: "SC-103",
  difficulty: "Moderate",
  summary: "…", description: "…", surface: "…", bestSeason: "…",
  highlights: ["…","…","…"],
}
```

Then:

```bash
node scripts/build-blm-routes.mjs <area-id>
```

For each route this fetches the segments (bbox-constrained), splits them into
contiguous **parts** (disjoint pieces stay separate — see gotcha 2), computes
real distance per part, pulls SRTM elevation, writes a multi-`<trkseg>` GPX, and
emits `lib/routes/<area>.generated.ts`.

### Step 3 — Register the area

Add to `lib/areas.ts`: import the generated routes, add the id to `AreaId`, and
append an `Area` with a **`source`** descriptor (this is what re-labels the
overview, intro, and footer for BLM):

```ts
{
  id: "<area-id>", name: "Jawbone Canyon",
  region: "BLM Ridgecrest Field Office · Mojave Desert",
  regionShort: "BLM · Jawbone", state: "California",
  blurb: "…open OHV land…", tagline: "…",
  mvumGeojson: "/data/<area-id>-blm.geojson",   // field name is historical; any source
  forest: BLM_RIDGECREST,                        // managing agency { name, url }
  source: {
    overviewLabel: "BLM Ridgecrest FO",
    overviewIntro: "…",
    legend: { green: "Open OHV route", plate: "Limited / restricted" },
    attribution: "&copy; OpenStreetMap contributors · BLM GTLF",
    verifyNote: "…stay on designated routes; desert tortoise closures…",
    credit: "Route data © BLM Ground Transportation Linear Features (GTLF)",
  },
  routes: <area>Routes,
}
```

### Step 4 — Add day loops ("Make a day of it")

Add a `loops` array to the area entry stringing the featured routes into
all-day rides. The `AreaGuide` renders a "Make a day of it" section whenever an
area has loops; an open BLM OHV network is a natural place for them, so don't
skip this pass.

```ts
loops: [
  {
    name: "Dove Springs Big Day",
    id: "dove-springs-big-day",         // kebab-case, unique within the area
    distanceMiles: 24,                 // rough composite; routes overlap/connect
    summary: "…one-line framing of the day…",
    description: "…the ride, in order, in prose…",
    routeIds: ["sc-94", "sc-103-east", "butterbredt-canyon"], // riding order
  },
],
```

**Ground every loop in the routes' real positions** (their `trailhead`
lat/lng), not just a nice-sounding string of names. BLM areas can be spread out:
Jawbone's five routes span ~23 km north to south in two clusters, so it got two
loops (a northern Dove Springs day and a south-end canyon-and-singletrack day)
rather than one loop pretending it all connects. The GTLF gives route geometry
but not a verified through-route between routes, so keep mileage approximate and
lean on the section's standing "segments overlap and connect" disclaimer instead
of inventing specific junctions.

Every loop needs an `id` (kebab-case, unique within the area). After adding
loops, run `npm run build:loops` to generate the composite downloadable GPX
under `public/gpx/loops/<areaId>--<loopId>.gpx` and commit the output with
the registry change — the "Make a day of it" card's download link depends on
that file existing.

### Step 5 — Add the page

Create `app/<area-id>/page.tsx` (identical template to a USFS page; the nav and
home card auto-derive from `AREAS`). The nav groups by `forest.name`, so a BLM
field office becomes its own group automatically.

### Step 6 — Build, verify, commit

```bash
npm run build                          # must be clean (TS + static gen)
```

Then serve `out/` and screenshot: the hero, the overview map (green open /
blue limited), a route card (each disjoint part is its own rust polyline), and
the nav at 375px. Commit the data + scripts + page together.

---

## 4. How the rendering generalizes (what changed to support BLM)

The display layer was source-agnostic except for a few MVUM-specific strings and
the green/plate access split. The additions (all backward-compatible; USFS areas
render byte-identical when `source` is omitted):

- **`Area.source?: AreaSource`** — per-area overrides for the overview collar,
  intro paragraph, map legend/tooltip labels, tile attribution, and footer copy.
  `AreaGuide` falls back to the MVUM wording when it's absent.
- **`"track"` segment color** — `AreaMap`/`RouteMap`/`StaticMap` learned a third,
  neutral access value used to draw a multi-part route as separate polylines
  without bridging the gaps. Added to `tiles.ts`, `mvum.ts`, and the two map
  components.
- **`loadTrackParts` + `trackStatsFromParts`** — parse a GPX into its `<trkseg>`
  parts and compute distance/elevation **within** parts only, so a route built
  from disjoint BLM segments doesn't pick up phantom mileage from the straight
  line that would otherwise connect them.
- **Filtered hero badge legend** — a BLM area shows only the access badges its
  routes actually use (all `yes`), instead of the full four-status MVUM legend.

---

## 5. Gotchas & lessons (Jawbone)

1. **BLM geometry is mostly anonymous.** In the Jawbone bbox, 1 of 703 open
   routes had a name. There are no road numbers like the MVUM's `3N16`. Curate
   by `ROUTE_PRMRY_NM` where it exists (the main arteries: Jawbone Canyon Rd, the
   SC-numbered routes) and by the `Motorized Single Track` tag for the moto
   singletrack. Most of the network is only renderable as the anonymous overview.

2. **Routes are disjoint; don't bridge them.** GTLF labels only stretches of a
   road (Jawbone Canyon Road came back as 4 separate pieces). The builder keeps
   parts farther than ~275 m apart **separate** rather than stitching one line
   across the gap. This is honest but has a consequence:

3. **Featured-route mileage reflects only labeled segments.** "Jawbone Canyon
   Road" derives to 4.8 mi because that's all GTLF labels by that name, even
   though the physical road is longer. Don't write prose that implies a specific
   length the data doesn't support; describe character, not mileage.

4. **"Limited" is not "plate only."** The trap that almost shipped: classifying
   by GTLF layer (open vs limited) would have drawn hundreds of admin/county
   roads as ridable and missed the real plated-only routes. Classify by
   `OHV_DSGNTN_LIM_EXPLAIN` (see §2). Most BLM areas come out all-green and use
   the standard legend (no `source.legend` override); the overview map hides the
   empty plate/seasonal rows automatically.

5. **Keep SVRAs out.** State Vehicular Recreation Areas (Hungry Valley is right
   next to several forest areas; Ocotillo Wells, Carnegie) are CA State Parks,
   not BLM, with fees and their own data. The Scope callout says so; don't smuggle
   one in under the BLM pipeline.

6. **Overview GeoJSON is larger.** Jawbone's network is ~640 KB raw (~150 KB
   gzip). Fine to ship; tighten the bbox if it balloons.

7. **Loops have to follow the geography.** BLM routes can be far apart, so check
   the trailhead coordinates before stringing a loop. Jawbone's routes spanned
   ~23 km in two clusters and got two loops, not one. Don't assert a through-route
   the data doesn't show; keep composite mileage approximate.

8. **Route `id`s are global GPX filenames — keep them unique across ALL areas.**
   A route writes `public/gpx/<id>.gpx`, so a generic id silently overwrites
   another area's track. El Paso's `black-mountain-road` clobbered San Jacinto's
   until it was namespaced to `el-paso-black-mountain`. Prefix BLM road ids with
   the area (`<area>-<route>`) unless the name is obviously unique, and after a
   build run `git status public/gpx` — a tracked GPX showing as *modified* (not
   added) is a collision.
