import { describe, expect, it } from "vitest";
import { centeredMap, trackMap } from "@/lib/tiles";
import type { LatLng } from "@/lib/tiles";

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
});
