import { readFileSync } from "node:fs";
import path from "node:path";
import { routeSegmentsFromGeojson, type GeoFeature, type RouteSegment } from "./mvum-parse";

export { routeSegmentsFromGeojson };
export type { Access, GeoFeature, RouteSegment } from "./mvum-parse";

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
