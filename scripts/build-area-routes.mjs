// Build featured-route data + GPX for an area straight from authoritative
// sources, so distance, access, geometry and elevation are all real:
//   - geometry & access  -> USFS MVUM (EDW_MVUM_01), queried by road number
//   - elevation          -> SRTM via opentopodata.org (best-effort)
//   - prose/difficulty   -> editorial, in the CONFIG below (the only hand part)
//
//   node scripts/build-area-routes.mjs [area ...]
//
// Emits public/gpx/<route-id>.gpx and lib/routes/<area>.generated.ts.
// Re-run when the curated CONFIG changes or to refresh against the MVUM.

import { writeFile, mkdir } from "node:fs/promises";

const BASE =
  "https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_MVUM_01/MapServer";
const UA = "dirt-bikes/1.0 (route-guide; build script)";
const MVUM = "USFS Motor Vehicle Use Map (MVUM), 2026";

// Road numbers repeat across the ~150 national forests, so every lookup is
// constrained to the area's bounding box (else id='6S13' stitches Thomas Mtn
// to a same-numbered road three states away).
const BBOX = {
  "san-jacinto": "-116.90,33.45,-116.30,33.95",
  "santa-ana": "-117.55,33.55,-117.30,33.80",
  "laguna": "-116.60,32.65,-116.30,32.95",
  "santa-barbara": "-120.05,34.40,-119.55,34.80",
  "san-luis-obispo": "-120.55,35.05,-119.85,35.55",
  "mt-pinos": "-119.55,34.65,-118.85,35.00",
  "lake-arrowhead": "-117.42,34.20,-117.06,34.42",
  "san-gorgonio": "-117.05,34.08,-116.65,34.22",
  "palomar": "-116.95,33.25,-116.62,33.52",
  "big-bear": "-117.05,34.15,-116.70,34.35",
};

// ---- Curated featured routes (editorial fields only; facts are derived) -----
// `ids` lists the exact MVUM road numbers that make up the ride (segments are
// stitched into one track). Order = editorial best -> worst.
const CONFIG = {
  // The San Jacinto Mountains as one area: the green-sticker OHV roads on the
  // Garner Valley / Santa Rosa (desert) side, plus the plated forest roads
  // around Idyllwild on the west/upper side. Ordered green-sticker first.
  "san-jacinto": {
    routes: [
      {
        id: "san-jacinto-ridge", name: "San Jacinto Ridge", ids: ["5S09"],
        difficulty: "Difficult",
        summary: "High, rocky ridge road with sweeping Garner Valley and desert views.",
        description:
          "Forest road 5S09 works along the high ridge on the east side of the San Jacintos above Garner Valley, a rough, high-clearance OHV route with loose, rocky, rutted pitches. Up top, a long ridgeline opens onto the Santa Rosa Mountains and, on clear days, the Coachella Valley far below.",
        surface: "High-clearance dirt with loose rock and rutted climbs",
        bestSeason: "April–November",
        highlights: [
          "Long ridgeline views over Garner Valley",
          "Genuinely rocky high-clearance OHV riding",
          "Links into the Santa Rosa backcountry network",
        ],
      },
      {
        id: "red-mountain", name: "Red Mountain OHV Road", ids: ["6S22"],
        difficulty: "Moderate",
        summary: "Pinyon-slope climb on Red Mountain, green-sticker on part of it.",
        description:
          "6S22 climbs through pinyon and chaparral on the flanks of Red Mountain south of Garner Valley, mixing smooth graded stretches with looser, rockier climbs as it gains the ridge. Part of the road is open to all vehicles, so green-sticker access comes and goes by the segment.",
        surface: "Graded dirt with rockier, looser climbs up high",
        bestSeason: "April–November",
        highlights: [
          "Green-sticker access on part of the road",
          "Pinyon-and-chaparral high country",
          "Quieter than the Garner Valley fire roads",
        ],
      },
      {
        id: "indian-canyon", name: "Indian Canyon Road", ids: ["4S06"],
        difficulty: "Moderate",
        summary: "Canyon road through the Garner Valley high country, partly green-sticker.",
        description:
          "4S06 runs up Indian Canyon in the Garner Valley area, a high-clearance road with a mix of forest and high-desert transition, sandy washes, and rocky sections. Part of it is open to all vehicles, with green-sticker access varying segment to segment, a solid intermediate option that connects to the surrounding road network.",
        surface: "Mixed dirt and sandy wash with rocky sections",
        bestSeason: "April–November",
        highlights: [
          "Green-sticker access on part of the road",
          "Forest-to-high-desert transition scenery",
          "Connects the Garner Valley road network",
        ],
      },
      {
        id: "indian-mountain", name: "Indian Mountain OHV Road", ids: ["4S21"],
        difficulty: "Moderate",
        summary: "Short, scenic green-sticker spur toward Indian Mountain.",
        description:
          "A shorter designated OHV road (4S21) branching toward Indian Mountain. Open to all vehicles, it's a quick, scenic high-clearance ride with rocky pitches and good views, a nice add-on to a Garner Valley day rather than a destination in itself.",
        surface: "High-clearance dirt with rocky sections",
        bestSeason: "April–November",
        highlights: [
          "Green-sticker designated road",
          "Short, scenic high-clearance spur",
          "Pairs well with the Indian Canyon network",
        ],
      },
      {
        id: "bee-canyon", name: "Bee Canyon OHV Road", ids: ["5S07"],
        difficulty: "Moderate",
        summary: "Designated OHV road dropping through Bee Canyon.",
        description:
          "5S07 follows Bee Canyon as a designated road open to all vehicles. It's a compact green-sticker option with sandy canyon-bottom sections and rockier benches, threading pinyon and scrub on the desert side of the range.",
        surface: "Sandy canyon bottom with rocky benches",
        bestSeason: "April–November",
        highlights: [
          "Green-sticker designated road",
          "Sandy canyon-bottom character",
          "Desert-side pinyon and scrub",
        ],
      },
      {
        id: "thomas-mountain", name: "Thomas Mountain Road", ids: ["6S13"],
        difficulty: "Moderate",
        summary: "Long, scenic climb to Thomas Mountain, plated bikes only.",
        description:
          "6S13 is a long, graded climb up Thomas Mountain on the west side of Garner Valley, generally smooth enough for passenger cars but a fun, view-packed dual-sport ride. It passes Jeffrey pine, dispersed campsites, and overlooks of Lake Hemet and Garner Valley.",
        surface: "Long graded dirt, generally smooth",
        bestSeason: "April–November",
        highlights: [
          "Overlooks of Lake Hemet and Garner Valley",
          "Jeffrey pine and dispersed camping",
          "Smooth, beginner-friendly grade (plated only)",
        ],
      },
      {
        id: "santa-rosa-road", name: "Santa Rosa Mountain Road", ids: ["7S02"],
        difficulty: "Difficult",
        summary: "Remote high-clearance climb deep into the Santa Rosa Mountains.",
        description:
          "7S02 climbs toward the high Santa Rosa Mountains and the Toro Peak area, a remote, high-clearance road with rough, rocky, sometimes washed-out sections. It tops out in cool conifer country with enormous views over the desert; come prepared and plated, since it's open to street-legal vehicles only.",
        surface: "Rough, rocky high-clearance road; washouts likely",
        bestSeason: "May–October",
        highlights: [
          "Remote, high Santa Rosa Mountains",
          "Huge desert overlooks near Toro Peak",
          "Cool conifer country up high (plated only)",
        ],
      },
      {
        id: "black-mountain-road", name: "Black Mountain Road", ids: ["4S01"],
        difficulty: "Difficult",
        summary: "Long forest climb to the Black Mountain lookout above Idyllwild.",
        description:
          "4S01 climbs the north flank of Black Mountain through dense pine and cedar above Idyllwild toward the historic fire lookout and the Black Mountain trailheads. A scenic, sustained graded climb with rocky, rutted sections. Open to street-legal vehicles only, so it's a plated dual-sport ride.",
        surface: "Graded dirt with rocky, rutted climbs",
        bestSeason: "May–October",
        highlights: [
          "Climbs to the Black Mountain fire lookout",
          "Dense pine-and-cedar San Jacinto forest",
          "Cooler high-elevation riding (plated only)",
        ],
      },
      {
        id: "idyllwild-control-road", name: "Idyllwild Control Road", ids: ["5S06"],
        difficulty: "Moderate",
        summary: "Classic dirt connector linking Idyllwild to the high country.",
        description:
          "5S06 is a graded forest road threading the pines near Idyllwild, a relaxed plated dual-sport ride with good sight lines and forest scenery. Open to street-legal vehicles only, it's a pleasant way to link the area's roads and trailheads without technical demands.",
        surface: "Graded dirt, generally smooth",
        bestSeason: "May–October",
        highlights: [
          "Easy pine-forest cruising near town",
          "Links the Idyllwild road network",
          "Beginner-friendly grade (plated only)",
        ],
      },
      {
        id: "dark-canyon-road", name: "Dark Canyon Road", ids: ["4S02"],
        difficulty: "Moderate",
        summary: "Short forest road into the Dark Canyon drainage.",
        description:
          "4S02 drops into the Dark Canyon area northwest of Idyllwild, a shaded forest road serving the campground and trailheads along the San Jacinto's western canyons. A short, scenic plated ride through pine and oak, open to street-legal vehicles only.",
        surface: "Graded dirt with rocky sections",
        bestSeason: "May–October",
        highlights: [
          "Shaded Dark Canyon forest",
          "Campground and trailhead access",
          "Short, scenic plated ride",
        ],
      },
      {
        id: "fobes-ranch-road", name: "Fobes Ranch Road", ids: ["6S05"],
        difficulty: "Moderate",
        summary: "Plated spur to the Fobes Ranch PCT trailhead.",
        description:
          "6S05 climbs to the Fobes Ranch trailhead on the south side of the San Jacintos, a popular jumping-off point for the Pacific Crest Trail. A moderate, rocky graded road with chaparral-to-forest transition and big views, plated dual-sport, street-legal vehicles only.",
        surface: "Rocky graded dirt; rougher up high",
        bestSeason: "May–October",
        highlights: [
          "Access to the Fobes Ranch PCT trailhead",
          "Chaparral-to-forest transition",
          "Big San Jacinto views (plated only)",
        ],
      },
    ],
  },

  // Santa Ana Mountains (Cleveland N.F.) — the Main Divide / Trabuco country
  // near LA/Orange County. Almost entirely plated dual-sport / adventure roads
  // (green-sticker OHV here is the separate Wildomar area); the marquee ride is
  // the ~35-mile North Main Divide over Santiago Peak.
  "santa-ana": {
    routes: [
      {
        id: "north-main-divide", name: "North Main Divide Road", ids: ["3S04"],
        difficulty: "Difficult",
        summary: "The legendary ~35-mile crest of the Santa Ana Mountains over Saddleback.",
        description:
          "The North Main Divide Truck Trail (3S04) runs the spine of the Santa Ana Mountains past Santiago and Modjeska Peaks (Saddleback), a long, exposed ridge road with rocky, rutted high-clearance sections and enormous views from the Inland Empire to the Pacific. A classic SoCal plated dual-sport / adventure ride, street-legal vehicles only, and a serious day of riding.",
        surface: "Long, rocky high-clearance ridge road",
        bestSeason: "Year-round (avoid heat and after rain)",
        highlights: [
          "Rides the crest past Santiago Peak (Saddleback)",
          "Inland-Empire-to-Pacific views",
          "Marquee plated adventure ride near LA/OC",
        ],
      },
      {
        id: "south-main-divide", name: "South Main Divide Road", ids: ["6S07"],
        difficulty: "Moderate",
        summary: "The southern half of the divide toward El Cariso and Lake Elsinore.",
        description:
          "South Main Divide (6S07) continues the ridge south from the Ortega Highway toward El Cariso and the Lake Elsinore side, generally smoother than the north divide with chaparral ridgetops and overlooks of the lake and valley. A scenic, moderate plated ride, street-legal vehicles only.",
        surface: "Graded-to-rocky ridge road",
        bestSeason: "Year-round (avoid heat and after rain)",
        highlights: [
          "Overlooks of Lake Elsinore",
          "Smoother companion to the north divide",
          "Chaparral ridgetop scenery (plated only)",
        ],
      },
      {
        id: "maple-springs", name: "Maple Springs Road", ids: ["5S04"],
        difficulty: "Moderate",
        summary: "Climbs from Silverado Canyon up to the Main Divide.",
        description:
          "Maple Springs Road (5S04) climbs out of Silverado Canyon through oak and bay woodland to meet the Main Divide near Modjeska Peak. A scenic graded-to-rocky climb and one of the main ways up to the crest from the Orange County side, open to street-legal vehicles only.",
        surface: "Graded dirt with rocky upper sections",
        bestSeason: "Year-round (avoid heat and after rain)",
        highlights: [
          "Shaded climb out of Silverado Canyon",
          "Connects to the Main Divide crest",
          "Oak-and-bay woodland (plated only)",
        ],
      },
      {
        id: "indian-truck-trail", name: "Indian Truck Trail", ids: ["5S01"],
        difficulty: "Moderate",
        summary: "Long graded climb to the divide from the Corona side.",
        description:
          "Indian Truck Trail (5S01) climbs the eastern flank of the Santa Anas from the Corona / Lake Mathews side up to the Main Divide, a steady graded ascent through chaparral with expanding Inland Empire views. A popular plated dual-sport climb, street-legal vehicles only.",
        surface: "Graded dirt, steady grade",
        bestSeason: "Year-round (avoid heat and after rain)",
        highlights: [
          "Long steady climb to the crest",
          "Inland Empire views",
          "Popular plated dual-sport route",
        ],
      },
      {
        id: "trabuco-canyon", name: "Trabuco Canyon Road", ids: ["6S13"],
        difficulty: "Difficult",
        summary: "Rough, rocky canyon road to the Holy Jim trailhead.",
        description:
          "Trabuco Canyon Road (6S13) runs up the boulder-strewn Trabuco Canyon to the Holy Jim trailhead, a notoriously rocky, rutted, creek-crossing road that demands real high-clearance riding. Short but technical, shaded and scenic, open to street-legal vehicles only.",
        surface: "Rocky, rutted canyon road with creek crossings",
        bestSeason: "Year-round (avoid heat and after rain)",
        highlights: [
          "Rough, technical canyon riding",
          "Shaded Trabuco Canyon and Holy Jim",
          "Short but demanding (plated only)",
        ],
      },
      {
        id: "bedford-ridge", name: "Bedford Ridge Road", ids: ["4S03"],
        difficulty: "Moderate",
        summary: "Short ridge spur off the northern divide country.",
        description:
          "Bedford Ridge (4S03) is a shorter high-clearance ridge road in the northern Santa Anas, mixing rocky benches and chaparral with valley views. A compact plated ride best linked with the Main Divide, street-legal vehicles only.",
        surface: "Rocky high-clearance ridge dirt",
        bestSeason: "Year-round (avoid heat and after rain)",
        highlights: [
          "Compact northern-divide spur",
          "Chaparral ridge and valley views",
          "Pairs with the Main Divide (plated only)",
        ],
      },
      {
        id: "long-canyon", name: "Long Canyon Road", ids: ["6S05"],
        difficulty: "Easy",
        summary: "Mellow graded road in the El Cariso / Blue Jay area.",
        description:
          "Long Canyon Road (6S05) is a gentler graded road around the El Cariso and Blue Jay campground area on the south end of the range, good for an easy plated cruise and reaching trailheads and camps. Open to street-legal vehicles only.",
        surface: "Wide graded dirt, generally smooth",
        bestSeason: "Year-round (avoid heat and after rain)",
        highlights: [
          "Easy graded riding near Blue Jay / El Cariso",
          "Campground and trailhead access",
          "Beginner-friendly plated route",
        ],
      },
    ],
  },

  // The Laguna Mountains in San Diego County (Cleveland N.F., Descanso R.D.):
  // the Corral Canyon OHV Area green-sticker network near Pine Valley, plus the
  // plated Mount Laguna / Sunrise Highway forest roads.
  "laguna": {
    routes: [
      {
        id: "corral-canyon", name: "Corral Canyon Road", ids: ["17S04"],
        difficulty: "Difficult",
        summary: "The namesake road of San Diego's Corral Canyon OHV Area.",
        description:
          "17S04 is the spine of the Corral Canyon OHV Area near Pine Valley, a rocky, high-clearance road through chaparral and oak with technical pitches and connections to the area's trail network. It's open to all vehicles on its OHV segments and to street-legal vehicles only on others, so green-sticker access depends on which segment you're on.",
        surface: "Rocky, high-clearance OHV-area dirt",
        bestSeason: "Fall–spring (hot in summer)",
        highlights: [
          "Heart of the Corral Canyon OHV Area",
          "Green-sticker access on part of the road",
          "Rocky, technical San Diego backcountry",
        ],
      },
      {
        id: "kernan-trail", name: "Kernan Trail", ids: ["802"], layer: 2,
        difficulty: "Difficult",
        summary: "The longest singletrack in the Corral Canyon OHV Area.",
        description:
          "Trail 802 (Kernan) is the longest dedicated OHV trail in the Corral Canyon system near Pine Valley, narrow, rocky, twisting singletrack through dense chaparral and oak. This is the real reason riders come to Corral Canyon: technical green-sticker trail riding, not fire roads. Open to vehicles 50 inches and under.",
        surface: "Narrow, rocky OHV singletrack",
        bestSeason: "Fall–spring (hot in summer)",
        highlights: [
          "Longest singletrack in the Corral Canyon system",
          "Technical, narrow OHV trail",
          "Designated green-sticker singletrack",
        ],
      },
      {
        id: "wrangler-trail", name: "Wrangler Trail", ids: ["901"], layer: 2,
        difficulty: "Moderate",
        summary: "Classic Corral Canyon OHV singletrack loop trail.",
        description:
          "Trail 901 (Wrangler) is one of the signature OHV trails in the Corral Canyon network, a twisting green-sticker singletrack through chaparral that links the area's loop system. Tighter and more technical than the roads, it's prime dirt-bike trail riding, open to vehicles 50 inches and under.",
        surface: "Narrow OHV singletrack, rocky and sandy",
        bestSeason: "Fall–spring (hot in summer)",
        highlights: [
          "Signature Corral Canyon trail",
          "Twisting green-sticker singletrack",
          "Links the area's loop system",
        ],
      },
      {
        id: "peace-maker-trail", name: "Peace Maker Singletrack", ids: ["912"], layer: 2,
        difficulty: "Difficult",
        summary: "Motorcycle-only singletrack in the Corral Canyon OHV Area.",
        description:
          "Trail 912 (Peace Maker) is designated open to motorcycles only, true narrow-gauge singletrack, the tightest, most technical green-sticker riding in the Corral Canyon system. No quads or wider machines; just dirt bikes threading the chaparral. The heart of why Corral Canyon is San Diego's best forest moto-trail area.",
        surface: "Tight motorcycle-only singletrack",
        bestSeason: "Fall–spring (hot in summer)",
        highlights: [
          "Motorcycle-only singletrack",
          "Tightest, most technical trail here",
          "Designated green-sticker (dirt bikes only)",
        ],
      },
      {
        id: "long-valley-loop", name: "Long Valley Loop", ids: ["16S15"],
        difficulty: "Moderate",
        summary: "Fully green-sticker loop in the Corral Canyon OHV Area.",
        description:
          "16S15 (Long Valley Loop) is a designated loop open to all vehicles in the Corral Canyon OHV Area, the cleanest green-sticker ride here, with rocky and sandy tread through oak and chaparral. A fun, self-contained loop that's a natural centerpiece for a green-sticker day.",
        surface: "Rocky and sandy OHV-area tread",
        bestSeason: "Fall–spring (hot in summer)",
        highlights: [
          "Fully designated green-sticker loop",
          "Centerpiece of the OHV-area network",
          "Oak-and-chaparral San Diego backcountry",
        ],
      },
      {
        id: "los-pinos", name: "Los Pinos Road", ids: ["16S17"],
        difficulty: "Moderate",
        summary: "Climb toward the Los Pinos lookout above Corral Canyon.",
        description:
          "16S17 climbs toward the Los Pinos fire lookout on the ridge above the Corral Canyon area, a high-clearance road with rocky sections and expanding views over the San Diego backcountry to the desert. Part of it is open to all vehicles, so green-sticker access runs segment by segment.",
        surface: "Rocky high-clearance dirt",
        bestSeason: "Fall–spring (hot in summer)",
        highlights: [
          "Climbs toward the Los Pinos lookout",
          "Green-sticker access on part of the road",
          "Big San-Diego-to-desert views",
        ],
      },
      {
        id: "bear-valley", name: "Bear Valley Road", ids: ["16S12"],
        difficulty: "Difficult",
        summary: "Rugged OHV-area road through the Corral Canyon backcountry.",
        description:
          "16S12 (Bear Valley) is a rugged high-clearance road in the Corral Canyon country, mixing rocky climbs and oak-shaded canyon bottoms. Part of it is open to all vehicles, with green-sticker access changing by segment, a solid intermediate-to-hard ride that links the OHV-area roads.",
        surface: "Rocky high-clearance dirt",
        bestSeason: "Fall–spring (hot in summer)",
        highlights: [
          "Green-sticker access on part of the road",
          "Rocky Corral Canyon backcountry",
          "Connects the OHV-area network",
        ],
      },
      {
        id: "skye-valley", name: "Skye Valley Road", ids: ["17S06"],
        difficulty: "Moderate",
        summary: "OHV-area road threading the Skye Valley chaparral.",
        description:
          "17S06 (Skye Valley) runs through the chaparral and grassland of the Corral Canyon area, a mix of graded and rockier tread. Part of it is open to all vehicles, with green-sticker access shifting segment to segment, a good intermediate option in the network.",
        surface: "Graded-to-rocky OHV-area dirt",
        bestSeason: "Fall–spring (hot in summer)",
        highlights: [
          "Green-sticker access on part of the road",
          "Chaparral-and-grassland scenery",
          "Links the Corral Canyon roads",
        ],
      },
      {
        id: "la-posta", name: "La Posta Road", ids: ["15S05"],
        difficulty: "Moderate",
        summary: "Long plated forest road on the south side of the Lagunas.",
        description:
          "15S05 (La Posta) is a long graded forest road through the oak and chaparral country south of the Laguna crest, a scenic plated dual-sport ride. Open to street-legal vehicles only, it's a good way to cover ground and link the area's backcountry away from the OHV roads.",
        surface: "Graded dirt with rocky sections",
        bestSeason: "Spring–fall",
        highlights: [
          "Long, scenic plated dual-sport road",
          "Oak-and-chaparral Laguna country",
          "Quieter than the OHV area",
        ],
      },
      {
        id: "pine-creek", name: "Pine Creek Road", ids: ["14S05"],
        difficulty: "Easy",
        summary: "Mellow plated road below the Laguna crest near Pine Valley.",
        description:
          "14S05 (Pine Creek) is a gentler graded road near Pine Valley below the Laguna Mountain crest, a relaxed plated ride through pine and oak, good for easy miles and reaching the area's trailheads. Open to street-legal vehicles only.",
        surface: "Wide graded dirt, generally smooth",
        bestSeason: "Spring–fall",
        highlights: [
          "Easy, beginner-friendly grade",
          "Pine-and-oak Laguna foothills",
          "Trailhead access near Pine Valley (plated only)",
        ],
      },
    ],
  },

  // Mt Pinos / Frazier Park (Los Padres N.F., Mt Pinos R.D.) — the green-sticker
  // OHV complex near Gorman / I-5, ~1 hr from LA: Alamo & Frazier Mountains, the
  // Cuyama sandstone badlands (Apache/Quatal), and the Ballinger OHV area. (The
  // adjacent Hungry Valley SVRA is California State land and is not included.)
  "mt-pinos": {
    routes: [
      {
        id: "alamo-mountain", name: "Alamo Mountain OHV", ids: ["8N01.3"],
        difficulty: "Difficult",
        summary: "High green-sticker loop around Alamo Mountain, climbing past 7,000 feet.",
        description:
          "8N01.3 is the OHV-designated upper loop around Alamo Mountain, climbing past 7,000 feet through pine forest in the headwaters of Piru Creek. A long, rocky, high-clearance green-sticker road with big high-country views, the marquee OHV ride of the Mt Pinos / Frazier Park complex. Snow closes it seasonally up high.",
        surface: "Rocky, high-clearance OHV-area dirt",
        bestSeason: "May–October (seasonal snow closure)",
        highlights: [
          "Loops the upper flanks of Alamo Mountain",
          "Pine high country in the Piru headwaters",
          "Marquee green-sticker ride of the area",
        ],
      },
      {
        id: "mt-pinos-singletrack", name: "Mt Pinos Singletrack", ids: ["19W04"], layer: 2,
        difficulty: "Difficult",
        summary: "Long designated motorcycle singletrack, the area's premier trail ride.",
        description:
          "Trail 19W04 is one of the longest designated motorcycle trails in the Mt Pinos area, miles of narrow, technical green-sticker singletrack winding through the backcountry well away from the OHV roads. This is the kind of riding the area is really known for among dirt-bikers: true singletrack, motorcycles only, and seasonal.",
        surface: "Long, technical motorcycle singletrack",
        bestSeason: "May–October (seasonal)",
        highlights: [
          "One of the area's longest moto singletracks",
          "Technical, narrow green-sticker trail",
          "Motorcycle-only, the real reason to come",
        ],
      },
      {
        id: "mutau", name: "Mutau OHV Road", ids: ["7N03.2"],
        difficulty: "Moderate",
        summary: "Long, remote green-sticker road toward Mutau Flat.",
        description:
          "7N03 (Mutau) runs deep toward Mutau Flat on the edge of the Sespe backcountry, a long road open to all vehicles, mixing forest and meadow with sandy and rocky stretches. Remote, quiet green-sticker mileage. Go prepared; seasonal.",
        surface: "Mixed forest road, sandy and rocky sections",
        bestSeason: "May–October (seasonal)",
        highlights: [
          "Remote ride toward Mutau Flat",
          "Edge of the Sespe backcountry",
          "Quiet green-sticker mileage",
        ],
      },
      {
        id: "apache-canyon", name: "Apache Canyon OHV", ids: ["8N06"],
        difficulty: "Moderate",
        summary: "Green-sticker road through the colorful Cuyama badlands.",
        description:
          "8N06 threads Apache Canyon in the sandstone badlands on the Cuyama side of the range, a road open to all vehicles, with sandy washes, rocky benches, and striking eroded rock. A fun, scenic green-sticker ride that pairs with neighboring Quatal Canyon.",
        surface: "Sandy wash and rocky badlands tread",
        bestSeason: "Fall–spring (hot in summer)",
        highlights: [
          "Colorful Cuyama sandstone badlands",
          "Sandy-wash green-sticker riding",
          "Pairs with Quatal Canyon",
        ],
      },
      {
        id: "scott-russell", name: "Scott Russell OHV", ids: ["9N21.1", "9N21.2", "9N21.3"],
        difficulty: "Moderate",
        summary: "Green-sticker OHV road in the Frazier high country.",
        description:
          "9N21 (Scott Russell) is a road open to all vehicles in the forested country between Frazier Mountain and Lockwood Valley, mixing graded and rockier stretches through pine and oak. A solid intermediate green-sticker ride linking the area's OHV network; seasonal.",
        surface: "Mixed graded and rocky forest road",
        bestSeason: "May–October (seasonal)",
        highlights: [
          "Forested Frazier high country",
          "Links the area's OHV network",
          "Designated green-sticker road",
        ],
      },
      {
        id: "frazier-mountain", name: "Frazier Mountain OHV", ids: ["8N04.2"],
        difficulty: "Moderate",
        summary: "Green-sticker climb to the Frazier Mountain lookout.",
        description:
          "8N04.2 is the OHV-designated climb up Frazier Mountain toward the lookout and summit antennas near 8,000 feet, with sweeping views over Lockwood Valley, Mt Pinos, and the high desert. A rocky, high-clearance green-sticker road; seasonal up top.",
        surface: "Rocky, high-clearance climb",
        bestSeason: "May–October (seasonal)",
        highlights: [
          "Climbs toward the Frazier Mountain lookout",
          "Views over Lockwood Valley and Mt Pinos",
          "Designated green-sticker road",
        ],
      },
      {
        id: "quatal-canyon", name: "Quatal Canyon OHV", ids: ["9N09.2"],
        difficulty: "Moderate",
        summary: "Sandstone-badlands OHV road, green-sticker on part of it.",
        description:
          "Quatal Canyon (9N09) is the classic Cuyama-badlands sand-wash ride, winding through dramatic eroded sandstone. Part of it is open to all vehicles and part is open to street-legal vehicles only, so green-sticker access goes segment by segment. Sandy and exposed; best in cool weather.",
        surface: "Deep sandy wash through sandstone badlands",
        bestSeason: "Fall–spring (hot in summer)",
        highlights: [
          "Dramatic sandstone badlands",
          "Sandy-wash riding",
          "Green-sticker access on part of the road",
        ],
      },
      {
        id: "reyes-peak", name: "Reyes Peak Road", ids: ["6N06.1"],
        difficulty: "Moderate",
        summary: "Scenic plated ridge road along Pine Mountain.",
        description:
          "6N06 runs the Pine Mountain ridge east of Mt Pinos, a high conifer road near 7,000 feet past campgrounds and trailheads with enormous views toward the Sespe and, on clear days, the Channel Islands. Open to street-legal vehicles only, a scenic plated cruise; seasonal.",
        surface: "Graded dirt ridge road",
        bestSeason: "May–October (seasonal)",
        highlights: [
          "High conifer ridge along Pine Mountain",
          "Views toward the Sespe wilderness",
          "Scenic plated cruise",
        ],
      },
      {
        id: "ballinger-canyon", name: "Ballinger Canyon Road", ids: ["9N10.1"],
        difficulty: "Easy",
        summary: "Plated staging road into the Ballinger Canyon OHV area.",
        description:
          "9N10 is the graded access road into the Ballinger Canyon OHV area on the Cuyama side, an easy plated ride to the staging area and campground that anchors a big network of OHV trails. The road itself is open to street-legal vehicles only; the OHV trail riding branches off it.",
        surface: "Wide graded dirt",
        bestSeason: "Fall–spring (hot in summer)",
        highlights: [
          "Gateway to the Ballinger Canyon OHV area",
          "Easy plated access road",
          "Anchors a big OHV trail network",
        ],
      },
    ],
  },

  // The Pozo / La Panza OHV area in the Santa Lucia backcountry east of SLO:
  // a real green-sticker network of OHV roads (and motorcycle singletrack),
  // plus the long, remote Sierra Madre Ridge for plated adventure riding.
  "san-luis-obispo": {
    routes: [
      {
        id: "hi-mountain", name: "Hi Mountain OHV Road", ids: ["30S11"],
        difficulty: "Difficult",
        summary: "Climb to the Hi Mountain lookout in the heart of the Pozo OHV area.",
        description:
          "30S11 is the signature green-sticker road of the Pozo / La Panza OHV area, climbing rocky, high-clearance tread through chaparral and oak toward Hi Mountain and its historic condor lookout. Big Santa Lucia Range views and a designated OHV route, open seasonally, and a long way from anywhere.",
        surface: "Rocky, high-clearance OHV-area dirt",
        bestSeason: "Fall–spring (closed when wet)",
        highlights: [
          "Heart of the Pozo OHV area",
          "Climbs toward the Hi Mountain condor lookout",
          "Designated green-sticker road",
        ],
      },
      {
        id: "pozo-singletrack", name: "Pozo OHV Singletrack", ids: ["16E21"], layer: 2,
        difficulty: "Difficult",
        summary: "The longest designated OHV trail in the Pozo singletrack network.",
        description:
          "Trail 16E21 is the longest dedicated OHV trail in the Pozo / La Panza area, narrow green-sticker singletrack threading the chaparral and oak well off the OHV roads. The Pozo trail network is the real draw for dirt-bikers here, and this is its centerpiece: technical, remote, and seasonal (closed when wet).",
        surface: "Narrow OHV singletrack through chaparral",
        bestSeason: "Fall–spring (closed when wet)",
        highlights: [
          "Longest trail in the Pozo singletrack network",
          "Narrow, technical green-sticker riding",
          "The real draw of the Pozo OHV area",
        ],
      },
      {
        id: "rock-front", name: "Rock Front OHV Road", ids: ["30S06.1"],
        difficulty: "Moderate",
        summary: "Designated green-sticker OHV road through the La Panza chaparral.",
        description:
          "30S06 is an OHV road open to all vehicles in the La Panza country, mixing rocky benches and sandy stretches through dense chaparral. A solid intermediate green-sticker ride that links into the surrounding Pozo OHV network, seasonal when wet.",
        surface: "Rocky and sandy OHV-area tread",
        bestSeason: "Fall–spring (closed when wet)",
        highlights: [
          "Designated green-sticker (open to all vehicles)",
          "La Panza chaparral country",
          "Connects the Pozo OHV network",
        ],
      },
      {
        id: "queen-bee-loop", name: "Queen Bee Loop OHV", ids: ["29S18.1", "29S18.2"],
        difficulty: "Moderate",
        summary: "Short green-sticker loop in the Pozo OHV area.",
        description:
          "The Queen Bee Loop (29S18) is a compact designated OHV road in the Pozo area, open to all vehicles, with sandy and rocky tread through oak and chaparral. A fun, low-commitment green-sticker loop to add onto a bigger day, open seasonally.",
        surface: "Sandy and rocky OHV-area tread",
        bestSeason: "Fall–spring (closed when wet)",
        highlights: [
          "Designated green-sticker loop",
          "Oak-and-chaparral Pozo country",
          "Good add-on to the Hi Mountain ride",
        ],
      },
      {
        id: "old-sierra", name: "Old Sierra OHV Road", ids: ["12N03.1"],
        difficulty: "Moderate",
        summary: "Short, rocky green-sticker spur toward the Sierra Madre country.",
        description:
          "12N03 (Old Sierra) is a short OHV road open to all vehicles on the approach to the Sierra Madre high country, rocky, high-clearance tread with chaparral and grassland views. A brief green-sticker option best paired with the longer roads nearby; seasonal.",
        surface: "Rocky high-clearance OHV-area dirt",
        bestSeason: "Fall–spring (closed when wet)",
        highlights: [
          "Designated green-sticker road",
          "Sierra Madre approach country",
          "Pairs with Sierra Madre Road",
        ],
      },
      {
        id: "navajo-road", name: "Navajo Road", ids: ["29S02.1", "29S02.2"],
        difficulty: "Moderate",
        summary: "Backcountry road into the Pozo OHV area, green-sticker on part of it.",
        description:
          "Navajo Road (29S02) drops into the Pozo / La Panza backcountry, mixing graded stretches with rockier sections through oak woodland. Part of it is open to all vehicles and part is open to street-legal vehicles only, with green-sticker access varying by segment. Seasonal closures apply.",
        surface: "Graded dirt with rocky sections",
        bestSeason: "Fall–spring (closed when wet)",
        highlights: [
          "Green-sticker access on part of the road",
          "Oak-woodland Pozo backcountry",
          "Gateway to the OHV network",
        ],
      },
      {
        id: "sierra-madre-road", name: "Sierra Madre Road", ids: ["32S13.1"],
        difficulty: "Difficult",
        summary: "The ~28-mile Sierra Madre Ridge, remote plated backcountry.",
        description:
          "Sierra Madre Road (32S13) runs the long, remote Sierra Madre Ridge, one of the great backcountry roads in Los Padres, roughly 28 miles of graded-to-rocky ridgeline through grassland and chaparral with lonely, far-reaching views. Open to street-legal vehicles only, a plated adventure-bike ride; gated and seasonal, and a committing one, so carry everything.",
        surface: "Long, remote graded-to-rocky ridge road",
        bestSeason: "Spring–fall (closed when wet)",
        highlights: [
          "~28 miles of remote Sierra Madre Ridge",
          "Huge, lonely grassland-and-chaparral views",
          "Classic plated backcountry adventure",
        ],
      },
      {
        id: "fernandez-road", name: "Fernandez Road", ids: ["28S02.1", "28S02.2"],
        difficulty: "Moderate",
        summary: "Quiet plated forest road in the Santa Lucia backcountry.",
        description:
          "Fernandez Road (28S02) is a quieter road open to street-legal vehicles only, through the Santa Lucia backcountry near Pozo, with graded dirt and rocky sections through oak and chaparral. A relaxed plated ride and a way to link the area without the technical or seasonal demands of the OHV roads.",
        surface: "Graded dirt with rocky sections",
        bestSeason: "Spring–fall",
        highlights: [
          "Quiet Santa Lucia backcountry",
          "Oak-and-chaparral scenery",
          "Relaxed plated ride",
        ],
      },
    ],
  },

  "santa-barbara": {
    routes: [
      {
        id: "camuesa-road", name: "Camuesa Road (Romero–Camuesa)", ids: ["5N15.2"],
        difficulty: "Difficult",
        summary: "The backbone of Santa Barbara's Camuesa OHV area, green-sticker riding.",
        description:
          "The Romero–Camuesa road (5N15) is the spine of the Camuesa OHV area in the Santa Ynez backcountry, with segment 5N15.2 designated open to all vehicles. It's a rugged, remote backcountry road through chaparral and oak, the heart of the only real green-sticker network near Santa Barbara, with seasonal wet-weather closures.",
        surface: "Rugged backcountry dirt with rocky, eroded sections",
        bestSeason: "Late spring–fall (closed when wet)",
        highlights: [
          "Core of the Camuesa OHV area",
          "Designated green-sticker (open to all vehicles)",
          "Remote Santa Ynez backcountry",
        ],
      },
      {
        id: "east-camino-cielo", name: "East Camino Cielo (OHV segment)", ids: ["5N12.1"],
        difficulty: "Moderate",
        summary: "The legendary ridge road above Santa Barbara, its OHV-open stretch.",
        description:
          "East Camino Cielo rides the crest of the Santa Ynez Mountains directly above Santa Barbara, with the 5N12.1 segment designated open to all vehicles. Expect knife-edge ocean-and-backcountry views, sandstone outcrops, and a mix of graded and rougher tread along one of the most scenic ridgelines in the county.",
        surface: "Mixed graded dirt and rocky sandstone tread",
        bestSeason: "Spring–fall (seasonal closures when wet)",
        highlights: [
          "Crest-of-the-range ocean and backcountry views",
          "Sandstone outcrops along the ridge",
          "Green-sticker-open ridge segment",
        ],
      },
      {
        id: "buckhorn-road", name: "Buckhorn Road", ids: ["9N11.4"],
        difficulty: "Difficult",
        summary: "Remote green-sticker road into the San Rafael backcountry.",
        description:
          "9N11.4 (Buckhorn) pushes into the remote San Rafael / upper Santa Ynez backcountry as a designated road open to all vehicles. It's a long, rugged, lightly-traveled high-clearance route through chaparral and pine, proper green-sticker backcountry with seasonal closures, so go prepared and self-sufficient.",
        surface: "Rugged high-clearance dirt; rough and remote",
        bestSeason: "Late spring–fall (closed when wet)",
        highlights: [
          "Deep San Rafael backcountry",
          "Designated green-sticker road",
          "Quiet, remote, and rugged",
        ],
      },
      {
        id: "zaca-ridge", name: "Zaca Ridge OHV Road", ids: ["8N02"],
        difficulty: "Moderate",
        summary: "Ridge road in the Zaca Peak OHV area, green-sticker on part of it.",
        description:
          "8N02 climbs to Zaca Ridge in the Zaca Peak OHV area north of the Santa Ynez Valley. Rolling chaparral ridgetops, oak woodland, and big views over the wine-country valleys make it one of the more approachable rides in the forest. Part of the road is open to all vehicles, with green-sticker access changing by segment, and it's open seasonally.",
        surface: "Graded-to-rocky ridge road",
        bestSeason: "Spring–fall (seasonal)",
        highlights: [
          "Green-sticker access on part of the road (seasonal)",
          "Chaparral ridgetops and oak woodland",
          "Views over the Santa Ynez wine country",
        ],
      },
      {
        id: "west-dry-canyon", name: "West Dry Canyon Road", ids: ["8N19"],
        difficulty: "Moderate",
        summary: "Quiet plated backcountry road in the Sunset Valley area.",
        description:
          "8N19 runs through the West Dry Canyon / Sunset Valley country as a road open to street-legal vehicles only. It's a quiet, scenic plated dual-sport ride through oak and chaparral with creek crossings, a good way to link the area's backcountry without the technical demands of the OHV roads.",
        surface: "Graded dirt with creek crossings",
        bestSeason: "Spring–fall",
        highlights: [
          "Quiet oak-and-chaparral backcountry",
          "Seasonal creek crossings",
          "Scenic plated dual-sport route",
        ],
      },
      {
        id: "sunset-valley-road", name: "Sunset Valley Road", ids: ["8N09"],
        difficulty: "Easy",
        summary: "Mellow plated road into the Sunset Valley backcountry.",
        description:
          "8N09 is a gentler graded road into the Sunset Valley area, a relaxed plated ride good for easy miles and reaching trailheads and dispersed camps. Oak woodland, open valley, and easy navigation. Open to street-legal vehicles only.",
        surface: "Wide graded dirt, generally smooth",
        bestSeason: "Spring–fall",
        highlights: [
          "Easy, beginner-friendly grade",
          "Oak woodland and open valley",
          "Access to dispersed camping (plated only)",
        ],
      },
      {
        id: "happy-canyon-road", name: "Happy Canyon Road", ids: ["7N07.2"],
        difficulty: "Moderate",
        summary: "Scenic plated road from the Santa Ynez Valley into the forest.",
        description:
          "Happy Canyon (7N07) climbs from the Santa Ynez Valley up into the Los Padres backcountry, transitioning from oak-dotted ranch country to chaparral forest. A long, scenic road for street-legal bikes only, a classic plated dual-sport climb toward Figueroa Mountain country.",
        surface: "Graded dirt, smooth lower, rougher up high",
        bestSeason: "Spring–fall",
        highlights: [
          "Santa Ynez Valley to forest transition",
          "Toward Figueroa Mountain country",
          "Long scenic plated climb",
        ],
      },
    ],
  },

  // Lake Arrowhead / Deep Creek (San Bernardino N.F.) — the front-country OHV
  // country west of Big Bear: the Crab Flats and Deep Creek green-sticker roads
  // and singletrack, plus the Cleghorn / Pilot Rock ridges above Silverwood.
  // Green-sticker first, then the long plated backcountry road.
  "lake-arrowhead": {
    routes: [
      {
        id: "crab-flats-road", name: "Crab Flats Road", ids: ["3N34"],
        difficulty: "Moderate",
        summary: "The hub of the Crab Flats green-sticker network near Green Valley Lake.",
        description:
          "3N34 runs through the Crab Flats area between Green Valley Lake and the Deep Creek country, the staging hub for this corner of the forest. Graded dirt with rockier, rutted stretches through pine and cedar, linking the campground to the OHV roads and trails around it. Part of it is open to all vehicles and part is open to street-legal vehicles only, so green-sticker access depends on the segment.",
        surface: "Graded dirt with rocky, rutted sections",
        bestSeason: "May–November (snow closes it in winter)",
        highlights: [
          "Staging hub for the Crab Flats OHV network",
          "Green-sticker access on part of the road",
          "Pine-and-cedar country near Green Valley Lake",
        ],
      },
      {
        id: "deep-creek-singletrack", name: "Deep Creek OHV Singletrack", ids: ["2W01"], layer: 2,
        difficulty: "Difficult",
        summary: "Designated motorcycle singletrack in the Deep Creek country.",
        description:
          "Trail 2W01 is a designated motorcycle trail threading the slopes above Deep Creek, narrow green-sticker singletrack with rocky, twisting tread well off the fire roads. This is the kind of riding people come to this side of the forest for: true singletrack, motorcycles only, not a graded road. Short, but it pairs naturally with the Crab Flats roads for a real green-sticker day.",
        surface: "Narrow, rocky motorcycle singletrack",
        bestSeason: "May–November (snow closes it in winter)",
        highlights: [
          "Designated motorcycle-only singletrack",
          "Above the Deep Creek drainage",
          "True green-sticker trail, not a fire road",
        ],
      },
      {
        id: "cleghorn-ridge", name: "Cleghorn Ridge OHV Road", ids: ["2N47"],
        difficulty: "Moderate",
        summary: "Long green-sticker ridge road above Silverwood Lake, about 15 miles.",
        description:
          "2N47 runs the Cleghorn Ridge above Silverwood Lake and the Cajon Pass, roughly 15 miles open to all vehicles the length of its OHV stretch. That makes it the rare thing on a dirt bike: a long green-sticker ride, not just a short spur. Rocky, high-clearance tread along an exposed chaparral ridge with big views down to the lake and out over the pass, well away from the Crab Flats crowds.",
        surface: "Rocky, high-clearance ridge dirt",
        bestSeason: "Year-round (hot in summer, muddy after storms)",
        highlights: [
          "About 15 miles of designated green-sticker road",
          "Views over Silverwood Lake and Cajon Pass",
          "Exposed chaparral ridge riding",
        ],
      },
      {
        id: "miller-canyon", name: "Miller Canyon OHV Road", ids: ["2N37"],
        difficulty: "Moderate",
        summary: "Short green-sticker road dropping through Miller Canyon.",
        description:
          "2N37 follows Miller Canyon as a road open to all vehicles, a compact green-sticker option with sandy canyon-bottom stretches and rockier benches through chaparral on the slopes below Crab Flats. A quick, scenic ride and a natural add-on to a bigger green-sticker day in the area rather than a destination on its own.",
        surface: "Sandy canyon bottom with rocky benches",
        bestSeason: "Year-round (hot in summer, muddy after storms)",
        highlights: [
          "Designated green-sticker road",
          "Sandy canyon-bottom character",
          "Pairs with the Crab Flats network",
        ],
      },
      {
        id: "pilot-rock-road", name: "Pilot Rock Road", ids: ["2N33"],
        difficulty: "Moderate",
        summary: "Long ridge road between Lake Arrowhead and Silverwood, partly green-sticker.",
        description:
          "2N33 works the ridge between the Lake Arrowhead crest and Silverwood Lake past the Pilot Rock landmark, a long high-clearance road with rocky, rutted climbs and long views in both directions. Part of it is open to all vehicles and part is open to street-legal vehicles only, so green-sticker access shifts from one segment to the next.",
        surface: "High-clearance dirt with rocky, rutted climbs",
        bestSeason: "Year-round (hot in summer, muddy after storms)",
        highlights: [
          "Long ridge between Arrowhead and Silverwood",
          "Green-sticker access on part of the road",
          "Pilot Rock landmark and big two-way views",
        ],
      },
      {
        id: "bailey-canyon", name: "Bailey Canyon Road", ids: ["2N49"],
        difficulty: "Difficult",
        summary: "Long, remote plated backcountry road on the west side of the area.",
        description:
          "2N49 pushes a long way through the Bailey Canyon backcountry on the Silverwood / Cleghorn side, roughly 16 miles of rough, high-clearance road through remote chaparral and oak. It's open to street-legal vehicles only, so it's a plated dual-sport ride: quiet, committing, and a good way to cover ground away from the OHV staging areas. Carry water and go prepared.",
        surface: "Long, rough high-clearance backcountry dirt",
        bestSeason: "Spring and fall (hot in summer, muddy after storms)",
        highlights: [
          "About 16 miles of remote backcountry",
          "Quiet plated dual-sport riding",
          "Chaparral-and-oak Silverwood country",
        ],
      },
    ],
  },

  // San Gorgonio front (San Bernardino N.F.) — the Santa Ana River, Barton Flats
  // and Heart Bar country on the south side of the range, below the San Gorgonio
  // Wilderness. Entirely plated dual-sport: no green-sticker roads here.
  "san-gorgonio": {
    routes: [
      {
        id: "coon-creek-jumpoff", name: "Coon Creek Jumpoff Road", ids: ["1N02"],
        difficulty: "Difficult",
        summary: "Rough high-clearance road to the Coon Creek Jumpoff overlook.",
        description:
          "1N02 climbs and traverses to the Coon Creek Jumpoff, a dramatic overlook where the forest drops away toward the desert below San Gorgonio. The road is genuinely rough in stretches, rocky, eroded, high-clearance dual-sport riding, with one of the bigger view payoffs in the area. Open to street-legal vehicles only, so plated bikes only.",
        surface: "Rough, rocky, eroded high-clearance dirt",
        bestSeason: "May–November (snow up high in winter)",
        highlights: [
          "Overlook where the forest drops to the desert",
          "Genuinely rough high-clearance riding",
          "One of the best view payoffs in the area",
        ],
      },
      {
        id: "radford-front-line", name: "Radford Front Line Road", ids: ["1N04"],
        difficulty: "Moderate",
        summary: "Long front-line road through the Barton Flats high country.",
        description:
          "1N04 runs the front line through the Barton Flats and Santa Ana River high country, a long graded-to-rocky road serving the camps, trailheads, and overlooks along the south side of the range. A scenic plated dual-sport ride with steady mileage and pine-forest views toward San Gorgonio. Open to street-legal vehicles only.",
        surface: "Graded dirt with rockier sections",
        bestSeason: "May–November (snow up high in winter)",
        highlights: [
          "Long ride through the Barton Flats country",
          "Camps, trailheads, and overlooks",
          "Pine-forest views toward San Gorgonio",
        ],
      },
      {
        id: "wildhorse-meadow", name: "Wildhorse Meadow Road", ids: ["2N93"],
        difficulty: "Moderate",
        summary: "Long high-clearance climb to Wildhorse Meadow, about 11 miles.",
        description:
          "2N93 runs about 11 miles up toward Wildhorse Meadow on the slopes above the Santa Ana River, a high-clearance road mixing rocky climbs with forest and meadow as it gains real elevation toward the crest. A quieter plated ride with cool conifer country and meadows near the top. Open to street-legal vehicles only.",
        surface: "Rocky, high-clearance climb",
        bestSeason: "May–November (snow up high in winter)",
        highlights: [
          "Climbs to Wildhorse Meadow",
          "Forest-and-meadow high country",
          "Quieter than the front-line roads",
        ],
      },
      {
        id: "fish-creek-meadows", name: "Fish Creek Meadows Road", ids: ["1N05"],
        difficulty: "Moderate",
        summary: "Forest road into the Fish Creek and Heart Bar meadows.",
        description:
          "1N05 runs into the Fish Creek and Heart Bar Meadows country on the east end of the area, graded forest road through pine and meadow toward the Fish Creek trailheads near the San Gorgonio Wilderness boundary. A relaxed, scenic plated ride; the wilderness itself is closed to motors, so the trailheads are places to park, not ride. Open to street-legal vehicles only.",
        surface: "Graded dirt with rocky sections",
        bestSeason: "May–November (snow up high in winter)",
        highlights: [
          "Into the Fish Creek and Heart Bar meadows",
          "Pine-and-meadow forest scenery",
          "Trailheads near the San Gorgonio Wilderness",
        ],
      },
      {
        id: "city-creek", name: "City Creek Road", ids: ["1N09"],
        difficulty: "Moderate",
        summary: "Long graded traverse along the front of the range, about 22 miles.",
        description:
          "1N09 is the long one here: roughly 22 miles of graded road traversing the front of the range above the City Creek drainage, the kind of ride you do to cover ground rather than for any single feature. The grade is gentle but the distance is real, winding through chaparral and oak with views out over the San Bernardino Valley. Open to street-legal vehicles only.",
        surface: "Long graded dirt, gentle grade",
        bestSeason: "Year-round (hot in summer)",
        highlights: [
          "About 22 miles along the range front",
          "Views over the San Bernardino Valley",
          "Distance ride, not a technical one",
        ],
      },
    ],
  },

  // Palomar (Cleveland N.F.) — the compact third district of the Cleveland after
  // the Santa Anas and the Lagunas. A small, entirely plated network on Palomar
  // Mountain in north San Diego County: the long Palomar Divide ridge, the climb
  // to the High Point lookout, and Indian Flats.
  "palomar": {
    routes: [
      {
        id: "palomar-divide", name: "Palomar Divide Road", ids: ["9S07"],
        difficulty: "Moderate",
        summary: "The long backbone ridge of Palomar Mountain, about 13 miles.",
        description:
          "9S07 runs the Palomar Divide the length of the mountain, roughly 13 miles of graded-to-rocky ridge road through oak and conifer with sweeping views over the San Diego backcountry and out to the desert. The signature ride on Palomar: a long, scenic plated dual-sport cruise, smoother than the Santa Ana divide but every bit as scenic. Open to street-legal vehicles only.",
        surface: "Graded-to-rocky ridge road",
        bestSeason: "Spring and fall (hot in summer, muddy after storms)",
        highlights: [
          "About 13 miles along the Palomar crest",
          "Big San Diego backcountry and desert views",
          "The signature ride on the mountain",
        ],
      },
      {
        id: "high-point", name: "High Point Road", ids: ["8S05"],
        difficulty: "Moderate",
        summary: "High-clearance climb on the northeast flank of Palomar Mountain.",
        description:
          "8S05 climbs the northeast flank of Palomar above the Aguanga and Lake Henshaw side, gaining a couple of thousand feet of forest through conifer and oak. A high-clearance road with rocky sections and a steadier, more remote feel than the divide. It tops out around 4,900 feet, below the High Point lookout itself, which sits on a separate gated road. Open to street-legal vehicles only.",
        surface: "High-clearance dirt with rocky sections",
        bestSeason: "Spring and fall (hot in summer, muddy after storms)",
        highlights: [
          "Forested climb on the northeast flank",
          "Quieter, remote-feeling high-clearance road",
          "Tops out around 4,900 feet",
        ],
      },
      {
        id: "indian-flats", name: "Indian Flats Road", ids: ["9S05"],
        difficulty: "Moderate",
        summary: "Backcountry road into the Indian Flats country on the north side.",
        description:
          "9S05 drops into the Indian Flats country on the north side of Palomar near Lake Henshaw, a graded-to-rocky backcountry road through chaparral and oak toward the Indian Flats campground. A quieter plated ride than the divide, with a more remote feel and good seat time. Open to street-legal vehicles only.",
        surface: "Graded dirt with rocky sections",
        bestSeason: "Spring and fall (hot in summer, muddy after storms)",
        highlights: [
          "Into the remote Indian Flats country",
          "Toward the Indian Flats campground",
          "Quieter companion to the Divide",
        ],
      },
      {
        id: "oak-grove-road", name: "Oak Grove Road", ids: ["9S09"],
        difficulty: "Easy",
        summary: "Short access road linking Highway 79 to the Palomar Divide.",
        description:
          "9S09 is the short access road off Highway 79 at Oak Grove that ties into the Palomar Divide, an easy graded climb through oak and chaparral. Brief on its own, but it's the natural way onto the ridge from the east, so it earns its place as the connector that starts a divide day. Open to street-legal vehicles only.",
        surface: "Short graded climb, generally smooth",
        bestSeason: "Spring and fall (hot in summer, muddy after storms)",
        highlights: [
          "Eastern access onto the Palomar Divide",
          "Easy oak-and-chaparral grade",
          "The natural start of a divide day",
        ],
      },
    ],
  },

  // Big Bear (San Bernardino N.F.) — migrated onto the MVUM pipeline so its
  // geometry, access, distance and elevation are all derived like every other
  // area (it used to be hand-authored from OpenStreetMap). Pinyon/Vista is the
  // designated OHV singletrack, split in the MVUM as trail segments 2E20.1-.5.
  "big-bear": {
    routes: [
      {
        id: "pinyon-vista", name: "Cactus Flat OHV Singletrack",
        ids: ["2E20.1", "2E20.2", "2E20.3", "2E20.4", "2E20.5"], layer: 2,
        difficulty: "Moderate",
        summary: "Big Bear's designated OHV trail tread, narrow-gauge, not a fire road.",
        description:
          "The 2E20 system is the designated OHV trail network off the upper Cactus Flat / Smarts Ranch road (3N03), in the pinyon and juniper north of Baldwin Lake. Narrow, wheeled-OHV tread under 50 inches, sandy with rocky sections, the closest thing in the area to true singletrack and the one featured ride here that's open to green-sticker dirt bikes the whole way.",
        surface: "Narrow OHV tread (≤50 in.), sandy with rocky sections",
        bestSeason: "April–November",
        highlights: [
          "Designated OHV trail, not a fire road",
          "Fully green-sticker (wheeled OHV under 50 inches)",
          "Pinyon-and-juniper country north of Baldwin Lake",
        ],
      },
      {
        id: "holcomb-valley", name: "Holcomb Valley Loop", ids: ["3N16"],
        difficulty: "Easy",
        summary: "Historic gold-rush basin with mellow, flowing dirt road riding.",
        description:
          "Looping through the old Holcomb Valley mining district north of Big Bear Lake, this is mostly wide, graded forest road with gentle grades and pine-shaded meadows. A great warm-up or family-friendly route with plenty of historic stops like Belleville and the Hangman's Tree.",
        surface: "Graded dirt road with occasional washboard",
        bestSeason: "May–October",
        highlights: [
          "Historic gold-mining sites and interpretive markers",
          "Open meadows and easy navigation",
          "Connects to many other Big Bear backcountry roads",
        ],
      },
      {
        id: "gold-mountain", name: "Gold Mountain / Dishpan Springs", ids: ["3N69"],
        difficulty: "Difficult",
        summary: "Scenic climb past old mines to wide high-desert overlooks.",
        description:
          "A technical climb up the flanks of Gold Mountain with mixed dirt and rocky pitches, passing relics of the area's mining past. The upper sections open to sweeping views across Baldwin Lake and the high desert toward Lucerne Valley.",
        surface: "Dirt road with loose rock and rutted climbs",
        bestSeason: "May–October",
        highlights: [
          "Big views over Baldwin Lake and the desert",
          "Historic mine sites",
          "Links the John Bull area",
        ],
      },
      {
        id: "cactus-flats", name: "Cactus Flat OHV Area", ids: ["3N03"],
        difficulty: "Moderate",
        summary: "East-side OHV staging hub feeding the area's road network.",
        description:
          "Off Highway 18 north of Big Bear, Cactus Flat is a designated OHV staging area (vault toilet, parking, signage) feeding Smarts Ranch Rd (3N03) through pinyon and juniper. Terrain ranges from easy dirt road to looser, sandier routes.",
        surface: "Mixed dirt and sandy tread with rocky sections",
        bestSeason: "April–November",
        highlights: [
          "Established OHV staging and parking",
          "Green-sticker access on part of the road",
          "High-desert transition scenery",
        ],
      },
      {
        id: "coxey-road", name: "Coxey Road Connector", ids: ["3N14"],
        difficulty: "Easy",
        summary: "Long, mellow graded road, the backbone of the backcountry.",
        description:
          "Coxey Road runs from Fawnskin toward the northern forest boundary. Smooth and beginner-friendly with long sight lines, it's ideal for building seat time or covering ground between trail systems.",
        surface: "Wide graded dirt, generally smooth",
        bestSeason: "April–November",
        highlights: [
          "Great for beginners and warm-ups",
          "Central connector to the northern road network",
          "Forest and meadow scenery",
        ],
      },
      {
        id: "van-dusen-canyon", name: "Van Dusen Canyon Road", ids: ["3N09"],
        difficulty: "Easy",
        summary: "Historic stage road, an easy, scenic climb from town toward Holcomb Valley.",
        description:
          "A wide, smooth dirt road following the old Van Dusen Canyon stage route from Big Bear City up to Holcomb Valley. Gentle and beginner-friendly under a canopy of pines, one of the most accessible ways into the backcountry.",
        surface: "Wide, smooth graded dirt",
        bestSeason: "April–November",
        highlights: [
          "Historic Van Dusen stage route",
          "Gentle, beginner-friendly grade",
          "Direct line into Holcomb Valley",
        ],
      },
      {
        id: "arrastre-creek", name: "Arrastre Creek Road", ids: ["2N02"],
        difficulty: "Moderate",
        summary: "Long east-side graded road with one green-sticker stretch.",
        description:
          "Arrastre Creek Road runs from Baldwin Lake Road east toward the forest boundary, climbing through Jeffrey pine and high-desert transition. A scenic, moderate ride, mostly plate-only, with one segment open to all vehicles.",
        surface: "Graded dirt with rocky, rutted sections",
        bestSeason: "May–October",
        highlights: [
          "Long, scenic east-side mileage",
          "Jeffrey pine and high-desert transition",
          "Quieter than the OHV staging areas",
        ],
      },
      {
        id: "john-bull", name: "John Bull Trail", ids: ["3N10"],
        difficulty: "Expert",
        summary:
          "Big Bear's most famous trail, a brutal experts-only rock crawl that's more bragging rights than flow on a bike.",
        description:
          "One of the most famous technical trails in Southern California, John Bull is a relentless field of granite boulders and step-ups. The Forest Service rates it black-diamond / most difficult. On a dirt bike it demands expert balance, line choice, and clutch control, and most riders find it more punishing than fun. Ranked low here because it's plate-only and a sufferfest on two wheels, not because it isn't famous. Never ride it alone.",
        surface: "Large granite boulders and rock ledges",
        bestSeason: "June–September",
        highlights: [
          "Iconic technical rock obstacles",
          "Big payoff views from the high desert edge",
          "Connects to the Gold Mountain network",
        ],
      },
    ],
  },
};

// ---- geometry + access from the MVUM -----------------------------------------
// layer 1 = roads, layer 2 = trails (same schema, so the rest of the pipeline
// is identical — a featured route just declares which layer it lives on).
async function fetchFeature(ids, bbox, layer = 1) {
  const where = ids.map((i) => `id='${i.replace(/'/g, "''")}'`).join(" OR ");
  const url =
    `${BASE}/${layer}/query?where=${encodeURIComponent(where)}` +
    `&geometry=${encodeURIComponent(bbox)}&geometryType=esriGeometryEnvelope` +
    `&inSR=4326&spatialRel=esriSpatialRelIntersects` +
    `&outFields=id,name,mvum_symbol_name,seasonal,motorcycle,other_ohv_lt50inches,atv,gis_miles` +
    `&returnGeometry=true&outSR=4326&f=geojson`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`layer ${layer} ${ids} HTTP ${res.status}`);
  const json = await res.json();
  return json.features ?? [];
}

const isOpen = (v) => typeof v === "string" && v.toLowerCase() === "open";
function segAccess(p) {
  const sym = (p.mvum_symbol_name || "").toLowerCase();
  return isOpen(p.motorcycle) || isOpen(p.other_ohv_lt50inches) || isOpen(p.atv) || sym.includes("open to all")
    ? "green"
    : "plate";
}

// Greedy-stitch line parts into one ordered path by nearest endpoints.
const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
function stitch(parts) {
  parts = parts.filter((p) => p.length > 1).map((p) => p.slice());
  if (!parts.length) return [];
  parts.sort((a, b) => b.length - a.length);
  let path = parts.shift();
  while (parts.length) {
    const tail = path[path.length - 1];
    const head = path[0];
    let best = { d: Infinity };
    parts.forEach((seg, i) => {
      const s = seg[0];
      const e = seg[seg.length - 1];
      for (const c of [
        { d: d2(tail, s), i, flip: false, end: "tail" },
        { d: d2(tail, e), i, flip: true, end: "tail" },
        { d: d2(head, e), i, flip: false, end: "head" },
        { d: d2(head, s), i, flip: true, end: "head" },
      ])
        if (c.d < best.d) best = c;
    });
    const seg = parts.splice(best.i, 1)[0];
    const o = best.flip ? seg.slice().reverse() : seg;
    path = best.end === "tail" ? path.concat(o) : o.concat(path);
  }
  return path;
}

function haversineMi(a, b) {
  const R = 3958.8;
  const toR = (d) => (d * Math.PI) / 180;
  const dLat = toR(b[1] - a[1]);
  const dLon = toR(a[0] - b[0]);
  const la1 = toR(a[1]);
  const la2 = toR(b[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// ---- elevation (best-effort) -------------------------------------------------
async function fetchElevations(coords) {
  // sample <= 90 points evenly
  const N = Math.min(90, coords.length);
  const idx = Array.from({ length: N }, (_, i) =>
    Math.round((i * (coords.length - 1)) / (N - 1)),
  );
  const locs = idx.map((i) => `${coords[i][1]},${coords[i][0]}`).join("|");
  try {
    const res = await fetch(
      `https://api.opentopodata.org/v1/srtm90m?locations=${locs}`,
      { headers: { "User-Agent": UA } },
    );
    if (!res.ok) return null;
    const json = await res.json();
    if (json.status !== "OK") return null;
    return idx.map((i, k) => ({ i, ele: json.results[k]?.elevation ?? null }));
  } catch {
    return null;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fmtFt = (m) => Math.round((m * 3.28084) / 50) * 50;

function accessNote(name, ids, access, seasonal, isTrail = false) {
  const id = ids[0];
  const season = seasonal
    ? " This route has a seasonal (wet-weather) closure, so confirm it's open before you go."
    : "";
  if (isTrail)
    // Trails are motorcycle/OHV singletrack — green-sticker by nature.
    return `Per the MVUM, trail ${id} is a designated OHV trail open to motorcycles, so green-sticker (non-street-legal) bikes are allowed. Being narrow-gauge singletrack, it's a true OHV trail, not a road. Registration + spark arrestor required.${season}`;
  if (access === "yes")
    return `Per the MVUM, ${id} is designated open to all vehicles, so green-sticker (non-street-legal) bikes are allowed. Registration + spark arrestor required.${season}`;
  if (access === "partial")
    return `Per the MVUM, ${name} is mixed: some segments are open to all vehicles (green-sticker OK) and others are open to street-legal vehicles only, so access goes segment by segment. Read the signs at each junction; registration + spark arrestor required.${season}`;
  return `Per the MVUM, ${id} is open to street-legal vehicles only: plated bikes, no green-sticker (non-street-legal) bikes.${season}`;
}

async function buildRoute(cfg, bbox) {
  const layer = cfg.layer ?? 1;
  const feats = await fetchFeature(cfg.ids, bbox, layer);
  if (!feats.length) {
    console.warn(`  ! ${cfg.id}: no MVUM features for ${cfg.ids.join(",")} (layer ${layer})`);
    return null;
  }
  const parts = [];
  const accesses = new Set();
  let seasonal = false;
  for (const f of feats) {
    accesses.add(segAccess(f.properties));
    const s = (f.properties.seasonal || "").toLowerCase().trim();
    if (s && s !== "yearlong") seasonal = true;
    const g = f.geometry;
    if (!g) continue;
    if (g.type === "LineString") parts.push(g.coordinates);
    else if (g.type === "MultiLineString") parts.push(...g.coordinates);
  }
  const path = stitch(parts);
  if (path.length < 2) {
    console.warn(`  ! ${cfg.id}: empty geometry`);
    return null;
  }
  const access = accesses.has("green") && accesses.has("plate")
    ? "partial"
    : accesses.has("green")
      ? "yes"
      : "no";

  let miles = 0;
  for (let i = 1; i < path.length; i++) miles += haversineMi(path[i - 1], path[i]);

  // elevation
  const eleSamples = await fetchElevations(path);
  const eleByIdx = new Map((eleSamples ?? []).map((s) => [s.i, s.ele]));
  let eMin = Infinity, eMax = -Infinity, hasEle = false;
  if (eleSamples) {
    for (const s of eleSamples)
      if (s.ele != null) { hasEle = true; eMin = Math.min(eMin, s.ele); eMax = Math.max(eMax, s.ele); }
  }

  // GPX (interpolate elevation onto every point from the samples we have)
  const sampledIdx = (eleSamples ?? []).filter((s) => s.ele != null).map((s) => s.i);
  const eleAt = (i) => {
    if (!hasEle) return null;
    // nearest sampled index
    let best = sampledIdx[0];
    for (const si of sampledIdx) if (Math.abs(si - i) < Math.abs(best - i)) best = si;
    return eleByIdx.get(best);
  };
  const trkpts = path
    .map((c, i) => {
      const e = eleAt(i);
      return `    <trkpt lat="${c[1].toFixed(5)}" lon="${c[0].toFixed(5)}">${
        e != null ? `<ele>${e.toFixed(1)}</ele>` : ""
      }</trkpt>`;
    })
    .join("\n");
  const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="dirt-bikes build-area-routes (MVUM geometry + SRTM elevation)" xmlns="http://www.topografix.com/GPX/1/1">
  <trk><name>${cfg.name}</name><trkseg>
${trkpts}
  </trkseg></trk>
</gpx>
`;
  await writeFile(new URL(`../public/gpx/${cfg.id}.gpx`, import.meta.url), gpx);

  const route = {
    id: cfg.id,
    name: cfg.name,
    forestRoad: cfg.ids.join(", "),
    summary: cfg.summary,
    description: cfg.description,
    distanceMiles: Math.round(miles * 10) / 10,
    difficulty: cfg.difficulty,
    ...(hasEle ? { elevationFt: `${fmtFt(eMin).toLocaleString()}–${fmtFt(eMax).toLocaleString()} ft` } : {}),
    surface: cfg.surface,
    bestSeason: cfg.bestSeason,
    access: {
      streetLegal: true,
      greenSticker: access,
      note: accessNote(cfg.name, cfg.ids, access, seasonal, layer === 2),
      source: MVUM,
    },
    highlights: cfg.highlights,
    trailhead: {
      name: `${cfg.name} (${cfg.ids[0]})`,
      lat: Math.round(path[0][1] * 1e4) / 1e4,
      lng: Math.round(path[0][0] * 1e4) / 1e4,
    },
  };
  console.log(
    `  ✓ ${cfg.id}: ${route.distanceMiles}mi, ${access}${seasonal ? "/seasonal" : ""}, ` +
      `${hasEle ? route.elevationFt : "no elev"}, ${path.length} pts`,
  );
  return route;
}

const varName = (area) =>
  area.replace(/-([a-z])/g, (_, c) => c.toUpperCase()) + "Routes";

await mkdir(new URL("../public/gpx/", import.meta.url), { recursive: true });
const targets = process.argv.slice(2).length
  ? process.argv.slice(2)
  : Object.keys(CONFIG);

for (const area of targets) {
  const cfg = CONFIG[area];
  if (!cfg) {
    console.error(`Unknown area "${area}"`);
    continue;
  }
  console.log(`\n== ${area} ==`);
  const routes = [];
  for (const r of cfg.routes) {
    const route = await buildRoute(r, BBOX[area]);
    if (route) routes.push(route);
    await sleep(1200); // be polite to opentopodata (1 req/s)
  }
  const ts = `// AUTO-GENERATED by scripts/build-area-routes.mjs — do not edit by hand.
// Geometry & access: USFS MVUM (EDW_MVUM_01). Elevation: SRTM via opentopodata.
// Prose, difficulty, and ordering are editorial (see the script's CONFIG).
import type { Route } from "../types";

export const ${varName(area)}: Route[] = ${JSON.stringify(routes, null, 2)};
`;
  await writeFile(new URL(`../lib/routes/${area}.generated.ts`, import.meta.url), ts);
  console.log(`Wrote lib/routes/${area}.generated.ts (${routes.length} routes)`);
}
