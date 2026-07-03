import { describe, expect, it } from "vitest";
import { routeSegmentsFromGeojson } from "@/lib/mvum-parse";

function lineFeature(id: string, access: string, coords: [number, number][]) {
  return {
    properties: { id, access },
    geometry: { type: "LineString", coordinates: coords },
  };
}

function multiLineFeature(
  id: string,
  access: string,
  lines: [number, number][][],
) {
  return {
    properties: { id, access },
    geometry: { type: "MultiLineString", coordinates: lines },
  };
}

describe("routeSegmentsFromGeojson", () => {
  it("returns [] for an undefined forestRoad", () => {
    const json = { features: [lineFeature("3N16", "green", [[-117, 34], [-117.1, 34.1]])] };
    expect(routeSegmentsFromGeojson(json, undefined)).toEqual([]);
  });

  it("matches a single id", () => {
    const json = {
      features: [
        lineFeature("3N16", "green", [[-117, 34], [-117.1, 34.1]]),
        lineFeature("2N10", "plate", [[-118, 35], [-118.1, 35.1]]),
      ],
    };
    const segs = routeSegmentsFromGeojson(json, "3N16");
    expect(segs.length).toBe(1);
    expect(segs[0].access).toBe("green");
    expect(segs[0].coords).toEqual([
      { lat: 34, lng: -117 },
      { lat: 34.1, lng: -117.1 },
    ]);
  });

  it("matches a comma-separated list of ids", () => {
    const json = {
      features: [
        lineFeature("29S02.1", "plate", [[-118, 35], [-118.1, 35.1]]),
        lineFeature("29S02.2", "plate", [[-118.1, 35.1], [-118.2, 35.2]]),
        lineFeature("29S03", "plate", [[-119, 36], [-119.1, 36.1]]),
      ],
    };
    const segs = routeSegmentsFromGeojson(json, "29S02.1, 29S02.2");
    expect(segs.length).toBe(2);
    expect(segs.map((s) => s.coords.length)).toEqual([2, 2]);
  });

  it("maps access: 'green' to 'green' and anything else to 'plate'", () => {
    const json = {
      features: [
        lineFeature("A", "green", [[-117, 34], [-117.1, 34.1]]),
        lineFeature("B", "seasonal", [[-118, 35], [-118.1, 35.1]]),
      ],
    };
    expect(routeSegmentsFromGeojson(json, "A")[0].access).toBe("green");
    expect(routeSegmentsFromGeojson(json, "B")[0].access).toBe("plate");
  });

  it("explodes a MultiLineString into one segment per line", () => {
    const json = {
      features: [
        multiLineFeature("M1", "plate", [
          [[-117, 34], [-117.1, 34.1]],
          [[-118, 35], [-118.1, 35.1]],
        ]),
      ],
    };
    const segs = routeSegmentsFromGeojson(json, "M1");
    expect(segs.length).toBe(2);
  });

  it("drops single-point lines", () => {
    const json = {
      features: [lineFeature("P1", "plate", [[-117, 34]])],
    };
    expect(routeSegmentsFromGeojson(json, "P1")).toEqual([]);
  });

  it("returns [] when no feature id matches", () => {
    const json = {
      features: [lineFeature("X1", "green", [[-117, 34], [-117.1, 34.1]])],
    };
    expect(routeSegmentsFromGeojson(json, "Y1")).toEqual([]);
  });
});
