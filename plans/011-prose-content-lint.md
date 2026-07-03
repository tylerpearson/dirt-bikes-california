# Plan 011: Enforce the writing-style rules with a prose content lint (and fix the current violations)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 19d8670..HEAD -- components/StickerGuide.tsx lib/areas.ts lib/routes tests AGENTS.md docs/area-review-process.md`
> If in-scope files changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.
>
> **Network required**: no.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW–MED (the risk is false positives; the allow-rules below are
  what keep it LOW)
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `19d8670`, 2026-07-03

## Why this matters

The repo's writing-style rules (`AGENTS.md`: **no em dashes** in public copy,
**no jammed hyphen compounds** like "highway-legal-only" or
"open-to-all-vehicles road") are enforced today by a documented manual sweep
(`docs/area-review-process.md:180-206`) that has needed repeated cleanup
commits (`47a87de`, `b5b298b`, `f7f2970`, `3a9760d`, PR #13) — and once
regressed ~50 instances at a stroke when the banned compound lived in the
generated note template (PR #25, documented at
`docs/area-review-process.md:221-225`). These rules are mechanically checkable.
A vitest content lint turns the recurring manual sweep into a CI gate that
catches a violation before it multiplies across an area.

## Current state

- The rules, verbatim from `AGENTS.md`:

  > - **No em dashes.** Use commas, periods, colons, or parentheses instead.
  >   (En dashes in ranges like `November–April` are fine.)
  > - **Don't stack words into hyphenated compounds.** Write "road open to all
  >   vehicles", not "open-to-all-vehicles road"; "open to street-legal
  >   vehicles only", not "highway-legal-only".
  > - **Keep the real rider terms** as normal adjectives: green-sticker,
  >   street-legal, plated.

  Scope note from `AGENTS.md`: this applies to **public-facing site copy**;
  internal docs, PR descriptions, and code comments are exempt.

- Where public prose lives:
  1. **Runtime registry strings** — `lib/areas.ts` (blurbs, taglines, loop
     prose, `source` overrides) and `lib/routes/*.generated.ts` (route
     `summary`/`description`/`highlights`/`access.note` etc.), all reachable
     by importing `AREAS` from `@/lib/areas` and walking the objects.
  2. **Hand-written component/page copy** — JSX text and string literals in
     `components/*.tsx` and `app/**/*.tsx`.
  3. **Script prose templates** — the `accessNote()` functions and CONFIG
     blocks in `scripts/build-*.mjs`, which *generate* category 1 on the next
     regen (this is where PR #25's regression lived).

- Current violations, verified at planning time (2026-07-03): exactly one
  cluster. `components/StickerGuide.tsx:49-81` — the `SOURCES` link-label
  array uses " — " as a title separator in all 9 labels, e.g.:

  ```tsx
  // components/StickerGuide.tsx:48-51
  const SOURCES: { label: string; href: string }[] = [
    {
      label: "California DMV — Register an Off-Highway Vehicle (OHV)",
      href: "https://www.dmv.ca.gov/portal/...",
  ```

  Every other em dash in `components/` and `app/` is inside a code comment
  (verified file-by-file: e.g. `components/HeroTopo.tsx:37` is a JSX comment,
  `app/opengraph-image.tsx:10` a line comment). The runtime registry strings
  are clean (zero em dashes in `lib/areas.ts`; the generated files' single em
  dash each is the `// AUTO-GENERATED ... — do not edit by hand.` header
  comment, which is not a prose field). No `highway-legal` or `open-to-all-`
  compounds exist anywhere (grep-verified).

- Test conventions: vitest, files in `tests/*.test.ts`, `@/` alias,
  `expect(cond, message)` with failure messages that name the offending
  path — model after `tests/registry.test.ts`.

- En dashes (`–`, U+2013) are legal and present in data (e.g. `elevationFt:
  "6,800–7,500 ft"`, `bestSeason: "May–October"`) — the lint must ban only
  the em dash (`—`, U+2014).

## Commands you will need

| Purpose   | Command             | Expected on success |
|-----------|---------------------|---------------------|
| Tests     | `npm test`          | all pass            |
| Typecheck | `npm run typecheck` | exit 0              |
| Lint      | `npm run lint`      | exit 0              |
| Build     | `npm run build`     | exit 0              |

## Scope

**In scope**:
- `tests/prose-style.test.ts` (create)
- `components/StickerGuide.tsx` (fix the 9 labels — copy edit only)

**Out of scope** (do NOT touch):
- `lib/areas.ts`, `lib/routes/*.generated.ts` — expected to pass untouched;
  if the lint finds a violation there, see STOP conditions (generated-file
  fixes must be paired with the script template per `AGENTS.md`, and that
  call is the maintainer's).
- `scripts/*.mjs` — the compound check reads them; it must not edit them.
- `docs/*` — internal docs are exempt from the prose rules.
- ESLint config — this lint lives in vitest where the other invariants live,
  not in eslint.

## Git workflow

- Branch: `prose-content-lint`.
- Two commits: `Fix em-dash separators in the sticker guide source labels`,
  then `Add prose-style lint: em dashes and jammed compounds`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Fix the StickerGuide labels

In `components/StickerGuide.tsx:49-81`, replace the " — " separator with
": " in all 9 `label` strings, e.g.
`"California DMV — Register an Off-Highway Vehicle (OHV)"` →
`"California DMV: Register an Off-Highway Vehicle (OHV)"`. Change nothing
else (not the `href`s, not the order). This follows the AGENTS.md rule
("use commas, periods, colons, or parentheses instead").

**Verify**: `grep -c "—" components/StickerGuide.tsx` → `0`.

### Step 2: Create `tests/prose-style.test.ts`

Three describe blocks. Shared constants at the top:

```ts
const EM_DASH = "—"; // U+2014; en dash – (U+2013) in ranges is allowed
/** Jammed compounds banned by AGENTS.md; extend as new ones are spotted. */
const BANNED_COMPOUNDS: { re: RegExp; hint: string }[] = [
  { re: /highway-legal/i, hint: 'write "street-legal"' },
  { re: /open-to-all/i, hint: 'write "open to all vehicles"' },
  { re: /street-legal-only/i, hint: 'write "street-legal vehicles only"' },
];
```

**Block A — registry prose (the load-bearing one).** Import `AREAS` from
`@/lib/areas`. Recursively walk each area object collecting every string
value with its path (e.g. `big-bear.routes[3].access.note`); skip only the
non-prose keys `mvumGeojson` and URL-valued fields (`url`, `closuresUrl`,
`href`) — everything else, including `attribution`/`credit`, is rendered
copy. Assert every collected string contains no `EM_DASH` and matches no
`BANNED_COMPOUNDS` pattern; failure message = the path + a short excerpt +
the hint.

**Block B — hand-written component/page copy.** `readFileSync` every
`components/*.tsx` and `app/**/*.tsx` file (glob via `readdirSync`
recursion — no new deps). Strip comments before scanning, since comments are
exempt: remove block comments `/\/\*[\s\S]*?\*\//g` (this also covers JSX
`{/* … */}` bodies) and line comments `/(^|\s)\/\/.*$/gm` (the required
leading whitespace keeps `https://…` URLs intact). Assert the remainder has
no `EM_DASH` and no banned compound; failure message = file + line number
(compute by re-locating the match in the unstripped source).

**Block C — script prose templates.** For `scripts/build-area-routes.mjs`,
`scripts/build-blm-routes.mjs`, `scripts/build-angeles-routes.mjs`: scan the
raw source for `BANNED_COMPOUNDS` only (NOT em dashes — the scripts contain
em dashes legitimately in code comments and in the `// AUTO-GENERATED … — do
not edit` header template they emit, and the em-dash rule for their *output*
is already enforced by Block A once a regen lands). This is the check that
would have caught PR #25's template regression at edit time.

**Verify**: `npm test` → all pass on the current tree (after Step 1).

### Step 3: Mutation-check the lint

Confirm each block actually fires:

1. Add an em dash to one `tagline` in `lib/areas.ts` → `npm test` fails in
   Block A naming the path → revert (`git checkout -- lib/areas.ts`).
2. Add `"highway-legal"` inside a JSX string in `components/AreaGuide.tsx` →
   fails in Block B with file+line → revert.
3. Add `open-to-all-vehicles` inside the `accessNote` template string in
   `scripts/build-area-routes.mjs` → fails in Block C → revert.

**Verify**: after reverts, `git status` shows only
`components/StickerGuide.tsx` and `tests/prose-style.test.ts` modified/added,
and `npm test` passes.

## Test plan

The new file is the test. Cases: Block A (registry walk, ~13 areas × all
string fields), Block B (component/page sources, comment-stripped), Block C
(script templates, compounds only) — plus the three mutation checks above
performed and reverted. Model structure and failure-message style after
`tests/registry.test.ts`. Verification: `npm test` → exit 0.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `grep -c "—" components/StickerGuide.tsx` returns 0
- [ ] `tests/prose-style.test.ts` exists with the three blocks; `npm test` exits 0
- [ ] All three mutation checks demonstrated to fail, then reverted (state this in the report)
- [ ] `npm run typecheck`, `npm run lint`, `npm run build` exit 0
- [ ] `git status` clean outside the two in-scope files
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Block A fails on the **current** tree anywhere outside what Step 1 fixed —
  especially in `lib/routes/*.generated.ts` content. Fixing generated prose
  requires editing the script template AND the generated file identically
  (`AGENTS.md`; `docs/area-review-process.md:195-203`), and whether to do
  that inline is the maintainer's call. Report the exact paths.
- Block B fails on a file where the em dash is genuinely inside a comment —
  that means the comment-stripper has a gap; fix the stripper, not the
  comment, and if you can't within two attempts, report.
- You are tempted to add an allowlist entry to make the current tree pass —
  the tree was verified clean at planning; an allowlist need means drift.
- Any file outside the two in-scope files needs modification.

## Maintenance notes

- To extend the rules, add to `BANNED_COMPOUNDS` — one line per new offender,
  with the rewrite hint (`docs/area-review-process.md:189-193` has the
  canonical don't/do table).
- The lint intentionally does NOT check `docs/` (internal, exempt per
  AGENTS.md) and does NOT check em dashes in script source (comments +
  emitted file headers are legitimate); the scripts' *prose output* is
  covered via the registry walk after each regen.
- The manual "writing-style sweep" in `docs/area-review-process.md` remains
  the place for judgment calls (compound patterns not yet in the list,
  awkward-but-legal phrasing); this lint only automates the known-mechanical
  part. A future docs touch-up could note the lint's existence there —
  deliberately left out of this plan's scope (plan 013 owns doc edits).
