import { describe, expect, it } from "vitest";
import { loadTrack, loadTrackParts } from "@/lib/gpx";
import { parseTrackParts } from "@/lib/gpx-parse";
import { AREAS } from "@/lib/areas";

describe("loadTrack", () => {
  it("returns an empty array for a missing file", () => {
    expect(loadTrack("does-not-exist.gpx")).toEqual([]);
  });

  it("loads a real route's GPX with SoCal-bounded points", () => {
    const routeId = AREAS[0].routes[0].id;
    const points = loadTrack(`${routeId}.gpx`);
    expect(points.length).toBeGreaterThan(1);
    for (const p of points) {
      expect(p.lat).toBeGreaterThanOrEqual(32);
      expect(p.lat).toBeLessThanOrEqual(36);
      expect(p.lng).toBeGreaterThanOrEqual(-121);
      expect(p.lng).toBeLessThanOrEqual(-114);
      if (p.ele !== undefined) {
        expect(Number.isFinite(p.ele)).toBe(true);
      }
    }
  });
});

describe("loadTrackParts", () => {
  it("returns non-empty parts whose flattened length matches loadTrack", () => {
    const routeId = AREAS[0].routes[0].id;
    const file = `${routeId}.gpx`;
    const parts = loadTrackParts(file);
    expect(parts.length).toBeGreaterThan(0);
    for (const part of parts) {
      expect(part.length).toBeGreaterThan(0);
    }
    const flattened = parts.flat();
    expect(flattened.length).toBe(loadTrack(file).length);
  });
});

describe("parseTrackParts (fs-free)", () => {
  it("splits a two-<trkseg> document into two parts", () => {
    const xml = `<gpx><trk><trkseg>
      <trkpt lat="34.1" lon="-117.1"><ele>1000</ele></trkpt>
      <trkpt lat="34.2" lon="-117.2"><ele>1010</ele></trkpt>
    </trkseg><trkseg>
      <trkpt lat="34.3" lon="-117.3"><ele>1020</ele></trkpt>
      <trkpt lat="34.4" lon="-117.4"><ele>1030</ele></trkpt>
    </trkseg></trk></gpx>`;
    const parts = parseTrackParts(xml);
    expect(parts.length).toBe(2);
    expect(parts[0].length).toBe(2);
    expect(parts[1].length).toBe(2);
    expect(parts[0][0]).toEqual({ lat: 34.1, lng: -117.1, ele: 1000 });
  });

  it("falls back to one part for a <trkpt>-only document with no <trkseg>", () => {
    const xml = `<gpx><trk>
      <trkpt lat="34.1" lon="-117.1"/>
      <trkpt lat="34.2" lon="-117.2"/>
    </trk></gpx>`;
    const parts = parseTrackParts(xml);
    expect(parts.length).toBe(1);
    expect(parts[0].length).toBe(2);
  });

  it("returns [] for garbage input", () => {
    expect(parseTrackParts("not gpx at all")).toEqual([]);
  });
});
