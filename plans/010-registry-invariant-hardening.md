# Plan 010: Harden the registry invariants — orphaned artifacts and all three pipeline bbox pairs

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 19d8670..HEAD -- tests/registry.test.ts scripts lib/areas.ts public/gpx public/data`
> If in-scope files changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.
>
> **Network required**: no.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (recommended before plan 012, whose refactor these
  tests then guard)
- **Category**: tests
- **Planned at**: commit `19d8670`, 2026-07-03

## Why this matters

The registry test suite guards route→GPX existence and one bbox table pair,
but three drift classes it was built for slip through:

1. **Orphaned artifacts**: `docs/area-review-process.md:90-102` (Pass 4,
   trimming weak routes) explicitly warns that removing a route must also
   delete "the orphaned `public/gpx/<id>.gpx`", or a later regen can resurrect
   it — yet nothing checks the reverse direction (file → route). Same for
   `public/data/*.geojson` vs. the areas that reference them.
2. **Fetch/build bbox drift in the newer pipelines**: the existing test pins
   `fetch-mvum-area.mjs` against `build-area-routes.mjs`, but the BLM pair
   (`fetch-blm-area.mjs` / `build-blm-routes.mjs`) and Angeles pair
   (`fetch-angeles-area.mjs` / `build-angeles-routes.mjs`) — the two newest,
   most actively churning pipelines — have no equivalent guard. A mismatched
   bbox means the overview map and the featured routes silently describe
   different windows of ground.
3. **Pipeline coverage**: nothing asserts that every registry area belongs to
   exactly one fetch pipeline. A new area registered in `lib/areas.ts` but
   missing from every fetch script's table (or left in a table after removal
   from the registry) goes unnoticed.

At planning time all three invariants hold (90 GPX files ↔ 90 routes; 13
GeoJSON files ↔ 13 areas; 10+2+1 fetch-table keys = the 13 registry ids), so
these tests land green and only fire on real future drift.

## Current state

- `tests/registry.test.ts` — the file to extend. Relevant excerpts:

  ```ts
  // tests/registry.test.ts:58-73 — forward check only (route -> file)
  it("every route has a GPX file with at least one trkpt", () => {
    for (const area of AREAS) {
      for (const route of area.routes) {
        const gpxPath = path.join(PUBLIC_DIR, "gpx", `${route.id}.gpx`);
        expect(existsSync(gpxPath), ...).toBe(true);
        ...
  ```

  ```ts
  // tests/registry.test.ts:102-157 — bbox check, MVUM pair only
  it("bbox tables in fetch-mvum-area.mjs and build-area-routes.mjs agree on shared areas", () => {
    ...
    const extractMap = (src: string, marker: string): Map<string, string> => {
      const start = src.indexOf(marker);
      ...
      const re = /"([a-z-]+)": "(-?[\d.]+,-?[\d.]+,-?[\d.]+,-?[\d.]+)"/g;
      ...
    };
    const fetchMap = extractMap(fetchSrc, "const AREAS");
    const buildMap = extractMap(buildSrc, "const BBOX");
    // ...>=8 entries each, >=8 shared keys, all shared values equal
  ```

- The six scripts' tables all use the same `"<id>": "x1,y1,x2,y2"` value shape,
  but **two scripts have an unquoted key**: `scripts/fetch-blm-area.mjs:30` and
  `scripts/build-blm-routes.mjs:26` both read `jawbone: "-118.30,35.18,-118.02,35.46",`
  (no quotes around `jawbone`, because it has no hyphen). The existing regex
  requires quoted keys, so the generalized extractor MUST accept both forms.
  Table locations:
  - `scripts/fetch-mvum-area.mjs:22` `const AREAS = {` (10 entries) ↔
    `scripts/build-area-routes.mjs:22` `const BBOX = {` (10 entries)
  - `scripts/fetch-blm-area.mjs:26` `const AREAS = {` (2) ↔
    `scripts/build-blm-routes.mjs:25` `const BBOX = {` (2)
  - `scripts/fetch-angeles-area.mjs:24` `const AREAS = {` (1) ↔
    `scripts/build-angeles-routes.mjs:31` `const BBOX = {` (1)
  Note the BLM/Angeles tables can contain `//` comment lines between entries —
  the regex approach skips them naturally.

- `lib/areas.ts:125` — `export const AREAS: Area[]` with 13 areas; each has
  `id` and `mvumGeojson` (e.g. `"/data/big-bear-mvum.geojson"`,
  `"/data/jawbone-blm.geojson"`, `"/data/rowher-flats-angeles.geojson"`).

- On-disk artifacts at planning time: `ls public/gpx/*.gpx | wc -l` → 90
  (equal to total routes); `public/data/` has exactly 13 `.geojson` files, all
  referenced.

- Convention: descriptive `it()` names with rich failure messages inside
  `expect(cond, message)` — match the existing style in this file.

## Commands you will need

| Purpose   | Command             | Expected on success |
|-----------|---------------------|---------------------|
| Tests     | `npm test`          | all pass            |
| Typecheck | `npm run typecheck` | exit 0              |
| Lint      | `npm run lint`      | exit 0              |

## Scope

**In scope** (the only file you should modify):
- `tests/registry.test.ts`

**Out of scope** (do NOT touch):
- `scripts/*.mjs` — the tests read them as strings; do not "clean up" the
  unquoted `jawbone:` keys or move the tables. If a table can't be parsed,
  that's a STOP, not a script edit.
- `public/gpx/*`, `public/data/*`, `lib/areas.ts` — if an orphan or mismatch
  shows up, see STOP conditions; do not delete or edit data to make tests
  pass.

## Git workflow

- Branch: `registry-invariant-hardening`.
- Single commit is fine: `Extend registry invariants: orphan artifacts, all bbox pairs, pipeline coverage`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Reverse (orphan) checks for GPX and GeoJSON

Add two tests to `tests/registry.test.ts`:

1. `"every file in public/gpx belongs to a registered route"` — build the set
   of all route ids across `AREAS`; `readdirSync` `public/gpx`; every entry
   matching `*.gpx` must have `basename ∈ routeIds`. Failure message lists the
   orphan filenames.
2. `"every file in public/data is referenced by an area"` — the set of
   `area.mvumGeojson` basenames must equal exactly the set of `.geojson`
   files in `public/data` (both directions; failure message says which side
   has the extras).

**Verify**: `npm test` → all pass (90 GPX ↔ 90 routes, 13 GeoJSON ↔ 13 areas
at planning time).

### Step 2: Generalize the bbox cross-check to all three pipeline pairs

Refactor the existing bbox test (`:102-157`) into a data-driven form:

```ts
const BBOX_PAIRS = [
  { fetch: "fetch-mvum-area.mjs",    build: "build-area-routes.mjs",    min: 8 },
  { fetch: "fetch-blm-area.mjs",     build: "build-blm-routes.mjs",     min: 2 },
  { fetch: "fetch-angeles-area.mjs", build: "build-angeles-routes.mjs", min: 1 },
];
```

- Keep `extractMap` but change its regex to accept optionally-quoted keys:
  `/"?([a-z][a-z-]*)"?: "(-?[\d.]+,-?[\d.]+,-?[\d.]+,-?[\d.]+)"/g`
  (the leading `[a-z]` keeps it from matching stray fragments).
- Loop the pairs inside `it.each`-style or a plain `for` within one `it` per
  pair (one `it` per pair gives better failure isolation — prefer that; the
  test name should include the pair's filenames, matching the existing
  naming style).
- Per pair, keep the three existing assertions: fetch table has ≥ `min`
  entries, build table has ≥ `min` entries, and every shared key has an
  identical bbox string (with the existing mismatch-listing message).
- The original MVUM `it` is replaced by the parameterized version — the
  MVUM assertions must not get weaker (still ≥8, still exact string equality).

**Verify**: `npm test` → all pass; temporarily change one digit of the
`jawbone` bbox in a scratch copy of your working tree to confirm the BLM pair
test fails with a useful message, then revert (`git checkout -- scripts/`).

### Step 3: Pipeline-coverage invariant

Add one more test: `"every registry area is claimed by exactly one fetch
pipeline"` — union the key sets extracted from the three fetch scripts'
`const AREAS` tables and assert:

- the three key sets are pairwise disjoint,
- their union equals exactly `new Set(AREAS.map((a) => a.id))` from
  `lib/areas.ts` (both directions; message names missing/extra ids).

At planning time: mvum {big-bear, san-jacinto, santa-ana, laguna,
santa-barbara, san-luis-obispo, mt-pinos, lake-arrowhead, san-gorgonio,
palomar} ∪ blm {jawbone, el-paso} ∪ angeles {rowher-flats} = the 13 registry
ids exactly.

**Verify**: `npm test` → all pass.

## Test plan

This plan **is** tests. New cases: 2 orphan checks (Step 1), 3 bbox-pair
checks replacing 1 (Step 2), 1 coverage check (Step 3) — net +5 `it` blocks in
`tests/registry.test.ts`, modeled on the file's existing style.
Verification: `npm test` → exit 0 with ≥25 total tests (20 at planning time,
+5, −0).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npm test` exits 0; total test count increased by ≥5
- [ ] `npm run typecheck` and `npm run lint` exit 0
- [ ] The three bbox-pair tests each reference their pair's actual filenames in the test name
- [ ] Mutation check performed (Step 2's scratch-edit) and reverted: `git diff --stat scripts/` is empty
- [ ] `git status` shows no modified files outside `tests/registry.test.ts`
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Any new invariant FAILS on the current tree — e.g. an orphaned GPX/GeoJSON
  exists, a bbox pair disagrees, or the pipeline-coverage union mismatches.
  Everything was verified clean at `19d8670`; a failure means the tree
  drifted. Report the specific files/keys; deleting data or editing scripts
  to go green is the maintainer's call, not yours.
- The generalized regex can't parse a table (e.g. a table was reformatted) —
  do not edit the script; report.
- `scripts/*.mjs` or data files would need modification for any reason.

## Maintenance notes

- Plan 012 (pipeline shared-core extraction) must NOT move or reformat the
  `const AREAS` / `const BBOX` tables, which these tests parse from script
  source; its plan says so, but reviewers of either PR should keep it in mind.
- Adding a 14th area: the coverage test will fail until the area id appears
  in exactly one fetch script's table — that's the designed signal, mirroring
  `docs/adding-an-area.md`'s register step.
- If a future pipeline variant is added (a 4th fetch/build pair), extend
  `BBOX_PAIRS` and the coverage union.
