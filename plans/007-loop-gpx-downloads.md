# Plan 007: Downloadable composite GPX for suggested loops

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 13a87ad..HEAD -- lib/areas.ts lib/types.ts components/AreaGuide.tsx components/ExpandableMap.tsx lib/gpx.ts scripts docs README.md tests`
> If in-scope files changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. Plan 006 (Rowher Flats) has already
> landed as of this plan's baseline: `AREAS` has 13 areas, 23 loops total
> (Rowher Flats contributes "Rowher Trails Day" and "Divide & Pelona Plated
> Day") — the counts below reflect that; the script and tests are written to
> cover whatever areas/loops exist at run time regardless.
>
> **Network required**: no. This plan composes new GPX files from data
> already committed under `public/gpx/*.gpx` (each route's existing track);
> it does not call any external service.

## Status

- **Priority**: P2
- **Effort**: M (one new build script + registry field + UI + tests + docs)
- **Risk**: LOW (additive; no existing route/area data changes)
- **Depends on**: none (plans 001–005 landed; independent of 006)
- **Category**: direction
- **Planned at**: commit `13a87ad`, 2026-07-02

## Why this matters

Loops (`AreaLoop` in `lib/areas.ts`) are first-class UI: every area with one
gets its own card with a composite map, mileage, and prose
(`components/AreaGuide.tsx`, "Make a day of it" section, ~lines 232-310).
That's the thing a rider actually plans their day around. But there is no way
to download a loop as a single track — only the individual routes strung into
it have a GPX link (`components/ExpandableMap.tsx` ~line 137, the "↓ GPX"
button wired from `RouteCard.tsx`'s `gpxHref={`/gpx/${route.id}.gpx`}`). A
rider who wants "Holcomb Valley Big Day" on their GPS today has to open each
of 3 route cards, download each GPX, and load all of them onto the device
separately. This was surfaced during the 2026-07-01 improve-skill pass and
deliberately deferred (`plans/README.md`, "Findings considered and
rejected"); this plan picks it up.

## Current state (repo)

- `lib/areas.ts` — `AreaLoop` type (~line 36) has `name`, `distanceMiles`,
  `summary`, `description`, `routeIds`; no `id`/slug field. The UI keys loop
  cards by `name` (`key={loop.name}`, `AreaGuide.tsx` ~line 253). 23 loops
  exist across the 13 areas currently on `main` (grep `name: "` inside
  `loops: [` blocks); each area has one loop except Santa Barbara, San Luis
  Obispo, Lake Arrowhead, San Gorgonio, Palomar, and Rowher Flats, which have
  two.
- `lib/gpx.ts` — `loadTrack(file)` and `loadTrackParts(file)` read
  `public/gpx/<file>` server-side (build time only, uses `fs`); files there
  are also directly downloadable at `/gpx/<file>` because they live under
  `public/`.
- `public/gpx/<route-id>.gpx` — one file per route, written by
  `scripts/build-area-routes.mjs` / `scripts/build-blm-routes.mjs`. Format:
  `<gpx version="1.1" creator="...">` wrapping a single `<trk><name>...</name>
  <trkseg>...</trkseg></trk>` (or multiple `<trkseg>` for BLM routes stitched
  from disjoint pieces — see `lib/gpx.ts`'s `loadTrackParts` doc comment).
  `escXml` (in `build-area-routes.mjs`) is the existing XML-escaping helper;
  reuse its behavior rather than re-deriving it.
- `components/AreaGuide.tsx` — the loop card (~lines 251-306): composite
  `StaticMap` built from each `loop.routeIds`' track parts (~lines 85-99, not
  shown above but referenced there), then name/distance/summary/description,
  then a route-id chip trail linking to each route's anchor (`#${id}`). No
  download affordance today.
- `components/ExpandableMap.tsx` — the pattern to match for the download
  button's markup/style (~lines 136-143): a plain `<a href={gpxHref} download>`
  styled as a bordered pill, label "↓ GPX".
- `tests/registry.test.ts` — already has loop invariants: every `routeId`
  resolves within the area (~line 9), and `distanceMiles` is finite/positive
  (~line 90). No invariant yet touches loop ids or generated GPX files.
- `package.json` scripts — `dev`, `build`, `start`, `lint`, `typecheck`,
  `test`, `deploy`. No `tsx` devDependency; `lib/areas.ts` and its route
  modules use extensionless TS imports (`./types`, `./routes/*.generated`),
  so a plain `node script.mjs` cannot `import` the registry directly on this
  Node version — a new build script needs `tsx` (or an equivalent loader) to
  read `AREAS`, matching how you'd want to reuse the real loop/route data
  instead of re-deriving it by hand.
- `next.config.ts` — `output: "export"`; the site is fully static, served
  from Cloudflare Workers static assets (no server runtime, no API routes by
  design). Any per-loop GPX must therefore be a **prebuilt, committed file**
  under `public/gpx/`, exactly like route GPX — not generated on request.
- `docs/adding-an-area.md`, `docs/adding-a-blm-area.md`,
  `docs/area-review-process.md` — the maintenance playbooks; each documents
  the loop step and will need a one-line pointer to the new regen command.

## Design

- Add `id: string` to `AreaLoop` (required, kebab-case, unique within the
  area — mirrors the existing route-id convention). Backfill it for all 21
  existing loops in `lib/areas.ts` by hand as part of this plan (short,
  descriptive slugs derived from each loop's `name`, e.g. "Holcomb Valley Big
  Day" → `holcomb-valley-big-day`).
- Composite file path: `public/gpx/loops/<areaId>--<loopId>.gpx` (a `loops/`
  subdirectory keeps them visually separate from per-route files in listings;
  the `--` separator avoids collisions since area ids and loop ids are each
  already-validated kebab-case).
- New script `scripts/build-loop-gpx.mts` (`.mts` so `tsx` runs it as ESM
  TypeScript without extra config):
  - Import `AREAS` from `../lib/areas.ts` via `tsx`.
  - For every `area.loops`, for every `loop`, read each `routeIds[i]`'s
    existing `public/gpx/<routeId>.gpx`, extract its `<trk>...</trk>`
    block(s) verbatim (regex or light parse — reuse the same
    `<trkseg>`-aware approach `lib/gpx.ts` already uses, since some route
    files carry multiple `<trkseg>` blocks that must stay grouped under one
    `<trk>` per route), and concatenate them in `routeIds` order into one
    GPX with one `<trk>` per route (a multi-track GPX — every GPS app and
    Gaia/CalTopo/OnX handle multiple `<trk>` in one file for exactly this
    "day of connected rides" case).
  - `<metadata><name>` = `"<Area name>: <Loop name>"`; keep each route's own
    `<trk><name>` untouched so a device still shows individual leg names.
  - `creator="dirt-bikes build-loop-gpx (composite of existing route GPX)"`,
    matching the style of the existing creator strings.
  - Write `public/gpx/loops/<areaId>--<loopId>.gpx`; print one line per loop
    written (area, loop name, route count, total points) so a run is
    auditable in CI/PR logs.
  - If a `routeId` has no `public/gpx/<routeId>.gpx` on disk, fail loudly
    (throw, nonzero exit) rather than silently skipping — a missing leg in a
    "day of it" download is a correctness bug, not a soft warning.
- `package.json`: add `"tsx"` to devDependencies (pin to the same major as
  used elsewhere in the ecosystem is not a constraint here — pick current
  latest) and a script `"build:loops": "tsx scripts/build-loop-gpx.mts"`.
- `components/AreaGuide.tsx`: add a "↓ GPX" download link to each loop card,
  visually matching `ExpandableMap.tsx`'s button (bordered pill, `download`
  attribute), `href={`/gpx/loops/${area.id}--${loop.id}.gpx`}`. Place it next
  to or below the mileage figure in the card header — exact placement is a
  judgment call for Step 3, but it must not crowd the existing route-chip
  trail at the bottom of the card.
- `lib/areas.ts`: switch loop card `key` from `loop.name` to `loop.id` while
  touching this file (cheap correctness fix — `name` was never guaranteed
  unique, `id` now is).

## Commands you will need

| Purpose        | Command                                  | Expected on success |
|-----------------|------------------------------------------|----------------------|
| Install         | `npm install`                            | exit 0 (adds `tsx`) |
| Typecheck       | `npm run typecheck`                      | exit 0 |
| Lint            | `npm run lint`                           | exit 0 |
| Tests           | `npm test`                               | all pass (new loop-GPX invariants included) |
| Build           | `npm run build`                          | exit 0 |
| Build loop GPX  | `npm run build:loops` (created in Step 2) | writes `public/gpx/loops/*.gpx`, prints one line per loop |

## Scope

**In scope**:
- `lib/areas.ts` (add `AreaLoop.id`, backfill all loop entries, `key` fix)
- `scripts/build-loop-gpx.mts` (create)
- `public/gpx/loops/*.gpx` (generated, one per existing loop)
- `package.json` (`tsx` devDependency, `build:loops` script)
- `components/AreaGuide.tsx` (download link on the loop card)
- `tests/registry.test.ts` (new invariants)
- `README.md` (regen section), `docs/adding-an-area.md`,
  `docs/adding-a-blm-area.md`, `docs/area-review-process.md` (loop-pass note)
- `plans/README.md` (status row)

**Out of scope** (do NOT touch):
- Per-route GPX generation (`scripts/build-area-routes.mjs`,
  `scripts/build-blm-routes.mjs`) and their output — this plan only reads
  those files, never regenerates or edits them.
- `lib/gpx.ts`'s server-side loaders — the download is a static file link,
  not a rendered/parsed view; no new runtime parsing path is needed.
- Loop content itself (name, summary, description, distanceMiles, routeIds) —
  editorial text is unchanged; only `id` is added.
- Rowher Flats' own routes/data (plan 006, landed) — its two loops ("Rowher
  Trails Day", "Divide & Pelona Plated Day") are covered like any other area
  by the script iterating `AREAS`; do not hand-author anything Rowher-specific
  here beyond the same `id` backfill every other area's loops get.

## Git workflow

- Branch: `loop-gpx-downloads` (already created, based on `main` at `a17800f`,
  in worktree `~/projects/dirt-bikes-loop-gpx`)
- Commit per logical unit (registry `id` field + script, then generated GPX,
  then UI, then tests, then docs), imperative messages matching repo history
- Push and open a PR when the full gate (Step 5) is green.

## Steps

### Step 1: Add `AreaLoop.id` and backfill

- Add `id: string` to the `AreaLoop` type in `lib/areas.ts` with a doc
  comment: kebab-case, unique within the area, used as the composite GPX
  filename stem.
- Add an `id` to each of the 23 existing loop literals, derived from `name`
  (lowercase, spaces/`&`/`/` → hyphens, collapse repeats, strip trailing
  hyphens). Spot check a few by hand rather than trusting a blind slugify
  (e.g. "Pozo / La Panza OHV Day" → `pozo-la-panza-ohv-day`; "Wildhorse &
  Fish Creek Meadows" → `wildhorse-fish-creek-meadows`).

**Verify**: `npx tsc --noEmit` fails until every loop has an `id` (TypeScript
enforces the required field) — confirm it fails first with the type added
and no backfill, then passes once all 23 are filled in.

### Step 2: `scripts/build-loop-gpx.mts`

Write the script per the Design section above. Reuse `lib/gpx.ts`'s
`<trkseg>`-splitting approach conceptually (you're concatenating whole
`<trk>` blocks, not re-parsing into points, but the same regex care around
self-closing vs. content-bearing tags applies) — do not reinvent GPX parsing
from scratch beyond what's needed to extract `<trk>...</trk>`.

**Verify**: `npm run build:loops` completes with no errors, prints exactly
23 lines (or the current loop count if it has drifted per the drift check),
and `find public/gpx/loops -name '*.gpx' | wc -l` matches. Open one output
file and confirm it has one `<trk>` per `routeIds` entry, in order, and a
`<metadata><name>` matching `"<Area>: <Loop>"`.

### Step 3: UI — download link on the loop card

Add the "↓ GPX" link to `components/AreaGuide.tsx`'s loop card, styled to
match `ExpandableMap.tsx`. Fix the `key` to `loop.id`.

**Verify**: `npm run dev`, load an area page with loops (e.g. `/big-bear`),
confirm the link appears, and confirm clicking it downloads
`big-bear--holcomb-valley-big-day.gpx` (or equivalent) rather than opening
inline. Use headless Chrome per the repo's documented verification approach
if a live click-through isn't practical; at minimum inspect the rendered
`href`.

### Step 4: Tests

Add to `tests/registry.test.ts`:
- Every loop has a non-empty, kebab-case `id` (regex `^[a-z0-9]+(-[a-z0-9]+)*$`).
- Loop ids are unique within their area (not necessarily globally — mirror
  how route ids are checked globally but scope this one to the area, since
  the filename already namespaces by `areaId--loopId`).
- For every loop, `public/gpx/loops/<areaId>--<loopId>.gpx` exists
  (`existsSync`) — this is the regression guard: if a loop's `routeIds`
  change and someone forgets to re-run `build:loops`, this test doesn't
  catch staleness by itself, so also assert...
- ...the composite file contains exactly `loop.routeIds.length` `<trk>`
  elements (a cheap regex count) — this catches the common drift case where
  a route is added to or removed from a loop without regenerating.

**Verify**: `npm test` — new tests pass against the Step 2 output; then
temporarily edit one loop's `routeIds` (without regenerating) locally to
confirm the new count-mismatch test actually fails, then revert the edit.

### Step 5: Docs and full gate

- `README.md`: add `npm run build:loops` to the "Regenerating area data"
  section with a one-line comment ("composite GPX for suggested loops, from
  already-generated route GPX — no network").
- `docs/adding-an-area.md` and `docs/adding-a-blm-area.md`: add a line to
  the loops step noting that a new loop needs an `id` and a `build:loops` run
  before it ships.
- `docs/area-review-process.md`: in the "loops" pass, add a line to confirm
  the composite GPX downloads and contains the right legs.
- `plans/README.md`: this plan's status row, and update the
  "Findings considered and rejected" note that previously said loop GPX was
  "deliberately not planned this round" to instead point at plan 007.

**Verify**, in order: `npm run typecheck` → 0; `npm run lint` → 0;
`npm test` → all pass; `npm run build` → 0; `npm run build:loops` → 0 with no
uncommitted diff afterward (i.e. checked-in GPX matches what the script
produces from checked-in route GPX — run it once more after all other
changes land and confirm `git status` is clean).

## Test plan

`tests/registry.test.ts`'s new invariants (Step 4) are the permanent
regression guard. `npm test` and `npm run build` together are the full gate;
no manual QA beyond the Step 3 visual/click check and the Step 5 doc pass.

## Done criteria

- [ ] `AreaLoop.id` exists, is required, and is backfilled on all existing loops
- [ ] `scripts/build-loop-gpx.mts` + `npm run build:loops` exist and produce
      one composite GPX per loop under `public/gpx/loops/`, committed
- [ ] Loop cards in `components/AreaGuide.tsx` have a working "↓ GPX" download
- [ ] `tests/registry.test.ts` enforces loop id shape/uniqueness and
      composite-file-matches-routeIds
- [ ] `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` all exit 0
- [ ] `README.md`, `docs/adding-an-area.md`, `docs/adding-a-blm-area.md`,
      `docs/area-review-process.md` mention the new regen step
- [ ] `plans/README.md` status row updated and the stale "not planned this
      round" note corrected

## STOP conditions

Stop and report back (do not improvise) if:

- Any loop's `routeIds` references a route with no `public/gpx/<id>.gpx` on
  disk (should be impossible per the existing routeIds-resolve invariant,
  but the GPX *file* existing is a separate guarantee — if it's ever false,
  that's a pre-existing data bug, not something to paper over here).
- `tsx` cannot cleanly import `lib/areas.ts` in this repo's TS/module
  config (extensionless imports, `@/` path alias) — if it needs nonstandard
  workarounds beyond a normal `tsconfig.json` `paths` resolution, stop and
  report rather than hacking around module resolution.
- A route's GPX file has malformed or unexpected `<trk>` structure (e.g. zero
  `<trk>` elements) that the extraction can't handle safely.

## Maintenance notes

- If a loop's `routeIds` change, or a route's own GPX is regenerated,
  `npm run build:loops` must be re-run and the diff committed — Step 4's
  trk-count test is the safety net, but it's not automatic; consider adding
  `build:loops` to CI as a "no diff" check in a future plan if staleness
  becomes a recurring problem.
- Any future area (Rowher Flats' successor pipeline variants, or a wholly new
  area) gets composite loop GPX for free the next time `build:loops` runs, as
  long as its loops get an `id` — no follow-up plan needed for that alone.
