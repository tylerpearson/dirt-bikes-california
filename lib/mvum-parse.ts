import type { LatLng } from "./tiles";

// "green"/"plate" are MVUM access classes; "track" is a neutral run used to
// draw a multi-part route (e.g. a BLM route of disjoint GTLF pieces) without
// bridging the gaps.
export type Access = "green" | "plate" | "track";
export type RouteSegment = { access: Access; coords: LatLng[] };

export type GeoFeature = {
  properties?: { id?: string; access?: string };
  geometry?: { type?: string; coordinates?: unknown };
};

/**
 * Pure filter/transform: pick the GeoJSON features matching a route's forest
 * road(s) and turn their geometry into access-colored segments. Shared by the
 * server-side `loadRouteSegments` (build time) and the client-side dialog
 * (fetches the same area GeoJSON on demand). No `node:fs` import here — this
 * module must be safe to bundle into a client component.
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
