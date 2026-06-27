import type { Route, Trailhead } from "./types";
import { bigBearRoutes } from "./routes/big-bear";
import { sanJacintoRoutes } from "./routes/san-jacinto.generated";
import { santaAnaRoutes } from "./routes/santa-ana.generated";
import { santaBarbaraRoutes } from "./routes/santa-barbara.generated";
import { sanLuisObispoRoutes } from "./routes/san-luis-obispo.generated";

export type AreaId =
  | "big-bear"
  | "san-jacinto"
  | "santa-ana"
  | "santa-barbara"
  | "san-luis-obispo";

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
const CNF = { name: "Cleveland National Forest", url: "https://www.fs.usda.gov/cleveland" };

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
    id: "san-jacinto",
    name: "San Jacinto",
    region: "San Bernardino N.F. · San Jacinto R.D.",
    regionShort: "San Jacinto R.D.",
    state: "California",
    blurb:
      "The San Jacinto Mountains between Palm Springs and Idyllwild — one range, two characters. The Garner Valley and Santa Rosa side has designated green-sticker OHV roads; the forested Idyllwild side is plated dual-sport country up to the Black Mountain lookout and the PCT trailheads. Route maps and elevation from the Forest Service MVUM and SRTM.",
    mvumGeojson: "/data/san-jacinto-mvum.geojson",
    forest: SBNF,
    routes: sanJacintoRoutes,
  },
  {
    id: "santa-ana",
    name: "Santa Ana Mtns",
    region: "Cleveland National Forest",
    regionShort: "Cleveland N.F.",
    state: "California",
    blurb:
      "The Santa Ana Mountains between Orange County and the Inland Empire — the Main Divide country, about an hour from LA. These are mostly plated dual-sport and adventure roads, headlined by the ~35-mile North Main Divide over Saddleback; for green-sticker OHV riding, the Wildomar OHV area sits on the southeast edge of the range. Route maps and elevation from the Forest Service MVUM and SRTM.",
    mvumGeojson: "/data/santa-ana-mvum.geojson",
    forest: CNF,
    routes: santaAnaRoutes,
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
  {
    id: "san-luis-obispo",
    name: "San Luis Obispo",
    region: "Los Padres National Forest",
    regionShort: "Los Padres N.F.",
    state: "California",
    blurb:
      "The Los Padres backcountry east of San Luis Obispo — the Pozo and La Panza OHV area. A real green-sticker network of OHV roads and motorcycle singletrack around Hi Mountain and Pozo, plus the long, remote Sierra Madre Ridge for plated adventure riding. (Oceano Dunes, the coastal riding, is state land and isn't covered here.) Many roads and trails close seasonally when wet. Route maps and elevation from the Forest Service MVUM and SRTM.",
    mvumGeojson: "/data/san-luis-obispo-mvum.geojson",
    forest: LPNF,
    routes: sanLuisObispoRoutes,
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
