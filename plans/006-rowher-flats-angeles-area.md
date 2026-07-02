# Plan 006: Add the Rowher Flats (Angeles NF) riding area via a TrailNFS/RoadBasic pipeline variant

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat a17800f..HEAD -- scripts lib/areas.ts lib/types.ts components/AreaGuide.tsx docs README.md app`
> If in-scope files changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.
>
> **Network required**: this plan runs the data pipeline against live federal
> ArcGIS services and opentopodata.org, exactly like the repo's existing
> fetch/build scripts. If those services are unreachable, STOP.

## Status

- **Priority**: P2
- **Effort**: L (multi-day: new pipeline variant + curated area + editorial passes)
- **Risk**: MED (new data source; road access classes need editorial judgment)
- **Depends on**: none (plans 001–005 landed)
- **Category**: direction
- **Planned at**: commit `a17800f`, 2026-07-01

## Why this matters

The homepage scope box literally promises this area ("Federal OHV areas like Rowher Flats count too", `app/page.tsx` scope paragraph) but no Angeles National Forest area exists. Angeles is the fourth and last SoCal Adventure Pass forest, and Rowher Flats is the closest designated green-sticker riding to Los Angeles proper, with genuine motorcycle-only singletrack. The catch, established by a completed data spike (2026-07-01): **Angeles is the only California forest absent from the EDW MVUM MapServer** the existing USFS pipeline uses, so this area needs a pipeline variant built on two sibling federal datasets. The BLM areas already set the precedent for a variant pipeline plus an `AreaSource` override; this follows the same shape.

## Current state (repo)

- `scripts/fetch-mvum-area.mjs` — pre-bakes per-area overview GeoJSON from the EDW MVUM service (`https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_MVUM_01/MapServer`, layer 1 roads / layer 2 trails). Classifies `access: "green" | "plate"` from the MVUM motorcycle/OHV columns. **Returns zero Angeles features — do not try to use it for this area.**
- `scripts/build-area-routes.mjs` — builds featured routes + GPX from the same MVUM service (editorial CONFIG at top, mechanics at bottom: `fetchFeature`, `segAccess`, `stitch`, `fetchElevations`, GPX writer with `escXml`, TS emitter). Same caveat.
- `scripts/fetch-blm-area.mjs` and `scripts/build-blm-routes.mjs` — **the precedent to copy.** Same pipeline shape against a different ArcGIS service (BLM GTLF), with its own access classifier. Read both fully before writing any code; the new scripts should mirror their structure, naming, comments, and politeness (User-Agent header, 1.2 s sleeps for opentopodata).
- `lib/areas.ts` — area registry. BLM areas show how a non-MVUM area registers: a `source: AreaSource` override supplies `overviewLabel`, `overviewIntro`, optional `legend` labels, `attribution`, `verifyNote`, `credit` (see the `jawbone` entry as the exemplar). `forest` supplies the managing-unit link and `closuresUrl`.
- `lib/types.ts` — `GreenStickerStatus` includes `"unconfirmed"` ("could not verify against an authoritative source") — this plan uses it for roads.
- `components/AreaGuide.tsx` — shared page body; consumes `area.source` for BLM-style areas (disjoint track parts drawn as neutral polylines). No changes needed.
- `components/AreaNav.tsx` — groups areas by `forest.name` into a 4-column mega-menu; the packing logic explicitly handles a 5th group (drops into the shortest column). No code change expected; verify visually.
- `docs/adding-an-area.md` and `docs/adding-a-blm-area.md` — the end-to-end playbooks; `docs/area-review-process.md` — the six editorial/QA passes every area must run before it ships. Read all three.
- `tests/registry.test.ts` — invariants that automatically cover a new area (loop ids resolve, unique route ids, GPX file exists per route, overview GeoJSON exists and non-empty). The bbox-parity test only inspects the two existing USFS scripts; a new script does not affect it.
- `README.md` — the twelve-area list (grouped by managing unit) must gain the new area (plan 005's maintenance note).

## Current state (spike findings — the data, verified 2026-07-01)

**Angeles has no MVUM GIS.** `EDW_MVUM_01` and `EDW_MVUM_02` contain 106 forests including every other CA forest; `forestname LIKE '%Angeles%'` returns 0 on all layers. Angeles publishes its MVUM only as georeferenced PDF sheets (Avenza, "Angeles MVUM Front/Back", US Forest Service R5).

**Trails come from the national trails inventory** — `https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_TrailNFSPublish_01/MapServer/0`:

- Filter: `admin_org LIKE '0501%'` (0501 = Angeles) `AND terra_motorized='Y'` → 25 segments.
- Useful fields: `trail_no`, `trail_name`, `mvum_symbol`, `terra_motorized`, `motorcycle_managed` (e.g. `01/01-12/31`), `atv_managed`, `fourwd_managed`, `gis_miles`, geometry.
- MVUM trail symbol meanings (pulled from the national MVUM layer): 5/6 = open to all vehicles (yearlong/seasonal), 7/8 = vehicles 50 inches or less, 9/10 = motorcycles only, 11/12 = special designation, 16/17 = wheeled OHV under 50 inches. Odd numbers yearlong, evens seasonal.
- The Rowher Flat system (all yearlong, all with managed motorcycle use):
  - Symbol 7 (green-sticker bikes + quads): 3414W07 Buffer 3.1 mi, 3414W22 Broken Spoke 2.9, 3414W28 Sierra 2.2, 3414W32 Break 2.1, 3414W20 Flat 1.9, 3415W15 Texas 1.7, 3414W05 Spring 1.4, 3414W24 Mine 1.4, 3414W26 Sidewinder 1.3, 3414W27 Bouquet 1.5, 3415W05 Portal 1.2, 3414W08 Ridge 1.2, 3414W10 Stage 0.8, 3414W09 Coyote 0.6, 3414W23 Knob 0.7, 3414W31 Arc 0.7, 3414W25 Bypass 0.3, 3414W06 TK 0.2.
  - Symbol 9 (motorcycles only — real singletrack): 3415W16 Silverking 1.4 mi, 3415W18 Yucca 1.0, 3414W33 King Snake 0.7.
  - Symbol 11 (special designation): 3414W19 Rowher 4x4 5.0 mi, 3414W34 Lookout 4x4 2.7 mi.
  - Symbol 0 (not currently designated — EXCLUDE): 3411W01 Shortcut (San Gabriel Canyon, closed area), 4434W15 Alimony 4x4 (Littlerock side, centroid 34.462, -117.998).
- Cluster location: centroids span lat 34.51–34.56, lng -118.44 to -118.35 (Sierra Pelona country north of Santa Clarita), with Portal at 34.615, -118.442 and Bypass at 34.641, -118.38 further north.

**Roads come from the roads inventory** — `https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_RoadBasic_01/MapServer/0`:

- Filter: `admin_org LIKE '0501%'` (158 records forest-wide). Useful fields: `id`, `name`, `symbol_name`, `gis_miles`, geometry.
- Segment-suffix id format matches the repo's existing multi-id handling: Santa Clara Divide is `3N17.1` … `3N17.9` (~46 mi total), plus `8N04` Old Ridge Route, `6N07` Sierra Pelona Rd (9.3 mi), `6N08` Artesian Springs (4.6), `5N04.1` Little Rock Canyon, `5N13.1` Rush Cyn Rd (the Rowher access road — riding on it is prohibited), `6N04.2` Leona Divide, `2N23` Shortcut Edison (8.9).
- **`symbol_name` here is maintenance symbology** ("Dirt Road, Suitable for Passenger Car" etc.), NOT an MVUM access class, and `openforuseto` is uniformly "ALL". There is no machine-readable green-vs-plate class for Angeles roads. Note: `2N24` (Rincon-Redbox) was not found under that id — probe alternatives (`2N24%`) during the build; if absent, drop it from candidates.

**Access model decision (already made — implement, don't relitigate):** trails get machine-derived access from `mvum_symbol` (7/16 → `greenSticker: "yes"`, 9 → `"yes"` with a motorcycles-only note, 11 → `"yes"` with a note to check special-designation rules posted on the MVUM). Featured roads get `greenSticker: "no"` ONLY where the maintainer verifies plate-only status against the published Angeles MVUM PDF; otherwise `"unconfirmed"` with the honest note. The `AreaSource.verifyNote` must say route data comes from the Forest Service trail and road inventories, not the MVUM GIS, and point riders at the published MVUM.

**Status and closures (as of 2026-07-01):** Rowher Flat OHV Area is open year-round (intermittent flood closures; access via Rush Canyon Rd off Sierra Highway; three staging areas; $5/day or $30/year Adventure Pass; spark arrester required). San Gabriel Canyon OHV Area is closed (Forest Order 05-01-26-09) — out of scope, exclude. Eaton Fire closure order 05-01-26-04 runs through 2027-12-31 on the front range (does not touch the Rowher/Sierra Pelona country, but Santa Clara Divide's east end approaches burn-area country — verify each featured road against the current alerts page and add closure notes per the existing pattern). Forest alerts: `https://www.fs.usda.gov/r05/angeles/alerts`.

**Starting bbox** (refine against fetched data): `-118.65,34.35,-118.05,34.70` — Sierra Pelona / Rowher / Santa Clara Divide corridor, deliberately excluding the closed San Gabriel Canyon front country.

## Commands you will need

| Purpose   | Command             | Expected on success |
|-----------|---------------------|---------------------|
| Install   | `npm install`       | exit 0              |
| Typecheck | `npm run typecheck` | exit 0              |
| Lint      | `npm run lint`      | exit 0              |
| Tests     | `npm test`          | all pass (registry invariants must pass with the new area) |
| Build     | `npm run build`     | exit 0              |
| Fetch     | `node scripts/fetch-angeles-area.mjs` (created in step 1) | writes `public/data/rowher-flats-angeles.geojson` |
| Routes    | `node scripts/build-angeles-routes.mjs rowher-flats` (created in step 2) | writes GPX + `lib/routes/rowher-flats.generated.ts` |

## Scope

**In scope**:
- `scripts/fetch-angeles-area.mjs` (create)
- `scripts/build-angeles-routes.mjs` (create)
- `public/data/rowher-flats-angeles.geojson` (generated)
- `public/gpx/rowher-*.gpx` and any plated-road GPX for this area (generated)
- `lib/routes/rowher-flats.generated.ts` (generated)
- `lib/areas.ts` (register the area: entry + `AreaId` union member)
- `app/rowher-flats/page.tsx` (create, copying an existing area page)
- `README.md` (add the area to the grouped list; add the new scripts to the regen section)
- `docs/adding-an-angeles-area.md` OPTIONAL — only if the docs pass in step 7 decides the variant deserves its own playbook page; otherwise a short "Angeles variant" section appended to `docs/adding-an-area.md`
- `plans/README.md` (status row)

**Out of scope** (do NOT touch):
- `scripts/fetch-mvum-area.mjs`, `scripts/build-area-routes.mjs`, `scripts/fetch-blm-area.mjs`, `scripts/build-blm-routes.mjs` — the existing pipelines must not change.
- San Gabriel Canyon OHV and the Littlerock side (Alimony 4x4) — closed or undesignated; a future area if they reopen.
- `components/` — the shared page body and nav handle a new area/group without changes; if you find yourself editing a component, STOP.
- Existing areas' data and prose.

## Git workflow

- Branch: `rowher-flats-area` (branched from current main)
- Commit per logical unit (scripts, then generated data, then registry+page, then docs), imperative messages matching repo history
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: `scripts/fetch-angeles-area.mjs` — overview GeoJSON

Copy the structure of `scripts/fetch-blm-area.mjs` (header comment explaining source and access model, AREAS table, slimmed GeoJSON output with `metadata.counts` and `metadata.fetched`). Source both layers:

- Trails: `EDW_TrailNFSPublish_01/MapServer/0`, `where=admin_org LIKE '0501%' AND terra_motorized='Y' AND mvum_symbol > 0`, bbox intersect with the area bbox. Emit `access: "green"`, `kind: "trail"`, `seasonal` from even symbol codes, plus a `motoOnly` flag when `mvum_symbol` in (9, 10) if the fetch script's feature properties support it cheaply (the overview map only consumes `id`, `name`, `kind`, `access`, `seasonal` — do not extend the map component).
- Roads: `EDW_RoadBasic_01/MapServer/0`, `where=admin_org LIKE '0501%'`, same bbox. Emit `access: "plate"`, `kind: "road"`. Exclude spur/parking records under 0.15 mi to keep the map legible (mirrors how the BLM fetch trims noise; check its filtering and match the approach).
- Output: `public/data/rowher-flats-angeles.geojson`.

**Verify**: run the script; it prints per-class counts; the trails count is ≥ 20 and roads count is > 30. `python3 -c "import json; d=json.load(open('public/data/rowher-flats-angeles.geojson')); print(len(d['features']))"` → > 50.

### Step 2: `scripts/build-angeles-routes.mjs` — featured routes + GPX

Copy the structure of `scripts/build-blm-routes.mjs` (CONFIG of curated routes, fetch-by-id, stitch, SRTM elevation via opentopodata with 1.2 s sleeps, multi-`<trkseg>` GPX with `escXml`, TS emitter writing `lib/routes/rowher-flats.generated.ts`). Differences:

- Trails fetch by `trail_no` from TrailNFS; roads fetch by `id` from RoadBasic (support both in one script via a per-route `layer: "trail" | "road"` flag, like the USFS script's `layer: 2`).
- Access note templates (respect the writing style: no em dashes, no stacked hyphenated compounds):
  - symbol 7/16 trails: open to vehicles 50 inches or less, so green-sticker bikes are allowed; registration + spark arrester.
  - symbol 9 trails: motorcycles only, true singletrack.
  - symbol 11 trails: designated with special provisions; check the posted MVUM at the staging area.
  - roads: per the published Angeles MVUM (verified `"no"`) or `"unconfirmed"` with the honest "could not verify against the MVUM GIS; the Angeles publishes its MVUM as a printed map" note.
  - Source string: `"USFS trail and road inventories (EDW), 2026"` for machine-derived facts; the note text may reference the published Angeles MVUM where the maintainer verified it.
- Route id convention: prefix trail ids with `rowher-` (e.g. `rowher-4x4`, `rowher-silverking`) to keep the global-uniqueness invariant safe; plated roads use descriptive ids (`santa-clara-divide`, `old-ridge-route`, `sierra-pelona-road`).

Candidate featured routes (editorial — pick 6 to 8, best first, per `docs/area-review-process.md`; short trails should be combined into one featured route where they form a natural loop):

1. Rowher 4x4 Trail (3414W19, 5.0 mi, symbol 11) — the marquee long trail.
2. Silverking singletrack (3415W16, 1.4 mi, symbol 9) possibly combined with Yucca (3415W18) and King Snake (3414W33) as a "Rowher singletrack" feature — all motorcycles only.
3. Buffer + Spring + Stage cluster (3414W07/05/10) as a green loop feature.
4. Broken Spoke + Sidewinder + Sierra (3414W22/26/28).
5. Santa Clara Divide Road (3N17.1–3N17.9, ~46 mi composite) — the plated epic; check the alerts page for the east-end burn-area status and add a closure note if needed.
6. Old Ridge Route (8N04) — historic plated ride; probe for additional `8N04%` segments.
7. Sierra Pelona Road (6N07, 9.3 mi) plated ridge road above the OHV area.

**Verify**: `node scripts/build-angeles-routes.mjs rowher-flats` completes; every configured route prints its `✓` line with distance/access/elevation; `lib/routes/rowher-flats.generated.ts` and one GPX per route exist. `npx tsc --noEmit` → exit 0.

### Step 3: Register the area in `lib/areas.ts`

- Add `"rowher-flats"` to the `AreaId` union and an entry modeled on the `jawbone` entry (it's the non-default-source exemplar):
  - `name: "Rowher Flats"`, `region: "Angeles National Forest"`, `regionShort: "Angeles N.F."`.
  - `forest`: `{ name: "Angeles National Forest", url: "https://www.fs.usda.gov/angeles", closuresUrl: "https://www.fs.usda.gov/r05/angeles/alerts" }`.
  - `source` override: `overviewLabel: "Angeles N.F. inventories"`; `overviewIntro` explaining that the Angeles publishes its MVUM as a printed map, so route lines here come from the Forest Service trail and road inventories: green lines are the designated OHV trails of the Rowher Flat system, blue lines are forest roads for street-legal vehicles; `legend: { green: "Designated OHV trail (green-sticker OK)", plate: "Forest road, street-legal only (verify)" }`; `attribution` and `credit` naming the USFS trail/road inventories; `verifyNote` carrying the honest data-source caveat plus the flood-closure intermittency and the Adventure Pass requirement.
  - `blurb` and `tagline`: hand-written per the writing style rules (no em dashes; keep green-sticker/street-legal/plated as plain adjectives). Content anchors: closest designated green-sticker riding to LA, Rush Canyon staging off Sierra Highway, motorcycle-only singletrack, the plated Santa Clara Divide country above.
  - 1–2 `loops` referencing only route ids that exist in the generated file.
- Create `app/rowher-flats/page.tsx` by copying `app/jawbone/page.tsx` and adjusting id, title, and description.

**Verify**: `npm test` → all pass (registry invariants now cover the new area: loop ids resolve, GPX files exist, GeoJSON non-empty). `npm run build` → exit 0 and the build output lists `/rowher-flats`.

### Step 4: Editorial and QA passes

Run the six passes in `docs/area-review-process.md` (sort best-first → rider review → PM review → trim weak routes → loops → UI critique) against the new page. This is not optional; every existing area went through it. Use `npm run dev` plus a headless browser for the UI pass (the repo memory documents headless Chrome as the verification path).

**Verify**: document each pass's outcome in the PR description or your report; the route order in CONFIG reflects the best-first sort; any route that failed rider review is removed from CONFIG and regenerated.

### Step 5: README and docs

- `README.md`: add an "Angeles National Forest" group with the Rowher Flats bullet (use the registry `tagline`), update the areas count in the intro line, and add the two new scripts to the regen section with one-line comments naming their sources.
- Append a short "Angeles variant" subsection to `docs/adding-an-area.md` (or a separate doc if step 7's judgment says so) recording: Angeles is absent from the EDW MVUM service; the TrailNFS/RoadBasic sources, the `admin_org LIKE '0501%'` filter, the symbol table, and the roads-have-no-access-class caveat.

**Verify**: `grep -c "^- \*\*" README.md` increases by exactly 1 relative to the previous count; `grep -n "Rowher" README.md` matches in the areas list.

### Step 6: Full gate

**Verify**, in order: `npm run typecheck` → 0; `npm run lint` → 0; `npm test` → all pass; `npm run build` → 0. Then load `/rowher-flats` in a browser: hero renders, overview map draws green trails and blue roads with the overridden legend, every route card has a map and elevation profile, loop cards render, nav mega-menu shows a fifth forest group without layout breakage (the packing comment in `components/AreaNav.tsx` says the shortest column absorbs it — confirm visually).

## Test plan

The existing registry invariants in `tests/registry.test.ts` are the safety net and must pass unmodified. Add nothing to the test suite unless a step above reveals a gap; if you believe a new invariant is needed (e.g. every `AreaId` has an `app/<id>/page.tsx`), note it in your report rather than adding it here.

## Done criteria

- [ ] `public/data/rowher-flats-angeles.geojson`, `lib/routes/rowher-flats.generated.ts`, and one GPX per featured route exist and are committed
- [ ] `lib/areas.ts` registers `rowher-flats` with a `source` override; `app/rowher-flats/page.tsx` exists
- [ ] `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` all exit 0
- [ ] Build output includes `/rowher-flats`
- [ ] Trails carry machine-derived access (symbol 9 routes say motorcycles only); no featured road claims `greenSticker: "no"` without a note citing the published Angeles MVUM; anything unverified says `unconfirmed`
- [ ] README lists the area under an Angeles group and documents the new scripts
- [ ] The six review passes from `docs/area-review-process.md` are documented as run
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- TrailNFS returns fewer than 15 motorized Angeles segments, or the `mvum_symbol` field is absent/renamed (the service schema drifted since the 2026-07-01 spike).
- RoadBasic returns no `3N17%` segments (the marquee plated ride is gone from the inventory).
- The Angeles alerts page shows a closure order covering Rowher Flat itself (not just intermittent flood advisories) — the area may not be publishable while closed.
- You cannot write an honest access note for a route without guessing — use `unconfirmed`, and if that would apply to MOST featured routes, stop and report instead (the area may not meet the site's accuracy bar yet).
- Implementing requires touching any `components/` file or an existing pipeline script.

## Maintenance notes

- The Angeles MVUM PDF (Avenza, R5) is the authoritative check for road access classes; if the forest ever lands in the EDW MVUM service, this area should migrate to the standard pipeline and this variant retired.
- San Gabriel Canyon OHV (closed, order 05-01-26-09) and the Littlerock side are the natural follow-up areas if they reopen; the fetch script's bbox and the excluded symbol-0 trails (3411W01, 4434W15) are the starting point.
- Rowher Flat closes intermittently for flooding (1 inch or more of forecast rain); the `verifyNote` must carry this so regens don't lose it.
- Reviewer scrutiny: the access notes (honesty over confidence), the blurb/tagline style (no em dashes, no stacked compounds), and that the fifth nav group doesn't break the mega-menu packing.
