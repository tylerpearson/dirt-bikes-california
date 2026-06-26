/**
 * Generates APPROXIMATE PLACEHOLDER GPX tracks near each trailhead so the
 * map-line feature is visible end to end. These are illustrative wandering
 * paths — NOT surveyed routes. Replace any file in /data/gpx with a real GPX
 * export (same <route-id>.gpx name) to draw the true trail.
 *
 * Run: node scripts/gen-sample-gpx.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const trailheads = [
  { id: "holcomb-valley", name: "Holcomb Valley Loop", lat: 34.3122, lng: -116.9183, spread: 0.014, loop: true, minFt: 7000, maxFt: 7400 },
  { id: "john-bull", name: "John Bull Trail", lat: 34.2789, lng: -116.8005, spread: 0.01, loop: false, minFt: 7200, maxFt: 7800 },
  { id: "gold-mountain", name: "Gold Mountain / Dishpan Springs", lat: 34.27, lng: -116.83, spread: 0.013, loop: false, minFt: 6900, maxFt: 8200 },
  { id: "coxey-road", name: "Coxey Road Connector", lat: 34.305, lng: -116.885, spread: 0.02, loop: false, minFt: 6700, maxFt: 7300 },
  { id: "cactus-flats", name: "Cactus Flats OHV Area", lat: 34.221, lng: -116.732, spread: 0.015, loop: true, minFt: 6400, maxFt: 7000 },
  { id: "arrastre-creek", name: "Arrastre Creek Road", lat: 34.265, lng: -116.78, spread: 0.016, loop: false, minFt: 6800, maxFt: 7500 },
];

const FT_PER_M = 3.28084;

function buildPoints({ lat, lng, spread, loop, minFt, maxFt }, seed) {
  const N = 28;
  const band = maxFt - minFt;
  const pts = [];
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    // Loop: full circle wander. Out-and-back: stretch out then return.
    const ang = loop
      ? t * Math.PI * 2 + seed
      : Math.sin(t * Math.PI) * Math.PI * 1.4 + seed;
    const reach = loop ? spread * (0.5 + 0.45 * Math.sin(t * Math.PI)) : spread * t;
    const wobbleLat = Math.sin(i * 1.7 + seed) * spread * 0.16;
    const wobbleLng = Math.cos(i * 2.1 + seed) * spread * 0.16;

    // Elevation: loops roll; out-and-back climbs to a high point then returns.
    const shape = loop
      ? 0.5 + 0.5 * Math.sin(t * Math.PI * 2 - Math.PI / 2)
      : Math.sin(t * Math.PI);
    const eleFt = minFt + band * shape + Math.sin(i * 1.3 + seed) * band * 0.06;
    const eleM = eleFt / FT_PER_M;

    pts.push([
      (lat + reach * Math.sin(ang) + wobbleLat).toFixed(6),
      (lng + reach * Math.cos(ang) * 1.2 + wobbleLng).toFixed(6),
      eleM.toFixed(1),
    ]);
  }
  return pts;
}

const outDir = path.join(process.cwd(), "data", "gpx");
mkdirSync(outDir, { recursive: true });

for (let i = 0; i < trailheads.length; i++) {
  const th = trailheads[i];
  const pts = buildPoints(th, i * 0.9);
  const trkpts = pts
    .map(
      ([la, lo, el]) =>
        `      <trkpt lat="${la}" lon="${lo}"><ele>${el}</ele></trkpt>`,
    )
    .join("\n");
  const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="dirt-bikes (APPROXIMATE PLACEHOLDER)" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>APPROXIMATE placeholder — ${th.name}</name>
    <desc>Illustrative track only. Not a surveyed route. Replace with a real GPX export.</desc>
  </metadata>
  <trk>
    <name>${th.name} (approximate)</name>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>
`;
  writeFileSync(path.join(outDir, `${th.id}.gpx`), gpx);
  console.log(`wrote data/gpx/${th.id}.gpx (${pts.length} pts)`);
}
