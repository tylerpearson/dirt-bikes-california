import type { Route, Trailhead } from "./types";
import { bigBearRoutes } from "./routes/big-bear";
import { palmSpringsRoutes } from "./routes/palm-springs.generated";
import { idyllwildRoutes } from "./routes/idyllwild.generated";
import { santaBarbaraRoutes } from "./routes/santa-barbara.generated";

export type AreaId =
  | "big-bear"
  | "palm-springs"
  | "idyllwild"
  | "santa-barbara";

export type Area = {
  id: AreaId;
  /** Short display name, e.g. "Big Bear". */
  name: string;
  /** Full forest / district line. */
  region: string;
  /** Compact region label for the map-sheet collar. */
  regionShort: string;
  state: string;
  /** Hero lead paragraph — area-specific character. */
  blurb: string;
  /** Pre-baked MVUM overview GeoJSON served from /public. */
  mvumGeojson: string;
  /** Managing forest, for the footer's "verify before you go" link. */
  forest: { name: string; url: string };
  routes: Route[];
};

const SBNF = { name: "San Bernardino National Forest", url: "https://www.fs.usda.gov/sbnf" };
const LPNF = { name: "Los Padres National Forest", url: "https://www.fs.usda.gov/lpnf" };

export const AREAS: Area[] = [
  {
    id: "big-bear",
    name: "Big Bear",
    region: "San Bernardino National Forest",
    regionShort: "San Bernardino N.F.",
    state: "California",
    blurb:
      "A field guide to the best OHV rides around Big Bear — real route maps and elevation pulled from the Forest Service MVUM and OpenStreetMap, the details that matter, and exactly where you need a street-legal plate versus where green-sticker bikes are allowed.",
    mvumGeojson: "/data/big-bear-mvum.geojson",
    forest: SBNF,
    routes: bigBearRoutes,
  },
  {
    id: "palm-springs",
    name: "Palm Springs",
    region: "San Bernardino N.F. · San Jacinto R.D.",
    regionShort: "San Jacinto R.D.",
    state: "California",
    blurb:
      "The backcountry above Palm Springs — Garner Valley, the San Jacinto ridges, and the high Santa Rosa Mountains. A mix of designated green-sticker OHV roads and long, scenic plated dual-sport climbs, with route maps and elevation from the Forest Service MVUM and SRTM.",
    mvumGeojson: "/data/palm-springs-mvum.geojson",
    forest: SBNF,
    routes: palmSpringsRoutes,
  },
  {
    id: "idyllwild",
    name: "Idyllwild",
    region: "San Bernardino N.F. · San Jacinto R.D.",
    regionShort: "San Jacinto R.D.",
    state: "California",
    blurb:
      "The forested west side of the San Jacintos around Idyllwild — pine-and-cedar dirt roads to the Black Mountain lookout, Dark Canyon, and the PCT trailheads. These are almost all plated dual-sport roads; for green-sticker OHV riding in the same range, see the Palm Springs (Garner Valley) guide. Maps and elevation from the Forest Service MVUM and SRTM.",
    mvumGeojson: "/data/idyllwild-mvum.geojson",
    forest: SBNF,
    routes: idyllwildRoutes,
  },
  {
    id: "santa-barbara",
    name: "Santa Barbara",
    region: "Los Padres National Forest",
    regionShort: "Los Padres N.F.",
    state: "California",
    blurb:
      "The Santa Ynez and San Rafael backcountry behind Santa Barbara — the Camuesa OHV area, the East Camino Cielo crest, and remote green-sticker roads, plus quieter plated routes. Maps and elevation from the Forest Service MVUM and SRTM; many roads have seasonal wet-weather closures.",
    mvumGeojson: "/data/santa-barbara-mvum.geojson",
    forest: LPNF,
    routes: santaBarbaraRoutes,
  },
];

export function getArea(id: AreaId): Area {
  const area = AREAS.find((a) => a.id === id);
  if (!area) throw new Error(`Unknown area: ${id}`);
  return area;
}

/** Link to the full interactive Google Map centered on the trailhead. */
export function fullMapUrl(trailhead: Trailhead): string {
  const { lat, lng } = trailhead;
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}
