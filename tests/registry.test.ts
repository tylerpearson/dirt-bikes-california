import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { AREAS } from "@/lib/areas";

const PUBLIC_DIR = path.join(process.cwd(), "public");

const extractMap = (src: string, marker: string): Map<string, string> => {
  const start = src.indexOf(marker);
  expect(start, `could not find "${marker}" in source`).toBeGreaterThanOrEqual(0);
  const end = src.indexOf("};", start);
  expect(end, `could not find closing "};" after "${marker}"`).toBeGreaterThan(
    start,
  );
  const block = src.slice(start, end);
  const re = /"?([a-z][a-z-]*)"?: "(-?[\d.]+,-?[\d.]+,-?[\d.]+,-?[\d.]+)"/g;
  const map = new Map<string, string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(block)) !== null) {
    map.set(m[1], m[2]);
  }
  return map;
};

const BBOX_PAIRS = [
  { fetch: "fetch-mvum-area.mjs", build: "build-area-routes.mjs", min: 8 },
  { fetch: "fetch-blm-area.mjs", build: "build-blm-routes.mjs", min: 2 },
  { fetch: "fetch-angeles-area.mjs", build: "build-angeles-routes.mjs", min: 1 },
];

describe("registry invariants", () => {
  it("every loop's routeIds resolve to a route in the same area", () => {
    for (const area of AREAS) {
      if (!area.loops) continue;
      const routeIds = new Set(area.routes.map((r) => r.id));
      for (const loop of area.loops) {
        for (const id of loop.routeIds) {
          expect(
            routeIds.has(id),
            `area "${area.id}" loop "${loop.name}" references missing route id "${id}"`,
          ).toBe(true);
        }
      }
    }
  });

  it("route ids are globally unique", () => {
    const seen = new Map<string, string>(); // id -> area id
    const duplicates: string[] = [];
    for (const area of AREAS) {
      for (const route of area.routes) {
        const existingArea = seen.get(route.id);
        if (existingArea) {
          duplicates.push(
            `"${route.id}" appears in both "${existingArea}" and "${area.id}"`,
          );
        } else {
          seen.set(route.id, area.id);
        }
      }
    }
    expect(duplicates, duplicates.join("; ")).toEqual([]);
  });

  it("area ids are unique and every area has at least one route", () => {
    const seen = new Set<string>();
    const duplicates: string[] = [];
    for (const area of AREAS) {
      if (seen.has(area.id)) duplicates.push(area.id);
      seen.add(area.id);
      expect(
        area.routes.length,
        `area "${area.id}" has no routes`,
      ).toBeGreaterThan(0);
    }
    expect(duplicates, `duplicate area ids: ${duplicates.join(", ")}`).toEqual(
      [],
    );
  });

  it("every route has a GPX file with at least one trkpt", () => {
    for (const area of AREAS) {
      for (const route of area.routes) {
        const gpxPath = path.join(PUBLIC_DIR, "gpx", `${route.id}.gpx`);
        expect(
          existsSync(gpxPath),
          `missing GPX file for route "${route.id}" (area "${area.id}"): ${gpxPath}`,
        ).toBe(true);
        const content = readFileSync(gpxPath, "utf8");
        expect(
          content.includes("<trkpt"),
          `GPX file for route "${route.id}" has no <trkpt> elements`,
        ).toBe(true);
      }
    }
  });

  it("every area has an overview GeoJSON with non-empty features", () => {
    for (const area of AREAS) {
      const geojsonPath = path.join(PUBLIC_DIR, area.mvumGeojson.replace(/^\//, ""));
      expect(
        existsSync(geojsonPath),
        `missing overview GeoJSON for area "${area.id}": ${geojsonPath}`,
      ).toBe(true);
      const parsed = JSON.parse(readFileSync(geojsonPath, "utf8"));
      expect(
        Array.isArray(parsed.features) && parsed.features.length > 0,
        `overview GeoJSON for area "${area.id}" has no features`,
      ).toBe(true);
    }
  });

  it("every loop id is non-empty, kebab-case, and unique within its area", () => {
    const kebab = /^[a-z0-9]+(-[a-z0-9]+)*$/;
    for (const area of AREAS) {
      if (!area.loops) continue;
      const seen = new Set<string>();
      for (const loop of area.loops) {
        expect(
          kebab.test(loop.id),
          `area "${area.id}" loop "${loop.name}" has a non-kebab-case id: "${loop.id}"`,
        ).toBe(true);
        expect(
          seen.has(loop.id),
          `area "${area.id}" has more than one loop with id "${loop.id}"`,
        ).toBe(false);
        seen.add(loop.id);
      }
    }
  });

  it("every loop has a composite GPX file with one <trk> per routeId", () => {
    for (const area of AREAS) {
      if (!area.loops) continue;
      for (const loop of area.loops) {
        const gpxPath = path.join(
          PUBLIC_DIR,
          "gpx",
          "loops",
          `${area.id}--${loop.id}.gpx`,
        );
        expect(
          existsSync(gpxPath),
          `missing composite loop GPX for area "${area.id}" loop "${loop.name}": ${gpxPath}`,
        ).toBe(true);
        const content = readFileSync(gpxPath, "utf8");
        const trkCount = (content.match(/<trk\b/g) ?? []).length;
        expect(
          trkCount,
          `composite loop GPX for area "${area.id}" loop "${loop.name}" has ${trkCount} <trk> element(s), expected ${loop.routeIds.length} (one per routeId) — run "npm run build:loops"`,
        ).toBe(loop.routeIds.length);
      }
    }
  });

  it("every loop distance is a finite positive number", () => {
    for (const area of AREAS) {
      if (!area.loops) continue;
      for (const loop of area.loops) {
        expect(
          Number.isFinite(loop.distanceMiles) && loop.distanceMiles > 0,
          `area "${area.id}" loop "${loop.name}" has an invalid distanceMiles: ${loop.distanceMiles}`,
        ).toBe(true);
      }
    }
  });

  it("every file in public/gpx belongs to a registered route", () => {
    const routeIds = new Set<string>();
    for (const area of AREAS) {
      for (const route of area.routes) {
        routeIds.add(route.id);
      }
    }
    const gpxDir = path.join(PUBLIC_DIR, "gpx");
    const orphans = readdirSync(gpxDir)
      .filter((f) => f.endsWith(".gpx"))
      .filter((f) => !routeIds.has(f.replace(/\.gpx$/, "")));
    expect(
      orphans,
      `orphaned GPX file(s) with no matching route: ${orphans.join(", ")}`,
    ).toEqual([]);
  });

  it("every file in public/data is referenced by an area", () => {
    const referenced = new Set(
      AREAS.map((a) => path.basename(a.mvumGeojson)),
    );
    const dataDir = path.join(PUBLIC_DIR, "data");
    const onDisk = new Set(
      readdirSync(dataDir).filter((f) => f.endsWith(".geojson")),
    );

    const orphanFiles = [...onDisk].filter((f) => !referenced.has(f));
    const missingFiles = [...referenced].filter((f) => !onDisk.has(f));

    expect(
      orphanFiles,
      `public/data has file(s) not referenced by any area: ${orphanFiles.join(", ")}`,
    ).toEqual([]);
    expect(
      missingFiles,
      `area(s) reference geojson file(s) missing from public/data: ${missingFiles.join(", ")}`,
    ).toEqual([]);
  });

  for (const { fetch, build, min } of BBOX_PAIRS) {
    it(`bbox tables in ${fetch} and ${build} agree on shared areas`, () => {
      const scriptsDir = path.join(process.cwd(), "scripts");
      const fetchSrc = readFileSync(path.join(scriptsDir, fetch), "utf8");
      const buildSrc = readFileSync(path.join(scriptsDir, build), "utf8");

      const fetchMap = extractMap(fetchSrc, "const AREAS");
      const buildMap = extractMap(buildSrc, "const BBOX");

      expect(
        fetchMap.size,
        `expected at least ${min} entries in ${fetch} AREAS`,
      ).toBeGreaterThanOrEqual(min);
      expect(
        buildMap.size,
        `expected at least ${min} entries in ${build} BBOX`,
      ).toBeGreaterThanOrEqual(min);

      const sharedKeys = [...fetchMap.keys()].filter((k) => buildMap.has(k));
      expect(
        sharedKeys.length,
        `expected the two bbox tables to share at least ${min} area keys`,
      ).toBeGreaterThanOrEqual(min);

      const mismatches: string[] = [];
      for (const key of sharedKeys) {
        if (fetchMap.get(key) !== buildMap.get(key)) {
          mismatches.push(
            `"${key}": ${fetch}="${fetchMap.get(key)}" vs ${build}="${buildMap.get(key)}"`,
          );
        }
      }
      expect(mismatches, mismatches.join("; ")).toEqual([]);
    });
  }

  it("every registry area is claimed by exactly one fetch pipeline", () => {
    const scriptsDir = path.join(process.cwd(), "scripts");
    const fetchScripts = [
      "fetch-mvum-area.mjs",
      "fetch-blm-area.mjs",
      "fetch-angeles-area.mjs",
    ];
    const keySets = fetchScripts.map((f) =>
      extractMap(readFileSync(path.join(scriptsDir, f), "utf8"), "const AREAS"),
    );

    const overlaps: string[] = [];
    for (let i = 0; i < keySets.length; i++) {
      for (let j = i + 1; j < keySets.length; j++) {
        for (const key of keySets[i].keys()) {
          if (keySets[j].has(key)) {
            overlaps.push(
              `"${key}" appears in both ${fetchScripts[i]} and ${fetchScripts[j]}`,
            );
          }
        }
      }
    }
    expect(overlaps, overlaps.join("; ")).toEqual([]);

    const union = new Set<string>();
    for (const map of keySets) {
      for (const key of map.keys()) union.add(key);
    }
    const registryIds = new Set<string>(AREAS.map((a) => a.id));

    const missingFromPipelines = [...registryIds].filter(
      (id) => !union.has(id),
    );
    const extraInPipelines = [...union].filter((id) => !registryIds.has(id));

    expect(
      missingFromPipelines,
      `registry area(s) not claimed by any fetch pipeline: ${missingFromPipelines.join(", ")}`,
    ).toEqual([]);
    expect(
      extraInPipelines,
      `fetch pipeline area(s) not present in the registry: ${extraInPipelines.join(", ")}`,
    ).toEqual([]);
  });
});
