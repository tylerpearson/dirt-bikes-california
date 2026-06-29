// Pre-bake the BLM Ground Transportation Linear Features (GTLF) network for a
// BLM OHV area into a slimmed GeoJSON the area overview map draws from. This is
// the BLM analog of fetch-mvum-area.mjs: same output shape, different source.
//
//   node scripts/fetch-blm-area.mjs [area ...]
//
// Source: BLM National GTLF "Public Display" MapServer (national; window with a
// bbox). Layers:
//   0 = Roads Managed for Public Motorized Use         -> open
//   1 = Roads Managed for Limited Public Motorized Use -> limited
//   2 = Trails Managed for Public Motorized Use         -> open
//   3 = Trails Managed for Limited Public Motorized Use -> limited
//
// BLM's access model is NOT the USFS green/plate distinction. On BLM OHV land
// the whole open network is rideable by green-sticker (non-street-legal) bikes;
// the meaningful split is "open" vs "limited/designated" (stay-on-route, vehicle
// width limits, permit-only). We reuse the geojson's existing access keys so the
// shared AreaMap renders unchanged: "green" = open OHV route, "plate" = limited.
// The UI relabels these per-area via the area's `source` descriptor.

import { writeFile, mkdir } from "node:fs/promises";

const BASE =
  "https://gis.blm.gov/arcgis/rest/services/transportation/BLM_Natl_GTLF_Public_Display/MapServer";
const UA = "dirt-bikes/1.0 (route-guide; build script)";

// Per-area bounding boxes (xmin,ymin,xmax,ymax in lon/lat, WGS84).
const AREAS = {
  // Jawbone Canyon / Dove Springs / Butterbredt — the classic Mojave
  // green-sticker OHV complex on BLM Ridgecrest Field Office land, west of
  // Highway 14 in Kern County.
  jawbone: "-118.30,35.18,-118.02,35.46",
};

const argv = process.argv.slice(2);
const targets = argv.length ? argv : Object.keys(AREAS);

const OUT_FIELDS = [
  "ROUTE_PRMRY_NM",
  "FAMS_ID",
  "PLAN_OHV_ROUTE_DSGNTN",
  "OHV_DSGNTN_LIM_EXPLAIN",
  "OBSRVE_SRFCE_TYPE",
  "GIS_MILES",
].join(",");

// layer id -> (access, kind) for the overview classification.
const LAYERS = [
  { id: 0, access: "green", kind: "road" }, // open roads
  { id: 1, access: "plate", kind: "road" }, // limited roads
  { id: 2, access: "green", kind: "trail" }, // open trails
  { id: 3, access: "plate", kind: "trail" }, // limited trails
];

// Round to ~11 m precision (4 decimals) — sub-pixel for an area overview map.
const rnd = (n) => Math.round(n * 1e4) / 1e4;

async function fetchLayer(bbox, layer, access, kind) {
  const out = [];
  let offset = 0;
  const PAGE = 1000;
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
      const p = f.properties ?? {};
      // A short stable label: route name if present, else its BLM FAMS id.
      const id = (p.ROUTE_PRMRY_NM || p.FAMS_ID || "").trim() || null;
      const lines =
        f.geometry.type === "MultiLineString"
          ? f.geometry.coordinates
          : [f.geometry.coordinates];
      const rounded = lines.map((line) =>
        line
          .map(([x, y]) => [rnd(x), rnd(y)])
          .filter((pt, i, a) => i === 0 || pt[0] !== a[i - 1][0] || pt[1] !== a[i - 1][1]),
      );
      out.push({
        type: "Feature",
        properties: {
          id,
          name: (p.ROUTE_PRMRY_NM || "").trim() || null,
          kind,
          access,
          seasonal: false, // GTLF seasonal restriction is not populated here
        },
        geometry:
          rounded.length === 1
            ? { type: "LineString", coordinates: rounded[0] }
            : { type: "MultiLineString", coordinates: rounded },
      });
    }
    process.stdout.write(`  layer ${layer} (${kind}/${access}): +${feats.length} (total ${out.length})\n`);
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
  const features = [];
  for (const { id, access, kind } of LAYERS) {
    features.push(...(await fetchLayer(bbox, id, access, kind)));
  }
  const counts = features.reduce((acc, f) => {
    acc[f.properties.access] = (acc[f.properties.access] ?? 0) + 1;
    return acc;
  }, {});
  const fc = {
    type: "FeatureCollection",
    metadata: {
      source: "BLM National Ground Transportation Linear Features (GTLF), Public Display",
      area,
      bbox,
      fetched: new Date().toISOString().slice(0, 10),
      counts,
    },
    features,
  };
  const out = new URL(`../public/data/${area}-blm.geojson`, import.meta.url);
  const json = JSON.stringify(fc);
  await writeFile(out, json);
  console.log(
    `Wrote ${features.length} features (${(json.length / 1024).toFixed(0)} KB) -> public/data/${area}-blm.geojson · counts ${JSON.stringify(counts)}`,
  );
}
