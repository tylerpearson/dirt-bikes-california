/**
 * Build static map renders by composing standard OpenStreetMap raster tiles.
 * No third-party static-map service and no API key: the browser loads a handful
 * of 256px tiles directly, positioned in a fixed 600×320 coordinate space that
 * the <StaticMap> component renders as a responsive SVG (so nothing is clipped).
 *
 * Two kinds of render:
 *  - centeredMap(): a pin centered on a single trailhead.
 *  - trackMap():    a GPX track auto-fit to the frame with a drawn polyline.
 *
 * Tiles come from the public OSM tile server, fine for a small, low-traffic
 * site. For higher volume, point TILE_URL at your own cache or a tile provider.
 */

const TILE_SIZE = 256;
const TILE_URL = (z: number, x: number, y: number) =>
  `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;

export type LatLng = { lat: number; lng: number };
export type Point = { left: number; top: number };

export type MapTile = {
  src: string;
  left: number;
  top: number;
};

export type MapRender = {
  width: number;
  height: number;
  tiles: MapTile[];
  /** centered single-point marker (centeredMap) */
  pin?: Point;
  /** drawn GPX polyline in viewport coordinates (trackMap) */
  path?: Point[];
  start?: Point;
  end?: Point;
  /**
   * Road/trail segments drawn as separate polylines. "green"/"plate" color by
   * MVUM access; "track" is a neutral run used to draw a multi-part route (e.g.
   * BLM routes made of disjoint GTLF segments) without connecting the gaps.
   */
  segments?: { access: "green" | "plate" | "track"; points: Point[] }[];
};

/** A run of geometry sharing one access status, in lat/lng. */
export type AccessSegment = { access: "green" | "plate" | "track"; coords: LatLng[] };

type Frame = { width: number; height: number };

/** Global pixel coordinate of a lat/lng at a given zoom (256px tiles). */
function project(lat: number, lng: number, z: number): { x: number; y: number } {
  const n = 2 ** z;
  const x = ((lng + 180) / 360) * n * TILE_SIZE;
  const latRad = (lat * Math.PI) / 180;
  const y =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
    n *
    TILE_SIZE;
  return { x, y };
}

/** Compose the tiles covering a viewport centered on a global pixel point. */
function composeTiles(
  centerX: number,
  centerY: number,
  zoom: number,
  width: number,
  height: number,
): { tiles: MapTile[]; originX: number; originY: number } {
  const n = 2 ** zoom;
  const originX = centerX - width / 2;
  const originY = centerY - height / 2;

  const minTileX = Math.floor(originX / TILE_SIZE);
  const maxTileX = Math.floor((originX + width) / TILE_SIZE);
  const minTileY = Math.floor(originY / TILE_SIZE);
  const maxTileY = Math.floor((originY + height) / TILE_SIZE);

  const tiles: MapTile[] = [];
  for (let tx = minTileX; tx <= maxTileX; tx++) {
    for (let ty = minTileY; ty <= maxTileY; ty++) {
      if (ty < 0 || ty >= n) continue;
      const wrappedX = ((tx % n) + n) % n;
      tiles.push({
        src: TILE_URL(zoom, wrappedX, ty),
        left: tx * TILE_SIZE - originX,
        top: ty * TILE_SIZE - originY,
      });
    }
  }
  return { tiles, originX, originY };
}

export function centeredMap(
  lat: number,
  lng: number,
  { zoom = 12, width = 600, height = 400 } = {},
): MapRender {
  const center = project(lat, lng, zoom);
  const { tiles } = composeTiles(center.x, center.y, zoom, width, height);
  return {
    width,
    height,
    tiles,
    pin: { left: width / 2, top: height / 2 },
  };
}

/**
 * Fit a GPX track to the frame: choose the highest zoom at which the track's
 * bounding box fits inside the padded viewport, then project every point.
 */
export function trackMap(
  points: LatLng[],
  {
    width = 600,
    height = 400,
    padding = 64,
    minZoom = 9,
    maxZoom = 15,
    segments = [],
  }: Partial<Frame> & {
    padding?: number;
    minZoom?: number;
    maxZoom?: number;
    /** MVUM segments to color by access; projected into the same frame. */
    segments?: AccessSegment[];
  } = {},
): MapRender {
  // Fit to the track AND any colored segments so neither gets clipped.
  const fit = [...points, ...segments.flatMap((s) => s.coords)];
  const lats = fit.map((p) => p.lat);
  const lngs = fit.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;

  const availW = width - padding * 2;
  const availH = height - padding * 2;

  let zoom = minZoom;
  for (let z = maxZoom; z >= minZoom; z--) {
    const tl = project(maxLat, minLng, z); // top-left (north-west)
    const br = project(minLat, maxLng, z); // bottom-right (south-east)
    if (br.x - tl.x <= availW && br.y - tl.y <= availH) {
      zoom = z;
      break;
    }
  }

  const center = project(centerLat, centerLng, zoom);
  const { tiles, originX, originY } = composeTiles(
    center.x,
    center.y,
    zoom,
    width,
    height,
  );

  const toPoint = (p: LatLng): Point => {
    const px = project(p.lat, p.lng, zoom);
    return { left: px.x - originX, top: px.y - originY };
  };

  const path: Point[] = points.map(toPoint);
  const projected = segments.map((s) => ({
    access: s.access,
    points: s.coords.map(toPoint),
  }));

  return {
    width,
    height,
    tiles,
    path,
    start: path[0],
    end: path[path.length - 1],
    segments: projected.length ? projected : undefined,
  };
}
