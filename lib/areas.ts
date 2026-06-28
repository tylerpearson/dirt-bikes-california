import type { Route, Trailhead } from "./types";
import { bigBearRoutes } from "./routes/big-bear";
import { sanJacintoRoutes } from "./routes/san-jacinto.generated";
import { santaAnaRoutes } from "./routes/santa-ana.generated";
import { lagunaRoutes } from "./routes/laguna.generated";
import { mtPinosRoutes } from "./routes/mt-pinos.generated";
import { santaBarbaraRoutes } from "./routes/santa-barbara.generated";
import { sanLuisObispoRoutes } from "./routes/san-luis-obispo.generated";

export type AreaId =
  | "big-bear"
  | "san-jacinto"
  | "santa-ana"
  | "laguna"
  | "mt-pinos"
  | "santa-barbara"
  | "san-luis-obispo";

/**
 * A suggested all-day loop stringing several routes together — editorial, for
 * riders who want a day plan rather than a single road. Distance is a rough
 * composite (segments overlap and connect), so treat it as approximate.
 */
export type AreaLoop = {
  name: string;
  /** Rough composite distance in miles — approximate. */
  distanceMiles: number;
  /** One-line framing of the day. */
  summary: string;
  /** The ride, in order, in prose. */
  description: string;
  /** Route ids strung together, in riding order. */
  routeIds: string[];
};

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
  /** One-line hook for the home-page card. Short and scannable; no em-dash chains. */
  tagline: string;
  /** Pre-baked MVUM overview GeoJSON served from /public. */
  mvumGeojson: string;
  /** Managing forest, for the footer's "verify before you go" link. */
  forest: { name: string; url: string };
  /** Suggested all-day loops stringing routes together (optional, editorial). */
  loops?: AreaLoop[];
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
      "A field guide to the best OHV rides around Big Bear, with real route maps and elevation pulled from the Forest Service MVUM and OpenStreetMap, the details that matter, and exactly where you need a street-legal plate versus where green-sticker bikes are allowed.",
    tagline:
      "Forest roads and OHV trails ringing Big Bear Lake at 7,000 feet.",
    mvumGeojson: "/data/big-bear-mvum.geojson",
    forest: SBNF,
    loops: [
      {
        name: "Holcomb Valley Big Day",
        distanceMiles: 38,
        summary:
          "The classic plated-bike day: climb out of town, loop the gold-rush basin, drop out the back.",
        description:
          "Climb the old stage route up Van Dusen Canyon (3N09) out of Big Bear City, loop the historic Holcomb Valley basin (3N16) with stops at Belleville and the Hangman's Tree, then run Coxey Road (3N14) north toward the forest boundary to close it out. Mostly smooth graded dirt with long sight lines — a relaxed full day, not a technical one. Plan around five to six hours with stops; most of it is plate-legal, with only short green-sticker-open segments.",
        routeIds: ["van-dusen-canyon", "holcomb-valley", "coxey-road"],
      },
      {
        name: "East-Side OHV Sampler",
        distanceMiles: 10,
        summary:
          "A shorter green-sticker-friendly half-day from the Cactus Flat side.",
        description:
          "Start from Cactus Flat off Highway 18, warm up on Smarts Ranch Rd (3N03), then session the Pinyon/Vista OHV trails (2E20) — the closest thing to real singletrack in the area and fully green-sticker. A good half-day for green-sticker bikes or anyone wanting trail tread over fire road; pair it with Gold Mountain or John Bull nearby if you want to add teeth.",
        routeIds: ["cactus-flats", "pinyon-vista"],
      },
    ],
    routes: bigBearRoutes,
  },
  {
    id: "san-jacinto",
    name: "San Jacinto",
    region: "San Bernardino N.F. · San Jacinto R.D.",
    regionShort: "San Jacinto R.D.",
    state: "California",
    blurb:
      "The San Jacinto Mountains between Palm Springs and Idyllwild are one range with two very different sides. The Garner Valley and Santa Rosa side has designated green-sticker OHV roads; the forested Idyllwild side is plated dual-sport country up to the Black Mountain lookout and the PCT trailheads. Route geometry and elevation come from the Forest Service MVUM and SRTM.",
    tagline:
      "One range, two sides: green-sticker OHV roads above Palm Springs, plated dual-sport up at Idyllwild.",
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
      "The Santa Ana Mountains sit between Orange County and the Inland Empire, the Main Divide country about an hour from LA. These are mostly plated dual-sport and adventure roads, headlined by the ~35-mile North Main Divide over Saddleback; for green-sticker OHV riding, the Wildomar OHV area sits on the southeast edge of the range. Route geometry and elevation are pulled from the Forest Service MVUM and SRTM.",
    tagline:
      "Mostly plated Main Divide country, headlined by the 35-mile run over Saddleback.",
    mvumGeojson: "/data/santa-ana-mvum.geojson",
    forest: CNF,
    routes: santaAnaRoutes,
  },
  {
    id: "laguna",
    name: "Laguna Mtns",
    region: "Cleveland National Forest",
    regionShort: "Cleveland N.F.",
    state: "California",
    blurb:
      "The Laguna Mountains in San Diego County hold the Corral Canyon OHV Area near Pine Valley, the guide's one real green-sticker network this far south, plus the plated forest roads of the Mount Laguna and Sunrise Highway country. Green-sticker access on the OHV roads is mostly segment-by-segment, with plated dual-sport riding everywhere else. Route geometry and elevation come from the Forest Service MVUM and SRTM.",
    tagline:
      "Corral Canyon's green-sticker network plus the Mount Laguna forest roads, the guide's southernmost riding.",
    mvumGeojson: "/data/laguna-mvum.geojson",
    forest: CNF,
    routes: lagunaRoutes,
  },
  {
    id: "mt-pinos",
    name: "Mt Pinos",
    region: "Los Padres National Forest",
    regionShort: "Mt Pinos R.D.",
    state: "California",
    blurb:
      "The Mt Pinos / Frazier Park country in northern Los Padres, near Gorman and I-5 about an hour from LA, is the strongest green-sticker OHV complex in this guide. You get high pine roads around Alamo and Frazier Mountains, the colorful Cuyama sandstone badlands of Apache and Quatal Canyons, and the Ballinger Canyon OHV area, plus scenic plated ridge roads. (The adjacent Hungry Valley SVRA is California State land and isn't covered here.) Much of the high country is typically snowbound and closed from roughly December into April, though the timing swings year to year with the snowpack. Route geometry and elevation come from the Forest Service MVUM and SRTM.",
    tagline:
      "The guide's strongest green-sticker complex: pine roads, Cuyama badlands, and Ballinger Canyon OHV.",
    mvumGeojson: "/data/mt-pinos-mvum.geojson",
    forest: LPNF,
    routes: mtPinosRoutes,
  },
  {
    id: "santa-barbara",
    name: "Santa Barbara",
    region: "Los Padres National Forest",
    regionShort: "Los Padres N.F.",
    state: "California",
    blurb:
      "The Santa Ynez and San Rafael backcountry behind Santa Barbara takes in the Camuesa OHV area, the East Camino Cielo crest, and remote green-sticker roads, plus quieter plated routes. Route geometry and elevation come from the Forest Service MVUM and SRTM. Many roads here close in wet weather — storm-driven rather than calendar-based, so expect closures during and after winter and spring rains (roughly November–April) until the tread dries out.",
    tagline:
      "Camuesa OHV roads and the East Camino Cielo crest in the backcountry above the city.",
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
      "The Los Padres backcountry east of San Luis Obispo is home to the Pozo and La Panza OHV area: a real green-sticker network of OHV roads and motorcycle singletrack around Hi Mountain and Pozo, plus the long, remote Sierra Madre Ridge for plated adventure riding. (Oceano Dunes, the coastal riding, is state land and isn't covered here.) Many roads and trails close when wet — storm-driven rather than calendar-based, so expect closures during and after winter and spring rains (roughly November–April) until things dry out. Route geometry and elevation come from the Forest Service MVUM and SRTM.",
    tagline:
      "The Pozo and La Panza OHV area: green-sticker roads, singletrack, and the long Sierra Madre Ridge.",
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
