import { readFileSync } from "node:fs";
import path from "node:path";
import type { TrackPoint } from "./track-stats";
import { parseTrkpts, parseTrackParts } from "./gpx-parse";

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
  return parseTrackParts(xml);
}
