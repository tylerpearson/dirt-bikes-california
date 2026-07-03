import { readFileSync } from "node:fs";
import path from "node:path";
import type { LatLng } from "./tiles";

// "green"/"plate" are MVUM access classes; "track" is a neutral run used to
// draw a multi-part route (e.g. a BLM route of disjoint GTLF pieces) without
// bridging the gaps.
export type Access = "green" | "plate" | "track";
export type RouteSegment = { access: Access; coords: LatLng[] };

/**
 * Load the MVUM segments for a route's forest road(s) from the area's GeoJSON,
 * each tagged with its access (green-sticker vs plate-only). This is what lets a
 * route map color WHERE green-sticker is and isn't allowed — the "partial"
 * specifics a rider can't otherwise locate on the ground.
 *
 * `forestRoad` is the route's road label, which may list several numbers
 * (e.g. "29S02.1, 29S02.2"); every matching GeoJSON feature is returned.
 * Server-only (uses fs). Returns [] if the file or roads aren't found.
 */
export function loadRouteSegments(
  geojsonPublicPath: string,
  forestRoad: string | undefined,
): RouteSegment[] {
  const full = path.join(
    process.cwd(),
    "public",
    geojsonPublicPath.replace(/^\//, ""),
  );
  let json: { features?: GeoFeature[] };
  try {
    json = JSON.parse(readFileSync(full, "utf8"));
  } catch {
    return [];
  }

  return routeSegmentsFromGeojson(json, forestRoad);
}

/**
 * Pure filter/transform: pick the GeoJSON features matching a route's forest
 * road(s) and turn their geometry into access-colored segments. Shared by the
 * server-side `loadRouteSegments` (build time) and the client-side dialog
 * (fetches the same area GeoJSON on demand).
 */
export function routeSegmentsFromGeojson(
  json: { features?: GeoFeature[] },
  forestRoad: string | undefined,
): RouteSegment[] {
  if (!forestRoad) return [];
  const roads = new Set(
    forestRoad
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
  if (roads.size === 0) return [];

  const segs: RouteSegment[] = [];
  for (const f of json.features ?? []) {
    const id = f.properties?.id;
    if (!id || !roads.has(id)) continue;
    const access: Access = f.properties?.access === "green" ? "green" : "plate";
    const g = f.geometry;
    const lines =
      g?.type === "MultiLineString"
        ? (g.coordinates as number[][][])
        : g?.type === "LineString"
          ? [g.coordinates as number[][]]
          : [];
    for (const line of lines) {
      const coords = line.map(([lng, lat]) => ({ lat, lng }));
      if (coords.length > 1) segs.push({ access, coords });
    }
  }
  return segs;
}

export type GeoFeature = {
  properties?: { id?: string; access?: string };
  geometry?: { type?: string; coordinates?: unknown };
};
