// Build featured-route data + GPX for an Angeles National Forest area straight
// from the USFS trail and road inventories, so distance, access, geometry and
// elevation are all real. This is the Angeles analog of build-blm-routes.mjs.
//
//   node scripts/build-angeles-routes.mjs [area ...]
//
// Emits public/gpx/<route-id>.gpx and lib/routes/<area>.generated.ts.
//
// Curation handle: the Angeles is the one California forest absent from the
// EDW MVUM MapServer — it publishes its motor vehicle use map only as a
// printed / Avenza map, not a queryable GIS layer. So geometry comes from two
// other EDW services instead:
//   - trails: TrailNFS (EDW_TrailNFSPublish_01), selected by trail_no
//   - roads:  RoadBasic (EDW_RoadBasic_01), selected by id
// Trail access is machine-derived from mvum_symbol (the trail inventory does
// carry MVUM codes). Road access is NOT machine-readable here — RoadBasic has
// no designation field — so featured roads say "unconfirmed" with an honest
// note pointing riders at the posted MVUM.

import { writeFile, mkdir } from "node:fs/promises";

const TRAILS_BASE =
  "https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_TrailNFSPublish_01/MapServer/0";
const ROADS_BASE =
  "https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_RoadBasic_01/MapServer/0";
const UA = "dirt-bikes/1.0 (route-guide; build script)";
const SOURCE = "USFS trail and road inventories (EDW), 2026";

// Per-area bounding boxes (xmin,ymin,xmax,ymax in lon/lat, WGS84). Trail/road
// numbers repeat across forests, so every lookup is constrained to this box.
const BBOX = {
  "rowher-flats": "-118.65,34.35,-118.05,34.70",
};

// ---- Curated featured routes (editorial fields only; facts are derived) -----
const CONFIG = {
  "rowher-flats": {
    routes: [
      {
        id: "rowher-4x4", name: "Rowher 4x4 Trail",
        select: { layer: "trail", trailNos: ["3414W19"] },
        difficulty: "Difficult",
        summary: "The marquee trail of the system: five miles of steep, loose climbing out of the staging flats.",
        description:
          "The Rowher 4x4 Trail is the longest trail in the system and the one the area is named for, five miles of steep, loose climbing from the staging flats up toward the Sierra Pelona high country. It carries a special designation on the motor vehicle use map and is managed for 4x4s and OHVs together, so expect ruts, ledges, and company on weekends. The payoff is real elevation gain and long views over the Santa Clarita valley.",
        surface: "Steep, loose 4x4 trail, rutted with rocky pitches",
        bestSeason: "October–May (hot in summer)",
        highlights: [
          "Longest trail in the Rowher system",
          "Climbs toward the Sierra Pelona high country",
          "Big views over the Santa Clarita valley",
        ],
      },
      {
        id: "rowher-singletrack", name: "Rowher Singletrack (Silverking, Yucca & King Snake)",
        select: { layer: "trail", trailNos: ["3415W16", "3415W18", "3414W33"] },
        difficulty: "Difficult",
        summary: "The closest designated motorcycle singletrack to Los Angeles: three trails of narrow, technical tread.",
        description:
          "Silverking, Yucca, and King Snake are the singletrack heart of Rowher Flats: narrow motorcycle-only tread threading the slopes above the staging areas. It's only about three miles all told, but it's genuine singletrack, tight, loose, and technical, and it's the closest designated singletrack to Los Angeles proper. Ride it as laps rather than a point-to-point.",
        surface: "Narrow motorcycle-only singletrack, loose and technical",
        bestSeason: "October–May (hot in summer)",
        highlights: [
          "True motorcycle-only singletrack",
          "The closest designated singletrack to LA",
          "Tight, technical tread worth lapping",
        ],
      },
      {
        id: "rowher-buffer-loop", name: "Buffer, Spring & Stage",
        select: { layer: "trail", trailNos: ["3414W07", "3414W05", "3414W10"] },
        difficulty: "Moderate",
        summary: "The natural first lap: three linked trails through the heart of the trail system.",
        description:
          "Buffer is the longest of the trails open to vehicles 50 inches or less, three miles working the drainages at the core of the system, and with Spring and Stage it links into a natural circuit. The tread is classic Rowher: loose soil over hardpack, whooped out in the flats, with short punchy climbs between drainages. A good first lap to learn the area before committing to the 4x4 trail or the singletrack.",
        surface: "Loose soil over hardpack, whooped in the flats",
        bestSeason: "October–May (hot in summer)",
        highlights: [
          "A natural circuit through the core of the system",
          "Open to green-sticker bikes and quads alike",
          "The right warm-up before the harder trails",
        ],
      },
      {
        id: "rowher-broken-spoke", name: "Broken Spoke, Sidewinder & Sierra",
        select: { layer: "trail", trailNos: ["3414W22", "3414W26", "3414W28"] },
        difficulty: "Moderate",
        summary: "The twistier side of the network, a step up from the Buffer circuit.",
        description:
          "Broken Spoke runs nearly three miles on the quieter side of the system, and Sidewinder and Sierra hang off it for another three and a half. The names are honest: this side twists harder and climbs steeper than the Buffer circuit, with off-camber corners and loose, marbly tread that keeps bikes and quads honest. String all three together for a solid green-sticker outing away from the staging crowds.",
        surface: "Twisting two-track, loose and off camber in spots",
        bestSeason: "October–May (hot in summer)",
        highlights: [
          "Twistier and steeper than the Buffer side",
          "Three trails string into one outing",
          "The quieter corner of the network",
        ],
      },
      {
        id: "santa-clara-divide", name: "Santa Clara Divide Road",
        select: { layer: "road", roadIds: ["3N17.1", "3N17.2", "3N17.3", "3N17.4", "3N17.5", "3N17.6", "3N17.7", "3N17.8", "3N17.9"] },
        designation: "3N17",
        difficulty: "Moderate",
        summary: "The plated epic: some forty miles along the divide past Mt. Gleason to Mill Creek Summit.",
        description:
          "Santa Clara Divide Road runs the long ridge between the Santa Clarita valley and the high Angeles backcountry, from Sand Canyon up past Mt. Gleason and down to Mill Creek Summit, with more segments carrying east toward Mt. Pacifico. Stretches are paved, long stretches are dirt not maintained for passenger cars, and the whole thing strings into one of the biggest dual-sport days this close to LA. Bring a plated bike, fuel for the full distance, and expect the odd locked gate in fire season.",
        surface: "Mixed pavement and dirt, rough in the unmaintained stretches",
        bestSeason: "April–November (snow and storm gates possible in winter)",
        highlights: [
          "One of the biggest dual-sport days near LA",
          "Tops out near Mt. Gleason around 6,000 feet",
          "Mixes pavement with remote dirt",
        ],
      },
      {
        id: "sierra-pelona-road", name: "Sierra Pelona Road",
        select: { layer: "road", roadIds: ["6N07"] },
        designation: "6N07",
        difficulty: "Easy",
        summary: "Nine miles of ridge dirt along the Sierra Pelona crest, directly above the OHV area.",
        description:
          "Sierra Pelona Road climbs to the ridgeline above Rowher Flats and runs the crest for nine miles, chaparral and grassy balds with the OHV area below on one side and the Antelope Valley out the other. It's graded dirt not maintained for passenger cars, easy going on a plated dual-sport and the natural extension after a morning on the trails below. The trail system and the road are separate networks, so plan on street-legal access up here.",
        surface: "Graded ridge dirt, rough in spots",
        bestSeason: "October–June (exposed and hot midsummer)",
        highlights: [
          "Crest views over the OHV area and the Antelope Valley",
          "Easy plated dual-sport dirt",
          "Pairs with a morning on the Rowher trails",
        ],
      },
    ],
  },
};

// ---- geometry + access from TrailNFS / RoadBasic -----------------------------
function whereClause(select) {
  const esc = (s) => s.replace(/'/g, "''");
  if (select.layer === "trail")
    return select.trailNos.map((n) => `trail_no='${esc(n)}'`).join(" OR ");
  return select.roadIds.map((n) => `id='${esc(n)}'`).join(" OR ");
}

async function fetchFeatures(select, bbox) {
  const where = whereClause(select);
  const base = select.layer === "trail" ? TRAILS_BASE : ROADS_BASE;
  const outFields =
    select.layer === "trail"
      ? "trail_no,trail_name,mvum_symbol,terra_motorized,gis_miles"
      : "id,name,symbol_name,gis_miles";
  const url =
    `${base}/query?where=${encodeURIComponent(where)}` +
    `&geometry=${encodeURIComponent(bbox)}&geometryType=esriGeometryEnvelope` +
    `&inSR=4326&spatialRel=esriSpatialRelIntersects` +
    `&outFields=${outFields}` +
    `&returnGeometry=true&outSR=4326&f=geojson`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${select.layer} HTTP ${res.status}`);
  const json = await res.json();
  return json.features ?? [];
}

// Greedy-stitch line parts by nearest endpoints, but break into SEPARATE paths
// when the nearest remaining piece is farther than GAP away. Trail/road
// selectors often pull several disjoint segments (a multi-segment road split
// by a wash, a trio of trails); bridging those gaps would draw phantom
// straight lines and inflate the distance. Returns an array of ordered paths
// (one per contiguous part).
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
const escXml = (s) =>
  s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);

// Trail access is machine-derived from mvum_symbol; road access is not
// machine-readable here, so featured roads are honestly "unconfirmed".
function accessNote(cfg, feats) {
  if (cfg.select.layer === "road") {
    return `The Angeles publishes its motor vehicle use map only as a printed map, so green-sticker access on this road could not be verified against an authoritative source. Treat it as open to street-legal (plated) vehicles only unless the published MVUM says otherwise.`;
  }
  const symbols = new Set(feats.map((f) => Number(f.properties.mvum_symbol)));
  if (symbols.has(7) || symbols.has(16))
    return `Per the Forest Service trail inventory, ${cfg.name} is designated for vehicles 50 inches or less, so green-sticker (non-street-legal) bikes and quads are allowed. Registration + spark arrestor required, and parking at the Rowher staging areas takes an Adventure Pass.`;
  if (symbols.has(9))
    return `Per the Forest Service trail inventory, this is designated for motorcycles only, so green-sticker (non-street-legal) bikes are allowed and nothing wider is. It's true singletrack. Registration + spark arrestor required, and parking at the staging areas takes an Adventure Pass.`;
  if (symbols.has(11))
    return `Per the Forest Service trail inventory, this trail carries a special designation on the motor vehicle use map, and green-sticker (non-street-legal) OHVs are allowed. Check the posted MVUM at the staging area for the specifics. Registration + spark arrestor required, and an Adventure Pass covers parking.`;
  return `Per the Forest Service trail inventory, ${cfg.name} is designated for motorized use, so green-sticker (non-street-legal) OHVs are allowed. Registration + spark arrestor required, and parking at the staging areas takes an Adventure Pass.`;
}

async function buildRoute(cfg, bbox) {
  const feats = await fetchFeatures(cfg.select, bbox);
  if (!feats.length) {
    console.warn(`  ! ${cfg.id}: no features for ${JSON.stringify(cfg.select)}`);
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

  const access = cfg.select.layer === "road" ? "unconfirmed" : "yes";

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
<gpx version="1.1" creator="dirt-bikes build-angeles-routes (TrailNFS/RoadBasic geometry + SRTM elevation)" xmlns="http://www.topografix.com/GPX/1/1">
  <trk><name>${escXml(cfg.name)}</name>
${trksegs}
  </trk>
</gpx>
`;
  await writeFile(new URL(`../public/gpx/${cfg.id}.gpx`, import.meta.url), gpx);

  const start = paths[0][0];
  const route = {
    id: cfg.id,
    name: cfg.name,
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
      note: accessNote(cfg, feats),
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
  const ts = `// AUTO-GENERATED by scripts/build-angeles-routes.mjs — do not edit by hand.
// Geometry: USFS TrailNFS (trails) and RoadBasic (roads) inventories, EDW.
// Elevation: SRTM via opentopodata.
// Prose, difficulty, and ordering are editorial (see the script's CONFIG).
import type { Route } from "../types";

export const ${varName(area)}: Route[] = ${JSON.stringify(routes, null, 2)};
`;
  await writeFile(new URL(`../lib/routes/${area}.generated.ts`, import.meta.url), ts);
  console.log(`Wrote lib/routes/${area}.generated.ts (${routes.length} routes)`);
}
