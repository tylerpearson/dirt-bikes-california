// Build featured-route data + GPX for a BLM OHV area straight from the BLM GTLF
// travel network, so distance, access, geometry and elevation are all real.
// This is the BLM analog of build-area-routes.mjs.
//
//   node scripts/build-blm-routes.mjs [area ...]
//
// Emits public/gpx/<route-id>.gpx and lib/routes/<area>.generated.ts.
//
// Curation handle: USFS road numbers don't exist here. BLM GTLF routes are
// mostly anonymous geometry, so a featured route selects its segments by
//   - `names`:       exact ROUTE_PRMRY_NM match (one or more), or
//   - `singletrack`: every "Motorized Single Track" segment in the bbox.
// Segments are queried across the open (layer 0) and limited (layer 1) road
// layers and stitched into one track, same as the MVUM builder.

import { writeFile, mkdir } from "node:fs/promises";

const BASE =
  "https://gis.blm.gov/arcgis/rest/services/transportation/BLM_Natl_GTLF_Public_Display/MapServer";
const UA = "dirt-bikes/1.0 (route-guide; build script)";
const SOURCE = "BLM Ground Transportation Linear Features (GTLF), 2026";

// Route designation numbers / names repeat across BLM field offices, so every
// lookup is constrained to the area's bounding box (same lesson as the MVUM).
const BBOX = {
  jawbone: "-118.30,35.18,-118.02,35.46",
  "el-paso": "-117.95,35.30,-117.62,35.50",
};

// ---- Curated featured routes (editorial fields only; facts are derived) -----
// Jawbone Canyon / Dove Springs / Butterbredt — the Mojave green-sticker OHV
// complex on BLM Ridgecrest Field Office land off Highway 14. The whole open
// network is green-sticker terrain; "limited" routes carry a designation
// restriction (vehicle type, permit) noted per route. Ordered best -> worst.
const CONFIG = {
  jawbone: {
    routes: [
      {
        id: "jawbone-singletrack", name: "Jawbone Motorized Singletrack",
        select: { singletrack: true },
        difficulty: "Difficult",
        summary: "The designated motorcycle singletrack the area is really known for.",
        description:
          "Beyond the roads, Jawbone carries a network of designated motorized singletrack: narrow, twisting motorcycle-only tread through the desert that's the real reason dirt-bikers come here. Tight, sandy, and technical in spots, it's true singletrack, not a two-track, and it's strictly motorcycle width. This entry stitches the area's designated single-track segments into one line so you can see where it runs.",
        surface: "Narrow motorcycle-only singletrack, sandy and technical",
        bestSeason: "October–April (hot in summer)",
        highlights: [
          "Designated motorcycle-only singletrack",
          "The real draw for dirt-bikers here",
          "Tight, sandy, technical desert tread",
        ],
      },
      {
        id: "jawbone-canyon-road", name: "Jawbone Canyon Road",
        select: { names: ["Jawbone Canyon Road"] },
        difficulty: "Easy",
        summary: "The main artery up Jawbone Canyon from Highway 14 into the OHV network.",
        description:
          "Jawbone Canyon Road is the way in: a graded sand and gravel route running west off Highway 14 up the canyon, past the old aqueduct siphon pipe, into the heart of the Jawbone OHV area. It's the staging spine that the rest of the network branches off, easy going on its own and the natural warm-up for a day out here.",
        surface: "Graded sand and gravel canyon road",
        bestSeason: "October–April (hot in summer)",
        highlights: [
          "Primary access from Highway 14",
          "Passes the landmark aqueduct siphon pipe",
          "Connects the whole Jawbone OHV network",
        ],
      },
      {
        id: "sc-103-east", name: "SC-103 East",
        select: { names: ["65014: SC-103 EAST"] }, designation: "SC-103",
        difficulty: "Moderate",
        summary: "A long designated open route working east across the Jawbone backcountry.",
        description:
          "SC-103 is one of the longer designated open routes in the area, miles of natural-surface desert two-track winding through Joshua tree and creosote on the high benches above the canyon. Sandy washes and rockier climbs trade off the whole way, real backcountry mileage well off the staging areas. Open and green-sticker the length of it.",
        surface: "Natural-surface desert two-track, sand and rock",
        bestSeason: "October–April (hot in summer)",
        highlights: [
          "Long designated open route, miles of seat time",
          "Joshua tree and creosote high desert",
          "Quiet backcountry away from staging",
        ],
      },
      {
        id: "sc-94", name: "SC-94",
        select: { names: ["65013: SC-94"] }, designation: "SC-94",
        difficulty: "Moderate",
        summary: "Designated open desert route threading the benches above the canyon.",
        description:
          "SC-94 is a designated open route of natural-surface two-track that links the Jawbone benches, a mix of sandy straights and rockier pitches through open Mojave desert. A solid intermediate ride that connects into the broader SC route network for a longer loop.",
        surface: "Natural-surface two-track, sandy with rocky sections",
        bestSeason: "October–April (hot in summer)",
        highlights: [
          "Designated open green-sticker route",
          "Connects into the SC route network",
          "Open high-desert riding",
        ],
      },
      {
        id: "butterbredt-canyon", name: "Butterbredt Canyon Road",
        select: { names: ["Butterbredt Canyon Rd"] },
        difficulty: "Moderate",
        summary: "Sandy canyon route toward Butterbredt Spring on the north side of the area.",
        description:
          "Butterbredt Canyon Road runs up its namesake canyon toward Butterbredt Spring, a sandy, scenic route on the quieter north side of the complex toward the Piute Mountains. The spring is a well-known desert oasis and migratory bird stop, so it's a mellower, prettier ride than the open flats, sandy in the wash bottoms with firmer benches.",
        surface: "Sandy canyon bottom with firmer benches",
        bestSeason: "October–April (hot in summer)",
        highlights: [
          "Toward the Butterbredt Spring oasis",
          "Quieter north side near the Piute Mountains",
          "Scenic sandy canyon riding",
        ],
      },
    ],
  },

  // El Paso Mountains (Ridgecrest FO) — colorful volcanic badlands east of
  // Jawbone near Randsburg: Last Chance Canyon and the Burro Schmidt Tunnel,
  // Mesquite and Iron canyons, and a real moto singletrack network. Open OHV
  // land; stay on designated routes (it borders Red Rock Canyon State Park,
  // which is closed to OHVs). Ordered best -> worst.
  "el-paso": {
    routes: [
      {
        id: "el-paso-singletrack", name: "El Paso Mountains Singletrack",
        select: { singletrack: true },
        difficulty: "Difficult",
        summary: "A real moto singletrack network threading the volcanic badlands.",
        description:
          "The El Paso Mountains hold one of the better designated singletrack networks in the Ridgecrest desert: miles of narrow motorcycle-only tread twisting through colorful volcanic country, tight and sandy with rocky pitches. For most riders this, not the roads, is the point of coming out here. The line on the map joins the area's designated single-track segments so you can see roughly where the network runs.",
        surface: "Narrow motorcycle-only singletrack, sandy and rocky",
        bestSeason: "October–April (hot in summer)",
        highlights: [
          "Designated motorcycle-only singletrack",
          "Colorful volcanic badlands country",
          "The best dirt-bike riding in the El Pasos",
        ],
      },
      {
        id: "el-paso-willis-well", name: "Willis Well Road",
        select: { names: ["65093: R43 WILLIS WELL ROAD"] }, designation: "R43",
        difficulty: "Moderate",
        summary: "A long designated open route across the El Paso backcountry.",
        description:
          "R43 (Willis Well Road) is one of the longer designated open routes through the El Paso Mountains, natural-surface desert two-track running across the benches and washes past old wells and mining ground. Sandy stretches trade off with rockier pitches, real backcountry mileage well off the staging areas. Open and green-sticker the length of it.",
        surface: "Natural-surface desert two-track, sand and rock",
        bestSeason: "October–April (hot in summer)",
        highlights: [
          "Long designated open route, real seat time",
          "Old wells and mining country",
          "Quiet El Paso backcountry",
        ],
      },
      {
        id: "el-paso-black-mountain", name: "Black Mountain Road",
        select: { names: ["65040: BLACK MTN ROAD"] },
        difficulty: "Moderate",
        summary: "Designated route climbing toward Black Mountain.",
        description:
          "Black Mountain Road is a designated open route working up toward Black Mountain on the north side of the range, a natural-surface climb with rockier high-clearance pitches and expanding views over the desert and the Sierra to the west. A solid intermediate ride that connects into the wider El Paso network.",
        surface: "Natural-surface high-clearance dirt, rocky up high",
        bestSeason: "October–April (hot in summer)",
        highlights: [
          "Climbs toward Black Mountain",
          "Big desert and Sierra views",
          "Connects the El Paso route network",
        ],
      },
      {
        id: "el-paso-iron-canyon", name: "Iron Canyon",
        select: { names: ["Iron-Canyon"] },
        difficulty: "Moderate",
        summary: "Short, scenic canyon route into the El Paso badlands.",
        description:
          "Iron Canyon is a short designated route threading one of the colorful eroded canyons that make the El Pasos worth the drive, sandy in the wash bottom with rockier benches and striking volcanic rock. A scenic add-on rather than a destination on its own, best paired with the longer routes and the singletrack.",
        surface: "Sandy canyon bottom with rocky benches",
        bestSeason: "October–April (hot in summer)",
        highlights: [
          "Colorful eroded volcanic canyon",
          "Sandy-wash riding",
          "Pairs with the El Paso network",
        ],
      },
    ],
  },

};

// ---- geometry + access from the BLM GTLF -------------------------------------
// We query both road layers (0 = open, 1 = limited) for a route's selector and
// merge, so a route that spans both designations stitches cleanly.
function whereClause(select) {
  if (select.singletrack) return "OHV_DSGNTN_LIM_EXPLAIN='Motorized Single Track'";
  const esc = (s) => s.replace(/'/g, "''");
  return select.names.map((n) => `ROUTE_PRMRY_NM='${esc(n)}'`).join(" OR ");
}

async function fetchFeatures(select, bbox) {
  const where = whereClause(select);
  const out = [];
  for (const layer of [0, 1]) {
    const url =
      `${BASE}/${layer}/query?where=${encodeURIComponent(where)}` +
      `&geometry=${encodeURIComponent(bbox)}&geometryType=esriGeometryEnvelope` +
      `&inSR=4326&spatialRel=esriSpatialRelIntersects` +
      `&outFields=ROUTE_PRMRY_NM,PLAN_OHV_ROUTE_DSGNTN,OHV_DSGNTN_LIM_EXPLAIN,GIS_MILES` +
      `&returnGeometry=true&outSR=4326&f=geojson`;
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) throw new Error(`layer ${layer} HTTP ${res.status}`);
    const json = await res.json();
    for (const f of json.features ?? []) f.properties = { ...f.properties, _layer: layer };
    out.push(...(json.features ?? []));
  }
  return out;
}

// Greedy-stitch line parts by nearest endpoints, but break into SEPARATE paths
// when the nearest remaining piece is farther than GAP away. BLM routes are
// often several disjoint GTLF segments (a singletrack network, a route split by
// a wash); bridging those gaps would draw phantom straight lines and inflate the
// distance. Returns an array of ordered paths (one per contiguous part).
const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
const GAP = 0.0025; // ~275 m in degrees at this latitude
function stitchParts(parts) {
  parts = parts.filter((p) => p.length > 1).map((p) => p.slice());
  if (!parts.length) return [];
  const order = () => parts.sort((a, b) => b.length - a.length);
  order();
  const paths = [];
  let path = parts.shift();
  while (parts.length) {
    const tail = path[path.length - 1];
    const head = path[0];
    let best = { d: Infinity };
    parts.forEach((seg, i) => {
      const s = seg[0];
      const e = seg[seg.length - 1];
      for (const c of [
        { d: d2(tail, s), i, flip: false, end: "tail" },
        { d: d2(tail, e), i, flip: true, end: "tail" },
        { d: d2(head, e), i, flip: false, end: "head" },
        { d: d2(head, s), i, flip: true, end: "head" },
      ])
        if (c.d < best.d) best = c;
    });
    if (Math.sqrt(best.d) > GAP) {
      // Nearest piece is too far: close this part and start a fresh one.
      paths.push(path);
      order();
      path = parts.shift();
      continue;
    }
    const seg = parts.splice(best.i, 1)[0];
    const o = best.flip ? seg.slice().reverse() : seg;
    path = best.end === "tail" ? path.concat(o) : o.concat(path);
  }
  paths.push(path);
  return paths.filter((p) => p.length > 1);
}

function haversineMi(a, b) {
  const R = 3958.8;
  const toR = (d) => (d * Math.PI) / 180;
  const dLat = toR(b[1] - a[1]);
  const dLon = toR(a[0] - b[0]);
  const la1 = toR(a[1]);
  const la2 = toR(b[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// ---- elevation (best-effort) -------------------------------------------------
async function fetchElevations(coords) {
  const N = Math.min(90, coords.length);
  const idx = Array.from({ length: N }, (_, i) =>
    Math.round((i * (coords.length - 1)) / (N - 1)),
  );
  const locs = idx.map((i) => `${coords[i][1]},${coords[i][0]}`).join("|");
  try {
    const res = await fetch(
      `https://api.opentopodata.org/v1/srtm90m?locations=${locs}`,
      { headers: { "User-Agent": UA } },
    );
    if (!res.ok) return null;
    const json = await res.json();
    if (json.status !== "OK") return null;
    return idx.map((i, k) => ({ i, ele: json.results[k]?.elevation ?? null }));
  } catch {
    return null;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fmtFt = (m) => Math.round((m * 3.28084) / 50) * 50;

// On BLM OHV land every featured route here is green-sticker terrain; the note
// explains the open-vs-limited designation rather than a green/plate split.
function accessNote(name, feats, isSingletrack) {
  const limited = feats.filter((f) => f.properties._layer === 1);
  const open = feats.filter((f) => f.properties._layer === 0);
  if (isSingletrack)
    return `Per the BLM travel plan, this is designated motorized single-track open to motorcycles, so green-sticker (non-street-legal) bikes are allowed; it's moto-width only, no ATVs or wider machines. Stay on the designated tread. Registration + spark arrestor required.`;
  if (limited.length && !open.length) {
    const lim = limited.map((f) => f.properties.OHV_DSGNTN_LIM_EXPLAIN).find((x) => x && x !== "Motorized,No Designation Given");
    const detail = lim ? ` The BLM designation carries a limitation (${lim.toLowerCase()}), so check the route signs.` : "";
    return `Per the BLM travel plan, ${name} is a designated route open to motorized use, so green-sticker (non-street-legal) bikes are allowed.${detail} Stay on designated routes; registration + spark arrestor required.`;
  }
  return `Per the BLM travel plan, ${name} is a designated open route, so green-sticker (non-street-legal) bikes are allowed. This is OHV-open land: stay on designated routes, registration + spark arrestor required.`;
}

async function buildRoute(cfg, bbox) {
  const isSingletrack = !!cfg.select.singletrack;
  const feats = await fetchFeatures(cfg.select, bbox);
  if (!feats.length) {
    console.warn(`  ! ${cfg.id}: no BLM features for ${JSON.stringify(cfg.select)}`);
    return null;
  }
  const parts = [];
  for (const f of feats) {
    const g = f.geometry;
    if (!g) continue;
    if (g.type === "LineString") parts.push(g.coordinates);
    else if (g.type === "MultiLineString") parts.push(...g.coordinates);
  }
  // One or more contiguous parts (disjoint pieces kept separate, not bridged).
  const paths = stitchParts(parts);
  if (!paths.length) {
    console.warn(`  ! ${cfg.id}: empty geometry`);
    return null;
  }
  // Every featured route on BLM OHV land is green-sticker terrain.
  const access = "yes";

  // Distance sums each part's own length — no phantom cross-gap connectors.
  let miles = 0;
  for (const p of paths)
    for (let i = 1; i < p.length; i++) miles += haversineMi(p[i - 1], p[i]);

  // Elevation: sample across all parts flattened in order; eleAt() indexes into
  // that same flattened sequence, which the GPX writer walks part by part.
  const flat = paths.flat();
  const eleSamples = await fetchElevations(flat);
  const eleByIdx = new Map((eleSamples ?? []).map((s) => [s.i, s.ele]));
  let eMin = Infinity, eMax = -Infinity, hasEle = false;
  if (eleSamples) {
    for (const s of eleSamples)
      if (s.ele != null) { hasEle = true; eMin = Math.min(eMin, s.ele); eMax = Math.max(eMax, s.ele); }
  }
  const sampledIdx = (eleSamples ?? []).filter((s) => s.ele != null).map((s) => s.i);
  const eleAt = (i) => {
    if (!hasEle) return null;
    let best = sampledIdx[0];
    for (const si of sampledIdx) if (Math.abs(si - i) < Math.abs(best - i)) best = si;
    return eleByIdx.get(best);
  };
  // One <trkseg> per part so the renderer draws them as separate polylines.
  let gi = 0;
  const trksegs = paths
    .map((p) => {
      const pts = p
        .map((c) => {
          const e = eleAt(gi);
          gi += 1;
          return `      <trkpt lat="${c[1].toFixed(5)}" lon="${c[0].toFixed(5)}">${
            e != null ? `<ele>${e.toFixed(1)}</ele>` : ""
          }</trkpt>`;
        })
        .join("\n");
      return `    <trkseg>\n${pts}\n    </trkseg>`;
    })
    .join("\n");
  const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="dirt-bikes build-blm-routes (BLM GTLF geometry + SRTM elevation)" xmlns="http://www.topografix.com/GPX/1/1">
  <trk><name>${cfg.name}</name>
${trksegs}
  </trk>
</gpx>
`;
  await writeFile(new URL(`../public/gpx/${cfg.id}.gpx`, import.meta.url), gpx);

  const start = paths[0][0];
  const route = {
    id: cfg.id,
    name: cfg.name,
    // The "No." badge: a clean BLM route designation (SC-103) when the route has
    // one; named roads (Jawbone Canyon Road) and singletrack carry none.
    ...(cfg.designation ? { forestRoad: cfg.designation } : {}),
    summary: cfg.summary,
    description: cfg.description,
    distanceMiles: Math.round(miles * 10) / 10,
    difficulty: cfg.difficulty,
    ...(hasEle ? { elevationFt: `${fmtFt(eMin).toLocaleString()}–${fmtFt(eMax).toLocaleString()} ft` } : {}),
    surface: cfg.surface,
    bestSeason: cfg.bestSeason,
    access: {
      streetLegal: true,
      greenSticker: access,
      note: accessNote(cfg.name, feats, isSingletrack),
      source: SOURCE,
    },
    highlights: cfg.highlights,
    trailhead: {
      name: cfg.name,
      lat: Math.round(start[1] * 1e4) / 1e4,
      lng: Math.round(start[0] * 1e4) / 1e4,
    },
  };
  console.log(
    `  ✓ ${cfg.id}: ${route.distanceMiles}mi, ${feats.length} segs -> ${paths.length} part(s), ` +
      `${hasEle ? route.elevationFt : "no elev"}, ${flat.length} pts`,
  );
  return route;
}

const varName = (area) =>
  area.replace(/-([a-z])/g, (_, c) => c.toUpperCase()) + "Routes";

await mkdir(new URL("../public/gpx/", import.meta.url), { recursive: true });
const targets = process.argv.slice(2).length
  ? process.argv.slice(2)
  : Object.keys(CONFIG);

for (const area of targets) {
  const cfg = CONFIG[area];
  if (!cfg) {
    console.error(`Unknown area "${area}"`);
    continue;
  }
  console.log(`\n== ${area} ==`);
  const routes = [];
  for (const r of cfg.routes) {
    const route = await buildRoute(r, BBOX[area]);
    if (route) routes.push(route);
    await sleep(1200); // be polite to opentopodata (1 req/s)
  }
  const ts = `// AUTO-GENERATED by scripts/build-blm-routes.mjs — do not edit by hand.
// Geometry & access: BLM GTLF travel network. Elevation: SRTM via opentopodata.
// Prose, difficulty, and ordering are editorial (see the script's CONFIG).
import type { Route } from "../types";

export const ${varName(area)}: Route[] = ${JSON.stringify(routes, null, 2)};
`;
  await writeFile(new URL(`../lib/routes/${area}.generated.ts`, import.meta.url), ts);
  console.log(`Wrote lib/routes/${area}.generated.ts (${routes.length} routes)`);
}
