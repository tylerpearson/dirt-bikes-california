# Playbook: Reviewing a Riding Area

`adding-an-area.md` gets the **facts** onto the page (bbox → MVUM → routes → GPX →
register → build). This doc is what comes after: the **editorial and quality
review** every area went through before it was considered done. The data pipeline
makes an area accurate; these passes make it *good*, and make every area hold the
same bar.

Run all six numbered passes, in order, on every new area, then the
writing-style sweep and the content-humanizer audit. Each pass is a distinct "lens" /
reviewer persona we actually used. Do them as separate commits so the reasoning
stays legible (that's how the existing areas read in `git log`).

> TL;DR order: **sort best-first → rider review → PM review → trim weak routes →
> add loops → impeccable UI critique → writing-style sweep → content-humanizer
> audit.** Then build, screenshot, commit.

---

## Where each pass writes

| Pass touches | File(s) |
|---|---|
| Route order, distances, seasons, descriptions | `lib/routes/<area>.generated.ts` **and** the `CONFIG` in `scripts/build-area-routes.mjs` (keep both in sync or a regen reverts you) |
| Area blurb, tagline, loops | `lib/areas.ts` (`AREAS[]`) |
| Loop rendering ("Make a day of it") | `components/AreaGuide.tsx` (already built, no per-area change) |
| UI critique fixes | shared components (`RouteCard`, `RouteMap`, `AreaMap`, `app/page.tsx`, …) |

**The golden rule from the data pipeline still applies here:** the access badge and
access `note` are auto-derived from the MVUM and are authoritative. Prose must never
contradict them. Every pass below defers to the MVUM on legal access.

---

## Pass 1: Sort routes best-first

Routes render in array order, and that order is an editorial claim: "this is the
ride to do first." Get it right before anyone reviews the content.

Ranking rule we settled on (see `a9ccdf3`, `57cfcd5`):

1. The area's **marquee route** (the one people come for).
2. **Green-sticker singletrack**, then green-sticker roads. Green-sticker access is
   the scarce, valuable thing on a dirt bike. A green-sticker trail outranks a
   graded fire road even if the fire road is "nicer," because plated bikes can
   ride everything anyway. This was the single most common reorder we made.
3. Notable plated / mixed routes, best to worst.
4. Connectors and stubs last (and see Pass 4; they may not belong at all).

Mirror the order in **both** `lib/routes/<area>.generated.ts` and the script
`CONFIG`, or the next regen undoes it.

## Pass 2: Experienced-rider review (the "Doc" / moto-tourer lens)

Read every route and loop as a rider who has actually ridden the area for years.
This pass is about *truth and usefulness*, not polish. What we fixed historically
(`9ad4126`, `24acb2c`):

- **Reconcile distances to GPX truth.** The card renders the GPX-measured distance;
  make the prose match it. We had prose saying "~17.8 mi" where the track was ~13.
  Don't round in the rider's favor.
- **Date the seasonal closures.** Replace vague "closes seasonally" with a rough
  window: high-country snow ~Dec–Apr, storm-driven wet-weather closures ~Nov–Apr.
  A window a rider can plan around beats a hedge.
- **Surface the real gotchas.** Gates between stretches, wet-season gate closures,
  required passes (Adventure Pass), plate-only connectors that isolate the
  green-sticker bits (so you trailer/shuttle between them). These are the things
  that wreck a day if nobody warned you.
- **Frame time over mileage** on committing rides. "Plan five to six hours with
  stops" is more honest than a mileage number for an all-day epic.
- **Reframe reputation vs. reality.** John Bull was implied "best"; it's really
  "most famous, experts-only." Say which.

## Pass 3: PM review of the important info

Now read it as a product manager protecting the guide's credibility. The question
is narrower: **does any claim promise something the data doesn't back up?**

- **No access overclaiming.** Don't describe an area or route as green-sticker
  riding if the route list and MVUM say otherwise. When we implied the Wildomar
  OHV area as a green-sticker offering the route list couldn't support, we reframed
  it as a separate, not-detailed-here system (`caa2ac3`).
- **Prose vs. derived access, one more time.** If the build prints `partial` for a
  road, the prose can't call it "designated green-sticker." The MVUM wins, always.
- **Every legal/safety claim is grounded.** PCT is closed to all motor vehicles;
  say "park here, don't ride this," not something a reader could misread as rideable.
- **Cross-area consistency.** Same terms, same difficulty scale, same honesty about
  "most roads here are plate-only" as the other areas. An all-plate area should
  *say so* and point to where the green-sticker riding actually is.

## Pass 4: Trim weak routes

A guide whose value is green-sticker access shouldn't pad itself with plate-only
stubs (plated bikes can ride everything anyway). Cut routes that don't earn a card
(`f0f2eb5`): short plate-only connectors, name-collision duplicates, the shortest
stub in an already plate-heavy area.

When you remove a route, remove **all** of it so a regen can't resurrect it:

- the entry in `lib/routes/<area>.generated.ts`,
- its `CONFIG` block in `scripts/build-area-routes.mjs`,
- the orphaned `public/gpx/<id>.gpx`,
- and check **no loop's `routeIds` referenced it** before cutting.

## Pass 5: Add loops ("Make a day of it")

Every area should have **at least two curated day-loops**. They string existing
routes into a real plan and render as the "Make a day of it" section via the
optional `loops?: AreaLoop[]` on `Area` (type in `lib/areas.ts`).

Rules we held to (`24acb2c`, `caa2ac3`, `9ad4126`):

- **Lead with the green-sticker loop** where the area has one. It's the access
  differentiator.
- **Ground every loop in real `routeIds`**, in riding order. The section renders
  anchor links to each route card, so the ids must exist.
- **Carry the rider-review warnings into the loop prose** (gates, passes, isolated
  green-sticker stretches, time-not-mileage framing).
- `distanceMiles` is a rough composite; approximate is fine, say so in the copy.

```ts
loops: [
  {
    name: "Garner Valley OHV Day",
    id: "garner-valley-ohv-day",   // kebab-case, unique within the area
    distanceMiles: 24,
    summary: "…one-line framing of the day…",
    description: "…the ride in order, with the real warnings…",
    routeIds: ["…", "…"],   // must match real route ids, in order
  },
  // …at least one more
],
```

Every loop needs an `id`. Run `npm run build:loops` afterward to generate its
composite downloadable GPX under `public/gpx/loops/`, commit the output, and
confirm the loop card's "↓ GPX" link downloads a file containing the right
legs (one `<trk>` per `routeId`, in order).

## Pass 6: Impeccable UI critique + screenshot verify

Finally, review the rendered page as an interface, using the **impeccable** skill.
This is where the "Critique fixes" work came from (`82357c0`: hero density, map
loading state, single canonical distance). Triage findings by priority (P1 blocking,
P2 should-fix, P3 nice-to-have) and fix the shared component, not one area.

Then **see it**, don't assume it (headless Chrome + `puppeteer-core` in the
scratchpad is how we screenshot, since there's no browser MCP):

```bash
npm run build   # must be clean: TS + static gen
npm run dev     # then screenshot the running app
```

Eyeball, for the new area:

- the **hero** (blurb + tagline read well, legal detail is collapsed not dumped),
- the **overview map** (let it lazy-load; green/blue coloring is vivid, not greyed),
- one **route card** (distance shows once, elevation strip renders, map paints),
- the **"Make a day of it"** section (loops present, anchor links land on cards),
- the **nav at 375px** (scrolls horizontally, wordmark stays one line, no page
  overflow),
- a **clean console**.

---

## Final per-area checklist

- [ ] Routes ordered best-first; green-sticker lifted above fire roads
- [ ] Order mirrored in `*.generated.ts` **and** script `CONFIG`
- [ ] Distances match the GPX the card renders
- [ ] Seasonal closures given as dated windows, not "closes seasonally"
- [ ] Real warnings surfaced (gates, passes, isolated green-sticker, connectors)
- [ ] No access claim the route list / MVUM can't back up
- [ ] Prose never contradicts the derived access badge/note
- [ ] Weak plate-only stubs trimmed (route + CONFIG + GPX + no loop refs)
- [ ] ≥2 loops, green-sticker loop first, real `routeIds`
- [ ] impeccable critique run; P1/P2 fixed in shared components
- [ ] `npm run build` clean
- [ ] Screenshots checked: hero, overview map, a card, loops, nav @375px, console
- [ ] Writing-style sweep done (see below)
- [ ] content-humanizer audit run (AI tells, incl. the access-note template)
- [ ] Committed as legible, per-pass commits

---

## Writing-style sweep (every pass)

All public-facing copy follows the rules in `AGENTS.md`: **no em dashes**, **no
jammed hyphen compounds**, keep the real rider terms (green-sticker, street-legal,
plated) as normal adjectives.

The compound rule trips us up most on access wording, where it's tempting to stack
modifiers into a noun. Unjam them into plain English (PR #13, `435abd1`):

| Don't write | Write |
|---|---|
| "open-to-all-vehicles road" | "road open to all vehicles" |
| "highway-legal-only" | "open to street-legal vehicles only" (or "street-legal vehicles only" / "for street-legal bikes only," as the sentence calls for) |
| "...some segments are open to all and others are highway-legal-only..." | "...some segments are open to all vehicles and others are open to street-legal vehicles only..." |

Two hard rules when doing this:

1. **Meaning must not change.** This is pure phrasing. The access facts (who can
   ride where) are identical before and after, and must stay consistent with the
   derived MVUM badge/note. Reword, don't reclassify.
2. **Fix it in the template, not just the output.** Route notes are generated from
   the CONFIG/template in `scripts/build-area-routes.mjs`. Edit the wording **there**
   and in the generated `lib/routes/<area>.generated.ts`, identically, or the next
   regen reintroduces the jammed compound (drift).

This is a recurring cleanup in the log (`47a87de`, `b5b298b`, `f7f2970`, `3a9760d`,
PR #13), so do it inline as you write rather than as a late sweep.

## Content-humanizer audit (every new area)

After the writing-style sweep, run the new area's prose through the
**content-humanizer** skill (`/content-humanizer`, audit mode) before calling it
done. The writing-style sweep catches the `AGENTS.md` rule breaks; this catches the
softer AI tells the rules don't name: filler words, hedging chains, verbatim
templated boilerplate repeated across routes, and "view-word" inflation (every
route opening to "sweeping / enormous / big views").

Audit the area blurb + tagline (`lib/areas.ts`), the loop descriptions, and every
route `summary` / `description` / `highlights`. Two things to watch that are
specific to this guide:

- **The access-note template is a repeat offender.** The auto-generated `note`
  (the `accessNote()` function in `scripts/build-area-routes.mjs`) once emitted
  "open to highway-legal vehicles only," which reintroduced the banned jammed
  compound on every plate-only route at once. A template tell multiplies across the
  whole area, so check the generated `note` text, not just the hand-written prose.
- **Descriptions echoing the structured note.** Don't have the description repeat
  "read the signs at each junction" / "green-sticker access is segment-by-segment"
  verbatim when the derived `note` already says it. Vary it or drop it; the note
  carries the authoritative version.

Same two hard rules as the writing-style sweep apply: meaning must not change
(reword, don't reclassify), and fix it in the `CONFIG`/template **and** the
generated file identically, or a regen reverts you. This audit was added after
PR #25's prose-cleanup pass, which normalized ~50 `highway-legal` instances the
earlier sweeps had missed because they lived in the note template.
