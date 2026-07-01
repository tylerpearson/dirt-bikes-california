import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { AREAS } from "@/lib/areas";

const PUBLIC_DIR = path.join(process.cwd(), "public");

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

  it("bbox tables in fetch-mvum-area.mjs and build-area-routes.mjs agree on shared areas", () => {
    const scriptsDir = path.join(process.cwd(), "scripts");
    const fetchSrc = readFileSync(
      path.join(scriptsDir, "fetch-mvum-area.mjs"),
      "utf8",
    );
    const buildSrc = readFileSync(
      path.join(scriptsDir, "build-area-routes.mjs"),
      "utf8",
    );

    const extractMap = (src: string, marker: string): Map<string, string> => {
      const start = src.indexOf(marker);
      expect(start, `could not find "${marker}" in source`).toBeGreaterThanOrEqual(0);
      const end = src.indexOf("};", start);
      expect(end, `could not find closing "};" after "${marker}"`).toBeGreaterThan(
        start,
      );
      const block = src.slice(start, end);
      const re = /"([a-z-]+)": "(-?[\d.]+,-?[\d.]+,-?[\d.]+,-?[\d.]+)"/g;
      const map = new Map<string, string>();
      let m: RegExpExecArray | null;
      while ((m = re.exec(block)) !== null) {
        map.set(m[1], m[2]);
      }
      return map;
    };

    const fetchMap = extractMap(fetchSrc, "const AREAS");
    const buildMap = extractMap(buildSrc, "const BBOX");

    expect(
      fetchMap.size,
      "expected at least 8 entries in fetch-mvum-area.mjs AREAS",
    ).toBeGreaterThanOrEqual(8);
    expect(
      buildMap.size,
      "expected at least 8 entries in build-area-routes.mjs BBOX",
    ).toBeGreaterThanOrEqual(8);

    const sharedKeys = [...fetchMap.keys()].filter((k) => buildMap.has(k));
    expect(
      sharedKeys.length,
      "expected the two bbox tables to share at least 8 area keys",
    ).toBeGreaterThanOrEqual(8);

    const mismatches: string[] = [];
    for (const key of sharedKeys) {
      if (fetchMap.get(key) !== buildMap.get(key)) {
        mismatches.push(
          `"${key}": fetch-mvum-area="${fetchMap.get(key)}" vs build-area-routes="${buildMap.get(key)}"`,
        );
      }
    }
    expect(mismatches, mismatches.join("; ")).toEqual([]);
  });
});
