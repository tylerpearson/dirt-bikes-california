// Pre-bake an Angeles National Forest overview into a slimmed GeoJSON the area
// overview map draws from. This is the Angeles analog of fetch-blm-area.mjs.
//
//   node scripts/fetch-angeles-area.mjs [area ...]
//
// The Angeles is the one California national forest absent from the EDW MVUM
// MapServer — it publishes its motor vehicle use map only as a printed /
// Avenza map, not as a queryable GIS layer. So instead of MVUM we build the
// overview from the USFS trail (TrailNFS) and road (RoadBasic) inventories.
// Trails carry MVUM symbol codes (machine-readable access: green vs plate,
// yearlong vs seasonal). Roads do not carry a designation field here, so
// there's no green-vs-plate class for roads: they render as plate
// ("street-legal, verify against the posted MVUM").

import { mkdir } from "node:fs/promises";
import { roundLines, fetchPaged, writeAreaGeojson } from "./lib/pipeline.mjs";

const TRAILS_BASE =
  "https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_TrailNFSPublish_01/MapServer/0";
const ROADS_BASE =
  "https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_RoadBasic_01/MapServer/0";

// Per-area bounding boxes (xmin,ymin,xmax,ymax in lon/lat, WGS84).
const AREAS = {
  // Rowher Flats OHV area / Sierra Pelona / Santa Clara Divide corridor, in
  // the northwest Angeles above Santa Clarita. Deliberately excludes the San
  // Gabriel Canyon front country (closed / permit-restricted).
  "rowher-flats": "-118.65,34.35,-118.05,34.70",
};

const argv = process.argv.slice(2);
const targets = argv.length ? argv : Object.keys(AREAS);

async function fetchTrails(bbox) {
  const out = [];
  const PAGE = 1000;
  const where = encodeURIComponent(
    "admin_org LIKE '0501%' AND terra_motorized='Y' AND mvum_symbol > 0",
  );
  await fetchPaged(
    (offset) =>
      `${TRAILS_BASE}/query?where=${where}` +
      `&geometry=${encodeURIComponent(bbox)}&geometryType=esriGeometryEnvelope` +
      `&inSR=4326&spatialRel=esriSpatialRelIntersects` +
      `&outFields=trail_no,trail_name,mvum_symbol,terra_motorized,gis_miles` +
      `&returnGeometry=true&outSR=4326&resultOffset=${offset}&resultRecordCount=${PAGE}&f=geojson`,
    (feats) => {
      for (const f of feats) {
        if (!f.geometry) continue;
        const p = f.properties ?? {};
        out.push({
          type: "Feature",
          properties: {
            id: p.trail_no ?? null,
            name: p.trail_name ?? null,
            kind: "trail",
            access: "green",
            seasonal: Number(p.mvum_symbol) % 2 === 0,
          },
          geometry: roundLines(f.geometry),
        });
      }
      process.stdout.write(`  trails: +${feats.length} kept ${out.length}\n`);
    },
    "trails",
  );
  return out;
}

async function fetchRoads(bbox) {
  const out = [];
  let dropped = 0;
  const PAGE = 1000;
  const where = encodeURIComponent("admin_org LIKE '0501%'");
  await fetchPaged(
    (offset) =>
      `${ROADS_BASE}/query?where=${where}` +
      `&geometry=${encodeURIComponent(bbox)}&geometryType=esriGeometryEnvelope` +
      `&inSR=4326&spatialRel=esriSpatialRelIntersects` +
      `&outFields=id,name,symbol_name,gis_miles` +
      `&returnGeometry=true&outSR=4326&resultOffset=${offset}&resultRecordCount=${PAGE}&f=geojson`,
    (feats) => {
      for (const f of feats) {
        if (!f.geometry) continue;
        const p = f.properties ?? {};
        if ((p.gis_miles ?? 0) < 0.15) { dropped += 1; continue; } // spur/parking noise
        out.push({
          type: "Feature",
          properties: {
            id: p.id ?? null,
            name: p.name ?? null,
            kind: "road",
            access: "plate",
            seasonal: false,
          },
          geometry: roundLines(f.geometry),
        });
      }
      process.stdout.write(`  roads: +${feats.length} kept ${out.length}, dropped ${dropped}\n`);
    },
    "roads",
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
  const trails = await fetchTrails(bbox);
  const roads = await fetchRoads(bbox);
  const features = [...trails, ...roads];
  await writeAreaGeojson({
    outUrl: new URL(`../public/data/${area}-angeles.geojson`, import.meta.url),
    printPath: `public/data/${area}-angeles.geojson`,
    source: "USFS trail (TrailNFS) and road (RoadBasic) inventories, EDW",
    area,
    bbox,
    features,
  });
}
