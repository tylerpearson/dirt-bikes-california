# Plan 004: Add vitest with registry invariant checks and unit tests for the pure libs

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c7261bf..HEAD -- lib package.json scripts .github/workflows`
> If `lib/` files changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. (Changes to `lib/routes/*.generated.ts`
> or `lib/areas.ts` content are expected and fine — the invariants test data,
> not specific values.)

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW (additive: new devDependency, new test files, one script, one CI line)
- **Depends on**: none strictly; run after plans/003-add-ci-workflow.md so step 6 can wire tests into CI
- **Category**: tests
- **Planned at**: commit `c7261bf`, 2026-07-01

## Why this matters

This site's one real data-integrity failure mode is drift between the hand-written registry (`lib/areas.ts`) and generated artifacts (`lib/routes/*.generated.ts`, `public/gpx/*.gpx`, `public/data/*.geojson`). It already happened once: a loop referenced a route id from a different area and the page silently dropped a leg of the loop (fixed in plan 001). Nothing guards this today — the repo has zero tests. This plan adds vitest, a registry invariant suite that makes that whole bug class impossible to merge (once CI runs it), and unit tests for the pure geometry/stats libs that everything renders from.

## Current state

- No test runner, no test files, no `test` script. `package.json` devDependencies include TypeScript 5, `@types/node` 20; the repo uses npm (`package-lock.json`).
- TypeScript path alias: `tsconfig.json` maps `@/*` to `./*`. Test files should import with relative paths or the alias — the vitest config in step 1 wires the alias.
- Key facts about the code under test:

`lib/areas.ts` exports `AREAS: Area[]` (12 areas). Each `Area` has `id`, `mvumGeojson` (e.g. `"/data/big-bear-mvum.geojson"`, a path under `public/`), `routes: Route[]`, and optional `loops?: AreaLoop[]` where `AreaLoop.routeIds: string[]` must each match a `Route.id` in the same area's `routes`. Each `Route.id` also names its GPX file: `public/gpx/<id>.gpx`.

`lib/track-stats.ts` (pure, no fs):

```ts
export function trackStats(points: TrackPoint[]): TrackStats        // single part
export function trackStatsFromParts(parts: TrackPoint[][]): TrackStats
```

Semantics to test (documented in the file, lines 36–42): distance/gain/loss accumulate WITHIN parts only; gaps between parts add nothing. `hasElevation` is true only if EVERY point has a numeric `ele`. Distances are miles (haversine, R=6371000 m).

`lib/tiles.ts` (pure, no fs):

```ts
export function centeredMap(lat, lng, { zoom = 12, width = 600, height = 400 } = {}): MapRender
export function trackMap(points: LatLng[], { width = 600, height = 400, padding = 64, minZoom = 9, maxZoom = 15, segments = [] } = {}): MapRender
```

Semantics to test: `centeredMap` puts `pin` at the exact frame center; `trackMap` picks the highest zoom in [minZoom, maxZoom] whose projected bbox fits the padded frame, projects every point into frame coordinates, and sets `start`/`end` to the first/last path points.

`lib/gpx.ts` (reads from `process.cwd()/public/gpx/<file>`):

```ts
export function loadTrack(file: string): TrackPoint[]       // [] on missing/unparseable
export function loadTrackParts(file: string): TrackPoint[][] // one entry per <trkseg>
```

- The two data scripts each carry a private copy of the per-area bounding boxes, which must stay in lockstep or the overview map and the route builder query different windows:
  - `scripts/fetch-mvum-area.mjs` — `const AREAS = { "big-bear": "-117.05,34.15,-116.70,34.35", ... }` (starts ~line 23)
  - `scripts/build-area-routes.mjs` — `const BBOX = { "san-jacinto": ..., "big-bear": ... }` (starts ~line 22)

  They match today. Do NOT import these scripts in tests — both have top-level side effects (they fetch from government APIs and write files when executed). Compare their text.
- CI (if plan 003 landed): `.github/workflows/ci.yml` with steps `npm ci` → `npm run typecheck` → `npm run lint` → `npm run build`.

## Commands you will need

| Purpose   | Command             | Expected on success |
|-----------|---------------------|---------------------|
| Install   | `npm install`       | exit 0              |
| Add dep   | `npm install -D vitest` | exit 0          |
| Tests     | `npm test`          | all pass (after step 1) |
| Typecheck | `npx tsc --noEmit`  | exit 0              |
| Lint      | `npm run lint`      | exit 0              |

## Scope

**In scope**:
- `package.json` / `package-lock.json` (add `vitest` devDependency and a `test` script)
- `vitest.config.ts` (create)
- `tests/registry.test.ts` (create)
- `tests/track-stats.test.ts` (create)
- `tests/tiles.test.ts` (create)
- `tests/gpx.test.ts` (create)
- `.github/workflows/ci.yml` (append one step, only if it exists)
- `tsconfig.json` ONLY if the `tests/` dir needs including (its `include` may already cover `**/*.ts`; check first)

**Out of scope** (do NOT touch):
- Any file in `lib/`, `components/`, `app/`, `scripts/` — this plan is purely additive; if a test reveals a genuine bug in source, report it, don't fix it.
- `lib/routes/*.generated.ts`, `public/gpx/`, `public/data/` — test them, never modify them.
- Extracting the duplicated bbox tables into a shared module — deliberately deferred (see Maintenance notes).

## Git workflow

- Branch: `add-tests` (short kebab-case, merged via PR)
- Commit message style: imperative sentence, e.g. `Add vitest: registry invariants and unit tests for the pure libs`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Install vitest and wire the scripts

```bash
npm install -D vitest
```

Add to `package.json` scripts: `"test": "vitest run"`.

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname) },
  },
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
```

**Verify**: `npm test` → runs, reports "no test files found" or 0 tests (exit code may be nonzero until step 2 adds files — that's expected; just confirm vitest executes).

### Step 2: Registry invariants — `tests/registry.test.ts`

Import `{ AREAS }` from `@/lib/areas` and use `node:fs` + `node:path` (files resolve from `process.cwd()`; vitest runs from the repo root). Write these tests:

1. **Loop route ids resolve**: for every area with `loops`, every `loop.routeIds` entry exists in that same area's `routes.map(r => r.id)`. On failure, the assertion message must name the area, loop, and missing id. (This is the plan-001 bug class.)
2. **Route ids are globally unique**: collect all `route.id` across all areas; no duplicates.
3. **Area ids are unique** and every `area.routes` is non-empty.
4. **GPX file exists per route**: for every route, `public/gpx/<route.id>.gpx` exists and its content includes `<trkpt`.
5. **Overview GeoJSON exists per area**: for every area, the file at `public` + `area.mvumGeojson` exists and `JSON.parse`s to an object with a non-empty `features` array.
6. **Loop distances are sane**: every `loop.distanceMiles` is a finite number > 0 (they're editorial composites; no tighter bound).
7. **Script bbox parity**: read `scripts/fetch-mvum-area.mjs` and `scripts/build-area-routes.mjs` as text; extract each file's area→bbox map with the regex `/"([a-z-]+)": "(-?[\d.]+,-?[\d.]+,-?[\d.]+,-?[\d.]+)"/g` applied to the text between `const AREAS`/`const BBOX` and the next `};`. Assert every key present in BOTH maps has an identical value. (Keys may legitimately differ one-way only if one script gains an area first — assert only on the intersection, but assert the intersection is non-empty and ≥ 8 entries.)

**Verify**: `npx vitest run tests/registry.test.ts` → all pass. Then temporarily break one id in memory to prove the test bites: not needed as a committed step — instead confirm test 1 fails if you edit a routeId locally, then revert (`git diff --stat` must show `lib/areas.ts` unmodified afterward).

### Step 3: `tests/track-stats.test.ts`

Test `trackStats` / `trackStatsFromParts` from `@/lib/track-stats`:

- Two points 0.01° apart in latitude at lng 0 → distance ≈ 0.691 mi (1.11195 km); assert with tolerance ±0.01.
- Elevation: points with `ele` 100 m → 130 m → 110 m gives gainFt ≈ 30 m × 3.28084 (±0.1), lossFt ≈ 20 m × 3.28084, minFt ≈ 328.084, maxFt ≈ 426.5.
- `hasElevation` is false when any point lacks `ele`, and then gain/loss/min/max are 0.
- Multi-part gap skipping: two parts far apart; total distance equals the sum of within-part distances (compare `trackStatsFromParts([a, b])` against `trackStats(a).distanceMiles + trackStats(b).distanceMiles`, tolerance ±1e-9).
- Empty input: `trackStatsFromParts([])` returns distance 0 and `hasElevation` false. (Note: `all.every(...)` on an empty array is true, but `all.length > 0` guards it — assert `hasElevation === false`.)

**Verify**: `npx vitest run tests/track-stats.test.ts` → all pass.

### Step 4: `tests/tiles.test.ts`

Test `centeredMap` / `trackMap` from `@/lib/tiles`:

- `centeredMap(34, -117)` → `pin` is `{ left: 300, top: 200 }` (center of default 600×400); `tiles` non-empty; every tile `src` matches `https://tile.openstreetmap.org/12/…`.
- `trackMap` with two points spanning ~0.01° → chooses a high zoom (assert path points are inside the frame: every `left` in [0, 600], `top` in [0, 400], with padding respected within tolerance — assert within `[padding - 1, width - padding + 1]` for the bbox extremes on the longer axis).
- `trackMap` with points spanning several degrees → zoom clamps at `minZoom` (9); tile srcs start with `/9/`.
- `start`/`end` equal the projected first and last input points.
- Segments passed in are projected into the same frame: give one segment identical to the track and assert its projected points equal `path` (deep-equal within 1e-9).

**Verify**: `npx vitest run tests/tiles.test.ts` → all pass.

### Step 5: `tests/gpx.test.ts`

`loadTrack`/`loadTrackParts` read from `public/gpx/`, so test against committed data plus a missing-file case (no fixtures written into `public/`):

- `loadTrack("does-not-exist.gpx")` → `[]`.
- Pick the first area's first route id from `AREAS` (import it) and load `<id>.gpx`: result has `length > 1`; every point has `lat` in [32, 36], `lng` in [-121, -114] (SoCal bounds); if any point has `ele`, it parses as a finite number.
- `loadTrackParts` on the same file → non-empty array of non-empty parts; flattened length equals `loadTrack` length.

Keep assertions structural (counts, ranges), never exact coordinates — the files regenerate.

**Verify**: `npx vitest run tests/gpx.test.ts` → all pass.

### Step 6: Wire tests into CI (conditional)

If `.github/workflows/ci.yml` exists (plan 003), add after the `npm run build` step:

```yaml
      - run: npm test
```

If it does not exist, skip and note it in your report.

**Verify**: YAML still parses (`npx --yes js-yaml .github/workflows/ci.yml`).

### Step 7: Full gate

**Verify**: `npm test` → all suites pass (expect ~20+ tests). `npx tsc --noEmit` → exit 0. `npm run lint` → same result as before this plan (lint may or may not cover `tests/`; it must not get WORSE).

## Test plan

This plan IS the test plan. Coverage summary: registry integrity (7 invariants), `lib/track-stats.ts` (5 cases), `lib/tiles.ts` (5 cases), `lib/gpx.ts` (3 cases). Nothing here tests React components — the pure data/geometry layer is where regressions are silent and cheap to catch.

## Done criteria

- [ ] `npm test` exits 0; test files exist for registry, track-stats, tiles, gpx
- [ ] Registry suite includes the loop-routeId invariant (grep: `grep -l "routeIds" tests/registry.test.ts`)
- [ ] `npx tsc --noEmit` exits 0
- [ ] `git status` shows no modifications outside the in-scope list (in particular: nothing in `lib/`, `public/`, `scripts/`)
- [ ] CI workflow (if present) runs `npm test`
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Any registry invariant FAILS against current data — that's a real data bug (like plan 001's); report which invariant and the offending ids instead of loosening the test.
- vitest cannot resolve the `@/` alias or TS setup after two config attempts — report the exact error.
- The bbox-parity regex extracts fewer than 8 entries from either script (the scripts' format drifted; the test needs a different extraction strategy, which is a re-plan).
- You feel the need to modify any file in `lib/` or `scripts/` to make a test pass.

## Maintenance notes

- The bbox parity test is a text-level check by design: importing the scripts would execute their top-level fetch/write side effects. The clean long-term fix is extracting the bbox table into a shared `scripts/area-bboxes.mjs` imported by both scripts and the test — deferred because it touches the regen pipeline, which can only be fully verified against the live government APIs.
- When an area is added (see `docs/adding-an-area.md`), these invariants run against it for free; the "adding an area" docs' manual verify step could eventually point at `npm test`.
- Route GPX/geojson checks assert existence and structure, not values, so `node scripts/build-area-routes.mjs` regens won't break tests unless they orphan files.
