# Plan 008: Simplify and round the static-thumbnail SVG geometry

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 19d8670..HEAD -- lib/tiles.ts components/StaticMap.tsx tests/tiles.test.ts components/AreaGuide.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.
>
> **Network required**: no (build + tests only; the dev-time OSM tile loads
> in a browser are not part of any verification gate here).

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `19d8670`, 2026-07-03

## Why this matters

Every route card and loop card renders a static map thumbnail as inline SVG.
The polyline geometry inside those SVGs is written at full float precision
(~15–17 significant digits per coordinate) and includes **every** GPX vertex,
even though the thumbnail is a 600×400 viewBox where most vertices land
sub-pixel. Measured on the built site: `out/san-jacinto.html` is 4.5 MB total
and roughly 1–1.5 MB of that is `<svg>` thumbnail geometry; every area page
carries a similar penalty. Simplifying the projected polylines (Douglas–Peucker
at ~1 px tolerance) and rounding coordinates to integers cuts those bytes
several-fold with no perceptible visual change — the cards already carry an
"approximate" badge and the precise view is the interactive modal map.

Bonus: the same `MapRender` object is also serialized as a React client-component
prop (see `components/ExpandableMap.tsx`), so shrinking it in `lib/tiles.ts`
shrinks both the SVG markup and the hydration payload.

## Current state

- `lib/tiles.ts` — pure tile/projection math (no React). `trackMap()` projects
  every input point and every segment coordinate into the frame with no
  simplification and no rounding:

  ```ts
  // lib/tiles.ts:164-183
  const toPoint = (p: LatLng): Point => {
    const px = project(p.lat, p.lng, zoom);
    return { left: px.x - originX, top: px.y - originY };
  };

  const path: Point[] = points.map(toPoint);
  const projected = segments.map((s) => ({
    access: s.access,
    points: s.coords.map(toPoint),
  }));

  return {
    width,
    height,
    tiles,
    path,
    start: path[0],
    end: path[path.length - 1],
    segments: projected.length ? projected : undefined,
  };
  ```

- `components/StaticMap.tsx:23` — turns the points into SVG attribute strings
  verbatim: `const pathPoints = map.path?.map((p) => `${p.left},${p.top}`).join(" ");`
  and the same per-segment at `:61`. **No change needed in this file** — once
  `trackMap` emits simplified, integer coordinates, the strings shrink
  automatically.

- `components/AreaGuide.tsx:68-70, 96` — the two `trackMap` call sites (route
  cards and loop composite maps). No change needed.

- `tests/tiles.test.ts` — existing unit tests for `centeredMap`/`trackMap`.
  They use 2–3 point inputs, so simplification (which always preserves
  endpoints) should leave them passing; the frame-bounds assertions already
  carry ±1 slack (lines 32-35). The segment-projection test (lines 61-81)
  compares a 2-point path against a 2-point segment pointwise with
  `toBeCloseTo(..., 9)` — after this change both arrays are identical rounded
  integers, so it still passes. If any of these fail after your change, see
  STOP conditions.

- Repo conventions: pure functions in `lib/`, unit tests in `tests/*.test.ts`
  using vitest with the `@/` alias — model new tests on the existing
  `tests/tiles.test.ts` describe/it style.

## Commands you will need

| Purpose   | Command             | Expected on success |
|-----------|---------------------|---------------------|
| Typecheck | `npm run typecheck` | exit 0              |
| Tests     | `npm test`          | all pass            |
| Lint      | `npm run lint`      | exit 0              |
| Build     | `npm run build`     | exit 0, writes `out/` |

## Scope

**In scope** (the only files you should modify):
- `lib/tiles.ts`
- `tests/tiles.test.ts`

**Out of scope** (do NOT touch, even though they look related):
- `components/StaticMap.tsx` — consumes `MapRender` unchanged.
- `components/ExpandableMap.tsx`, `components/RouteMap.tsx`,
  `components/RouteCard.tsx`, `components/AreaGuide.tsx` — plan 009 reworks
  their data flow; touching them here creates conflicts.
- `public/gpx/*`, `lib/routes/*.generated.ts`, `scripts/*` — the source data
  stays full-precision; simplification is a render-time concern only.
- The interactive Leaflet maps — they draw from GPX/GeoJSON, not `MapRender`.

## Git workflow

- Branch: `simplify-thumbnail-svgs` (repo uses short kebab-case branch names,
  e.g. `loop-gpx-downloads`, `add-tests`).
- Commit style: imperative sentence, e.g. `Simplify and round thumbnail SVG geometry`
  (match `git log --oneline` style like "Add vitest: registry invariants...").
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add a Douglas–Peucker simplifier to `lib/tiles.ts`

Add a pure, exported function (exported so tests can exercise it directly):

```ts
/**
 * Ramer–Douglas–Peucker in viewport pixel space. Keeps endpoints; drops
 * vertices whose perpendicular distance to the local chord is <= tolerance.
 * Iterative (explicit stack) so a 10k-point GPX track can't overflow the
 * call stack.
 */
export function simplifyPoints(points: Point[], tolerance: number): Point[]
```

Implementation notes:
- `points.length <= 2` → return the input as-is.
- Use the standard perpendicular-distance formulation on `{left, top}`;
  handle the degenerate zero-length chord (first == last) by falling back to
  point-to-point distance.
- Iterative with an explicit index-range stack, marking kept indices in a
  boolean array, then filtering — do not recurse.

**Verify**: `npm run typecheck` → exit 0.

### Step 2: Apply simplification + integer rounding inside `trackMap`

In `trackMap` (`lib/tiles.ts`), after projection:

- Add a module constant `const SIMPLIFY_PX = 1;` with a one-line comment that
  it is the RDP tolerance in viewport pixels for thumbnail rendering.
- Replace the `path` / `projected` construction so every polyline is
  simplified then rounded:

```ts
const round = (p: Point): Point => ({ left: Math.round(p.left), top: Math.round(p.top) });
const path: Point[] = simplifyPoints(points.map(toPoint), SIMPLIFY_PX).map(round);
const projected = segments.map((s) => ({
  access: s.access,
  points: simplifyPoints(s.coords.map(toPoint), SIMPLIFY_PX).map(round),
}));
```

- `start`/`end` stay derived from the (now simplified+rounded) `path` exactly
  as today (`path[0]`, `path[path.length - 1]`) — RDP preserves endpoints, so
  these are still the projected first/last input points, just rounded.
- Do NOT touch `centeredMap` (its `pin` is already `width/2`,`height/2`).

**Verify**: `npm test` → all existing tests pass (see Current state for why;
if `tests/tiles.test.ts` fails, check STOP conditions before adjusting any
assertion).

### Step 3: Add tests for the new behavior

In `tests/tiles.test.ts`, add a `describe("simplifyPoints", ...)` (and one
trackMap-level case). Cases to cover:

1. **Collinear collapse**: build 101 points evenly spaced on a straight
   lat/lng line (e.g. `lat: 34 + i * 0.0001, lng: -117` for i in 0..100), run
   through `trackMap`, and assert `render.path!.length` is small (`<= 4` —
   Mercator keeps a meridian line straight, so RDP collapses it) while
   `render.start`/`render.end` still equal the first/last path points.
2. **Corner preservation**: an L-shaped 3-point input through
   `simplifyPoints` with tolerance 1 in pixel space (e.g. `{0,0},{100,0},{100,100}`)
   returns all 3 points.
3. **Integer coordinates**: for any `trackMap` render, every `path` and
   `segments[].points` coordinate satisfies `Number.isInteger`.
4. **≤2-point passthrough**: `simplifyPoints` returns 1- and 2-point inputs
   unchanged.

**Verify**: `npm test` → all pass, including the 4 new cases.

### Step 4: Build and measure

1. `npm run build` → exit 0.
2. Record before/after sizes (the baseline at planning time was
   4,556 KB): `du -k out/san-jacinto.html out/big-bear.html out/index.html`
3. Spot-check the emitted SVG uses integers:
   `grep -o 'points="[0-9][0-9,. -]*' out/big-bear.html | head -3` — the
   matched coordinate pairs must contain no decimal points.

**Verify**: `out/san-jacinto.html` is at least 15% smaller than its pre-change
size on your branch (measure the pre-change size first with a clean build on
`main` if you need the exact baseline; if plan 009 already landed, the page is
already ~3 MB smaller and the relative saving here is proportionally larger on
what remains). Report the exact before/after numbers.

## Test plan

- New tests in `tests/tiles.test.ts` per Step 3 (collinear collapse, corner
  preservation, integer rounding, small-input passthrough), modeled after the
  existing `describe("trackMap")` block.
- All pre-existing tests pass without weakening: do not delete or loosen
  existing assertions except as covered by STOP condition 2.
- Verification: `npm test` → exit 0.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npm run typecheck` exits 0
- [ ] `npm run lint` exits 0
- [ ] `npm test` exits 0, including ≥4 new simplification tests
- [ ] `npm run build` exits 0
- [ ] `grep -o 'points="[0-9][0-9,. -]*' out/big-bear.html | head -3` shows only integer coordinate pairs
- [ ] `out/san-jacinto.html` measurably smaller (report before/after KB)
- [ ] `git status` shows no modified files outside `lib/tiles.ts`, `tests/tiles.test.ts`
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" doesn't match the excerpts.
- An **existing** test in `tests/tiles.test.ts` fails after Step 2 for any
  reason other than sub-pixel rounding against its existing ±1 slack. (If it
  is exactly the ±1 rounding case, widening that specific slack by 1 more
  pixel is allowed; anything else means the simplifier is buggy — stop.)
- After Step 4, thumbnails look visibly wrong if you have any way to view
  them (jagged shortcuts across switchbacks, missing spurs). If you cannot
  view them, note that visual QA was not performed in your report.
- The size reduction in Step 4 is under 5% — that means the geometry wasn't
  the dominant cost on your branch state; report rather than tuning
  `SIMPLIFY_PX` upward.

## Maintenance notes

- `SIMPLIFY_PX = 1` is tuned for the 600×400 viewBox scaled up to ~2× on wide
  screens. If card dimensions grow significantly, revisit the tolerance.
- Plan 009 removes the `points`/`segments` client props entirely; this plan
  and 009 are independent, but both shrink area-page HTML — measure each
  landing separately if you want clean attribution.
- Reviewers should eyeball one MVUM thumbnail with green/plate segments
  (e.g. a Big Bear route) and one BLM multi-part thumbnail (Jawbone) in the
  built site.
- Deliberately deferred: simplifying the overview GeoJSON served to Leaflet
  (separate finding, "investigate" status — see `plans/README.md`).
