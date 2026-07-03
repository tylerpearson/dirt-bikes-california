# Plan 009: Stop serializing route geometry into every area page; lazy-load it when the map dialog opens

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 19d8670..HEAD -- components/AreaGuide.tsx components/RouteCard.tsx components/ExpandableMap.tsx components/RouteMap.tsx lib/gpx.ts lib/mvum.ts tests/gpx.test.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. (Plan 008 touches only
> `lib/tiles.ts`/`tests/tiles.test.ts` and is compatible either way.)
>
> **Network required**: no for build/tests. The runtime QA step loads OSM
> tiles in a browser; skip gracefully if offline and say so in your report.
>
> **Next.js note (from AGENTS.md)**: this repo's Next.js version has breaking
> changes vs. your training data. Before changing anything about
> client/server component boundaries, read the relevant guide under
> `node_modules/next/dist/docs/`. This plan keeps the existing boundaries
> (only prop shapes change), so you should not need new Next APIs.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none (plan 008 is independent; either order works)
- **Category**: perf
- **Planned at**: commit `19d8670`, 2026-07-03

## Why this matters

Every route card renders the client component `ExpandableMap` and passes it
`points` (the full-resolution GPX track as `{lat,lng}[]`) and `segments`
(MVUM/BLM coordinate runs). Those props exist **only** for the interactive
Leaflet dialog (`RouteMap`), which mounts only if the visitor clicks "Expand
map". Because `ExpandableMap` is a client component, React serializes all its
props into every page's hydration payload regardless of interaction.

Measured on the built site at planning time: `out/san-jacinto.html` is
4,556 KB, containing **24,045** `"lat":` occurrences; all 13 area pages weigh
1.3–4.5 MB while the homepage is ~100 KB. Most visitors pay megabytes of
transfer and main-thread JSON parsing for a dialog they never open.

The fix: the dialog fetches its geometry on open. The GPX file is *already
served* at `/gpx/<route-id>.gpx` (it's the download link in the same dialog),
and the green/plate segment coloring comes from the area GeoJSON that the
overview map on the same page *already fetches* (so it is typically warm in
the browser HTTP cache). This also fixes a latent bug: `RouteMap` currently
shows a permanent "Loading map…" spinner if a track ever has <2 points.

## Current state

- `components/AreaGuide.tsx` (server component) — builds per-route data at
  build time and passes geometry into the client tree:

  ```tsx
  // components/AreaGuide.tsx:54-77 (abridged)
  const cards = area.routes.map((route) => {
    const track = loadTrack(`${route.id}.gpx`);
    const hasTrack = track.length > 1;
    const parts = area.source ? loadTrackParts(`${route.id}.gpx`) : null;
    const segments = parts
      ? parts.map((pts) => ({ access: "track" as const, coords: ... }))
      : loadRouteSegments(area.mvumGeojson, route.forestRoad);
    const map = hasTrack ? trackMap(track, { segments }) : centeredMap(...);
    const points = track.map((p) => ({ lat: p.lat, lng: p.lng }));
    ...
    return { route, map, points, segments, stats };
  });
  ```

  and at `:320-330` renders `<RouteCard ... points={points} segments={segments} ... />`.
  Note `points`/`segments` are ALSO used at `:82-98` to build the loop
  composite maps (`trackById` → `loopMaps`) — that server-side use must keep
  working.

- `components/RouteCard.tsx:30-63` (server component) — forwards
  `points`/`segments` into `<ExpandableMap map={map} points={points}
  segments={segments} label=... routeName=... gpxHref={`/gpx/${route.id}.gpx`}
  directionsHref=... priority=... />`.

- `components/ExpandableMap.tsx` (`"use client"`) — props at `:11-33` include
  `points: LL[]` and `segments?: RouteSegment[]`; they are used in exactly one
  place, `:163`, inside the dialog: `<RouteMap points={points} segments={segments} />`.
  The dialog subtree renders only when `open` is true (`:119`).

- `components/RouteMap.tsx` (`"use client"`) — draws the Leaflet map from the
  props. Key excerpts:

  ```tsx
  // components/RouteMap.tsx:28-35
  const ref = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  ...
  useEffect(() => {
    if (points.length < 2) return;   // <-- leaves `loading` stuck true forever
  ```

  ```tsx
  // components/RouteMap.tsx:62-74 — drawing semantics to preserve
  const drawn = L.featureGroup().addTo(map);
  if (segments.length > 0) {
    for (const seg of segments) {
      const segll = seg.coords.map((p) => [p.lat, p.lng] as [number, number]);
      L.polyline(segll, { color: "#f6efdd", weight: 8, opacity: 0.9 }).addTo(drawn); // casing
      L.polyline(segll, { color: SEG_COLOR[seg.access], weight: 4 }).addTo(drawn);
    }
  } else {
    L.polyline(latlngs, { color: "#f6efdd", weight: 8, opacity: 0.9 }).addTo(drawn);
    L.polyline(latlngs, { color: "#a8492a", weight: 4 }).addTo(drawn);
  }
  ```

  plus start/end circle markers from `latlngs[0]` / `latlngs[latlngs.length-1]`
  (`:76-85`), `map.fitBounds(drawn.getBounds(), { padding: [30, 30] })` (`:87`),
  a tile `load` handler + 6 s fallback that clears `loading` (`:52-58`), and a
  `cancelled` flag + `map.remove()` cleanup (`:93-96`). `SEG_COLOR` at `:11`:
  `{ green: "#3f8f3a", plate: "#3a6e92", track: "#a8492a" }`.

- `lib/gpx.ts` — server-only loaders. `parseTrkpts(xml)` (`:25-44`) is a
  **private** pure regex parser; `loadTrack` (`:12-22`) and `loadTrackParts`
  (`:53-74`, one entry per `<trkseg>`, fallback to whole-file parse) wrap it
  with `readFileSync`.

- `lib/mvum.ts:21-64` — `loadRouteSegments(geojsonPublicPath, forestRoad)`
  mixes `readFileSync` + `JSON.parse` with the pure filtering logic: split
  `forestRoad` on commas into a Set, keep features whose `properties.id` is in
  the set, map `properties.access === "green" ? "green" : "plate"`, explode
  LineString/MultiLineString into `RouteSegment[]` (drop <2-point lines).

- **How the two area families differ** (must be preserved):
  - USFS/MVUM areas (`area.source` undefined): GPX has a single `<trkseg>`;
    the dialog shows green/plate colored segments from the area GeoJSON when
    the route's `forestRoad` ids match, else a single rust line.
  - BLM/Angeles areas (`area.source` set): GPX has one `<trkseg>` per disjoint
    part; the dialog draws each part as its own rust ("track") polyline so
    real gaps aren't bridged. These areas never get green/plate coloring in
    the dialog.

- Error-state convention to copy: `components/AreaMap.tsx:53` uses
  `status: "idle" | "loading" | "ready" | "error"` and renders a "Map
  unavailable" overlay on error (`:207-213`).

- Tests: `tests/gpx.test.ts` covers `loadTrack`/`loadTrackParts` against real
  committed GPX files; use it as the structural pattern.

## Commands you will need

| Purpose   | Command             | Expected on success |
|-----------|---------------------|---------------------|
| Typecheck | `npm run typecheck` | exit 0              |
| Tests     | `npm test`          | all pass            |
| Lint      | `npm run lint`      | exit 0              |
| Build     | `npm run build`     | exit 0, writes `out/` |
| Dev (QA)  | `npm run dev`       | serves localhost:3000 |

## Scope

**In scope** (the only files you should modify):
- `lib/gpx.ts` (extract), `lib/gpx-parse.ts` (create)
- `lib/mvum.ts` (extract a pure function; keep the fs wrapper)
- `components/RouteMap.tsx`
- `components/ExpandableMap.tsx`
- `components/RouteCard.tsx`
- `components/AreaGuide.tsx` (only the `<RouteCard>` prop list)
- `tests/gpx.test.ts`, `tests/mvum.test.ts` (create)

**Out of scope** (do NOT touch, even though they look related):
- `lib/tiles.ts`, `components/StaticMap.tsx` — plan 008's territory.
- `components/AreaMap.tsx`, `components/OverviewMap.tsx` — different maps,
  already lazy.
- `scripts/*`, `public/gpx/*`, `public/data/*` — data format stays exactly
  as-is; this plan must work with the committed files.
- The GPX download link and its `<a download>` markup.
- `AreaGuide`'s loop-map assembly (`:82-98`) — it must keep receiving the
  server-side `points`/`segments`.

## Git workflow

- Branch: `lazy-expand-map-geometry`.
- Commit per step; imperative style (`Extract fs-free GPX parsing`,
  `Lazy-load route geometry in the expand-map dialog`).
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Extract an fs-free GPX parser

Create `lib/gpx-parse.ts` exporting:

- `parseTrkpts(xml: string): TrackPoint[]` — move the function body verbatim
  from `lib/gpx.ts:25-44`.
- `parseTrackParts(xml: string): TrackPoint[][]` — the `<trkseg>` splitting +
  whole-file fallback currently inlined in `loadTrackParts`
  (`lib/gpx.ts:61-73`), operating on a string instead of a file.

Both import `TrackPoint` from `./track-stats` (type-only), no `node:fs`.
Update `lib/gpx.ts` so `loadTrack` = read file + `parseTrkpts`, and
`loadTrackParts` = read file + `parseTrackParts`; behavior identical.

**Verify**: `npm run typecheck && npm test` → exit 0 (the existing
`tests/gpx.test.ts` passes unchanged).

### Step 2: Extract the pure segment filter from `lib/mvum.ts`

In `lib/mvum.ts`, add an exported pure function and make the loader delegate:

```ts
export function routeSegmentsFromGeojson(
  json: { features?: GeoFeature[] },
  forestRoad: string | undefined,
): RouteSegment[]
```

Move the Set-building + feature loop (`lib/mvum.ts:26-63`) into it verbatim;
`loadRouteSegments` keeps only the fs read/JSON.parse/try-catch and calls it.
Export the `GeoFeature` type if the function signature needs it.

**Verify**: `npm run typecheck && npm test` → exit 0.

### Step 3: Make `RouteMap` fetch its own geometry

Change `components/RouteMap.tsx` props from
`{ points: LL[]; segments?: RouteSegment[] }` to:

```ts
{
  /** GPX to draw, e.g. `/gpx/holcomb-valley.gpx` (same file as the download link). */
  gpxHref: string;
  /** Area overview GeoJSON for green/plate coloring (MVUM areas only). */
  geojsonSrc?: string;
  /** Road number(s) to select in the GeoJSON, e.g. "3N16" or "29S02.1, 29S02.2". */
  forestRoad?: string;
}
```

Inside the effect (which already lazy-imports Leaflet):

1. Replace `loading: boolean` with `status: "loading" | "ready" | "error"`
   (mirroring `AreaMap`). The existing tile `load` handler and 6 s fallback set
   `"ready"`; the legend render condition changes from `!loading` to
   `status === "ready"` and the overlay shows "Loading map…" while
   `"loading"` and "Map unavailable" on `"error"`.
2. Fetch in parallel, honoring the existing `cancelled` flag:
   `fetch(gpxHref)` → text → `parseTrackParts` (from `lib/gpx-parse`) →
   `parts: TrackPoint[][]`; and, only when both `geojsonSrc` and `forestRoad`
   are provided, `fetch(geojsonSrc)` → json →
   `routeSegmentsFromGeojson(json, forestRoad)` → `segments`. Any fetch/parse
   failure, non-OK response, or `parts.flat().length < 2` → `setStatus("error")`
   and return **after** clearing state (this fixes the stuck-spinner bug — no
   code path may leave `status` at `"loading"` permanently except the 6 s
   window before the fallback fires). A failed *GeoJSON* fetch alone must NOT
   error the whole map: fall back to `segments = []` and still draw the track.
3. Draw, preserving current semantics exactly:
   - If `segments.length > 0`: casing + `SEG_COLOR[seg.access]` polyline per
     segment, exactly as the current `:62-69` block.
   - Else: for **each part** in `parts`, draw casing + rust `#a8492a`
     polyline. (For MVUM areas the GPX has one `<trkseg>` → one part →
     pixel-identical to today's single-line fallback. For BLM/Angeles areas
     this reproduces today's per-part "track" drawing without gap bridging.)
   - Start marker at the first point of the first part; end marker at the
     last point of the last part (equivalent to today's flattened
     `latlngs[0]`/`latlngs[last]`).
   - `fitBounds` on the drawn feature group; scale control; cleanup — all
     unchanged.
4. Effect deps become `[gpxHref, geojsonSrc, forestRoad]`.

**Verify**: `npm run typecheck` → exit 0 (callers still broken until Step 4 —
if typecheck fails only in `ExpandableMap.tsx` at this point, proceed to
Step 4 and verify both together).

### Step 4: Rewire the prop chain

- `components/ExpandableMap.tsx`: delete the `points`/`segments` props (and
  the now-unused `RouteSegment`/`LL` imports); add
  `geojsonSrc?: string; forestRoad?: string`; render
  `<RouteMap gpxHref={gpxHref} geojsonSrc={geojsonSrc} forestRoad={forestRoad} />`
  at the current `:163` site. Everything else (dialog, focus trap, StaticMap
  trigger) unchanged.
- `components/RouteCard.tsx`: delete `points`/`segments` from props and the
  `ExpandableMap` call; add pass-through `geojsonSrc?: string` and forward
  `forestRoad={route.forestRoad}`.
- `components/AreaGuide.tsx`: in the `<RouteCard>` render (`:320-330`), remove
  `points={points}` and `segments={segments}`; add
  `geojsonSrc={area.source ? undefined : area.mvumGeojson}`. Do NOT remove the
  `points`/`segments` computation in the `cards` map — the loop-map assembly
  at `:82-98` still consumes them. (If TypeScript flags them as unused in the
  returned card object, keep them in the object for the loop maps and drop
  only the RouteCard props.)

**Verify**: `npm run typecheck && npm run lint && npm test` → all exit 0.

### Step 5: Build and measure the payload win

1. `npm run build` → exit 0.
2. `grep -c '"lat":' out/san-jacinto.html` → **must be < 50** (was 24,045).
3. `du -k out/san-jacinto.html out/big-bear.html` → report before/after
   (baseline at planning: 4,556 KB and 4,160 KB; expect multi-MB drops).

### Step 6: Runtime QA (best-effort, requires network for tiles)

Start `npm run dev` and, with headless Chrome or a browser:

1. Open `/big-bear`, click the first route card's map → dialog shows the
   route line with **green/plate colored segments**, start (green) and end
   (red) dots, and the legend once tiles load.
2. Open `/jawbone`, expand "Jawbone Motorized Singletrack" (or any route) →
   multiple **disjoint rust line parts**, no straight bridging lines.
3. Press Escape → dialog closes; reopen → map loads again.
4. Temporarily block or corrupt one GPX response if convenient → "Map
   unavailable" appears instead of an eternal spinner (this can also be
   simulated by pointing one card's `gpxHref` at a bogus path in a scratch
   edit — revert it afterwards).

If you cannot run a browser, state exactly that in your report; steps 1–5
remain the machine gates.

## Test plan

- Extend `tests/gpx.test.ts` (or add cases in place): `parseTrackParts` on a
  synthetic two-`<trkseg>` XML string returns 2 parts; on a `<trkpt>`-only
  string (no `<trkseg>`) returns 1 fallback part; on garbage returns `[]`.
  These become possible now that parsing is fs-free.
- New `tests/mvum.test.ts`: `routeSegmentsFromGeojson` with a synthetic
  FeatureCollection — matches a single id; matches a comma list
  ("29S02.1, 29S02.2"); maps `access: "green"` vs anything-else→"plate";
  explodes MultiLineString; drops single-point lines; returns `[]` for
  undefined `forestRoad`. Model after `tests/gpx.test.ts`.
- Verification: `npm test` → all pass, including the new cases.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` all exit 0
- [ ] `grep -c '"lat":' out/san-jacinto.html` < 50
- [ ] `grep -rn '"points"\|points={points}' components/RouteCard.tsx components/ExpandableMap.tsx` returns no matches (prop fully removed)
- [ ] New tests for `parseTrackParts` and `routeSegmentsFromGeojson` exist and pass
- [ ] `git status` shows no modified files outside the in-scope list
- [ ] `plans/README.md` status row updated (note whether runtime QA ran)

## STOP conditions

Stop and report back (do not improvise) if:

- Code at the "Current state" locations doesn't match the excerpts.
- After Step 5, the `"lat":` count is ≥ 50 — something else is serializing
  geometry; find and name it in your report, don't patch blindly.
- The green/plate coloring in the dialog needs data that is NOT in the area's
  `/data/*.geojson` (i.e. `routeSegmentsFromGeojson` on the fetched file
  returns empty for a route that visibly had colored segments before). The
  build-time path reads the same file, so this indicates a logic gap — stop.
- You find yourself wanting to change the GPX file format, the pipeline
  scripts, or `AreaMap` — out of scope.
- A step's verification fails twice after a reasonable fix attempt.

## Maintenance notes

- The dialog now refetches on every open (component unmounts on close);
  browser HTTP cache makes this cheap. If it ever feels slow, memoize the
  parsed geometry in a module-level Map keyed by `gpxHref` — deliberately
  deferred for simplicity.
- If plan 012 (pipeline consolidation) later changes GPX emission, the
  `<trkseg>`-per-part contract is what this dialog (and `loadTrackParts`)
  depends on — keep it.
- Reviewers should scrutinize: the error path (no stuck spinner), the BLM
  multi-part drawing (no bridged gaps), and that `AreaGuide`'s loop maps
  still render (server-side geometry use was kept).
- Deferred follow-up: the `map: MapRender` prop is still serialized per card;
  plan 008 shrinks it. A further step (moving the StaticMap trigger out of
  the client component) was considered and rejected as not worth the
  restructuring.
