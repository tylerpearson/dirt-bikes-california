import { describe, expect, it } from "vitest";
import { centeredMap, simplifyPoints, trackMap } from "@/lib/tiles";
import type { LatLng, Point } from "@/lib/tiles";

describe("centeredMap", () => {
  it("places the pin at the exact frame center with default dimensions", () => {
    const render = centeredMap(34, -117);
    expect(render.pin).toEqual({ left: 300, top: 200 });
    expect(render.tiles.length).toBeGreaterThan(0);
    for (const tile of render.tiles) {
      expect(tile.src).toMatch(/^https:\/\/tile\.openstreetmap\.org\/12\//);
    }
  });
});

describe("trackMap", () => {
  it("fits a small track within the padded frame at a high zoom", () => {
    const points: LatLng[] = [
      { lat: 34, lng: -117 },
      { lat: 34.01, lng: -116.99 },
    ];
    const render = trackMap(points, { padding: 64, width: 600, height: 400 });
    expect(render.path).toBeDefined();
    for (const p of render.path!) {
      expect(p.left).toBeGreaterThanOrEqual(0);
      expect(p.left).toBeLessThanOrEqual(600);
      expect(p.top).toBeGreaterThanOrEqual(0);
      expect(p.top).toBeLessThanOrEqual(400);
    }
    const lefts = render.path!.map((p) => p.left);
    const tops = render.path!.map((p) => p.top);
    expect(Math.min(...lefts)).toBeGreaterThanOrEqual(64 - 1);
    expect(Math.max(...lefts)).toBeLessThanOrEqual(600 - 64 + 1);
    expect(Math.min(...tops)).toBeGreaterThanOrEqual(64 - 1);
    expect(Math.max(...tops)).toBeLessThanOrEqual(400 - 64 + 1);
  });

  it("clamps to minZoom when the track spans several degrees", () => {
    const points: LatLng[] = [
      { lat: 32.5, lng: -120 },
      { lat: 36, lng: -114 },
    ];
    const render = trackMap(points, { minZoom: 9, maxZoom: 15 });
    expect(render.tiles.length).toBeGreaterThan(0);
    for (const tile of render.tiles) {
      expect(tile.src).toMatch(/^https:\/\/tile\.openstreetmap\.org\/9\//);
    }
  });

  it("sets start/end to the projected first and last input points", () => {
    const points: LatLng[] = [
      { lat: 34, lng: -117 },
      { lat: 34.005, lng: -116.995 },
      { lat: 34.01, lng: -116.99 },
    ];
    const render = trackMap(points);
    expect(render.start).toEqual(render.path![0]);
    expect(render.end).toEqual(render.path![render.path!.length - 1]);
  });

  it("projects segments into the same frame as the track", () => {
    const points: LatLng[] = [
      { lat: 34, lng: -117 },
      { lat: 34.01, lng: -116.99 },
    ];
    const render = trackMap(points, {
      segments: [{ access: "track", coords: points }],
    });
    expect(render.segments).toBeDefined();
    expect(render.segments![0].points.length).toBe(render.path!.length);
    for (let i = 0; i < render.path!.length; i++) {
      expect(render.segments![0].points[i].left).toBeCloseTo(
        render.path![i].left,
        9,
      );
      expect(render.segments![0].points[i].top).toBeCloseTo(
        render.path![i].top,
        9,
      );
    }
  });

  it("collapses a straight line of many collinear points to a handful", () => {
    const points: LatLng[] = Array.from({ length: 101 }, (_, i) => ({
      lat: 34 + i * 0.0001,
      lng: -117,
    }));
    const render = trackMap(points);
    expect(render.path!.length).toBeLessThanOrEqual(4);
    expect(render.start).toEqual(render.path![0]);
    expect(render.end).toEqual(render.path![render.path!.length - 1]);
  });

  it("emits integer coordinates for path and segment points", () => {
    const points: LatLng[] = [
      { lat: 34, lng: -117 },
      { lat: 34.003, lng: -116.998 },
      { lat: 34.005, lng: -116.995 },
      { lat: 34.01, lng: -116.99 },
    ];
    const render = trackMap(points, {
      segments: [{ access: "track", coords: points }],
    });
    for (const p of render.path!) {
      expect(Number.isInteger(p.left)).toBe(true);
      expect(Number.isInteger(p.top)).toBe(true);
    }
    for (const seg of render.segments!) {
      for (const p of seg.points) {
        expect(Number.isInteger(p.left)).toBe(true);
        expect(Number.isInteger(p.top)).toBe(true);
      }
    }
  });
});

describe("simplifyPoints", () => {
  it("keeps a preserved corner in an L-shaped path", () => {
    const points: Point[] = [
      { left: 0, top: 0 },
      { left: 100, top: 0 },
      { left: 100, top: 100 },
    ];
    const result = simplifyPoints(points, 1);
    expect(result).toEqual(points);
  });

  it("passes through 1- and 2-point inputs unchanged", () => {
    const one: Point[] = [{ left: 5, top: 5 }];
    const two: Point[] = [
      { left: 0, top: 0 },
      { left: 10, top: 10 },
    ];
    expect(simplifyPoints(one, 1)).toEqual(one);
    expect(simplifyPoints(two, 1)).toEqual(two);
  });
});
