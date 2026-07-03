# Plan 012: Extract the shared data-pipeline core (one copy of the geo, elevation, GPX, and ArcGIS helpers)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 19d8670..HEAD -- scripts tests/pipeline.test.ts package.json tsconfig.json`
> If in-scope files changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.
>
> **Network required**: no — and deliberately so. This is a
> behavior-preserving refactor verified by unit tests, `node --check`, and
> inspection. Do NOT run the pipeline scripts (they hit federal ArcGIS
> services and opentopodata.org and would rewrite committed data). The first
> post-refactor regen is a follow-up verification the maintainer runs.

## Status

- **Priority**: P2
- **Effort**: L
- **Risk**: MED (touches all six pipeline scripts; mitigated by unit tests +
  a strict no-behavior-change rule)
- **Depends on**: 010 (soft — its tests parse the scripts' `AREAS`/`BBOX`
  tables and guard this refactor; land it first)
- **Category**: tech-debt
- **Planned at**: commit `19d8670`, 2026-07-03

## Why this matters

The six pipeline scripts under `scripts/` are three fetch/build pairs that
grew by copy-paste. The geospatial and I/O helpers now exist in three (or
more) byte-identical or near-identical copies: `haversineMi`,
`fetchElevations` (SRTM sampling), the elevation-interpolation block,
`sleep`/`fmtFt`/`escXml`/`d2`/`varName`, `stitchParts`+`GAP` (identical in two
scripts), coordinate rounding (`rnd`/`roundLines`), the ArcGIS paged-query
loop, the FeatureCollection writer, and the generated-module writer. Every new
area type forks another copy; a fix applied to one copy silently misses the
others; and none of it is unit-tested. Consolidating into one shared module
makes the next pipeline variant a small file, gives the pure geometry
functions their first tests, and fixes one real latent bug along the way: the
committed `elevationFt` strings are formatted with locale-dependent
`toLocaleString()` (a regen on a non-US-locale machine would produce
`6.800–7.500 ft`).

**What this plan is NOT**: it does not unify the *behavior* differences that
were audited and deliberately left alone this round — the duplicated
green/plate access classifiers (`classify`/`segAccess`) stay per-script, and
`build-area-routes.mjs` keeps its older single-path `stitch()` (switching it
to gap-aware `stitchParts` changes committed route data; that is a separate,
unselected finding). Byte-identical helper consolidation only.

## Current state

Verified duplication map (line numbers at commit `19d8670`):

| Helper | build-area-routes.mjs | build-blm-routes.mjs | build-angeles-routes.mjs | Identical? |
|---|---|---|---|---|
| `d2` | 1204 | 221 | 171 | yes |
| `stitch` (single-path, no gap split) | 1205-1231 | — | — | build-area only; **leave in place** |
| `stitchParts` + `GAP = 0.0025` | — | 222-258 | 172-208 | yes (diff-verified byte-identical) |
| `haversineMi` | 1232-1241 | 260-269 | 210-219 | yes |
| `fetchElevations` | 1244-1263 | 272-290 | 222-240 | yes except one comment line |
| `sleep`, `fmtFt`, `escXml` | 1265-1268 | 292-295 | 242-245 | yes |
| elevation lookup block (`eleByIdx`/`sampledIdx`/`eleAt`/`hasEle`/`eMin`/`eMax`) | 1322-1338 | 343-356 | ~283-300 | yes (inline in each `buildRoute`) |
| `elevationFt` via bare `toLocaleString()` | 1364 | 393 | 341 | yes — the locale bug |
| `varName` | 1387-1388 | 416-417 | near tail | yes |
| generated-module writer (`const ts = ...` + `writeFile`) | 1408-1416 | 437-445 | near tail | same shape, different header comment lines |

And across the fetch trio:

| Helper | fetch-mvum-area.mjs | fetch-blm-area.mjs | fetch-angeles-area.mjs | Identical? |
|---|---|---|---|---|
| `rnd` | 55 | 67 | 35 | yes |
| line rounding + consecutive-dup filter | inline 97-102 | inline 96-100 | `roundLines` 37-48 | same logic; angeles already has the function form |
| ArcGIS paged loop (`resultOffset`/`exceededTransferLimit`) | 74-123 | 69-121 | 50-128 (×2) | same skeleton; per-source `classify`/props mapping differs |
| FeatureCollection + metadata + write + log | 141-157 | 140-156 | 146-162 | same shape, different `source` string / filename suffix |
| `UA` constant | 18 | 23 | 21 | identical string in all six scripts |

Representative excerpts (confirm you're looking at the same code):

```js
// scripts/build-blm-routes.mjs:260-269 == build-angeles-routes.mjs:210-219 == build-area-routes.mjs:1232-1241
function haversineMi(a, b) {
  const R = 3958.8;
  const toR = (d) => (d * Math.PI) / 180;
  const dLat = toR(b[1] - a[1]);
  const dLon = toR(a[0] - b[0]);
  ...
```

```js
// scripts/build-area-routes.mjs:1364 (and :393 / :341 in the other two)
...(hasEle ? { elevationFt: `${fmtFt(eMin).toLocaleString()}–${fmtFt(eMax).toLocaleString()} ft` } : {}),
```

```js
// scripts/fetch-mvum-area.mjs:119-120 — the paging tail all fetchers share
if (!json.exceededTransferLimit || feats.length === 0) break;
offset += feats.length;
```

Environment facts:
- Scripts are plain `.mjs` run directly with `node scripts/<name>.mjs [area ...]`;
  they use top-level `await` and write files relative to
  `new URL("../...", import.meta.url)`.
- `tsconfig.json` has `"allowJs": true` and path alias `@/*` — a `.ts` vitest
  file CAN import a `.mjs` module directly (vitest resolves it; tsc accepts it
  under allowJs). Vitest test glob: `tests/**/*.test.ts`.
- Plan 010's tests parse `const AREAS` / `const BBOX` tables out of these
  scripts as source text — **those tables must not move or be reformatted**.
- The committed generated files (`lib/routes/*.generated.ts`, `public/gpx/*`,
  `public/data/*`) were produced by the current scripts and are the
  regression baseline: this refactor must be output-identical, which you
  demonstrate by NOT changing any emission format string.

## Commands you will need

| Purpose        | Command                                        | Expected on success |
|----------------|------------------------------------------------|---------------------|
| Syntax check   | `for f in scripts/*.mjs scripts/lib/*.mjs; do node --check "$f" || exit 1; done` | prints nothing, exit 0 |
| Import smoke   | `node -e "import('./scripts/lib/pipeline.mjs').then(m => console.log(Object.keys(m).sort().join(',')))"` | prints the export list, no side effects |
| Tests          | `npm test`                                     | all pass            |
| Typecheck      | `npm run typecheck`                            | exit 0              |
| Lint           | `npm run lint`                                 | exit 0              |
| Build          | `npm run build`                                | exit 0 (site unaffected, sanity only) |

## Scope

**In scope**:
- `scripts/lib/pipeline.mjs` (create — pure helpers, zero top-level side
  effects, zero network at import)
- `scripts/build-area-routes.mjs`, `scripts/build-blm-routes.mjs`,
  `scripts/build-angeles-routes.mjs` (replace local helpers with imports)
- `scripts/fetch-mvum-area.mjs`, `scripts/fetch-blm-area.mjs`,
  `scripts/fetch-angeles-area.mjs` (same)
- `tests/pipeline.test.ts` (create)

**Out of scope** (do NOT touch):
- The `CONFIG`, `AREAS`, `BBOX` tables and every editorial string inside the
  scripts — content-identical, position-stable (plan 010's tests parse them).
- `classify` (fetch-mvum:58, fetch-blm:56), `segAccess` (build-area:1196),
  `accessNote` (all three builders), `whereClause` — the per-source access
  logic stays where it is (unselected finding; unifying it changes the risk
  profile).
- `stitch` in `build-area-routes.mjs:1205-1231` — keep it in that file
  unchanged; add a one-line comment pointing at `stitchParts` in the shared
  module so the divergence is at least signposted.
- The GPX emission template literals in each builder (single-`<trkseg>`
  4-space indent in build-area vs per-part 6-space in blm/angeles) — their
  exact output format is the committed-data contract; do not "unify" the
  strings.
- `lib/track-stats.ts` — the app-side haversine (meters, typed, tested) is a
  different unit and consumer; merging app and script code is not worth the
  TS/JS bridging. Leave it.
- `lib/routes/*.generated.ts`, `public/**` — no regen in this plan.

## Git workflow

- Branch: `pipeline-shared-core`.
- Commit per step (module first, then one commit per script pair migration,
  then tests) — this makes the no-behavior-change review tractable.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Create `scripts/lib/pipeline.mjs`

One module, JSDoc-commented, exporting exactly (signatures preserved from the
copies; move the code, don't rewrite it):

- `UA` — the shared user-agent string.
- `d2(a, b)`, `haversineMi(a, b)` — from the identical copies.
- `GAP`, `stitchParts(parts)` — moved verbatim from
  `build-blm-routes.mjs:222-258` (the diff-verified canonical copy).
- `sleep(ms)`, `fmtFt(m)`, `escXml(s)`, `varName(area)`.
- `fmtFtRange(eMinMeters, eMaxMeters)` — NEW, the one intentional change:
  `` `${fmtFt(eMin).toLocaleString("en-US")}–${fmtFt(eMax).toLocaleString("en-US")} ft` ``.
  Pinning `"en-US"` makes regen output machine-independent; the committed
  data is already in this format, so it is a no-op on en-US machines.
- `fetchElevations(coords)` — moved verbatim (keep the `<= 90` sampling and
  best-effort `null` returns).
- `elevationLookup(eleSamples)` — NEW extraction of the identical inline
  block: returns `{ hasEle, eMin, eMax, eleAt }` where `eleAt(i)` implements
  the existing nearest-sampled-index interpolation. Each builder's inline
  `eleByIdx`/`sampledIdx`/`eleAt`/min-max code is replaced by one call.
- `rnd(n)`, `roundLines(geometry)` — from `fetch-angeles-area.mjs:35-48`
  (the function forms; the other two fetchers' inline equivalents become
  calls).
- `fetchPaged(makeUrl)` — NEW extraction of the paging skeleton: takes
  `(offset) => url`, loops `fetch(url, { headers: { "User-Agent": UA } })`,
  throws `new Error(\`HTTP ${res.status}\`)` context added by the caller on
  non-OK (preserve each caller's exact error message by letting the caller
  wrap: simplest faithful shape is `fetchPaged(makeUrl, onBatch)` where
  `onBatch(features, json)` is the caller's per-feature loop and `fetchPaged`
  handles offset/`exceededTransferLimit`/termination). Keep the per-batch
  `process.stdout.write` progress lines in the callers so console output is
  unchanged.
- `writeAreaGeojson({ outUrl, source, area, bbox, features })` — builds the
  `FeatureCollection` with the existing `metadata` shape (`source`, `area`,
  `bbox`, `fetched` date, `counts` reduced from `properties.access`), writes
  it, and prints the existing `Wrote N features (X KB) -> ...` line (take the
  printable path as a parameter so each script's message stays identical).
- `writeRoutesModule({ outUrl, exportName, routes, headerLines })` — the
  `const ts = ...`/`writeFile` tail, with `headerLines` carrying each
  script's two source-attribution comment lines verbatim.

No top-level statements besides imports (`node:fs/promises` for the writers)
and `const` definitions.

**Verify**: `node --check scripts/lib/pipeline.mjs` → exit 0, and the import
smoke command prints the export list without executing anything else.

### Step 2: Migrate the three build scripts

For each of `build-blm-routes.mjs`, `build-angeles-routes.mjs`,
`build-area-routes.mjs` (in that order — the two identical ones first):

- Replace the local helper definitions with a single import from
  `./lib/pipeline.mjs`; delete the local copies listed in the duplication
  map. `build-area-routes.mjs` keeps its local `stitch` (plus the signpost
  comment) and imports everything else, including `d2` which `stitch` uses.
- Replace each inline elevation block with `const { hasEle, eMin, eMax, eleAt } = elevationLookup(eleSamples);`.
- Replace the `elevationFt` template with `fmtFtRange(eMin, eMax)`.
- Replace the module-writing tail with `writeRoutesModule(...)`, passing that
  script's existing header comment lines verbatim.
- Do not reorder anything else; the `CONFIG`/`BBOX` tables and `buildRoute`
  flow stay put.

**Verify** after each file: `node --check scripts/<file>` → exit 0. After all
three: `npm test` → the plan-010 bbox/coverage tests still pass (proof the
tables didn't move).

### Step 3: Migrate the three fetch scripts

Same pattern: import `UA`, `rnd`, `roundLines`, `fetchPaged`,
`writeAreaGeojson`; delete local copies; keep `classify`, `OUT_FIELDS`,
`AREAS`, per-layer loops, and all console messages byte-identical. The
mvum/blm fetchers' inline rounding blocks become `roundLines(f.geometry)`
calls (verify by eye that the inline logic is exactly `roundLines` — it is:
same map/filter chain).

**Verify**: `node --check` all three → exit 0; `npm test` still green.

### Step 4: Unit-test the shared module

Create `tests/pipeline.test.ts` importing from
`../scripts/lib/pipeline.mjs` (works under `allowJs`; if tsc complains about
missing types for the .mjs import, add a minimal
`scripts/lib/pipeline.d.mts` declaring the tested exports rather than
loosening tsconfig). Cases:

- `stitchParts`: two segments sharing an endpoint → one path in the right
  order; a reversed middle segment gets flipped; two clusters farther apart
  than `GAP` → two paths; sub-2-point parts are dropped; empty input → `[]`.
- `haversineMi`: `[−117, 34] → [−117, 35]` ≈ 69.09 (±0.1); zero distance → 0.
- `fmtFt`: 2133 m → 7000 (nearest 50 ft).
- `fmtFtRange(2073, 2286)` → `"6,800–7,500 ft"` exactly (comma grouping +
  en dash, independent of the machine locale).
- `escXml`: `&`, `<`, `>` escaped; quotes passed through (matches current
  behavior — GPX `<name>` is a text node).
- `varName`: `"el-paso"` → `"elPasoRoutes"`, `"big-bear"` → `"bigBearRoutes"`.
- `elevationLookup`: samples `[{i:0, ele:100}, {i:10, ele:null}, {i:20, ele:200}]`
  → `hasEle` true, `eMin` 100, `eMax` 200, `eleAt(3)` → 100 (nearest sampled),
  `eleAt(16)` → 200; all-null samples → `hasEle` false, `eleAt` returns null.
- `rnd`/`roundLines`: 4-decimal rounding; consecutive duplicates dropped;
  LineString stays LineString, MultiLineString shape preserved.

Do NOT test `fetchElevations`/`fetchPaged` against the network; their loop
logic may be tested with an injected fake only if you can do it without
changing their production signatures — otherwise leave them to `node --check`
and review.

**Verify**: `npm test` → all pass (≥8 new tests).

### Step 5: Full gate + review diff

1. `npm run typecheck && npm run lint && npm test && npm run build` → all exit 0.
2. `git diff main --stat` — confirm only in-scope files changed.
3. Self-review each script's diff hunk-by-hunk against the rule: **deleted
   code must be byte-identical to what the shared module exports** (modulo
   the documented `fmtFtRange` change and the build-area comment line noted
   in the duplication map). Anything else is a STOP.

## Test plan

- `tests/pipeline.test.ts` per Step 4 — the first coverage the stitching and
  formatting logic has ever had; model file structure on
  `tests/track-stats.test.ts` (pure-function tests, no fs).
- Existing suites must stay green untouched — especially plan 010's
  script-parsing tests, which double as the "tables didn't move" gate.
- Verification: `npm test` → exit 0.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `scripts/lib/pipeline.mjs` exists; import smoke test prints exports with no side effects
- [ ] `grep -c "function haversineMi" scripts/*.mjs` → 0 (only the shared copy remains; same for `fetchElevations`, `stitchParts`, `varName`, `escXml`)
- [ ] `grep -n "toLocaleString()" scripts/` → no matches (all went through `fmtFtRange`)
- [ ] `grep -c "function stitch(" scripts/build-area-routes.mjs` → 1 (deliberately kept)
- [ ] `node --check` passes on all 7 `.mjs` files
- [ ] `npm run typecheck`, `npm run lint`, `npm test` (with ≥8 new pipeline tests), `npm run build` all exit 0
- [ ] `git status` clean outside the in-scope list; `lib/routes/`, `public/` untouched
- [ ] `plans/README.md` status row updated, noting "regen verification deferred to next maintainer-run regen"

## STOP conditions

Stop and report back (do not improvise) if:

- Any supposedly-identical helper copies actually differ beyond the two
  documented exceptions (build-area's extra `fetchElevations` comment; the
  `fmtFtRange` change) — a hidden fork means behavior would change.
- Migrating a script requires touching `CONFIG`/`AREAS`/`BBOX` tables,
  `classify`/`segAccess`/`accessNote`, or a GPX template literal.
- Plan 010's tests fail after a migration (a table moved or reformatted).
- The `.mjs` import in `tests/pipeline.test.ts` can't be made to satisfy both
  `tsc` and `vitest` within the two approaches given (direct import under
  allowJs, or a `.d.mts` shim).
- You feel the need to run any `scripts/*.mjs` end-to-end — that hits
  external services and rewrites committed data; it is out of bounds here.

## Maintenance notes

- **First regen after this lands is the real verification**: the maintainer
  should run one area per pipeline (e.g. `node scripts/build-area-routes.mjs
  palomar`, `... build-blm-routes.mjs el-paso`, `... build-angeles-routes.mjs
  rowher-flats`, plus one fetch each) and confirm `git diff` shows only
  expected refresh noise (fetched dates, upstream data changes) — no format
  shifts in `elevationFt`, GPX indentation, or generated-module headers.
- The next pipeline variant (a 4th source) should import from
  `scripts/lib/pipeline.mjs` from day one; if it needs a helper variant,
  parameterize the shared copy rather than forking.
- Deliberately deferred, tracked in `plans/README.md`: unifying the access
  classifiers (with characterization tests), and back-porting gap-aware
  `stitchParts` into `build-area-routes.mjs` (changes committed data; needs a
  network regen + diff review).
- Reviewers: the highest-risk hunks are the `fetchPaged` extraction (loop
  termination semantics) and `elevationLookup` (index math) — check those
  against the deleted originals line by line.
