import { describe, expect, it } from "vitest";
import { trackStats, trackStatsFromParts } from "@/lib/track-stats";
import type { TrackPoint } from "@/lib/track-stats";

const FT_PER_M = 3.28084;

describe("trackStats", () => {
  it("computes distance for two points 0.01deg apart in latitude", () => {
    const points: TrackPoint[] = [
      { lat: 0, lng: 0 },
      { lat: 0.01, lng: 0 },
    ];
    const stats = trackStats(points);
    expect(stats.distanceMiles).toBeCloseTo(0.691, 2);
  });

  it("computes gain/loss/min/max from an elevation profile", () => {
    const points: TrackPoint[] = [
      { lat: 0, lng: 0, ele: 100 },
      { lat: 0.001, lng: 0, ele: 130 },
      { lat: 0.002, lng: 0, ele: 110 },
    ];
    const stats = trackStats(points);
    expect(stats.hasElevation).toBe(true);
    expect(stats.gainFt).toBeCloseTo(30 * FT_PER_M, 1);
    expect(stats.lossFt).toBeCloseTo(20 * FT_PER_M, 1);
    expect(stats.minFt).toBeCloseTo(100 * FT_PER_M, 3);
    expect(stats.maxFt).toBeCloseTo(130 * FT_PER_M, 3);
  });

  it("hasElevation is false when any point lacks ele, and gain/loss/min/max are 0", () => {
    const points: TrackPoint[] = [
      { lat: 0, lng: 0, ele: 100 },
      { lat: 0.001, lng: 0 },
      { lat: 0.002, lng: 0, ele: 110 },
    ];
    const stats = trackStats(points);
    expect(stats.hasElevation).toBe(false);
    expect(stats.gainFt).toBe(0);
    expect(stats.lossFt).toBe(0);
    expect(stats.minFt).toBe(0);
    expect(stats.maxFt).toBe(0);
  });

  it("skips gaps between parts when accumulating distance", () => {
    const a: TrackPoint[] = [
      { lat: 0, lng: 0 },
      { lat: 0.01, lng: 0 },
    ];
    const b: TrackPoint[] = [
      { lat: 40, lng: 40 },
      { lat: 40.01, lng: 40 },
    ];
    const combined = trackStatsFromParts([a, b]);
    const expected = trackStats(a).distanceMiles + trackStats(b).distanceMiles;
    expect(combined.distanceMiles).toBeCloseTo(expected, 9);
  });

  it("returns distance 0 and hasElevation false for empty input", () => {
    const stats = trackStatsFromParts([]);
    expect(stats.distanceMiles).toBe(0);
    expect(stats.hasElevation).toBe(false);
  });
});
