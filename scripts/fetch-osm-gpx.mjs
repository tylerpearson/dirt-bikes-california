/**
 * Fetches REAL route geometry for each forest road from OpenStreetMap (Overpass
 * API), chains the way segments into one ordered polyline, samples elevation
 * from the SRTM DEM (opentopodata.org), and writes data/gpx/<id>.gpx.
 *
 * Source: © OpenStreetMap contributors (ODbL). Elevation: opentopodata SRTM 30m.
 * Run: node scripts/fetch-osm-gpx.mjs
 */
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

const BBOX = "34.15,-117.10,34.42,-116.60"; // S,W,N,E around Big Bear
const MAX_POINTS = 110;

const ROUTES = [
  { id: "holcomb-valley", ref: "FR 3N16", name: "Holcomb Valley Road" },
  { id: "john-bull", ref: "FR 3N10", name: "John Bull Trail" },
  { id: "gold-mountain", ref: "FR 3N69", name: "Gold Mountain Road" },
  { id: "coxey-road", ref: "FR 3N14", name: "Coxey Truck Trail" },
  { id: "cactus-flats", ref: "FR 3N03", name: "Smarts Ranch Road" },
  { id: "arrastre-creek", ref: "FR 2N02", name: "Arrastre Creek Road" },
  { id: "van-dusen-canyon", ref: "FR 3N09", name: "Van Dusen Canyon Road" },
  { id: "van-dusen-creek", ref: "FR 3N07", name: "Van Dusen Creek Road" },
  { id: "burnt-flat", ref: "FR 3N02", name: "Burnt Flat Road" },
  // 2E20 is a network of sub-trails (2E20.1–.5); match them all and chain.
  { id: "pinyon-vista", ref: "FR 2E20", name: "Pinyon & Vista OHV Trails", regex: true },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const keyOf = (p) => `${p[0].toFixed(7)},${p[1].toFixed(7)}`;

function haversine(a, b) {
  const R = 6371000;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const la1 = (a[0] * Math.PI) / 180;
  const la2 = (b[0] * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Greedy-chain ways (sharing exact endpoints) into the longest single line. */
function chainWays(ways) {
  const pool = ways.map((w) => w.slice());
  const chains = [];
  while (pool.length) {
    let chain = pool.shift();
    let extended = true;
    while (extended) {
      extended = false;
      const head = keyOf(chain[0]);
      const tail = keyOf(chain[chain.length - 1]);
      for (let i = 0; i < pool.length; i++) {
        const w = pool[i];
        const ws = keyOf(w[0]);
        const we = keyOf(w[w.length - 1]);
        if (we === head) { chain = w.slice(0, -1).concat(chain); pool.splice(i, 1); extended = true; break; }
        if (ws === head) { chain = w.slice().reverse().slice(0, -1).concat(chain); pool.splice(i, 1); extended = true; break; }
        if (ws === tail) { chain = chain.concat(w.slice(1)); pool.splice(i, 1); extended = true; break; }
        if (we === tail) { chain = chain.concat(w.slice().reverse().slice(1)); pool.splice(i, 1); extended = true; break; }
      }
    }
    chains.push(chain);
  }
  const dist = (c) => c.reduce((s, p, i) => (i ? s + haversine(c[i - 1], p) : 0), 0);
  chains.sort((a, b) => dist(b) - dist(a));
  return chains[0] || [];
}

function decimate(points, max) {
  if (points.length <= max) return points;
  const step = Math.ceil(points.length / max);
  const out = [];
  for (let i = 0; i < points.length; i += step) out.push(points[i]);
  if (out[out.length - 1] !== points[points.length - 1]) out.push(points[points.length - 1]);
  return out;
}

async function overpass(ref, regex = false) {
  const selector = regex ? `way["ref"~"^${ref}"]` : `way["ref"="${ref}"]`;
  const q = `[out:json][timeout:90];${selector}(${BBOX});out geom;`;
  let lastErr;
  for (let attempt = 0; attempt < 4; attempt++) {
    const ep = ENDPOINTS[attempt % ENDPOINTS.length];
    try {
      const res = await fetch(ep, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
          "User-Agent": "dirt-bikes-routes/1.0 (personal project)",
          Accept: "application/json",
        },
        body: q,
      });
      if (res.status === 429 || res.status === 504) {
        throw new Error(`${res.status} (busy)`);
      }
      if (!res.ok) throw new Error(`Overpass ${res.status}`);
      const j = await res.json();
      return (j.elements || [])
        .filter((el) => el.geometry?.length)
        .map((el) => el.geometry.map((g) => [g.lat, g.lon]));
    } catch (e) {
      lastErr = e;
      console.warn(`  ${ref} attempt ${attempt + 1} (${ep.split("/")[2]}): ${e.message}`);
      await sleep(4000 * (attempt + 1));
    }
  }
  throw new Error(`Overpass failed for ${ref}: ${lastErr?.message}`);
}

/** Sample elevations (meters) for points via opentopodata SRTM, batched. */
async function elevations(points) {
  const out = [];
  for (let i = 0; i < points.length; i += 100) {
    const batch = points.slice(i, i + 100);
    const locs = batch.map((p) => `${p[0]},${p[1]}`).join("|");
    try {
      const res = await fetch(
        `https://api.opentopodata.org/v1/srtm30m?locations=${locs}`,
        { headers: { "User-Agent": "dirt-bikes-routes/1.0" } },
      );
      if (!res.ok) throw new Error(`opentopodata ${res.status}`);
      const j = await res.json();
      for (const r of j.results || []) out.push(r.elevation);
    } catch (e) {
      console.warn("  elevation batch failed:", e.message);
      for (let k = 0; k < batch.length; k++) out.push(null);
    }
    await sleep(1200); // respect 1 req/sec public limit
  }
  return out;
}

function toGpx(name, ref, pts, eles) {
  const trkpts = pts
    .map(([lat, lng], i) => {
      const e = eles[i];
      const ele = typeof e === "number" ? `<ele>${e.toFixed(1)}</ele>` : "";
      return `      <trkpt lat="${lat.toFixed(6)}" lon="${lng.toFixed(6)}">${ele}</trkpt>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="dirt-bikes (OpenStreetMap geometry)" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${name} (${ref})</name>
    <desc>Geometry © OpenStreetMap contributors (ODbL). Elevation: SRTM 30m via opentopodata. Approximate; verify against the official MVUM.</desc>
  </metadata>
  <trk>
    <name>${name} ${ref}</name>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>
`;
}

const outDir = path.join(process.cwd(), "public", "gpx");
mkdirSync(outDir, { recursive: true });

for (const route of ROUTES) {
  const outFile = path.join(outDir, `${route.id}.gpx`);
  if (existsSync(outFile)) {
    console.log(`${route.id}: already have GPX — skipped`);
    continue;
  }
  try {
    const ways = await overpass(route.ref, route.regex);
    if (!ways.length) {
      console.log(`${route.id}: no OSM ways for ${route.ref} — skipped`);
      continue;
    }
    const chained = decimate(chainWays(ways), MAX_POINTS);
    const eles = await elevations(chained);
    const withEle = eles.filter((e) => typeof e === "number").length;
    writeFileSync(outFile, toGpx(route.name, route.ref, chained, eles));
    const miles =
      chained.reduce((s, p, i) => (i ? s + haversine(chained[i - 1], p) : 0), 0) /
      1609.344;
    console.log(
      `${route.id}: ${ways.length} ways → ${chained.length} pts, ${miles.toFixed(1)} mi, ${withEle} w/ elevation`,
    );
    await sleep(1500); // be nice to Overpass between routes
  } catch (e) {
    console.error(`${route.id}: ${e.message}`);
  }
}
