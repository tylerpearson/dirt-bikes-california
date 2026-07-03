// Composite GPX for suggested loops (plan 007).
//
// For every area.loops[].loop, reads each of its routeIds' existing
// public/gpx/<routeId>.gpx, extracts the whole <trk>...</trk> block(s)
// verbatim, and concatenates them (in routeIds order) into a single
// multi-track GPX under public/gpx/loops/<areaId>--<loopId>.gpx. This lets a
// rider download "the whole day" as one file with one <trk> per leg, instead
// of downloading each route separately.
//
// No network. Reads only already-generated route GPX; never regenerates or
// edits per-route files (those are owned by build-area-routes.mjs /
// build-blm-routes.mjs / build-angeles-routes.mjs).
//
// Run with: npm run build:loops (tsx scripts/build-loop-gpx.mts)

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AREAS } from "../lib/areas";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const GPX_DIR = path.join(ROOT, "public", "gpx");
const LOOPS_DIR = path.join(GPX_DIR, "loops");

/** Extract every <trk>...</trk> block from a GPX document, verbatim. */
function extractTracks(xml: string): string[] {
  const trkRe = /<trk\b[^>]*>[\s\S]*?<\/trk>/g;
  const matches = xml.match(trkRe);
  return matches ?? [];
}

/** Count <trkpt> elements across a set of <trk> blocks, for the log line. */
function countPoints(tracks: string[]): number {
  let total = 0;
  const ptRe = /<trkpt\b/g;
  for (const trk of tracks) {
    const m = trk.match(ptRe);
    if (m) total += m.length;
  }
  return total;
}

function escXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

mkdirSync(LOOPS_DIR, { recursive: true });

let written = 0;

for (const area of AREAS) {
  if (!area.loops) continue;
  for (const loop of area.loops) {
    const tracks: string[] = [];
    for (const routeId of loop.routeIds) {
      const routeGpxPath = path.join(GPX_DIR, `${routeId}.gpx`);
      if (!existsSync(routeGpxPath)) {
        throw new Error(
          `Loop "${loop.name}" (area "${area.id}") references route "${routeId}" ` +
            `with no GPX file at ${routeGpxPath}`,
        );
      }
      const xml = readFileSync(routeGpxPath, "utf8");
      const routeTracks = extractTracks(xml);
      if (routeTracks.length === 0) {
        throw new Error(
          `Route GPX "${routeGpxPath}" (referenced by loop "${loop.name}", ` +
            `area "${area.id}") has no <trk> elements`,
        );
      }
      // Some routes (e.g. BLM routes stitched from disjoint pieces) carry
      // multiple <trk> blocks; keep them all, grouped in routeIds order.
      tracks.push(...routeTracks);
    }

    const metadataName = `${area.name}: ${loop.name}`;
    const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="dirt-bikes build-loop-gpx (composite of existing route GPX)" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><name>${escXml(metadataName)}</name></metadata>
${tracks.map((t) => `  ${t}`).join("\n")}
</gpx>
`;

    const outPath = path.join(LOOPS_DIR, `${area.id}--${loop.id}.gpx`);
    writeFileSync(outPath, gpx);
    written++;
    console.log(
      `${area.id} / ${loop.name}: ${loop.routeIds.length} route(s), ${countPoints(tracks)} point(s) -> ${path.relative(ROOT, outPath)}`,
    );
  }
}

console.log(`\nWrote ${written} composite loop GPX file(s).`);
