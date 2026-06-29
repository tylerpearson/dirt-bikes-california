import type { Route, Trailhead } from "./types";
import { bigBearRoutes } from "./routes/big-bear.generated";
import { sanJacintoRoutes } from "./routes/san-jacinto.generated";
import { santaAnaRoutes } from "./routes/santa-ana.generated";
import { lagunaRoutes } from "./routes/laguna.generated";
import { mtPinosRoutes } from "./routes/mt-pinos.generated";
import { santaBarbaraRoutes } from "./routes/santa-barbara.generated";
import { sanLuisObispoRoutes } from "./routes/san-luis-obispo.generated";
import { lakeArrowheadRoutes } from "./routes/lake-arrowhead.generated";
import { sanGorgonioRoutes } from "./routes/san-gorgonio.generated";
import { palomarRoutes } from "./routes/palomar.generated";
import { jawboneRoutes } from "./routes/jawbone.generated";
import { elPasoRoutes } from "./routes/el-paso.generated";

export type AreaId =
  | "big-bear"
  | "san-jacinto"
  | "santa-ana"
  | "laguna"
  | "mt-pinos"
  | "santa-barbara"
  | "san-luis-obispo"
  | "lake-arrowhead"
  | "san-gorgonio"
  | "palomar"
  | "jawbone"
  | "el-paso";

/**
 * A suggested all-day loop stringing several routes together; editorial, for
 * riders who want a day plan rather than a single road. Distance is a rough
 * composite (segments overlap and connect), so treat it as approximate.
 */
export type AreaLoop = {
  name: string;
  /** Rough composite distance in miles (approximate). */
  distanceMiles: number;
  /** One-line framing of the day. */
  summary: string;
  /** The ride, in order, in prose. */
  description: string;
  /** Route ids strung together, in riding order. */
  routeIds: string[];
};

/**
 * Per-area data-source descriptor. Defaults (in AreaGuide) describe the USFS
 * MVUM; a non-USFS area (e.g. BLM) overrides these so the overview map, intro
 * copy, and footer attribution read correctly. The BLM classifier sorts routes
 * into the same green (green-sticker) / plate (street-legal only) classes the
 * MVUM uses, so the standard legend labels apply unless an area overrides them.
 */
export type AreaSource = {
  /** Collar label by the "Where can I ride?" heading, e.g. "BLM Ridgecrest FO". */
  overviewLabel: string;
  /** Plain-text intro paragraph under that heading (agency-specific). */
  overviewIntro: string;
  /** Legend + tooltip label overrides for the two access colors (optional). */
  legend?: { green: string; plate: string };
  /** Tile attribution suffix naming the data source. */
  attribution: string;
  /** Footer "verify before you go" body paragraph (agency-specific). */
  verifyNote: string;
  /** Footer credit line. */
  credit: string;
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
  /** Hero lead paragraph; area-specific character. */
  blurb: string;
  /** One-line hook for the home-page card. Short and scannable; no em-dash chains. */
  tagline: string;
  /** Pre-baked overview GeoJSON served from /public. */
  mvumGeojson: string;
  /** Managing agency (forest or BLM office), for the footer's "verify" link. */
  forest: { name: string; url: string };
  /** Non-USFS data-source overrides (defaults to USFS MVUM when omitted). */
  source?: AreaSource;
  /** Suggested all-day loops stringing routes together (optional, editorial). */
  loops?: AreaLoop[];
  routes: Route[];
};

const SBNF = { name: "San Bernardino National Forest", url: "https://www.fs.usda.gov/sbnf" };
const LPNF = { name: "Los Padres National Forest", url: "https://www.fs.usda.gov/lpnf" };
const CNF = { name: "Cleveland National Forest", url: "https://www.fs.usda.gov/cleveland" };
const BLM_RIDGECREST = {
  name: "BLM Ridgecrest Field Office",
  url: "https://www.blm.gov/office/ridgecrest-field-office",
};

export const AREAS: Area[] = [
  {
    id: "big-bear",
    name: "Big Bear",
    region: "San Bernardino National Forest",
    regionShort: "San Bernardino N.F.",
    state: "California",
    blurb:
      "A field guide to the best OHV rides around Big Bear, with real route maps and elevation pulled from the Forest Service MVUM and SRTM, the details that matter, and exactly where you need a street-legal plate versus where green-sticker bikes are allowed.",
    tagline:
      "Forest roads and OHV trails ringing Big Bear Lake at 7,000 feet.",
    mvumGeojson: "/data/big-bear-mvum.geojson",
    forest: SBNF,
    loops: [
      {
        name: "Holcomb Valley Big Day",
        distanceMiles: 36,
        summary:
          "The classic plated-bike day: climb out of town, loop the gold-rush basin, drop out the back.",
        description:
          "Climb the old stage route up Van Dusen Canyon (3N09) out of Big Bear City, loop the historic Holcomb Valley basin (3N16) with stops at Belleville and the Hangman's Tree, then run Coxey Road (3N14) north toward the forest boundary to close it out. Mostly smooth graded dirt with long sight lines. A relaxed full day, not a technical one. Plan around five to six hours with stops; most of it is plate-legal, with only short stretches open to green-sticker bikes.",
        routeIds: ["van-dusen-canyon", "holcomb-valley", "coxey-road"],
      },
      {
        name: "East-Side OHV Sampler",
        distanceMiles: 14,
        summary:
          "A shorter green-sticker half-day from the Cactus Flat side.",
        description:
          "Start from Cactus Flat off Highway 18, warm up on Smarts Ranch Rd (3N03), then session the Cactus Flat OHV singletrack (the 2E20 trails off its upper end), the closest thing to real trail tread in the area and fully green-sticker. A good half-day for green-sticker bikes or anyone wanting trail over fire road. Gold Mountain and John Bull are right next door if you want to add teeth, but both are open to street-legal vehicles only, so they're a plated-bike detour, not part of the green-sticker day.",
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
      "The San Jacinto Mountains between Palm Springs and Idyllwild are one range with two very different sides. The Garner Valley and Santa Rosa side has designated green-sticker OHV roads; the forested Idyllwild side is plated dual-sport country up to the Black Mountain lookout and the PCT trailheads. The Pacific Crest Trail itself is closed to every motor vehicle. Those are places to park, not singletrack to ride. Route geometry and elevation come from the Forest Service MVUM and SRTM.",
    tagline:
      "One range, two sides: green-sticker OHV roads above Palm Springs, plated dual-sport up at Idyllwild.",
    mvumGeojson: "/data/san-jacinto-mvum.geojson",
    forest: SBNF,
    loops: [
      {
        name: "Garner Valley OHV Day",
        distanceMiles: 24,
        summary:
          "The range's green-sticker corner, strung into one rocky high-country day.",
        description:
          "The designated OHV roads above Garner Valley are the one place in the San Jacintos a non-street-legal bike is legal: the Indian Mountain spur (4S21), Bee Canyon (5S07), and the marquee San Jacinto Ridge (5S09), a long, rough ridge run with sweeping desert and Garner Valley views. One honest catch: these are green-sticker OHV roads, not singletrack, and the roads linking them are plate-only, so on a non-plated bike they're isolated stretches you trailer or shuttle between, not one continuous loop. The Ridge alone is slow, rocky, high-clearance going, so budget by hours, not the ~24-mile number. Either way it's the green-sticker riding to prioritize here.",
        routeIds: ["indian-mountain", "bee-canyon", "san-jacinto-ridge"],
      },
      {
        name: "Idyllwild & Black Mountain",
        distanceMiles: 26,
        summary: "Forested plated dual-sport up toward the Black Mountain lookout.",
        description:
          "The Idyllwild side is plated country and makes a relaxed, view-packed day: climb Dark Canyon (4S02), link onto Black Mountain Road (4S01) toward the lookout and the PCT trailheads, then add the Idyllwild Control Road (5S06) to round it out. Graded dirt through pine and cedar with big drop-offs toward the desert. A dual-sport day, not a technical one. Plate-legal throughout; the PCT itself is closed to motors, so those are places to park, not ride.",
        routeIds: ["dark-canyon-road", "el-paso-black-mountain", "idyllwild-control-road"],
      },
    ],
    routes: sanJacintoRoutes,
  },
  {
    id: "santa-ana",
    name: "Santa Ana Mtns",
    region: "Cleveland National Forest",
    regionShort: "Cleveland N.F.",
    state: "California",
    blurb:
      "The Santa Ana Mountains sit between Orange County and the Inland Empire, the Main Divide country about an hour from LA. These are mostly plated dual-sport and adventure roads, headlined by the ~35-mile North Main Divide over Saddleback. (For green-sticker OHV riding, the Cleveland's Wildomar OHV area sits on the southeast edge of the range, a separate staging-based trail system not detailed here.) Route geometry and elevation are pulled from the Forest Service MVUM and SRTM.",
    tagline:
      "Mostly plated Main Divide country, headlined by the 35-mile run over Saddleback.",
    mvumGeojson: "/data/santa-ana-mvum.geojson",
    forest: CNF,
    loops: [
      {
        name: "The Main Divide Traverse",
        distanceMiles: 50,
        summary:
          "The signature Santa Ana day: climb to the crest and ride the spine the length of the range.",
        description:
          "Climb Indian Truck Trail (5S01) from the Corona side up to the crest, then run the full North Main Divide (3S04) over the shoulder of Saddleback and continue onto the South Main Divide (6S07) toward the Ortega Highway. A big, exposed, all-day plated ride along the top of the range, high-clearance dual-sport and adventure terrain, no green-sticker bikes. Carry water and watch the sky: the Divide bakes in the heat and the clay turns greasy after rain, when the gates often close.",
        routeIds: ["indian-truck-trail", "north-main-divide", "south-main-divide"],
      },
    ],
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
    loops: [
      {
        name: "Corral Canyon OHV Day",
        distanceMiles: 22,
        summary:
          "The far south's one real green-sticker network, strung into a full day.",
        description:
          "Work the Corral Canyon OHV area near Pine Valley: link the Corral Canyon (17S04), Bear Valley (16S12), and Los Pinos (16S17) roads with the green-sticker singletrack on Kernan (802) and Wrangler (901). A genuine OHV-area day for green-sticker bikes, though several of the roads are green-sticker on some segments only, so read each note. Best fall through spring; it bakes in summer.",
        routeIds: ["corral-canyon", "bear-valley", "los-pinos", "kernan-trail", "wrangler-trail"],
      },
    ],
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
    loops: [
      {
        name: "Alamo Mountain High Country",
        distanceMiles: 28,
        summary:
          "A green-sticker pine-country day on the high roads above Lockwood Valley.",
        description:
          "Session the Alamo Mountain loop (8N01) and link into the Scott Russell network (9N21) for a full day in the high pines, both green-sticker, with loose, rocky, rutted climbs and big ridgeline views. This is high country that holds snow: it's a May–October ride, and the upper roads can stay closed late into spring in a heavy-snow year.",
        routeIds: ["alamo-mountain", "scott-russell"],
      },
      {
        name: "Cuyama Badlands",
        distanceMiles: 14,
        summary:
          "Colorful sandstone canyons on the desert side, the cool-season counterpart to the high country.",
        description:
          "Run Apache Canyon (8N06) and neighboring Quatal Canyon (9N09) through the banded Cuyama sandstone badlands. Lower, hotter, and best fall through spring when the high country is snowed in. Apache is green-sticker; Quatal is partial, green-sticker on part of it only, so read the note before you drop in.",
        routeIds: ["apache-canyon", "quatal-canyon"],
      },
    ],
    routes: mtPinosRoutes,
  },
  {
    id: "santa-barbara",
    name: "Santa Barbara",
    region: "Los Padres National Forest",
    regionShort: "Los Padres N.F.",
    state: "California",
    blurb:
      "The Santa Ynez and San Rafael backcountry behind Santa Barbara takes in the Camuesa OHV area, the East Camino Cielo crest, and remote green-sticker roads, plus quieter plated routes. Route geometry and elevation come from the Forest Service MVUM and SRTM. Many roads here close in wet weather, storm-driven rather than calendar-based, so expect closures during and after winter and spring rains (roughly November–April) until the tread dries out.",
    tagline:
      "Camuesa OHV roads and the East Camino Cielo crest in the backcountry above the city.",
    mvumGeojson: "/data/santa-barbara-mvum.geojson",
    forest: LPNF,
    loops: [
      {
        name: "Camuesa Backcountry Traverse",
        distanceMiles: 34,
        summary:
          "The green-sticker crest-to-backcountry day, Santa Barbara's best OHV riding.",
        description:
          "The three green-sticker roads that make this range worth the drive: East Camino Cielo (5N12.1) along the crest above town, the Romero–Camuesa spine (5N15.2) into the Camuesa OHV area, and Buckhorn (9N11.4) deep into the San Rafael backcountry. Treat this as a committing all-day epic, not a casual outing. It's long, remote, and lightly-traveled, so carry water, fuel, and a way to call for help. Two caveats before you make the drive: the Camuesa side closes after rain (the wet-season gate closures, roughly November–April, apply here), and the access roads between these stretches are frequently gated, so they don't always link cleanly. Check current gate status first, and bring an Adventure Pass. Open and dry, it's the best green-sticker riding in the area.",
        routeIds: ["east-camino-cielo", "camuesa-road", "buckhorn-road"],
      },
      {
        name: "Figueroa & Zaca Country",
        distanceMiles: 24,
        summary:
          "Wine-country ridges and oak-shaded backroads northwest of the valley.",
        description:
          "The mellow, scenic counterpoint to the backcountry epics: climb Happy Canyon (7N07) out of the ranch land, cruise Sunset Valley (8N09) toward the dispersed camps, and finish on Zaca Ridge (8N02) in the Zaca Peak OHV area for big views over the wine country. Mostly relaxed graded dirt that genuinely connects into a real loop, ideal for seat time, scenery, or bringing along a newer rider, and a wildflower showcase in spring. Plated throughout, except part of Zaca Ridge is also open to green-sticker bikes, so check the signs there.",
        routeIds: ["happy-canyon-road", "sunset-valley-road", "zaca-ridge"],
      },
    ],
    routes: santaBarbaraRoutes,
  },
  {
    id: "san-luis-obispo",
    name: "San Luis Obispo",
    region: "Los Padres National Forest",
    regionShort: "Los Padres N.F.",
    state: "California",
    blurb:
      "The Los Padres backcountry east of San Luis Obispo is home to the Pozo and La Panza OHV area: a real green-sticker network of OHV roads and motorcycle singletrack around Hi Mountain and Pozo, plus the long, remote Sierra Madre Ridge for plated adventure riding. (Oceano Dunes, the coastal riding, is state land and isn't covered here.) Many roads and trails close when wet, storm-driven rather than calendar-based, so expect closures during and after winter and spring rains (roughly November–April) until things dry out. Route geometry and elevation come from the Forest Service MVUM and SRTM.",
    tagline:
      "The Pozo and La Panza OHV area: green-sticker roads, singletrack, and the long Sierra Madre Ridge.",
    mvumGeojson: "/data/san-luis-obispo-mvum.geojson",
    forest: LPNF,
    loops: [
      {
        name: "Pozo / La Panza OHV Day",
        distanceMiles: 24,
        summary:
          "Green-sticker roads and real singletrack around Hi Mountain and Pozo.",
        description:
          "Climb Hi Mountain (30S11), link Rock Front (30S06) and the Queen Bee loop (29S18), and session the Pozo OHV singletrack (16E21), all green-sticker, the rare southern network with genuine motorcycle singletrack. Closed when wet, so go when it's dried out. For a plated adventure instead, the long, remote Sierra Madre Road (32S13) is the standalone big day, so commit to it self-sufficient; there are no bailouts.",
        routeIds: ["hi-mountain", "rock-front", "queen-bee-loop", "pozo-singletrack"],
      },
    ],
    routes: sanLuisObispoRoutes,
  },
  {
    id: "lake-arrowhead",
    name: "Lake Arrowhead",
    region: "San Bernardino National Forest",
    regionShort: "San Bernardino N.F.",
    state: "California",
    blurb:
      "The front-country forest west of Big Bear, around Lake Arrowhead, Crab Flats, and Deep Creek. This is the closest real green-sticker riding to the Inland Empire: the Crab Flats roads and a designated motorcycle singletrack above Deep Creek, plus a long green-sticker ridge along Cleghorn above Silverwood Lake. The forested high country holds snow, so the upper roads close in winter (roughly December–April). Route geometry and elevation come from the Forest Service MVUM and SRTM.",
    tagline:
      "Green-sticker OHV roads and Deep Creek singletrack, just west of Big Bear.",
    mvumGeojson: "/data/lake-arrowhead-mvum.geojson",
    forest: SBNF,
    loops: [
      {
        name: "Crab Flats Green-Sticker Day",
        distanceMiles: 19,
        summary:
          "The area's green-sticker core: the Crab Flats roads and the Deep Creek singletrack.",
        description:
          "The green-sticker riding here clusters around Crab Flats. Stage at the Crab Flats road (3N34), session the Deep Creek motorcycle singletrack (2W01), which is true narrow-gauge trail, motorcycles only, then add Miller Canyon (2N37) for more designated mileage. One honest catch: Crab Flats and Pilot Rock are mixed, open to all vehicles on some segments and to street-legal vehicles only on others, so on a non-plated bike you ride the green-sticker stretches and trailer or shuttle past the plate-only links. The singletrack is the real reason to come. Budget by hours, not the rough 19-mile composite.",
        routeIds: ["crab-flats-road", "deep-creek-singletrack", "miller-canyon"],
      },
      {
        name: "Cleghorn Ridge & the West Side",
        distanceMiles: 42,
        summary:
          "A long western day along the Cleghorn and Pilot Rock ridges above Silverwood.",
        description:
          "The west side of the area is all about ridge mileage above Silverwood Lake. Run Cleghorn Ridge (2N47), about 15 miles of green-sticker road and the rare long OHV ride a non-street-legal bike can do here, link Pilot Rock (2N33) back toward the Arrowhead crest, then drop the long, remote Bailey Canyon (2N49) if you want a committing plated finish. Cleghorn is green-sticker, Pilot Rock is mixed, and Bailey is open to street-legal vehicles only, so plan access by bike. A big, exposed day; carry water and watch the weather, since the clay turns greasy after rain.",
        routeIds: ["cleghorn-ridge", "pilot-rock-road", "bailey-canyon"],
      },
    ],
    routes: lakeArrowheadRoutes,
  },
  {
    id: "san-gorgonio",
    name: "San Gorgonio",
    region: "San Bernardino N.F. · Front Country & Mountaintop R.D.",
    regionShort: "San Gorgonio front",
    state: "California",
    blurb:
      "The south side of the San Bernardinos below San Gorgonio: the Santa Ana River, Barton Flats, and Heart Bar high country. This is entirely plated dual-sport country, with no green-sticker roads, so it's a place for street-legal bikes to cover scenic forest mileage rather than green-sticker trail riding. For green-sticker access nearby, the Crab Flats roads around Lake Arrowhead or the Cactus Flat side of Big Bear are the closest options. The San Gorgonio Wilderness itself is closed to all motor vehicles. Those are trailheads to park at, not trails to ride. The high country holds snow in winter (roughly December–April). Route geometry and elevation come from the Forest Service MVUM and SRTM.",
    tagline:
      "Plated dual-sport in the Santa Ana River and Barton Flats high country below San Gorgonio.",
    mvumGeojson: "/data/san-gorgonio-mvum.geojson",
    forest: SBNF,
    loops: [
      {
        name: "Coon Creek Jumpoff & the Front Line",
        distanceMiles: 18,
        summary:
          "The signature plated day: the front-line road out to the Coon Creek Jumpoff overlook.",
        description:
          "The standout ride on this side is the Coon Creek Jumpoff (1N02), where the forest drops away toward the desert. Link the long Radford front-line road (1N04) to reach it and string the high-country overlooks together along the way. All plated dual-sport, no green-sticker bikes, and genuinely rough in stretches out to the Jumpoff, so it's high-clearance riding. Mostly snow-free spring through fall; the upper road can hold snow into spring.",
        routeIds: ["radford-front-line", "coon-creek-jumpoff"],
      },
      {
        name: "Wildhorse & Fish Creek Meadows",
        distanceMiles: 18,
        summary:
          "A higher, cooler day through the conifer and meadows near the wilderness boundary.",
        description:
          "For the cooler, higher country, climb Wildhorse Meadow (2N93) toward the crest and pair it with the Fish Creek and Heart Bar meadows (1N05) on the east end. Pine, fir, and mountain meadows up near 8,000 feet, a relaxed plated ride rather than a technical one. The Fish Creek trailheads sit right on the San Gorgonio Wilderness boundary, which is closed to motors, so park there, don't ride in. Best late spring through fall, once the snow is gone up high.",
        routeIds: ["wildhorse-meadow", "fish-creek-meadows"],
      },
    ],
    routes: sanGorgonioRoutes,
  },
  {
    id: "palomar",
    name: "Palomar",
    region: "Cleveland National Forest",
    regionShort: "Cleveland N.F.",
    state: "California",
    blurb:
      "Palomar Mountain in north San Diego County, the compact third district of the Cleveland after the Santa Anas and the Lagunas. It's a small, entirely plated network: the long Palomar Divide ridge, a high-clearance climb on the mountain's northeast flank, and the remote Indian Flats backcountry toward Lake Henshaw. No green-sticker roads here, so for green-sticker riding in San Diego County the place to go is the Corral Canyon OHV area in the Lagunas. Many of these roads close when wet, storm-driven rather than calendar-based, so expect closures during and after winter rains. Route geometry and elevation come from the Forest Service MVUM and SRTM.",
    tagline:
      "A compact, all-plate district headlined by the long Palomar Divide ridge.",
    mvumGeojson: "/data/palomar-mvum.geojson",
    forest: CNF,
    loops: [
      {
        name: "Palomar Divide Traverse",
        distanceMiles: 15,
        summary:
          "The signature ride: in from Oak Grove and the length of the divide.",
        description:
          "The classic Palomar day is the divide itself. Come in on the short Oak Grove access road (9S09) from Highway 79, then run the full Palomar Divide (9S07), about 13 miles of ridge with sweeping San Diego backcountry and desert views. All plated dual-sport, street-legal bikes only, and smoother than the Santa Ana divide, so a scenic cruise more than a technical day. Best in spring and fall; the road closes when wet.",
        routeIds: ["oak-grove-road", "palomar-divide"],
      },
      {
        name: "High Point & Indian Flats",
        distanceMiles: 20,
        summary:
          "The quieter, remote-feeling north side of the mountain.",
        description:
          "For a more remote feel, pair the High Point flank road (8S05), a forested high-clearance climb that tops out around 4,900 feet below the lookout itself, with the Indian Flats backcountry road (9S05) dropping toward Lake Henshaw. Both are plated, street-legal bikes only, and quieter than the divide. Good seat time through conifer and oak, again best once things have dried out after winter rains.",
        routeIds: ["high-point", "indian-flats"],
      },
    ],
    routes: palomarRoutes,
  },
  {
    id: "jawbone",
    name: "Jawbone Canyon",
    region: "BLM Ridgecrest Field Office · Mojave Desert",
    regionShort: "BLM · Jawbone",
    state: "California",
    blurb:
      "Jawbone Canyon is the classic Mojave green-sticker country: open BLM desert off Highway 14 in Kern County, with miles of designated routes climbing west from the canyon toward the Piute Mountains, plus the Dove Springs and Butterbredt drainages alongside. Unlike the national forests, this is open OHV land, so almost the whole designated network is open to green-sticker (non-street-legal) bikes, including real motorcycle singletrack. Route geometry and elevation come from the BLM travel network and SRTM.",
    tagline:
      "Open Mojave OHV desert off Highway 14: designated routes and moto singletrack, almost all green-sticker.",
    mvumGeojson: "/data/jawbone-blm.geojson",
    forest: BLM_RIDGECREST,
    source: {
      overviewLabel: "BLM Ridgecrest FO",
      overviewIntro:
        "Every designated motorized route in the Jawbone area, from the BLM travel network. This is open OHV land, so the whole designated network here is open to green-sticker (non-street-legal) bikes. Stay on the routes shown; the map leaves out roads closed to OHV recreation. Hover any line for its name.",
      attribution: "&copy; OpenStreetMap contributors · BLM GTLF",
      verifyNote:
        "Route lines come from the BLM Ground Transportation network and elevation from SRTM, not a surveyed legal boundary. This is open OHV land, but stay on designated routes: BLM closes and reroutes for habitat (desert tortoise) and seasonal conditions, and route designations change.",
      credit: "Route data © BLM Ground Transportation Linear Features (GTLF)",
    },
    loops: [
      {
        name: "Dove Springs Big Day",
        distanceMiles: 24,
        summary:
          "The northern open-route network strung into a full day of high-desert miles.",
        description:
          "The north end of the complex, around Dove Springs, is where the open mileage is. Start east near Highway 14 on SC-94, work west across the benches on the long SC-103, then drop toward Butterbredt Spring on the quieter far side toward the Piute Mountains. All of it is open green-sticker desert, sandy washes trading off with rockier two-track. This is a real day of seat time, open and exposed the whole way, so carry fuel and water and plan a margin.",
        routeIds: ["sc-94", "sc-103-east", "butterbredt-canyon"],
      },
      {
        name: "Canyon Stage & Singletrack",
        distanceMiles: 10,
        summary:
          "Come in up Jawbone Canyon, then session the moto singletrack to the south.",
        description:
          "A shorter, more focused day at the south end. Come in on Jawbone Canyon Road from Highway 14, the area's main artery off the highway, then head for the designated singletrack to session tight, sandy tread that's open to motorcycles only. It's less about mileage than about trading the open two-track for real singletrack, a good half-day on its own or a warm-up before pushing deeper into the network.",
        routeIds: ["jawbone-canyon-road", "jawbone-singletrack"],
      },
    ],
    routes: jawboneRoutes,
  },
  {
    id: "el-paso",
    name: "El Paso Mountains",
    region: "BLM Ridgecrest Field Office · Mojave Desert",
    regionShort: "BLM · El Paso",
    state: "California",
    blurb:
      "The El Paso Mountains are the colorful, rugged range just east of Jawbone near Randsburg: eroded volcanic badlands threaded with designated motorcycle singletrack, the old Last Chance Canyon mining country, and Burro Schmidt's hand-dug tunnel. Like Jawbone, this is open BLM OHV land, so the designated network is green-sticker terrain end to end. It wraps Red Rock Canyon State Park, which is closed to OHVs, so the boundaries matter here. Route geometry and elevation come from the BLM travel network and SRTM.",
    tagline:
      "Volcanic badlands and real moto singletrack east of Jawbone, around Last Chance Canyon and Randsburg.",
    mvumGeojson: "/data/el-paso-blm.geojson",
    forest: BLM_RIDGECREST,
    source: {
      overviewLabel: "BLM Ridgecrest FO",
      overviewIntro:
        "Every designated motorized route in the El Paso Mountains, from the BLM travel network. This is open OHV land, so the whole designated network here is open to green-sticker (non-street-legal) bikes. Stay on the routes shown; the map leaves out roads closed to OHV recreation, and Red Rock Canyon State Park (to the west) is closed to OHVs entirely. Hover any line for its name.",
      attribution: "&copy; OpenStreetMap contributors · BLM GTLF",
      verifyNote:
        "Route lines come from the BLM Ground Transportation network and elevation from SRTM, not a surveyed legal boundary. Stay on designated routes: the range borders Red Rock Canyon State Park (closed to OHVs) and carries cultural and mining sites, and BLM closes and reroutes for conditions.",
      credit: "Route data © BLM Ground Transportation Linear Features (GTLF)",
    },
    loops: [
      {
        name: "Singletrack & Canyons Day",
        distanceMiles: 31,
        summary:
          "The core green-sticker day: the singletrack network plus the canyon routes around it.",
        description:
          "Lead with the designated singletrack, the real reason to make the drive, then stretch out on Willis Well Road across the benches and dip into Iron Canyon's colorful eroded rock. It stays mostly in the central El Pasos, sandy and rocky desert, green-sticker the whole way. Composite mileage is rough and the country is exposed and a long way from services, so carry fuel and water and plan a full day.",
        routeIds: ["el-paso-singletrack", "el-paso-willis-well", "el-paso-iron-canyon"],
      },
      {
        name: "Black Mountain & the West Side",
        distanceMiles: 16,
        summary:
          "A road-focused day reaching the Black Mountain high point on the west side.",
        description:
          "A longer-format road day. Run Willis Well Road out across the backcountry, then climb Black Mountain Road on the west side toward the high point, with views over the desert and out to the Sierra. Open green-sticker routes, rockier up high. The two ends are a fair way apart, so plan time and fuel, and keep clear of the Red Rock Canyon State Park boundary on the west.",
        routeIds: ["el-paso-willis-well", "el-paso-black-mountain"],
      },
    ],
    routes: elPasoRoutes,
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
