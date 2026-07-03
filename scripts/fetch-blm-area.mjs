// Pre-bake the BLM Ground Transportation Linear Features (GTLF) network for a
// BLM OHV area into a slimmed GeoJSON the area overview map draws from. This is
// the BLM analog of fetch-mvum-area.mjs: same output shape, different source.
//
//   node scripts/fetch-blm-area.mjs [area ...]
//
// Source: BLM National GTLF "Public Display" MapServer (national; window with a
// bbox). Layers 0/1 = roads, 2/3 = trails (public / limited motorized use).
//
// The classification does NOT key on the layer ("Limited" in GTLF doesn't mean
// "plate only"). The honest signal is OHV_DSGNTN_LIM_EXPLAIN, which sorts every
// motorized route into one of three buckets for a dirt-bike guide:
//   green  -> open to green-sticker OHVs (motorized, singletrack, ATV/UTV width)
//   plate  -> "Street Legal Only" (a genuine plated-only route, rare on BLM)
//   (drop) -> "Closed to OHV recreation" (admin/easement/county access only) or
//             "Authorized/Permitted" (permitted use, not general rec) — not shown
// So green/plate mean exactly what they mean on the USFS pages.

import { mkdir } from "node:fs/promises";
import { roundLines, fetchPaged, writeAreaGeojson } from "./lib/pipeline.mjs";

const BASE =
  "https://gis.blm.gov/arcgis/rest/services/transportation/BLM_Natl_GTLF_Public_Display/MapServer";

// Per-area bounding boxes (xmin,ymin,xmax,ymax in lon/lat, WGS84).
const AREAS = {
  // Jawbone Canyon / Dove Springs / Butterbredt — the classic Mojave
  // green-sticker OHV complex on BLM Ridgecrest Field Office land, west of
  // Highway 14 in Kern County.
  jawbone: "-118.30,35.18,-118.02,35.46",
  // El Paso Mountains — Last Chance Canyon, Burro Schmidt Tunnel, Mesquite
  // Canyon, just east of Jawbone near Randsburg (Ridgecrest FO).
  "el-paso": "-117.95,35.30,-117.62,35.50",
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

const LAYERS = [
  { id: 0, kind: "road" },
  { id: 1, kind: "road" },
  { id: 2, kind: "trail" },
  { id: 3, kind: "trail" },
];

/** Sort a GTLF feature into green / plate, or null to drop it from the map. */
function classify(p) {
  const plan = (p.PLAN_OHV_ROUTE_DSGNTN || "").toLowerCase();
  const explain = (p.OHV_DSGNTN_LIM_EXPLAIN || "").toLowerCase();
  if (plan === "closed") return null;
  if (explain.includes("closed to ohv recreation")) return null; // admin/county access only
  if (explain === "authorized/permitted") return null; // permitted use, not general rec
  if (explain.includes("street legal only")) return "plate"; // genuine plated-only route
  return "green"; // motorized / singletrack / ATV-UTV / open
}

async function fetchLayer(bbox, layer, kind) {
  const out = [];
  let dropped = 0;
  const PAGE = 1000;
  await fetchPaged(
    (offset) =>
      `${BASE}/${layer}/query?` +
      `geometry=${encodeURIComponent(bbox)}&geometryType=esriGeometryEnvelope` +
      `&inSR=4326&spatialRel=esriSpatialRelIntersects` +
      `&outFields=${OUT_FIELDS}&returnGeometry=true&outSR=4326` +
      `&resultOffset=${offset}&resultRecordCount=${PAGE}&f=geojson`,
    (feats) => {
      for (const f of feats) {
        if (!f.geometry) continue;
        const p = f.properties ?? {};
        const access = classify(p);
        if (!access) { dropped += 1; continue; } // closed-to-rec / permit / closed
        // A short stable label: route name if present, else its BLM FAMS id.
        const id = (p.ROUTE_PRMRY_NM || p.FAMS_ID || "").trim() || null;
        out.push({
          type: "Feature",
          properties: {
            id,
            name: (p.ROUTE_PRMRY_NM || "").trim() || null,
            kind,
            access,
            seasonal: false, // GTLF seasonal restriction is not populated here
          },
          geometry: roundLines(f.geometry),
        });
      }
      process.stdout.write(`  layer ${layer} (${kind}): +${feats.length} kept ${out.length}, dropped ${dropped}\n`);
    },
    `layer ${layer}`,
  );
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
  for (const { id, kind } of LAYERS) {
    features.push(...(await fetchLayer(bbox, id, kind)));
  }
  await writeAreaGeojson({
    outUrl: new URL(`../public/data/${area}-blm.geojson`, import.meta.url),
    printPath: `public/data/${area}-blm.geojson`,
    source: "BLM National Ground Transportation Linear Features (GTLF), Public Display",
    area,
    bbox,
    features,
  });
}
