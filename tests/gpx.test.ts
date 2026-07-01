import { describe, expect, it } from "vitest";
import { loadTrack, loadTrackParts } from "@/lib/gpx";
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
