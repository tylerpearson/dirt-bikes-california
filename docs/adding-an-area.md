# Playbook: Adding a New Riding Area

This is the repeatable process we used to build the Big Bear, Palm Springs,
Idyllwild, and Santa Barbara guides. Follow it to add another region. The whole
idea is that **facts are derived from authoritative sources and only prose is
hand-written**, so every new area holds the same accuracy bar.

> TL;DR: pick a bounding box → confirm coverage on the MVUM → generate the
> overview map → curate featured routes by road number → generate their GPX +
> data → write a paragraph of prose → register the area → build & eyeball it.

---

## 1. What an "area" is

An area is one entry in the registry plus a thin page that renders it. Almost
everything else is shared.

| Concern | Lives in |
|---|---|
| Area registry (metadata + which routes) | `lib/areas.ts` → `AREAS[]` |
| Per-area featured-route data | `lib/routes/<area>.generated.ts` (auto) |
| Big Bear's routes (legacy, hand-authored) | `lib/routes/big-bear.ts` |
| The page body, identical for every area | `components/AreaGuide.tsx` |
| Top nav (auto-derives tabs from `AREAS`) | `components/AreaNav.tsx` |
| The "Where can I ride?" overview map | `components/AreaMap.tsx` (`src` prop) |
| The route card / static + interactive maps | `components/RouteCard`, `StaticMap`, `ExpandableMap`, `RouteMap` |
| The page route | `app/<area>/page.tsx` |
| Overview-map data | `public/data/<area>-mvum.geojson` (auto) |
| Featured-route tracks | `public/gpx/<route-id>.gpx` (auto) |

A page file is just:

```tsx
import { getArea } from "@/lib/areas";
import { AreaGuide } from "@/components/AreaGuide";
const area = getArea("<area-id>");
export const metadata = { title: "... — Field Guide", description: "..." };
export default function Page() { return <AreaGuide area={area} />; }
```

Add an area to `AREAS` and the nav tab appears automatically.

---

## 2. Data sources

### USFS Motor Vehicle Use Map (MVUM) — geometry + legal access

ArcGIS REST service, **national** (covers the whole US — you window into it with
a bounding box):

```
https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_MVUM_01/MapServer
  Layer 1 = Roads
  Layer 2 = Trails
```

Always send a `User-Agent` header. Coordinates are lon/lat (WGS84, `outSR=4326`).
Bounding boxes are `xmin,ymin,xmax,ymax`.

Fields we use:

| Field | Meaning |
|---|---|
| `id` | Forest road number, e.g. `3N16`, `5N12.1` |
| `name` | Road name (often ALL CAPS) |
| `mvum_symbol_name` | e.g. *"Roads open to all Vehicles, Yearlong"* vs *"…highway legal vehicles only…"* |
| `motorcycle`, `other_ohv_lt50inches`, `atv` | `"open"` (or null) — non-null = OHV class allowed |
| `seasonal` | `yearlong` vs a seasonal window |
| `gis_miles` | Segment length (real) |
| `operationalmaintlevel` | `2 - HIGH CLEARANCE` (rougher) … `3 - PASSENGER CARS` (smoother) — informs difficulty |
| `forestname` | Sanity-check you queried the right forest |

**Access classification (the core rule):**

- `green` (green-sticker OHV allowed) when any of `motorcycle` /
  `other_ohv_lt50inches` / `atv` is `"open"`, **or** `mvum_symbol_name`
  contains "open to all".
- `plate` (street-legal plated only) otherwise.
- A featured route spanning multiple segments is **`partial`** if it has both
  green and plate segments, else `yes` / `no`.

### SRTM elevation — opentopodata.org (best-effort)

`https://api.opentopodata.org/v1/srtm90m?locations=lat,lng|lat,lng…`
≤100 points per request, ~1 req/s (we sleep 1.2s between routes). If it fails
the card simply omits the elevation strip — never blocks the build.

---

## 3. Step-by-step

### Step 0 — Pick a bounding box and confirm coverage

Find the riding area, draw a rough bbox, and check it actually has MVUM roads.
Tune the bbox so the overview map is centered on the riding, not 80% empty
desert. Useful one-liners (see the Appendix for a fuller dump):

```bash
UA="Mozilla/5.0 (research)"
BASE="https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_MVUM_01/MapServer"
BBOX="-120.05,34.40,-119.55,34.80"   # xmin,ymin,xmax,ymax
curl -s -A "$UA" "$BASE/1/query?geometry=$BBOX&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects&returnCountOnly=true&f=json"
```

If the count is ~0, it's BLM/state land or a forest the MVUM doesn't cover —
reconsider the area. **Not every national forest is in EDW.** Confirmed gaps:

- **Angeles N.F. (the LA forest) is absent entirely** — `forestname LIKE '%Angeles%'`
  returns 0 on both `EDW_MVUM_01` and `EDW_MVUM_02`. Its travel-management plan
  was never published to EDW. Don't try to force it; we substituted the
  **Santa Ana Mtns (Cleveland N.F.)** as the LA-area option instead.
- **Oceano Dunes (SLO coast) is state land**, not Forest Service — not in the
  MVUM. The real SLO forest riding is inland (Pozo / La Panza).

SoCal forests confirmed present: San Bernardino, Cleveland, Los Padres. There's
also a sibling service `EDW_MVUM_02` (other regions) worth checking if `_01`
comes up empty for an area you expect to exist.

### Step 1 — Generate the overview map

Add the bbox to `AREAS` in `scripts/fetch-mvum-area.mjs`, then:

```bash
node scripts/fetch-mvum-area.mjs <area-id>
```

Writes `public/data/<area-id>-mvum.geojson` (roads + trails, classified, ~4-dec
precision). Note the printed `counts` — green vs plate. (Most forests are
overwhelmingly plate; the green routes standing out is the whole point.)

### Step 2 — Curate featured routes from real data

Dump the named routes in the bbox (Appendix query) and pick ~6–8, ordered
editorially best→worst. Lead with the green-sticker routes (the scarce, valuable
ones), then notable plated rides. Add an entry to `CONFIG` **and** `BBOX` in
`scripts/build-area-routes.mjs`. Each route:

```js
{
  id: "san-jacinto-ridge",          // url/file slug
  name: "San Jacinto Ridge",
  ids: ["5S09"],                     // MVUM road number(s) — stitched together
  difficulty: "Difficult",          // editorial, informed by maint level + terrain
  summary: "…",                     // one-line hook
  description: "…",                  // 2–3 sentences, grounded in real attributes
  surface: "…", bestSeason: "…",
  highlights: ["…","…","…"],
}
```

Then:

```bash
node scripts/build-area-routes.mjs <area-id>
```

For each route this fetches the segment geometry (bbox-constrained — see
Gotchas), stitches it into one track, classifies access, computes real distance,
pulls SRTM elevation, writes `public/gpx/<id>.gpx`, and emits
`lib/routes/<area>.generated.ts`. Watch the console: distance and elevation
should look sane.

### Step 3 — Reconcile prose with derived access

The script prints each route's derived access (`yes` / `partial` / `no` /
`seasonal`). **Read it and fix your prose** if it disagrees — e.g. don't call a
road "designated green-sticker" if it came back `partial`. The access *badge and
note are auto-generated and authoritative*; your prose must not contradict them.
Re-run Step 2 after edits.

### Step 4 — Register the area

Add to `lib/areas.ts`: import the generated routes and append an `Area`:

```ts
{
  id: "<area-id>",
  name: "Santa Barbara",
  region: "Los Padres National Forest",     // full line
  regionShort: "Los Padres N.F.",           // nav collar
  state: "California",
  blurb: "…area character, 2–3 sentences…", // hero lead paragraph
  mvumGeojson: "/data/<area-id>-mvum.geojson",
  forest: LPNF,                              // { name, url } — add a const if new forest
  routes: <area>Routes,
}
```

### Step 5 — Add the page

Create `app/<area-id>/page.tsx` (template in §1).

### Step 6 — Build, verify, commit

```bash
npm run build                          # must be clean (TS + static gen)
node .claude/skills/impeccable/scripts/detect.mjs --json <changed files>
```

Then run the dev server and screenshot (headless Chrome + puppeteer-core in the
scratchpad is how we "see" it): the hero, the overview map (let it lazy-load),
one route card, and the **nav at 375px** (it scrolls horizontally — confirm no
page overflow and the wordmark stays on one line). Check the console is clean.
Commit with the data + scripts + page together.

---

## 4. Gotchas & lessons (read these — we hit all of them)

1. **National road-number collisions.** Road numbers like `6S13` repeat across
   ~150 forests. Querying by `id` alone stitched Thomas Mtn to same-numbered
   roads three states away (66 mi "rides"). **Every road lookup must be
   bbox-constrained.** `build-area-routes.mjs` does this via the `BBOX` map —
   keep it in sync with the area.

2. **Editorial vs. derived access drift.** It's easy to write "green-sticker
   road" and have the MVUM say `partial`. Always reconcile (Step 3). The MVUM
   wins.

3. **Overlapping areas — prefer one area with two characters.** We first split
   the San Jacintos into "Palm Springs" (desert/green-sticker side) and
   "Idyllwild" (forested/plated side), but their bounding boxes overlapped and
   the two overview maps showed the same ground — they read as duplicates. We
   merged them into one `san-jacinto` area covering the whole range; the
   green-vs-plate map coloring already tells the "two characters" story on a
   single map. Lesson: if two candidate areas share a mountain range / ranger
   district and their bboxes overlap, make them **one** area, not two. Only
   split when the bboxes are genuinely disjoint.

4. **bbox tuning is iterative.** Too wide → the overview map is mostly empty and
   pulls in a neighboring area's roads; too tight → featured roads fall outside
   and get skipped (logged as `! no MVUM features`). Routes outside the bbox are
   skipped gracefully, so widen or re-pick.

5. **Most roads are plate-only.** That's not a bug — green-sticker access is
   genuinely the exception. Lead with the truth; if an area is all-plate (like
   Idyllwild), say so and point riders to where the green-sticker riding is.

6. **Keep the colored overlay vivid.** The overview map ages only the *tile
   pane* (`.area-map .leaflet-tile-pane` sepia filter) so the green/blue route
   coloring isn't desaturated. Don't put the vintage filter on the whole map.

7. **Escape third-party text in tooltips.** MVUM `name`/`id` go through HTML
   escaping in `AreaMap` before interpolation. Keep it.

8. **Big Bear is the odd one out.** Its routes are hand-authored from
   OpenStreetMap geometry (`lib/routes/big-bear.ts`), predating this pipeline.
   New areas use the MVUM-derived `*.generated.ts` flow. Don't "regenerate" Big
   Bear.

9. **Legal context is statewide.** The SB 586 / sticker section in `AreaGuide`
   is California-wide and shared — no per-area edits needed (unless you add a
   non-CA area, which would need its own rules).

---

## 5. Appendix — named-routes dump

Swap `BBOX` and run to see what's rideable, with access, before curating:

```bash
UA="Mozilla/5.0 (research)"
BASE="https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_MVUM_01/MapServer"
BBOX="-120.05,34.40,-119.55,34.80"
curl -s -A "$UA" "$BASE/1/query?geometry=$BBOX&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=id,name,mvum_symbol_name,seasonal,motorcycle,other_ohv_lt50inches,atv,gis_miles,operationalmaintlevel,forestname&returnGeometry=false&f=json" | python3 -c '
import sys,json,collections
feats=json.load(sys.stdin).get("features",[])
named=collections.defaultdict(lambda:[0.0,False])
for f in feats:
  a=f["attributes"]; nm=(a.get("name") or "").strip().title(); rid=a.get("id") or ""
  sym=(a.get("mvum_symbol_name") or "").lower()
  g=any(str(a.get(k)).lower()=="open" for k in ("motorcycle","other_ohv_lt50inches","atv")) or "open to all" in sym
  named[(nm,rid)][0]+=a.get("gis_miles") or 0; named[(nm,rid)][1]|=g
for (nm,rid),(mi,g) in sorted(named.items(),key=lambda x:-x[1][0]):
  if nm: print(f"  {nm:28s} {rid:8s} {mi:5.1f}mi  green={g}")
'
```

Layer 2 (`/2/query…`) is trails — dedicated OHV singletrack like
`Wheeled OHV <50"` or `Trails open to motorcycles`. Worth a look; some areas
have great trail riding the road layer misses.
