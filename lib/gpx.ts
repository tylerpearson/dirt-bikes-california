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

  return parseTrkpts(xml);
}

/** Parse every <trkpt> in a chunk of GPX into ordered track points. */
function parseTrkpts(xml: string): TrackPoint[] {
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

/**
 * Load a GPX track split into its <trkseg> parts. A route stitched from
 * disjoint segments (e.g. a BLM route built from separate GTLF pieces) writes
 * one <trkseg> per part; this returns each part separately so a renderer can
 * draw them as distinct polylines instead of joining the gaps with a straight
 * line. Single-segment tracks return one part. Server-only.
 */
export function loadTrackParts(file: string): TrackPoint[][] {
  const full = path.join(process.cwd(), "public", "gpx", file);
  let xml: string;
  try {
    xml = readFileSync(full, "utf8");
  } catch {
    return [];
  }
  const segRe = /<trkseg\b[^>]*>([\s\S]*?)<\/trkseg>/g;
  const parts: TrackPoint[][] = [];
  let m: RegExpExecArray | null;
  while ((m = segRe.exec(xml)) !== null) {
    const pts = parseTrkpts(m[1]);
    if (pts.length) parts.push(pts);
  }
  // Fall back to a single part if the file has no <trkseg> wrappers.
  if (!parts.length) {
    const pts = parseTrkpts(xml);
    if (pts.length) parts.push(pts);
  }
  return parts;
}
