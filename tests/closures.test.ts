import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { AREAS } from "@/lib/areas";
import {
  CLOSURES,
  isActive,
  activeClosures,
  closedThroughLabel,
  type Closure,
} from "@/lib/closures";

const PUBLIC_DIR = path.join(process.cwd(), "public");

const areaById = new Map<string, (typeof AREAS)[number]>(
  AREAS.map((a) => [a.id, a]),
);

/** The set of `properties.id` values present in an area's overview GeoJSON. */
function roadIdsForArea(areaId: string): Set<string> {
  const area = areaById.get(areaId);
  if (!area) return new Set();
  const geojsonPath = path.join(PUBLIC_DIR, area.mvumGeojson.replace(/^\//, ""));
  const parsed = JSON.parse(readFileSync(geojsonPath, "utf8"));
  const ids = new Set<string>();
  for (const f of parsed.features ?? []) {
    const id = f?.properties?.id;
    if (typeof id === "string") ids.add(id);
  }
  return ids;
}

describe("closures registry integrity", () => {
  it("every closure targets a registered area", () => {
    for (const c of CLOSURES) {
      expect(
        areaById.has(c.areaId),
        `closure "${c.title}" references unknown area "${c.areaId}"`,
      ).toBe(true);
    }
  });

  it("every routeId resolves to a route in the same area", () => {
    for (const c of CLOSURES) {
      const area = areaById.get(c.areaId);
      if (!area) continue;
      const routeIds = new Set(area.routes.map((r) => r.id));
      for (const id of c.routeIds) {
        expect(
          routeIds.has(id),
          `closure "${c.title}" (area "${c.areaId}") references missing route id "${id}"`,
        ).toBe(true);
      }
    }
  });

  it("every roadId is an exact properties.id in that area's GeoJSON", () => {
    for (const c of CLOSURES) {
      if (!c.roadIds?.length) continue;
      const present = roadIdsForArea(c.areaId);
      for (const roadId of c.roadIds) {
        expect(
          present.has(roadId),
          `closure "${c.title}" (area "${c.areaId}") road id "${roadId}" is not a properties.id in the area GeoJSON`,
        ).toBe(true);
      }
    }
  });

  it("dated closures use ISO YYYY-MM-DD; urls are https; title/summary non-empty", () => {
    const iso = /^\d{4}-\d{2}-\d{2}$/;
    for (const c of CLOSURES) {
      if (c.effectiveThrough !== undefined) {
        expect(
          iso.test(c.effectiveThrough),
          `closure "${c.title}" has a non-ISO effectiveThrough "${c.effectiveThrough}"`,
        ).toBe(true);
      }
      expect(
        c.url.startsWith("https://"),
        `closure "${c.title}" url must be https: "${c.url}"`,
      ).toBe(true);
      expect(c.title.trim().length, `closure has empty title`).toBeGreaterThan(0);
      expect(
        c.summary.trim().length,
        `closure "${c.title}" has empty summary`,
      ).toBeGreaterThan(0);
    }
  });

  it("advisories carry no closure date", () => {
    for (const c of CLOSURES) {
      if (c.kind === "advisory") {
        expect(
          c.effectiveThrough,
          `advisory "${c.title}" should not carry an effectiveThrough date`,
        ).toBeUndefined();
      }
    }
  });

  // Rot guard: freshly-expired entries only warn at build (see lib/closures.ts),
  // so a deploy isn't blocked the week an order lapses; but a long-stale entry
  // fails the suite so it gets cleaned up.
  it("no dated closure is expired by more than 60 days", () => {
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Los_Angeles",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    const cutoff = new Date(`${today}T00:00:00Z`).getTime() - 60 * 864e5;
    for (const c of CLOSURES) {
      if (!c.effectiveThrough) continue;
      const ended = new Date(`${c.effectiveThrough}T00:00:00Z`).getTime();
      expect(
        ended >= cutoff,
        `closure "${c.title}" (area "${c.areaId}") expired ${c.effectiveThrough}, more than 60 days ago — remove or update lib/closures.ts`,
      ).toBe(true);
    }
  });
});

describe("isActive", () => {
  const dated: Closure = {
    areaId: "san-gorgonio",
    routeIds: [],
    title: "t",
    summary: "s",
    kind: "order",
    url: "https://example.com",
    effectiveThrough: "2026-07-21",
  };
  const undated: Closure = { ...dated, effectiveThrough: undefined };

  it("is active before and on the end date", () => {
    expect(isActive(dated, "2026-07-01")).toBe(true);
    expect(isActive(dated, "2026-07-21")).toBe(true);
  });

  it("is inactive the day after the end date", () => {
    expect(isActive(dated, "2026-07-22")).toBe(false);
  });

  it("undated closures are always active", () => {
    expect(isActive(undated, "2030-01-01")).toBe(true);
  });
});

describe("activeClosures", () => {
  it("returns only closures for the given area", () => {
    for (const area of AREAS) {
      for (const c of activeClosures(area.id)) {
        expect(c.areaId).toBe(area.id);
      }
    }
  });
});

describe("closedThroughLabel", () => {
  const base: Closure = {
    areaId: "san-gorgonio",
    routeIds: [],
    title: "t",
    summary: "s",
    kind: "order",
    url: "https://example.com",
  };

  it("formats an ISO end date", () => {
    expect(closedThroughLabel({ ...base, effectiveThrough: "2026-07-21" })).toBe(
      "closed through July 21, 2026",
    );
  });

  it("prefers the display override", () => {
    expect(
      closedThroughLabel({
        ...base,
        effectiveThrough: "2026-09-01",
        effectiveThroughText: "September 2026",
      }),
    ).toBe("closed through September 2026");
  });

  it("reads 'until further notice' for an undated order", () => {
    expect(closedThroughLabel(base)).toBe("closed until further notice");
  });

  it("returns nothing for advisories", () => {
    expect(closedThroughLabel({ ...base, kind: "advisory" })).toBe("");
  });
});
