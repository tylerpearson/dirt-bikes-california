<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project: SoCal dirt bike route field guide

A multi-area guide to OHV/dual-sport dirt bike routes. Each area (Big Bear, Palm
Springs, Idyllwild, Santa Barbara, …) is a registry entry in `lib/areas.ts`
rendered by the shared `components/AreaGuide.tsx`. Route geometry and legal
access come from the USFS MVUM; elevation from SRTM. Only prose is hand-written.

**Adding another riding area?** Follow [`docs/adding-an-area.md`](docs/adding-an-area.md)
— it's the end-to-end pipeline (bbox → MVUM overview map → curated routes → GPX
→ register → verify) plus the gotchas we already hit (national road-number
collisions, editorial-vs-derived access drift, overlapping areas).

# Writing style (hand-written prose)

Write like a person, not a brochure. Applies to all copy: area blurbs, route
descriptions and notes, loop descriptions, and SEO/metadata.

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
