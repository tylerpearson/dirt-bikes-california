<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project: SoCal dirt bike route field guide

A multi-area guide to OHV/dual-sport dirt bike routes. Each area (Big Bear, Palm
Springs, Idyllwild, Santa Barbara, …) is a registry entry in `lib/areas.ts`
rendered by the shared `components/AreaGuide.tsx`. Route geometry and legal
access come from the USFS MVUM (national forests) or the BLM GTLF (BLM OHV land);
elevation from SRTM. Only prose is hand-written. (California State SVRAs like
Ocotillo Wells / Hungry Valley are a different agency with fees and are out of
scope.)

**Adding another riding area?** For a national forest, follow
[`docs/adding-an-area.md`](docs/adding-an-area.md). For BLM land (e.g. Jawbone
Canyon), follow [`docs/adding-a-blm-area.md`](docs/adding-a-blm-area.md) — same
shape, different source and access model (open vs limited, not green vs plate).
Both are the end-to-end pipeline (bbox → overview map → curated routes → GPX →
register → verify) plus the gotchas we already hit (national road-number
collisions, editorial-vs-derived access drift, overlapping areas, BLM's anonymous
geometry). Then run every area through the six editorial/QA passes in
[`docs/area-review-process.md`](docs/area-review-process.md) (sort best-first →
rider review → PM review → trim weak routes → loops → impeccable UI critique)
before calling it done.

Current closures (fire, storm, or gate orders with an order number, official
URL, and end date) live in `lib/closures.ts`, a hand-maintained registry
decoupled from the route generators. It's joined to routes at render time by
`components/AreaGuide.tsx`: a banner, a "Currently closed" badge on affected
route cards, and greyed segments on the overview map. Each entry auto-hides
once its `effectiveThrough` date passes, and the build warns when a dated
entry has lapsed so it gets renewed or removed. This replaces the old
`closure:` field that used to live in `scripts/build-area-routes.mjs`; that
field is gone. Seasonal riding windows and weekly weather closures still
belong in hand-written prose, not the registry.

# Writing style (hand-written prose)

Write like a person, not a brochure. Applies to public-facing site copy: area
blurbs, route descriptions and notes, loop descriptions, and SEO/metadata. Internal
docs, PR descriptions, and commit messages don't need to follow these rules.

- **No em dashes.** Use commas, periods, colons, or parentheses instead. (En
  dashes in ranges like `November–April` are fine.)
- **Don't stack words into hyphenated compounds.** Write "road open to all
  vehicles", not "open-to-all-vehicles road"; "open to street-legal vehicles
  only", not "highway-legal-only".
- **Keep the real rider terms** as normal adjectives: green-sticker,
  street-legal, plated.
- Route notes are generated from the CONFIG/template in
  `scripts/build-area-routes.mjs`, so fix wording there too, not just in the
  generated files, or a regen reverts it.
