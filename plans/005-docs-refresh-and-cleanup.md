# Plan 005: Refresh stale README/PRODUCT.md and clean up small repo debris

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c7261bf..HEAD -- README.md PRODUCT.md public scripts/build-area-routes.mjs lib/areas.ts`
> If `README.md` or `PRODUCT.md` changed since this plan was written, compare
> the "Current state" excerpts against the live files before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: docs (plus two trivial tech-debt/bug items folded in)
- **Planned at**: commit `c7261bf`, 2026-07-01

## Why this matters

`README.md` and `PRODUCT.md` are the first things a human or agent reads, and both are actively wrong. The README says the guide covers "Seven areas across the San Bernardino, Los Padres, and Cleveland national forests" — there are twelve areas, including two BLM desert areas whose data comes from a different source (BLM GTLF) the README never mentions. `PRODUCT.md` still describes "a single-page field guide to the best dirt bike routes around Big Bear," a product that stopped being single-page or Big-Bear-only many releases ago. Stale intent docs steer future work wrong (agents read these before touching anything). Two tiny hardening/debris items ride along: the GPX writer doesn't XML-escape route names, and five unused Next.js template SVGs sit in `public/`.

## Current state

- **`README.md`** — stale sections:
  - Lines 9–13 say facts come from "the U.S. Forest Service Motor Vehicle Use Map (MVUM)" only; BLM areas (added since) come from the BLM GTLF travel network (see `docs/adding-a-blm-area.md` and `AGENTS.md`).
  - Lines 19–34 ("Riding areas"): "Seven areas across the San Bernardino, Los Padres, and Cleveland national forests" followed by a 7-item list. There are now 12 areas.
  - Lines 78–86 ("Regenerating area data") list only `fetch-mvum-area.mjs` and `build-area-routes.mjs`; the BLM pipeline (`scripts/fetch-blm-area.mjs`, `scripts/build-blm-routes.mjs`) is missing.
  - Lines 137–142 ("Data sources & credits") omit the BLM GTLF.
  - The rest of the README (deployment, tech stack, license) was verified accurate at the planned-at commit; leave it.
- **The authoritative area list** lives in `lib/areas.ts` (`AREAS`, lines 113–512). The 12 areas, grouped by managing unit:
  - San Bernardino National Forest: Big Bear, Lake Arrowhead, San Gorgonio, San Jacinto
  - Los Padres National Forest: Mt Pinos, Santa Barbara, San Luis Obispo
  - Cleveland National Forest: Santa Ana Mtns, Laguna Mtns, Palomar
  - BLM Ridgecrest Field Office (Mojave Desert): Jawbone Canyon, El Paso Mountains

  Use each area's `tagline` field from `lib/areas.ts` as the one-line description in the README list (they're written for exactly this purpose).
- **`PRODUCT.md`** — stale sections: "Users" (lines 8–14, Big Bear only) and "Product Purpose" (lines 17–24, "A single-page field guide ... around Big Bear"). The "Brand Personality", "Anti-references", "Design Principles", and "Accessibility & Inclusion" sections describe the design system and remain accurate; do NOT rewrite them.
- **GPX name escaping** — `scripts/build-area-routes.mjs` line 1347 writes the route name into XML raw:

```js
  <trk><name>${cfg.name}</name><trkseg>
```

  A future route name containing `&` or `<` would emit invalid GPX. The BLM sibling has the same pattern — check `scripts/build-blm-routes.mjs` for its `<name>` interpolation and fix both the same way.
- **Unused template SVGs** — `public/file.svg`, `public/vercel.svg`, `public/next.svg`, `public/globe.svg`, `public/window.svg` are the create-next-app defaults; nothing under `app/`, `components/`, or `lib/` references them (verified by grep at the planned-at commit).

### Writing style (required for these edits)

From `AGENTS.md`: write like a person, not a brochure. Specifically:
- **No em dashes** in prose you write. Use commas, periods, colons, or parentheses. (En dashes in ranges like `November–April` are fine.)
- Don't stack words into hyphenated compounds ("road open to all vehicles", not "open-to-all-vehicles road").
- Keep rider terms as normal adjectives: green-sticker, street-legal, plated.

These rules formally bind site copy, but apply them to the README/PRODUCT.md prose you write here too; the maintainer dislikes em-dash-heavy AI prose everywhere.

## Commands you will need

| Purpose   | Command            | Expected on success |
|-----------|--------------------|---------------------|
| Typecheck | `npx tsc --noEmit` | exit 0              |
| Build     | `npm run build`    | exit 0              |
| Ref check | `grep -rn "vercel.svg\|next.svg\|globe.svg\|file.svg\|window.svg" app components lib` | no matches |

## Scope

**In scope** (the only files you should modify/delete):
- `README.md`
- `PRODUCT.md`
- `scripts/build-area-routes.mjs` (the GPX `<name>` line and a small escape helper only)
- `scripts/build-blm-routes.mjs` (same, if it has the same raw interpolation)
- Delete: `public/file.svg`, `public/vercel.svg`, `public/next.svg`, `public/globe.svg`, `public/window.svg`

**Out of scope** (do NOT touch):
- `AGENTS.md`, `CLAUDE.md`, `docs/*.md` — accurate as of the planned-at commit.
- `lib/areas.ts` and all site copy — this plan changes docs and scripts, not the site.
- Do NOT run the regen scripts (`node scripts/build-area-routes.mjs` etc.); they hit live government APIs and rewrite generated files. The escaping change is verified by inspection and a tiny node snippet, not by regenerating.
- `public/data/`, `public/gpx/` — generated data.

## Git workflow

- Branch: `docs-refresh` (short kebab-case, merged via PR)
- Commit message style: imperative sentence, e.g. `Refresh README and PRODUCT.md to the twelve-area reality`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Update README "Riding areas"

Replace the section at lines 19–34 with a 12-area list grouped by the four managing units listed in Current state, one line per area using its `tagline` from `lib/areas.ts` (trim to keep lines readable; keep the existing bold-name bullet format). Update the intro sentence to say twelve areas across three national forests (San Bernardino, Los Padres, Cleveland) plus BLM desert (Ridgecrest Field Office). Keep the closing line about the home page being a statewide map.

**Verify**: `grep -c "^- \*\*" README.md` → 12 (twelve area bullets). `grep -n "Seven areas" README.md` → no matches.

### Step 2: Update README data-source mentions

- Guiding-principle paragraph (lines 9–13): say route geometry and legal access come from the USFS MVUM for national forests and the BLM GTLF travel network for BLM areas; elevation from SRTM. Keep the sentence rhythm; no em dashes.
- "Regenerating area data" (lines 78–86): add the BLM pair alongside the USFS pair:

```bash
node scripts/fetch-mvum-area.mjs           # USFS overview-map GeoJSON (per area)
node scripts/build-area-routes.mjs [area]  # USFS featured routes + GPX (MVUM + SRTM)
node scripts/fetch-blm-area.mjs            # BLM overview-map GeoJSON (per area)
node scripts/build-blm-routes.mjs [area]   # BLM featured routes + GPX (GTLF + SRTM)
```

(Confirm the exact script usage lines from each script's header comment before writing them; the BLM scripts' headers document their own invocation.)
- "Data sources & credits": add a BLM GTLF line mirroring the MVUM line.

**Verify**: `grep -n "GTLF\|BLM" README.md` → at least 3 matches spanning the three sections.

### Step 3: Update PRODUCT.md scope

Rewrite only "Users" and "Product Purpose":
- Users: riders planning a day across Southern California's federal OHV land (national forests and BLM desert), same two questions (worth it and within ability; what registration it takes: green sticker or street-legal plate). Keep phone/desktop, pre-trip framing.
- Product Purpose: a multi-area field guide; a statewide map home page leading to per-area pages, each with an overview access map, suggested day loops, and per-route cards (map thumbnail with the track drawn on, elevation profile, ride details, legal requirement, GPX download). Success criterion stays: scan, pick a ride matching skill and bike, know what's needed before loading up.

Do not touch the other four sections.

**Verify**: `grep -n "single-page" PRODUCT.md` → no matches; `grep -n "Anti-references" PRODUCT.md` → still present.

### Step 4: Escape GPX route names in the build scripts

In `scripts/build-area-routes.mjs`, add near the other small helpers (e.g. by `fmtFt`, ~line 1266):

```js
const escXml = (s) =>
  s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
```

Change line 1347 from `<trk><name>${cfg.name}</name><trkseg>` to `<trk><name>${escXml(cfg.name)}</name><trkseg>`.

Check `scripts/build-blm-routes.mjs` for the same raw `<name>${...}` interpolation and apply the identical helper + call there if present.

**Verify**: `node -e "
const escXml = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
console.log(escXml('Fish & Chips <Loop>'));
"` → `Fish &amp; Chips &lt;Loop&gt;`. And `grep -n "escXml(cfg.name)" scripts/build-area-routes.mjs` → 1 match. Do NOT run the script itself.

### Step 5: Delete the unused template SVGs

```bash
git rm public/file.svg public/vercel.svg public/next.svg public/globe.svg public/window.svg
```

**Verify**: `grep -rn "vercel.svg\|next.svg\|globe.svg\|file.svg\|window.svg" app components lib` → no matches, then `npm run build` → exit 0.

### Step 6: Full gate

**Verify**: `npx tsc --noEmit` → exit 0; `npm run build` → exit 0; `git status` shows only the in-scope files.

## Test plan

No unit tests (docs and a build-script string change). Gates: the greps above, typecheck, and a full static build proving no deleted asset was referenced.

## Done criteria

- [ ] README lists 12 areas in 4 groups; no "Seven areas" text remains
- [ ] README names the BLM GTLF as a data source and lists the BLM regen scripts
- [ ] PRODUCT.md no longer says "single-page" or scopes to Big Bear alone; design sections untouched (`git diff PRODUCT.md` shows no hunks below "Brand Personality")
- [ ] `escXml` applied to the GPX `<name>` write in both build scripts (or the report states build-blm-routes.mjs had no raw interpolation)
- [ ] The five template SVGs are deleted; `npm run build` exits 0
- [ ] No em dashes in the prose you added: `grep -n "—" README.md PRODUCT.md` shows no NEW occurrences relative to `git show c7261bf:README.md` (pre-existing ones you didn't touch may remain)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The number of areas in `lib/areas.ts` isn't 12 (`grep -c '^    id: "' lib/areas.ts`) — the registry moved; rewrite the list from the live registry, and if area GROUPS changed (a new forest/office), flag it rather than inventing a grouping.
- `npm run build` fails after the SVG deletion (something started referencing one; restore and report).
- `scripts/build-blm-routes.mjs`'s GPX writing differs structurally from the USFS script (multi-segment `<trkseg>` writer) in a way that makes the one-line escape ambiguous — report the excerpt instead of guessing.

## Maintenance notes

- The README's area list will drift again every time an area lands; `docs/adding-an-area.md`'s checklist is where a "update README" reminder belongs (deferred, as that doc was accurate and out of scope here).
- Not addressed on purpose: the `npm audit` moderate advisory (postcss via next's bundled copy) is build-time only on a static export; it clears on a routine Next.js patch bump and wasn't worth a plan. Noted here so nobody re-audits it as new.
- Reviewer check: README claims should match `lib/areas.ts` exactly (names, grouping, count), and PRODUCT.md's untouched sections should show zero diff.
