export type TrackPoint = { lat: number; lng: number; ele?: number };

export type ProfilePoint = { distMi: number; eleFt: number };

export type TrackStats = {
  distanceMiles: number;
  hasElevation: boolean;
  gainFt: number;
  lossFt: number;
  minFt: number;
  maxFt: number;
  profile: ProfilePoint[];
};

const EARTH_M = 6371000;
const M_PER_MI = 1609.344;
const FT_PER_M = 3.28084;

/** Great-circle distance between two points, in meters. */
function haversine(a: TrackPoint, b: TrackPoint): number {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_M * Math.asin(Math.sqrt(h));
}

/** Derive distance + elevation stats and a profile series from a GPX track. */
export function trackStats(points: TrackPoint[]): TrackStats {
  const hasElevation =
    points.length > 0 && points.every((p) => typeof p.ele === "number");

  let meters = 0;
  let gainFt = 0;
  let lossFt = 0;
  let minFt = Infinity;
  let maxFt = -Infinity;
  const profile: ProfilePoint[] = [];

  for (let i = 0; i < points.length; i++) {
    if (i > 0) meters += haversine(points[i - 1], points[i]);
    const eleFt = hasElevation ? (points[i].ele as number) * FT_PER_M : 0;
    if (hasElevation) {
      minFt = Math.min(minFt, eleFt);
      maxFt = Math.max(maxFt, eleFt);
      if (i > 0) {
        const d = ((points[i].ele as number) - (points[i - 1].ele as number)) *
          FT_PER_M;
        if (d > 0) gainFt += d;
        else lossFt += -d;
      }
    }
    profile.push({ distMi: meters / M_PER_MI, eleFt });
  }

  return {
    distanceMiles: meters / M_PER_MI,
    hasElevation,
    gainFt,
    lossFt,
    minFt: hasElevation ? minFt : 0,
    maxFt: hasElevation ? maxFt : 0,
    profile,
  };
}
