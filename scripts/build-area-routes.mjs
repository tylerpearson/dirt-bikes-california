// Build featured-route data + GPX for an area straight from authoritative
// sources, so distance, access, geometry and elevation are all real:
//   - geometry & access  -> USFS MVUM (EDW_MVUM_01), queried by road number
//   - elevation          -> SRTM via opentopodata.org (best-effort)
//   - prose/difficulty   -> editorial, in the CONFIG below (the only hand part)
//
//   node scripts/build-area-routes.mjs [area ...]
//
// Emits public/gpx/<route-id>.gpx and lib/routes/<area>.generated.ts.
// Re-run when the curated CONFIG changes or to refresh against the MVUM.

import { writeFile, mkdir } from "node:fs/promises";

const BASE =
  "https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_MVUM_01/MapServer";
const UA = "dirt-bikes/1.0 (route-guide; build script)";
const MVUM = "USFS Motor Vehicle Use Map (MVUM), 2026";

// Road numbers repeat across the ~150 national forests, so every lookup is
// constrained to the area's bounding box (else id='6S13' stitches Thomas Mtn
// to a same-numbered road three states away).
const BBOX = {
  "palm-springs": "-116.90,33.45,-116.30,33.95",
  "idyllwild": "-116.82,33.64,-116.62,33.84",
  "santa-barbara": "-120.05,34.40,-119.55,34.80",
};

// ---- Curated featured routes (editorial fields only; facts are derived) -----
// `ids` lists the exact MVUM road numbers that make up the ride (segments are
// stitched into one track). Order = editorial best -> worst.
const CONFIG = {
  "palm-springs": {
    routes: [
      {
        id: "san-jacinto-ridge", name: "San Jacinto Ridge", ids: ["5S09"],
        difficulty: "Difficult",
        summary: "High, rocky ridge road with sweeping Garner Valley and desert views.",
        description:
          "Forest road 5S09 works along the high ridge on the east side of the San Jacintos above Garner Valley — a rough, high-clearance OHV route with loose, rocky, rutted pitches. The reward is a long ridgeline that opens onto the Santa Rosa Mountains and, on clear days, the Coachella Valley far below.",
        surface: "High-clearance dirt with loose rock and rutted climbs",
        bestSeason: "April–November",
        highlights: [
          "Long ridgeline views over Garner Valley",
          "Genuinely rocky high-clearance OHV riding",
          "Links into the Santa Rosa backcountry network",
        ],
      },
      {
        id: "red-mountain", name: "Red Mountain OHV Road", ids: ["6S22"],
        difficulty: "Moderate",
        summary: "Pinyon-slope climb on Red Mountain — green-sticker on part of it.",
        description:
          "6S22 climbs through pinyon and chaparral on the flanks of Red Mountain south of Garner Valley, mixing smooth graded stretches with looser, rockier climbs as it gains the ridge. Part of the road is open to all vehicles, so green-sticker access is segment-by-segment — read the signs at each junction.",
        surface: "Graded dirt with rockier, looser climbs up high",
        bestSeason: "April–November",
        highlights: [
          "Green-sticker access on part of the road",
          "Pinyon-and-chaparral high country",
          "Quieter than the Garner Valley fire roads",
        ],
      },
      {
        id: "indian-canyon", name: "Indian Canyon Road", ids: ["4S06"],
        difficulty: "Moderate",
        summary: "Canyon road through the Garner Valley high country — partly green-sticker.",
        description:
          "4S06 runs up Indian Canyon in the Garner Valley area, a high-clearance road with a mix of forest and high-desert transition, sandy washes, and rocky sections. Part of it is open to all vehicles, so green-sticker access is segment-by-segment — a solid intermediate option that connects to the surrounding road network.",
        surface: "Mixed dirt and sandy wash with rocky sections",
        bestSeason: "April–November",
        highlights: [
          "Green-sticker access on part of the road",
          "Forest-to-high-desert transition scenery",
          "Connects the Garner Valley road network",
        ],
      },
      {
        id: "indian-mountain", name: "Indian Mountain OHV Road", ids: ["4S21"],
        difficulty: "Moderate",
        summary: "Short, scenic green-sticker spur toward Indian Mountain.",
        description:
          "A shorter designated OHV road (4S21) branching toward Indian Mountain. Open to all vehicles, it's a quick, scenic high-clearance ride with rocky pitches and good views — a nice add-on to a Garner Valley day rather than a destination in itself.",
        surface: "High-clearance dirt with rocky sections",
        bestSeason: "April–November",
        highlights: [
          "Green-sticker designated road",
          "Short, scenic high-clearance spur",
          "Pairs well with the Indian Canyon network",
        ],
      },
      {
        id: "bee-canyon", name: "Bee Canyon OHV Road", ids: ["5S07"],
        difficulty: "Moderate",
        summary: "Designated OHV road dropping through Bee Canyon.",
        description:
          "5S07 follows Bee Canyon as a designated open-to-all-vehicles road. It's a compact green-sticker option with sandy canyon-bottom sections and rockier benches, threading pinyon and scrub on the desert side of the range.",
        surface: "Sandy canyon bottom with rocky benches",
        bestSeason: "April–November",
        highlights: [
          "Green-sticker designated road",
          "Sandy canyon-bottom character",
          "Desert-side pinyon and scrub",
        ],
      },
      {
        id: "thomas-mountain", name: "Thomas Mountain Road", ids: ["6S13"],
        difficulty: "Moderate",
        summary: "Long, scenic climb to Thomas Mountain — plated bikes only.",
        description:
          "6S13 is a long, graded climb up Thomas Mountain on the west side of Garner Valley, generally smooth enough for passenger cars but a fun, view-packed dual-sport ride. It passes Jeffrey pine, dispersed campsites, and overlooks of Lake Hemet and Garner Valley.",
        surface: "Long graded dirt, generally smooth",
        bestSeason: "April–November",
        highlights: [
          "Overlooks of Lake Hemet and Garner Valley",
          "Jeffrey pine and dispersed camping",
          "Smooth, beginner-friendly grade (plated only)",
        ],
      },
      {
        id: "santa-rosa-road", name: "Santa Rosa Mountain Road", ids: ["7S02"],
        difficulty: "Difficult",
        summary: "Remote high-clearance climb deep into the Santa Rosa Mountains.",
        description:
          "7S02 climbs toward the high Santa Rosa Mountains and the Toro Peak area — a remote, high-clearance road with rough, rocky, sometimes washed-out sections. It tops out in cool conifer country with enormous views over the desert; come prepared and plated, since it's highway-legal-only.",
        surface: "Rough, rocky high-clearance road; washouts likely",
        bestSeason: "May–October",
        highlights: [
          "Remote, high Santa Rosa Mountains",
          "Huge desert overlooks near Toro Peak",
          "Cool conifer country up high (plated only)",
        ],
      },
    ],
  },

  // Idyllwild is the forested west/upper side of the San Jacintos. Its roads
  // are almost all plated dual-sport (highway-legal only) — the green-sticker
  // OHV network is on the desert/Garner Valley side (see the Palm Springs guide).
  "idyllwild": {
    routes: [
      {
        id: "black-mountain-road", name: "Black Mountain Road", ids: ["4S01"],
        difficulty: "Difficult",
        summary: "Long forest climb to the Black Mountain lookout above Idyllwild.",
        description:
          "4S01 climbs the north flank of Black Mountain through dense pine and cedar above Idyllwild toward the historic fire lookout and the Black Mountain trailheads. A scenic, sustained graded climb with rocky, rutted sections — highway-legal-only, so it's a plated dual-sport ride.",
        surface: "Graded dirt with rocky, rutted climbs",
        bestSeason: "May–October",
        highlights: [
          "Climbs to the Black Mountain fire lookout",
          "Dense pine-and-cedar San Jacinto forest",
          "Cooler high-elevation riding (plated only)",
        ],
      },
      {
        id: "idyllwild-control-road", name: "Idyllwild Control Road", ids: ["5S06"],
        difficulty: "Moderate",
        summary: "Classic dirt connector linking Idyllwild to the high country.",
        description:
          "5S06 is a graded forest road threading the pines near Idyllwild, a relaxed plated dual-sport ride with good sight lines and forest scenery. Highway-legal-only, it's a pleasant way to link the area's roads and trailheads without technical demands.",
        surface: "Graded dirt, generally smooth",
        bestSeason: "May–October",
        highlights: [
          "Easy pine-forest cruising near town",
          "Links the Idyllwild road network",
          "Beginner-friendly grade (plated only)",
        ],
      },
      {
        id: "dark-canyon-road", name: "Dark Canyon Road", ids: ["4S02"],
        difficulty: "Moderate",
        summary: "Short forest road into the Dark Canyon drainage.",
        description:
          "4S02 drops into the Dark Canyon area northwest of Idyllwild, a shaded forest road serving the campground and trailheads along the San Jacinto's western canyons. A short, scenic plated ride through pine and oak — highway-legal vehicles only.",
        surface: "Graded dirt with rocky sections",
        bestSeason: "May–October",
        highlights: [
          "Shaded Dark Canyon forest",
          "Campground and trailhead access",
          "Short, scenic plated ride",
        ],
      },
      {
        id: "fobes-ranch-road", name: "Fobes Ranch Road", ids: ["6S05"],
        difficulty: "Moderate",
        summary: "Plated spur to the Fobes Ranch PCT trailhead.",
        description:
          "6S05 climbs to the Fobes Ranch trailhead on the south side of the San Jacintos, a popular jumping-off point for the Pacific Crest Trail. A moderate, rocky graded road with chaparral-to-forest transition and big views — plated dual-sport, highway-legal only.",
        surface: "Rocky graded dirt; rougher up high",
        bestSeason: "May–October",
        highlights: [
          "Access to the Fobes Ranch PCT trailhead",
          "Chaparral-to-forest transition",
          "Big San Jacinto views (plated only)",
        ],
      },
      {
        id: "red-hill-road", name: "Red Hill Road", ids: ["5S10"],
        difficulty: "Moderate",
        summary: "Short, scenic plated spur in the Garner Valley fringe.",
        description:
          "5S10 (Red Hill) is a compact graded road on the eastern fringe of the Idyllwild high country, mixing forest and high-meadow scenery. A short, scenic plated ride — highway-legal only — best paired with the longer roads nearby.",
        surface: "Graded dirt with rocky sections",
        bestSeason: "May–October",
        highlights: [
          "Forest-and-meadow scenery",
          "Short, scenic plated spur",
          "Pairs with the Idyllwild road network",
        ],
      },
    ],
  },

  "santa-barbara": {
    routes: [
      {
        id: "camuesa-road", name: "Camuesa Road (Romero–Camuesa)", ids: ["5N15.2"],
        difficulty: "Difficult",
        summary: "The backbone of Santa Barbara's Camuesa OHV area — green-sticker riding.",
        description:
          "The Romero–Camuesa road (5N15) is the spine of the Camuesa OHV area in the Santa Ynez backcountry, with segment 5N15.2 designated open to all vehicles. It's a rugged, remote backcountry road through chaparral and oak — the heart of the only real green-sticker network near Santa Barbara, with seasonal wet-weather closures.",
        surface: "Rugged backcountry dirt with rocky, eroded sections",
        bestSeason: "Late spring–fall (closed when wet)",
        highlights: [
          "Core of the Camuesa OHV area",
          "Designated green-sticker (open to all vehicles)",
          "Remote Santa Ynez backcountry",
        ],
      },
      {
        id: "east-camino-cielo", name: "East Camino Cielo (OHV segment)", ids: ["5N12.1"],
        difficulty: "Moderate",
        summary: "The legendary ridge road above Santa Barbara — its OHV-open stretch.",
        description:
          "East Camino Cielo rides the crest of the Santa Ynez Mountains directly above Santa Barbara, with the 5N12.1 segment designated open to all vehicles. Expect knife-edge ocean-and-backcountry views, sandstone outcrops, and a mix of graded and rougher tread along one of the most scenic ridgelines in the county.",
        surface: "Mixed graded dirt and rocky sandstone tread",
        bestSeason: "Spring–fall (seasonal closures when wet)",
        highlights: [
          "Crest-of-the-range ocean and backcountry views",
          "Sandstone outcrops along the ridge",
          "Green-sticker-open ridge segment",
        ],
      },
      {
        id: "buckhorn-road", name: "Buckhorn Road", ids: ["9N11.4"],
        difficulty: "Difficult",
        summary: "Remote green-sticker road into the San Rafael backcountry.",
        description:
          "9N11.4 (Buckhorn) pushes into the remote San Rafael / upper Santa Ynez backcountry as a designated open-to-all-vehicles road. It's a long, rugged, lightly-traveled high-clearance route through chaparral and pine — proper green-sticker backcountry with seasonal closures, so go prepared and self-sufficient.",
        surface: "Rugged high-clearance dirt; rough and remote",
        bestSeason: "Late spring–fall (closed when wet)",
        highlights: [
          "Deep San Rafael backcountry",
          "Designated green-sticker road",
          "Quiet, remote, and rugged",
        ],
      },
      {
        id: "zaca-ridge", name: "Zaca Ridge OHV Road", ids: ["8N02"],
        difficulty: "Moderate",
        summary: "Ridge road in the Zaca Peak OHV area — green-sticker on part of it.",
        description:
          "8N02 climbs to Zaca Ridge in the Zaca Peak OHV area north of the Santa Ynez Valley. Rolling chaparral ridgetops, oak woodland, and big views over the wine-country valleys make it one of the more approachable rides in the forest. Part of the road is open to all vehicles, so green-sticker access is segment-by-segment — and it's open seasonally.",
        surface: "Graded-to-rocky ridge road",
        bestSeason: "Spring–fall (seasonal)",
        highlights: [
          "Green-sticker access on part of the road (seasonal)",
          "Chaparral ridgetops and oak woodland",
          "Views over the Santa Ynez wine country",
        ],
      },
      {
        id: "west-dry-canyon", name: "West Dry Canyon Road", ids: ["8N19"],
        difficulty: "Moderate",
        summary: "Quiet plated backcountry road in the Sunset Valley area.",
        description:
          "8N19 runs through the West Dry Canyon / Sunset Valley country as a highway-legal-only road. It's a quiet, scenic plated dual-sport ride through oak and chaparral with creek crossings — a good way to link the area's backcountry without the technical demands of the OHV roads.",
        surface: "Graded dirt with creek crossings",
        bestSeason: "Spring–fall",
        highlights: [
          "Quiet oak-and-chaparral backcountry",
          "Seasonal creek crossings",
          "Scenic plated dual-sport route",
        ],
      },
      {
        id: "sunset-valley-road", name: "Sunset Valley Road", ids: ["8N09"],
        difficulty: "Easy",
        summary: "Mellow plated road into the Sunset Valley backcountry.",
        description:
          "8N09 is a gentler graded road into the Sunset Valley area, a relaxed plated ride good for building seat time and reaching trailheads and dispersed camps. Oak woodland, open valley, and easy navigation — highway-legal-only, so plated bikes only.",
        surface: "Wide graded dirt, generally smooth",
        bestSeason: "Spring–fall",
        highlights: [
          "Easy, beginner-friendly grade",
          "Oak woodland and open valley",
          "Access to dispersed camping (plated only)",
        ],
      },
      {
        id: "happy-canyon-road", name: "Happy Canyon Road", ids: ["7N07.2"],
        difficulty: "Moderate",
        summary: "Scenic plated road from the Santa Ynez Valley into the forest.",
        description:
          "Happy Canyon (7N07) climbs from the Santa Ynez Valley up into the Los Padres backcountry, transitioning from oak-dotted ranch country to chaparral forest. A long, scenic, highway-legal-only road — a classic plated dual-sport climb toward Figueroa Mountain country.",
        surface: "Graded dirt, smooth lower, rougher up high",
        bestSeason: "Spring–fall",
        highlights: [
          "Santa Ynez Valley to forest transition",
          "Toward Figueroa Mountain country",
          "Long scenic plated climb",
        ],
      },
    ],
  },
};

// ---- geometry + access from the MVUM -----------------------------------------
async function fetchRoad(ids, bbox) {
  const where = ids.map((i) => `id='${i.replace(/'/g, "''")}'`).join(" OR ");
  const url =
    `${BASE}/1/query?where=${encodeURIComponent(where)}` +
    `&geometry=${encodeURIComponent(bbox)}&geometryType=esriGeometryEnvelope` +
    `&inSR=4326&spatialRel=esriSpatialRelIntersects` +
    `&outFields=id,name,mvum_symbol_name,seasonal,motorcycle,other_ohv_lt50inches,atv,gis_miles` +
    `&returnGeometry=true&outSR=4326&f=geojson`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`road ${ids} HTTP ${res.status}`);
  const json = await res.json();
  return json.features ?? [];
}

const isOpen = (v) => typeof v === "string" && v.toLowerCase() === "open";
function segAccess(p) {
  const sym = (p.mvum_symbol_name || "").toLowerCase();
  return isOpen(p.motorcycle) || isOpen(p.other_ohv_lt50inches) || isOpen(p.atv) || sym.includes("open to all")
    ? "green"
    : "plate";
}

// Greedy-stitch line parts into one ordered path by nearest endpoints.
const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
function stitch(parts) {
  parts = parts.filter((p) => p.length > 1).map((p) => p.slice());
  if (!parts.length) return [];
  parts.sort((a, b) => b.length - a.length);
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
    const seg = parts.splice(best.i, 1)[0];
    const o = best.flip ? seg.slice().reverse() : seg;
    path = best.end === "tail" ? path.concat(o) : o.concat(path);
  }
  return path;
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
  // sample <= 90 points evenly
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

function accessNote(name, ids, access, seasonal) {
  const id = ids[0];
  const season = seasonal
    ? " This route has a seasonal (wet-weather) closure, so confirm it's open before you go."
    : "";
  if (access === "yes")
    return `Per the MVUM, ${id} is designated open to all vehicles, so green-sticker (non-street-legal) bikes are allowed. Registration + spark arrestor required.${season}`;
  if (access === "partial")
    return `Per the MVUM, ${name} is mixed: some segments are open to all vehicles (green-sticker OK) and others are highway-legal-only — so access is segment-by-segment. Read the signs at each junction; registration + spark arrestor required.${season}`;
  return `Per the MVUM, ${id} is open to highway-legal vehicles only — plated, street-legal bikes only; green-sticker (non-street-legal) bikes are not permitted.${season}`;
}

async function buildRoute(cfg, bbox) {
  const feats = await fetchRoad(cfg.ids, bbox);
  if (!feats.length) {
    console.warn(`  ! ${cfg.id}: no MVUM features for ${cfg.ids.join(",")}`);
    return null;
  }
  const parts = [];
  const accesses = new Set();
  let seasonal = false;
  for (const f of feats) {
    accesses.add(segAccess(f.properties));
    const s = (f.properties.seasonal || "").toLowerCase().trim();
    if (s && s !== "yearlong") seasonal = true;
    const g = f.geometry;
    if (!g) continue;
    if (g.type === "LineString") parts.push(g.coordinates);
    else if (g.type === "MultiLineString") parts.push(...g.coordinates);
  }
  const path = stitch(parts);
  if (path.length < 2) {
    console.warn(`  ! ${cfg.id}: empty geometry`);
    return null;
  }
  const access = accesses.has("green") && accesses.has("plate")
    ? "partial"
    : accesses.has("green")
      ? "yes"
      : "no";

  let miles = 0;
  for (let i = 1; i < path.length; i++) miles += haversineMi(path[i - 1], path[i]);

  // elevation
  const eleSamples = await fetchElevations(path);
  const eleByIdx = new Map((eleSamples ?? []).map((s) => [s.i, s.ele]));
  let eMin = Infinity, eMax = -Infinity, hasEle = false;
  if (eleSamples) {
    for (const s of eleSamples)
      if (s.ele != null) { hasEle = true; eMin = Math.min(eMin, s.ele); eMax = Math.max(eMax, s.ele); }
  }

  // GPX (interpolate elevation onto every point from the samples we have)
  const sampledIdx = (eleSamples ?? []).filter((s) => s.ele != null).map((s) => s.i);
  const eleAt = (i) => {
    if (!hasEle) return null;
    // nearest sampled index
    let best = sampledIdx[0];
    for (const si of sampledIdx) if (Math.abs(si - i) < Math.abs(best - i)) best = si;
    return eleByIdx.get(best);
  };
  const trkpts = path
    .map((c, i) => {
      const e = eleAt(i);
      return `    <trkpt lat="${c[1].toFixed(5)}" lon="${c[0].toFixed(5)}">${
        e != null ? `<ele>${e.toFixed(1)}</ele>` : ""
      }</trkpt>`;
    })
    .join("\n");
  const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="dirt-bikes build-area-routes (MVUM geometry + SRTM elevation)" xmlns="http://www.topografix.com/GPX/1/1">
  <trk><name>${cfg.name}</name><trkseg>
${trkpts}
  </trkseg></trk>
</gpx>
`;
  await writeFile(new URL(`../public/gpx/${cfg.id}.gpx`, import.meta.url), gpx);

  const route = {
    id: cfg.id,
    name: cfg.name,
    forestRoad: cfg.ids.join(", "),
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
      note: accessNote(cfg.name, cfg.ids, access, seasonal),
      source: MVUM,
    },
    highlights: cfg.highlights,
    trailhead: {
      name: `${cfg.name} (${cfg.ids[0]})`,
      lat: Math.round(path[0][1] * 1e4) / 1e4,
      lng: Math.round(path[0][0] * 1e4) / 1e4,
    },
  };
  console.log(
    `  ✓ ${cfg.id}: ${route.distanceMiles}mi, ${access}${seasonal ? "/seasonal" : ""}, ` +
      `${hasEle ? route.elevationFt : "no elev"}, ${path.length} pts`,
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
  const ts = `// AUTO-GENERATED by scripts/build-area-routes.mjs — do not edit by hand.
// Geometry & access: USFS MVUM (EDW_MVUM_01). Elevation: SRTM via opentopodata.
// Prose, difficulty, and ordering are editorial (see the script's CONFIG).
import type { Route } from "../types";

export const ${varName(area)}: Route[] = ${JSON.stringify(routes, null, 2)};
`;
  await writeFile(new URL(`../lib/routes/${area}.generated.ts`, import.meta.url), ts);
  console.log(`Wrote lib/routes/${area}.generated.ts (${routes.length} routes)`);
}
