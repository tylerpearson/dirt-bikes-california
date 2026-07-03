# Plan 013: Fix the four documentation drifts

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 19d8670..HEAD -- README.md docs/adding-an-area.md docs/area-review-process.md package.json`
> If in-scope files changed since this plan was written, compare the
> "Current state" excerpts against the live text before proceeding; on a
> mismatch, treat it as a STOP condition.
>
> **Network required**: no.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW (doc text only)
- **Depends on**: none
- **Category**: docs
- **Planned at**: commit `19d8670`, 2026-07-03

## Why this matters

These docs are executable playbooks — agents and contributors follow them
verbatim when adding areas and reviewing them. Four spots are now actively
wrong, and a wrong instruction is worse than a missing one: one step runs a
path that doesn't exist in the repo, the README omits two of the four CI
gates, one doc contradicts itself on how many review passes exist, and the
playbook intro names areas that were since merged.

Note: `AGENTS.md`'s writing-style rules (no em dashes etc.) apply to public
site copy, NOT to these internal docs — but don't introduce new em dashes
anyway; match each file's existing style.

## Current state

1. **Dead tool path** — `docs/adding-an-area.md:196-199` (Step 6 verification):

   ```
   ```bash
   npm run build                          # must be clean (TS + static gen)
   node .claude/skills/impeccable/scripts/detect.mjs --json <changed files>
   ```
   ```

   The repo's `.claude/` directory contains no `skills/` — the impeccable
   skill lives at the *user* level (`~/.claude/skills/`), so this
   repo-relative invocation fails with file-not-found for anyone else.
   Meanwhile `docs/area-review-process.md` (Pass 6, around lines 133-146)
   invokes the same tool as the `/impeccable` slash-command skill — the two
   docs disagree on how to run it.

2. **README scripts block omits the CI gates** — `README.md:97-105`:

   ```
   ### Scripts

   ```bash
   npm run dev      # start the dev server
   npm run build    # production build
   npm run start    # serve the production build
   npm run lint     # eslint
   ```
   ```

   `package.json` also defines `typecheck` (`tsc --noEmit`) and `test`
   (`vitest run`), and `.github/workflows/ci.yml` runs typecheck, lint,
   build, AND test on every PR/push. A contributor reading only the README
   pushes and gets a surprise red check.

3. **"Six passes" vs the eight-step list** — `docs/area-review-process.md:9-16`:

   ```
   Run all six passes, in order, on every new area. ...

   > TL;DR order: **sort best-first → rider review → PM review → trim weak routes →
   > add loops → impeccable UI critique → writing-style sweep → content-humanizer
   > audit.** Then build, screenshot, commit.
   ```

   The TL;DR enumerates eight steps; the file has six numbered "Pass"
   sections plus two additional sweep sections ("Writing-style sweep",
   "Content-humanizer audit"). "All six passes" undersells what's mandatory.

4. **Stale area names in the playbook intro** — `docs/adding-an-area.md:3-4`:

   ```
   This is the repeatable process we used to build the Big Bear, Palm Springs,
   Idyllwild, and Santa Barbara guides.
   ```

   Palm Springs and Idyllwild were merged into the single `san-jacinto` area —
   a change the same file documents later (Gotcha 3, ~lines 222-229). The
   intro contradicts the file's own guidance.

## Commands you will need

| Purpose   | Command             | Expected on success |
|-----------|---------------------|---------------------|
| Tests     | `npm test`          | all pass (docs changes can't break them; sanity gate) |
| Grep gates | see Done criteria  | as listed           |

## Scope

**In scope** (the only files you should modify):
- `docs/adding-an-area.md`
- `docs/area-review-process.md`
- `README.md`

**Out of scope** (do NOT touch):
- `AGENTS.md`, `PRODUCT.md`, `docs/adding-a-blm-area.md` (checked at planning
  time; no drift found there)
- `package.json`, `.github/workflows/ci.yml` — the docs move toward the
  code, never the reverse, in this plan.
- Any restructuring beyond the four fixes — no rewrites, no new sections.

## Git workflow

- Branch: `docs-drift-fixes`.
- Single commit: `Fix doc drift: impeccable invocation, README scripts, pass count, stale area names`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Align the impeccable invocation

In `docs/adding-an-area.md:196-199`, replace the `node .claude/...` line so
the block reads:

```bash
npm run build                          # must be clean (TS + static gen)
```

and immediately after the code block, add one sentence: run the
**`/impeccable`** skill on the changed pages (the same invocation Pass 6 of
`docs/area-review-process.md` uses); it requires the impeccable skill
installed in your agent environment (it is not vendored in this repo).
Match the file's surrounding prose style.

**Verify**: `grep -rn "\.claude/skills" docs/` → no matches.

### Step 2: Complete the README scripts block

In `README.md:99-104`, extend the block to cover all four CI gates plus the
existing entries, e.g.:

```bash
npm run dev        # start the dev server
npm run build      # production build
npm run start      # serve the production build
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
npm test           # vitest (registry invariants + unit tests)
```

Optionally note in one clause that CI runs typecheck, lint, build, and test
on every PR (matches `.github/workflows/ci.yml`).

**Verify**: `grep -n "typecheck" README.md` → at least one match in the
scripts block.

### Step 3: Fix the pass count

In `docs/area-review-process.md:9`, change "Run all six passes, in order, on
every new area." to state the true shape, e.g.: "Run all six numbered passes,
in order, on every new area, then the writing-style sweep and the
content-humanizer audit." Leave the TL;DR as is (it's correct).

**Verify**: `grep -n "all six passes" docs/area-review-process.md` → no
matches; `grep -c "content-humanizer" docs/area-review-process.md` ≥ 2.

### Step 4: Update the playbook intro

In `docs/adding-an-area.md:3-4`, replace the area list so it matches reality
without rewriting history, e.g.: "This is the repeatable process we used to
build the first guides (Big Bear, San Jacinto, and Santa Barbara), since
extended across thirteen areas." Keep the rest of the paragraph untouched.
(San Jacinto is the merged Palm Springs + Idyllwild area — see the file's own
Gotcha 3.)

**Verify**: `grep -n "Palm Springs," docs/adding-an-area.md` → the intro
(lines 1-10) no longer matches; Gotcha 3's historical mention of the merge
(around line 222) MAY still mention Palm Springs/Idyllwild — leave that one,
it is correct historical context.

## Test plan

Docs-only change; the gate is `npm test` still passing (nothing parses these
files) plus the four grep verifications above.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `grep -rn "\.claude/skills" docs/` returns nothing
- [ ] README scripts block lists `typecheck` and `test`
- [ ] `grep -n "all six passes" docs/area-review-process.md` returns nothing
- [ ] The `adding-an-area.md` intro no longer lists Palm Springs/Idyllwild as separate guide areas
- [ ] `npm test` exits 0
- [ ] `git status` shows changes only in the three in-scope files
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The quoted text at any of the four locations doesn't match the "Current
  state" excerpts (someone already fixed or moved it).
- You find yourself wanting to restructure a doc, renumber the passes, or
  edit `docs/adding-a-blm-area.md` — out of scope; note the idea in your
  report instead.

## Maintenance notes

- Plan 011 adds an automated prose lint; a natural follow-up (deferred, noted
  there too) is a one-line mention of it in the "Writing-style sweep" section
  of `docs/area-review-process.md` once both have landed.
- If the impeccable skill ever gets vendored into the repo, Step 1's sentence
  should point back at a concrete path.
