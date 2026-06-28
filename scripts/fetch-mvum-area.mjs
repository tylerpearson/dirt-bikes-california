// Pre-bake the USFS Motor Vehicle Use Map (MVUM) for the Big Bear area into a
// slimmed GeoJSON that the area overview map draws from. Mirrors the GPX
// pipeline: fetch once at build time, commit the result, no live calls per
// visitor (the FS ArcGIS service is slow and unreliable under load).
//
//   node scripts/fetch-mvum-area.mjs
//
// Source: EDW MVUM MapServer — layer 1 = Roads, layer 2 = Trails.
// We keep geometry + just enough attributes to classify "what can ride here":
//   access: "green" = open to green-sticker (non-street-legal) OHV motorcycles
//           "plate" = street-legal plated vehicles only
//   seasonal: true when access is not yearlong (drawn dashed)

import { writeFile, mkdir } from "node:fs/promises";

const BASE =
  "https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_MVUM_01/MapServer";
const UA = "dirt-bikes/1.0 (route-guide; build script)";

// Per-area bounding boxes (xmin,ymin,xmax,ymax in lon/lat, WGS84). The MVUM
// service is national, so each area is just a different window onto it.
const AREAS = {
  "big-bear": "-117.05,34.15,-116.70,34.35",
  "san-jacinto": "-116.90,33.45,-116.30,33.95",
  "santa-ana": "-117.55,33.55,-117.30,33.80",
  "laguna": "-116.60,32.65,-116.30,32.95",
  "santa-barbara": "-120.05,34.40,-119.55,34.80",
  "san-luis-obispo": "-120.55,35.05,-119.85,35.55",
  "mt-pinos": "-119.55,34.65,-118.85,35.00",
  // West of Big Bear's bbox (its western edge is -117.05), so the two areas
  // stay disjoint and don't show the same Holcomb/Coxey ground on both maps.
  "lake-arrowhead": "-117.42,34.20,-117.06,34.42",
  // The Santa Ana River / Barton Flats / Heart Bar corridor on the south side
  // of the range, below Big Bear's lake-basin routes.
  "san-gorgonio": "-117.05,34.08,-116.65,34.22",
  "palomar": "-116.95,33.25,-116.62,33.52",
};

// Run all areas, or just the one(s) named on the command line.
const argv = process.argv.slice(2);
const targets = argv.length ? argv : Object.keys(AREAS);

const OUT_FIELDS = [
  "id",
  "name",
  "mvum_symbol_name",
  "seasonal",
  "motorcycle",
  "other_ohv_lt50inches",
  "atv",
].join(",");

// Round to ~11 m precision (4 decimals) — sub-pixel for an area overview map,
// and it roughly halves the payload vs. full precision.
const rnd = (n) => Math.round(n * 1e4) / 1e4;

/** Classify a feature's properties into our access model. */
function classify(p) {
  const open = (v) => typeof v === "string" && v.toLowerCase() === "open";
  const sym = (p.mvum_symbol_name || "").toLowerCase();
  // Green-sticker OHV is allowed when the motorcycle/OHV columns are "open",
  // or the symbol says the route is open to all vehicles (not highway-legal only).
  const green =
    open(p.motorcycle) ||
    open(p.other_ohv_lt50inches) ||
    open(p.atv) ||
    sym.includes("open to all");
  const seasonal =
    (p.seasonal || "").toLowerCase().trim() !== "yearlong" &&
    (p.seasonal || "") !== "";
  return { access: green ? "green" : "plate", seasonal };
}

async function fetchLayer(bbox, layer, kind) {
  const out = [];
  let offset = 0;
  const PAGE = 500;
  for (;;) {
    const url =
      `${BASE}/${layer}/query?` +
      `geometry=${encodeURIComponent(bbox)}&geometryType=esriGeometryEnvelope` +
      `&inSR=4326&spatialRel=esriSpatialRelIntersects` +
      `&outFields=${OUT_FIELDS}&returnGeometry=true&outSR=4326` +
      `&resultOffset=${offset}&resultRecordCount=${PAGE}&f=geojson`;
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) throw new Error(`layer ${layer} HTTP ${res.status}`);
    const json = await res.json();
    const feats = json.features ?? [];
    for (const f of feats) {
      if (!f.geometry) continue;
      const { access, seasonal } = classify(f.properties ?? {});
      // Normalize to an array of LineStrings.
      const lines =
        f.geometry.type === "MultiLineString"
          ? f.geometry.coordinates
          : [f.geometry.coordinates];
      const rounded = lines.map((line) =>
        // drop consecutive duplicate points created by rounding
        line
          .map(([x, y]) => [rnd(x), rnd(y)])
          .filter((pt, i, a) => i === 0 || pt[0] !== a[i - 1][0] || pt[1] !== a[i - 1][1]),
      );
      out.push({
        type: "Feature",
        properties: {
          id: f.properties?.id ?? null,
          name: f.properties?.name ?? null,
          kind,
          access,
          seasonal,
        },
        geometry:
          rounded.length === 1
            ? { type: "LineString", coordinates: rounded[0] }
            : { type: "MultiLineString", coordinates: rounded },
      });
    }
    process.stdout.write(`  layer ${layer} (${kind}): +${feats.length} (total ${out.length})\n`);
    if (!json.exceededTransferLimit || feats.length === 0) break;
    offset += feats.length;
  }
  return out;
}

await mkdir(new URL("../public/data/", import.meta.url), { recursive: true });

for (const area of targets) {
  const bbox = AREAS[area];
  if (!bbox) {
    console.error(`Unknown area "${area}" — known: ${Object.keys(AREAS).join(", ")}`);
    continue;
  }
  console.log(`\n== ${area} (${bbox}) ==`);
  const roads = await fetchLayer(bbox, 1, "road");
  const trails = await fetchLayer(bbox, 2, "trail");
  const features = [...roads, ...trails];
  const counts = features.reduce((acc, f) => {
    acc[f.properties.access] = (acc[f.properties.access] ?? 0) + 1;
    return acc;
  }, {});
  const fc = {
    type: "FeatureCollection",
    metadata: {
      source: "USFS Motor Vehicle Use Map (MVUM), EDW_MVUM_01",
      area,
      bbox,
      fetched: new Date().toISOString().slice(0, 10),
      counts,
    },
    features,
  };
  const out = new URL(`../public/data/${area}-mvum.geojson`, import.meta.url);
  const json = JSON.stringify(fc);
  await writeFile(out, json);
  console.log(
    `Wrote ${features.length} features (${(json.length / 1024).toFixed(0)} KB) -> public/data/${area}-mvum.geojson · counts ${JSON.stringify(counts)}`,
  );
}
