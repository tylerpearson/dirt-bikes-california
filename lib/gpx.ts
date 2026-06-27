import { readFileSync } from "node:fs";
import path from "node:path";
import type { TrackPoint } from "./track-stats";

/**
 * Load a GPX track from /public/gpx/<file>. Returns the ordered track points
 * (with elevation in meters when present), or an empty array if the file is
 * missing/unparseable. Server-only (uses fs) — call from a Server Component
 * or at build time. Files live under /public/gpx so they're also downloadable
 * at /gpx/<file>.
 */
export function loadTrack(file: string): TrackPoint[] {
  const full = path.join(process.cwd(), "public", "gpx", file);
  let xml: string;
  try {
    xml = readFileSync(full, "utf8");
  } catch {
    return [];
  }

  const points: TrackPoint[] = [];
  // Match each <trkpt> element, whether self-closing or with inner content.
  const blockRe = /<trkpt\b([^>]*?)(?:\/>|>([\s\S]*?)<\/trkpt>)/g;
  let block: RegExpExecArray | null;
  while ((block = blockRe.exec(xml)) !== null) {
    const attrs = block[1];
    const inner = block[2] ?? "";
    const lat = /\blat="([-\d.]+)"/.exec(attrs);
    const lon = /\blon="([-\d.]+)"/.exec(attrs);
    if (!lat || !lon) continue;
    const ele = /<ele>([-\d.]+)<\/ele>/.exec(inner);
    points.push({
      lat: parseFloat(lat[1]),
      lng: parseFloat(lon[1]),
      ele: ele ? parseFloat(ele[1]) : undefined,
    });
  }
  return points;
}
