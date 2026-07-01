# Plan 001: Fix the dangling route id in the San Jacinto "Idyllwild & Black Mountain" loop

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c7261bf..HEAD -- lib/areas.ts lib/routes/san-jacinto.generated.ts`
> If either file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `c7261bf`, 2026-07-01

## Why this matters

Each riding area page has a "Make a day of it" section with suggested loops. A loop lists the route ids it strings together; the page renders a clickable route chain and a composite map from those ids. The San Jacinto loop "Idyllwild & Black Mountain" references the id `el-paso-black-mountain`, which belongs to a completely different area (the El Paso Mountains BLM area). San Jacinto's own route is `black-mountain-road`. Because the renderer silently skips unmatched ids, the live page shows the loop with its middle leg missing: the route chain reads "Dark Canyon Road → Idyllwild Control Road" and the loop map omits the Black Mountain track, even though the loop's prose describes riding Black Mountain Road (4S01). This is a one-line data fix.

## Current state

Relevant files:

- `lib/areas.ts` — hand-written area registry, including editorial loops. The bug is at line 176.
- `lib/routes/san-jacinto.generated.ts` — auto-generated route data for San Jacinto. Read-only reference for valid ids; do NOT edit it.
- `components/AreaGuide.tsx` — renders loops; `area.routes.find((x) => x.id === id)` at line 285 returns undefined for the bad id and the chip is skipped (`if (!r) return null;`), and the loop-map builder at lines 88–94 skips ids missing from `trackById`. No change needed here.

The buggy loop in `lib/areas.ts` (lines 170–177):

```ts
      {
        name: "Idyllwild & Black Mountain",
        distanceMiles: 26,
        summary: "Forested plated dual-sport up toward the Black Mountain lookout.",
        description:
          "The Idyllwild side is plated country and makes a relaxed, view-packed day: climb Dark Canyon (4S02), link onto Black Mountain Road (4S01) toward the lookout and the PCT trailheads, then add the Idyllwild Control Road (5S06) to round it out. Graded dirt through pine and cedar with big drop-offs toward the desert. A dual-sport day, not a technical one. Plate-legal throughout; the PCT itself is closed to motors, so those are places to park, not ride.",
        routeIds: ["dark-canyon-road", "el-paso-black-mountain", "idyllwild-control-road"],
      },
```

The correct id, from `lib/routes/san-jacinto.generated.ts` line 204:

```ts
    "id": "black-mountain-road",
```

(`black-mountain-road` is San Jacinto's forest road 4S01, matching the loop description. `el-paso-black-mountain` is a different road in the El Paso Mountains BLM area, referenced correctly by that area's own loops later in the same file — leave those alone.)

## Commands you will need

| Purpose   | Command            | Expected on success |
|-----------|--------------------|---------------------|
| Install   | `npm install`      | exit 0              |
| Typecheck | `npx tsc --noEmit` | exit 0, no output   |

## Scope

**In scope** (the only file you should modify):
- `lib/areas.ts` (one string on line 176)

**Out of scope** (do NOT touch, even though they look related):
- `lib/routes/*.generated.ts` — auto-generated; edits get overwritten on regen.
- `components/AreaGuide.tsx` — the silent-skip behavior is guarded systematically by plan 004's registry invariant tests; don't add ad-hoc guards here.
- The El Paso area's loops in `lib/areas.ts` (lines 490–509) — they use `el-paso-black-mountain` correctly.

## Git workflow

- Branch: `fix-san-jacinto-loop-route-id` (repo uses short kebab-case branch names, merged via PR)
- Commit message style: imperative sentence, e.g. `Fix the San Jacinto loop's Black Mountain route id` (matches history like "Add closure notes and per-area closures-alerts link")
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Replace the wrong route id

In `lib/areas.ts` line 176, change:

```ts
        routeIds: ["dark-canyon-road", "el-paso-black-mountain", "idyllwild-control-road"],
```

to:

```ts
        routeIds: ["dark-canyon-road", "black-mountain-road", "idyllwild-control-road"],
```

**Verify**: `grep -n "el-paso-black-mountain" lib/areas.ts` → exactly 2 matches, both inside the El Paso area's loops (lines ~498 and ~507), none in the San Jacinto section (before line 200).

### Step 2: Cross-check every loop id in the registry

Run this read-only check (it parses the generated route files and compares against every loop's `routeIds`):

```bash
node -e "
const fs = require('fs'), path = require('path');
const routeIds = {};
for (const f of fs.readdirSync('lib/routes')) {
  const src = fs.readFileSync(path.join('lib/routes', f), 'utf8');
  routeIds[f.replace('.generated.ts','')] = new Set([...src.matchAll(/\"id\": \"([^\"]+)\"/g)].map(m => m[1]));
}
const areasSrc = fs.readFileSync('lib/areas.ts', 'utf8');
const sections = areasSrc.split(/\n  \{\n    id: /).slice(1);
let bad = 0;
for (const sec of sections) {
  const areaId = sec.match(/^\"([a-z-]+)\"/)[1];
  const loopIds = [...sec.matchAll(/routeIds: \[([^\]]+)\]/g)].flatMap(m => [...m[1].matchAll(/\"([^\"]+)\"/g)].map(x => x[1]));
  const missing = loopIds.filter(id => !(routeIds[areaId] || new Set()).has(id));
  if (missing.length) { bad++; console.log(areaId, 'MISSING:', missing.join(', ')); }
}
console.log(bad ? 'FAIL' : 'all loop routeIds resolve');
"
```

**Verify**: output is `all loop routeIds resolve`.

### Step 3: Typecheck

**Verify**: `npx tsc --noEmit` → exit 0.

## Test plan

No new test in this plan; plan 004 adds a permanent registry invariant test that covers this class of bug (loop ids must resolve within their area). Step 2's script is the interim verification.

## Done criteria

- [ ] `git diff --stat` shows only `lib/areas.ts` modified, one line
- [ ] Step 2 script prints `all loop routeIds resolve`
- [ ] `npx tsc --noEmit` exits 0
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Line 176 of `lib/areas.ts` doesn't contain `el-paso-black-mountain` (drift).
- `lib/routes/san-jacinto.generated.ts` no longer contains `"id": "black-mountain-road"` (the route may have been removed in an editorial trim; the loop would then need editorial rework, which is not your call).
- Step 2 reports missing ids in any OTHER area — that's a new bug to report, not to fix here.

## Maintenance notes

- Loops in `lib/areas.ts` are hand-written and reference generated route ids by string; nothing enforces the link at build time until plan 004 lands. Until then, any editorial route trim (see git history: "Remove three weak, plate-only stub routes") can silently orphan a loop id.
- Reviewer check: confirm the loop's rendered chain on `/san-jacinto` shows three legs (Dark Canyon Road → Black Mountain Road → Idyllwild Control Road).
