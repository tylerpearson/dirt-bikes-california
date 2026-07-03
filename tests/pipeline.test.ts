import { describe, expect, it } from "vitest";
import {
  stitchParts,
  haversineMi,
  fmtFt,
  fmtFtRange,
  escXml,
  varName,
  elevationLookup,
  rnd,
  roundLines,
} from "../scripts/lib/pipeline.mjs";

describe("stitchParts", () => {
  // Note: the joint point is intentionally duplicated (the algorithm
  // concatenates parts without deduping the shared coordinate) — that matches
  // real GTLF/MVUM data, where adjoining segments repeat their shared vertex.
  it("joins two segments sharing an endpoint into one path in order", () => {
    const parts = [
      [
        [0, 0],
        [1, 0],
      ],
      [
        [1, 0],
        [2, 0],
      ],
    ];
    const paths = stitchParts(parts);
    expect(paths).toHaveLength(1);
    expect(paths[0]).toEqual([
      [0, 0],
      [1, 0],
      [1, 0],
      [2, 0],
    ]);
  });

  it("flips a reversed middle segment to keep the path contiguous", () => {
    // This segment is stored tail-to-head (its END coincides with the first
    // part's tail), so stitchParts must reverse it before appending.
    const flipParts = [
      [
        [0, 0],
        [1, 0],
      ],
      [
        [2, 0],
        [1, 0],
      ],
    ];
    const paths = stitchParts(flipParts);
    expect(paths).toHaveLength(1);
    expect(paths[0]).toEqual([
      [0, 0],
      [1, 0],
      [1, 0],
      [2, 0],
    ]);
  });

  it("splits into two paths when the nearest piece is farther than GAP", () => {
    const parts = [
      [
        [0, 0],
        [1, 0],
      ],
      [
        [10, 10],
        [11, 10],
      ],
    ];
    const paths = stitchParts(parts);
    expect(paths).toHaveLength(2);
  });

  it("drops sub-2-point parts", () => {
    const parts = [
      [[5, 5]],
      [
        [0, 0],
        [1, 0],
      ],
    ];
    const paths = stitchParts(parts);
    expect(paths).toHaveLength(1);
    expect(paths[0]).toHaveLength(2);
  });

  it("returns [] for empty input", () => {
    expect(stitchParts([])).toEqual([]);
  });
});

describe("haversineMi", () => {
  it("computes ~69.09mi for one degree of latitude near 34N", () => {
    const d = haversineMi([-117, 34], [-117, 35]);
    expect(d).toBeCloseTo(69.09, 1);
  });

  it("returns 0 for identical points", () => {
    expect(haversineMi([-117, 34], [-117, 34])).toBe(0);
  });
});

describe("fmtFt", () => {
  it("rounds 2133m to the nearest 50 ft (7000)", () => {
    expect(fmtFt(2133)).toBe(7000);
  });
});

describe("fmtFtRange", () => {
  it("formats with comma grouping and an en dash regardless of machine locale", () => {
    expect(fmtFtRange(2073, 2286)).toBe("6,800–7,500 ft");
  });
});

describe("escXml", () => {
  it("escapes &, <, > and passes quotes through unchanged", () => {
    expect(escXml(`Tom & Jerry's <ride> "loop"`)).toBe(
      `Tom &amp; Jerry's &lt;ride&gt; "loop"`,
    );
  });
});

describe("varName", () => {
  it("converts kebab-case area slugs to a camelCase Routes export name", () => {
    expect(varName("el-paso")).toBe("elPasoRoutes");
    expect(varName("big-bear")).toBe("bigBearRoutes");
  });
});

describe("elevationLookup", () => {
  it("computes hasEle/eMin/eMax and interpolates eleAt to the nearest sample", () => {
    const samples = [
      { i: 0, ele: 100 },
      { i: 10, ele: null },
      { i: 20, ele: 200 },
    ];
    const { hasEle, eMin, eMax, eleAt } = elevationLookup(samples);
    expect(hasEle).toBe(true);
    expect(eMin).toBe(100);
    expect(eMax).toBe(200);
    expect(eleAt(3)).toBe(100);
    expect(eleAt(16)).toBe(200);
  });

  it("hasEle is false and eleAt returns null when every sample is null", () => {
    const samples = [
      { i: 0, ele: null },
      { i: 10, ele: null },
    ];
    const { hasEle, eleAt } = elevationLookup(samples);
    expect(hasEle).toBe(false);
    expect(eleAt(5)).toBeNull();
  });
});

describe("rnd", () => {
  it("rounds to 4 decimal places", () => {
    expect(rnd(1.234567)).toBe(1.2346);
  });
});

describe("roundLines", () => {
  it("keeps a LineString a LineString and rounds/dedupes points", () => {
    const geometry = {
      type: "LineString",
      coordinates: [
        [1.00001, 2.00001],
        [1.000011, 2.000011], // rounds to the same point as above -> dropped
        [1.1, 2.1],
      ],
    };
    const out = roundLines(geometry);
    expect(out.type).toBe("LineString");
    expect(out.coordinates).toEqual([
      [1, 2],
      [1.1, 2.1],
    ]);
  });

  it("preserves MultiLineString shape", () => {
    const geometry = {
      type: "MultiLineString",
      coordinates: [
        [
          [0, 0],
          [1, 1],
        ],
        [
          [2, 2],
          [3, 3],
        ],
      ],
    };
    const out = roundLines(geometry);
    expect(out.type).toBe("MultiLineString");
    expect(out.coordinates).toEqual([
      [
        [0, 0],
        [1, 1],
      ],
      [
        [2, 2],
        [3, 3],
      ],
    ]);
  });
});
