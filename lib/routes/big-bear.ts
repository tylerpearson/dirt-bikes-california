import type { Route } from "../types";

/**
 * Big Bear–area OHV / dirt bike routes, ordered best → worst (editorial).
 *
 * ACCESS DATA comes from the USFS Motor Vehicle Use Map (MVUM) GIS layer
 * (EDW_MVUM_01), queried June 2026. Street-legal plated vehicles are allowed on
 * every route below; green-sticker (non-street-legal) access is the part that
 * varies — and on mixed roads it varies BY SEGMENT, so "partial" means only part
 * of the road is open to OHVs (read each note). The MVUM is updated periodically;
 * confirm the current map before riding. Route geometry is from OpenStreetMap;
 * trailhead coordinates, mileage, and elevation are approximate.
 *
 * CA sticker rules (current): since Jan 1 2025 red and green stickers are equally
 * valid year-round in OHV-designated areas; a new tan sticker replaces the red
 * sticker for model-year 2022+ non-compliant bikes. As of Jan 1 2026, electric
 * off-road motorcycles count as OHVs and need a green sticker.
 */
const MVUM = "USFS Motor Vehicle Use Map (MVUM), 2026";

export const bigBearRoutes: Route[] = [
  {
    id: "john-bull",
    name: "John Bull Trail",
    forestRoad: "3N10",
    summary: "Big Bear's legendary boulder-strewn rock crawl, for experts only.",
    description:
      "One of the most famous technical trails in Southern California, John Bull is a relentless field of granite boulders and step-ups. The Forest Service rates it black-diamond / most difficult. On a dirt bike it demands expert balance, line choice, and clutch control. Never ride it alone.",
    distanceMiles: 5,
    difficulty: "Expert",
    elevationFt: "7,200–7,800 ft",
    surface: "Large granite boulders and rock ledges",
    bestSeason: "June–September",
    access: {
      streetLegal: true,
      greenSticker: "no",
      note: "Despite its OHV-trail reputation, the MVUM lists 3N10 and its spurs as open to highway-legal vehicles only, a plated, street-legal bike route, not a green-sticker one. Expert rock; never ride it alone.",
      source: MVUM,
    },
    highlights: [
      "Iconic technical rock obstacles",
      "Big payoff views from the high desert edge",
      "Connects to the Gold Mountain network",
    ],
    trailhead: {
      name: "John Bull Trailhead (3N10)",
      lat: 34.2789,
      lng: -116.8005,
    },
  },
  {
    id: "holcomb-valley",
    name: "Holcomb Valley Loop",
    forestRoad: "3N16",
    summary: "Historic gold-rush basin with mellow, flowing dirt road riding.",
    description:
      "Looping through the old Holcomb Valley mining district north of Big Bear Lake, this is mostly wide, graded forest road with gentle grades and pine-shaded meadows. A great warm-up or family-friendly route with plenty of historic stops like Belleville and the Hangman's Tree.",
    distanceMiles: 23,
    difficulty: "Easy",
    elevationFt: "7,000–7,400 ft",
    surface: "Graded dirt road with occasional washboard",
    bestSeason: "May–October",
    access: {
      streetLegal: true,
      greenSticker: "partial",
      note: "Per the MVUM, 3N16 is mostly highway-legal-only, but one segment (around the Crab Flats / 3N34 area) is open to all vehicles, so green-sticker bikes are allowed on that portion only, not the stretches toward Green Valley Lake, Big Bear, or Fawnskin. Registration + spark arrestor required.",
      source: MVUM,
    },
    highlights: [
      "Historic gold-mining sites and interpretive markers",
      "Open meadows and easy navigation",
      "Connects to many other Big Bear backcountry roads",
    ],
    trailhead: {
      name: "Holcomb Valley Rd / 3N16 staging",
      lat: 34.3122,
      lng: -116.9183,
    },
  },
  {
    id: "pinyon-vista",
    name: "Pinyon & Vista OHV Trails",
    forestRoad: "2E20",
    summary: "Big Bear's beginner-friendly OHV singletrack, the trails, not a fire road.",
    description:
      "A well-marked network of designated OHV trails (Pinyon, Vista, Joshua Loop) running from the Cactus Flat staging area through pinyon and juniper. Easy-to-moderate 'terra trail' tread that's genuinely fun on a dirt bike, the closest thing here to true singletrack.",
    distanceMiles: 2,
    difficulty: "Moderate",
    elevationFt: "6,100–6,400 ft",
    surface: "Narrow OHV tread (≤50 in.), sandy with rocky sections",
    bestSeason: "April–November",
    access: {
      streetLegal: true,
      greenSticker: "yes",
      note: "Per the MVUM, these are designated OHV trails open to wheeled OHVs under 50 inches wide, year-round, green-sticker (and red-sticker, in season) dirt bikes welcome. Registration + spark arrestor required. The singletrack option, not a fire road.",
      source: MVUM,
    },
    highlights: [
      "Real OHV singletrack, not a fire road",
      "Well-marked and beginner-friendly",
      "Loops straight from the Cactus Flat staging area",
    ],
    trailhead: {
      name: "Cactus Flat OHV Staging (2E20 trails)",
      lat: 34.221,
      lng: -116.732,
    },
  },
  {
    id: "gold-mountain",
    name: "Gold Mountain / Dishpan Springs",
    forestRoad: "3N69",
    summary: "Scenic climb past old mines to wide high-desert overlooks.",
    description:
      "A technical climb up the flanks of Gold Mountain with mixed dirt and rocky pitches, passing relics of the area's mining past. The upper sections open to sweeping views across Baldwin Lake and the high desert toward Lucerne Valley.",
    distanceMiles: 4,
    difficulty: "Difficult",
    elevationFt: "6,900–8,200 ft",
    surface: "Dirt road with loose rock and rutted climbs",
    bestSeason: "May–October",
    access: {
      streetLegal: true,
      greenSticker: "no",
      note: "Per the MVUM, 3N69 is open to highway-legal vehicles only, plated bikes only; green-sticker (non-street-legal) bikes are not permitted. A technical, high-clearance climb.",
      source: MVUM,
    },
    highlights: [
      "Big views over Baldwin Lake and the desert",
      "Historic mine sites",
      "Links the John Bull area",
    ],
    trailhead: {
      name: "Gold Mountain / 3N69 junction",
      lat: 34.27,
      lng: -116.83,
    },
  },
  {
    id: "cactus-flats",
    name: "Cactus Flat OHV Area",
    forestRoad: "3N03",
    summary: "East-side OHV staging hub feeding the area's trail network.",
    description:
      "Off Highway 18 north of Big Bear, Cactus Flat is a designated OHV staging area (vault toilet, parking, signage) feeding Smarts Ranch Rd (3N03) and the Pinyon/Vista trail network through pinyon and juniper. Terrain ranges from easy dirt road to looser, sandier routes.",
    distanceMiles: 7,
    difficulty: "Moderate",
    elevationFt: "6,400–7,000 ft",
    surface: "Mixed dirt and sandy tread with rocky sections",
    bestSeason: "April–November",
    access: {
      streetLegal: true,
      greenSticker: "partial",
      note: "Per the MVUM, Smarts Ranch Rd (3N03) is part highway-legal-only and part open-to-all-vehicles, so green-sticker access is segment-by-segment, but the staging area's OHV trails (Pinyon/Vista, 2E20) are fully green-sticker. Registration + spark arrestor required.",
      source: MVUM,
    },
    highlights: [
      "Established OHV staging and parking",
      "Gateway to the Pinyon/Vista trail network",
      "High-desert transition scenery",
    ],
    trailhead: {
      name: "Cactus Flat Staging Area (3N03)",
      lat: 34.221,
      lng: -116.732,
    },
  },
  {
    id: "coxey-road",
    name: "Coxey Road Connector",
    forestRoad: "3N14",
    summary: "Long, mellow graded road, the backbone of the backcountry.",
    description:
      "Coxey Road runs ~17.8 miles from Fawnskin to the northern forest boundary. Smooth and beginner-friendly with long sight lines, it's ideal for building seat time or covering ground between trail systems.",
    distanceMiles: 13,
    difficulty: "Easy",
    elevationFt: "6,700–7,300 ft",
    surface: "Wide graded dirt, generally smooth",
    bestSeason: "April–November",
    access: {
      streetLegal: true,
      greenSticker: "partial",
      note: "Per the MVUM, 3N14 is part highway-legal-only and part open-to-all-vehicles, so green-sticker bikes are allowed on the open-to-all segment (north toward the forest boundary), not the lower stretch from Fawnskin. Registration + spark arrestor required.",
      source: MVUM,
    },
    highlights: [
      "Great for beginners and warm-ups",
      "Central connector to the northern road network",
      "Forest and meadow scenery",
    ],
    trailhead: {
      name: "Coxey Rd / 3N14 entrance",
      lat: 34.305,
      lng: -116.885,
    },
  },
  {
    id: "van-dusen-canyon",
    name: "Van Dusen Canyon Road",
    forestRoad: "3N09",
    summary: "Historic stage road, an easy, scenic climb from town toward Holcomb Valley.",
    description:
      "A wide, smooth dirt road following the old Van Dusen Canyon stage route from Big Bear City up to Holcomb Valley. Gentle and beginner-friendly under a canopy of pines, one of the most accessible ways into the backcountry.",
    distanceMiles: 4,
    difficulty: "Easy",
    elevationFt: "6,800–7,400 ft",
    surface: "Wide, smooth graded dirt",
    bestSeason: "April–November",
    access: {
      streetLegal: true,
      greenSticker: "no",
      note: "Per the MVUM, 3N09 is open to highway-legal vehicles only, plated bikes only; green-sticker bikes are not permitted. A gentle, scenic connector to Holcomb Valley.",
      source: MVUM,
    },
    highlights: [
      "Historic Van Dusen stage route",
      "Gentle, beginner-friendly grade",
      "Direct line into Holcomb Valley",
    ],
    trailhead: {
      name: "Van Dusen Canyon Rd (3N09), Big Bear City",
      lat: 34.262,
      lng: -116.905,
    },
  },
  {
    id: "arrastre-creek",
    name: "Arrastre Creek Road",
    forestRoad: "2N02",
    summary: "Long east-side graded road with one green-sticker-legal stretch.",
    description:
      "Arrastre Creek Road runs ~13 miles from Baldwin Lake Road east to the forest boundary, climbing through Jeffrey pine and high-desert transition. A scenic, moderate ride, mostly plate-only, with one segment open to OHVs.",
    distanceMiles: 11,
    difficulty: "Moderate",
    elevationFt: "6,800–7,500 ft",
    surface: "Graded dirt with rocky, rutted sections",
    bestSeason: "May–October",
    access: {
      streetLegal: true,
      greenSticker: "partial",
      note: "Per the MVUM, most of 2N02 is highway-legal-only, but a ~3.8-mile middle segment is open to all vehicles, so green-sticker bikes are allowed on that stretch only. Registration + spark arrestor required.",
      source: MVUM,
    },
    highlights: [
      "Long, scenic east-side mileage",
      "Jeffrey pine and high-desert transition",
      "Quieter than the OHV staging areas",
    ],
    trailhead: {
      name: "Arrastre Creek Rd / 2N02 (off Baldwin Lake Rd)",
      lat: 34.265,
      lng: -116.78,
    },
  },
  {
    id: "burnt-flat",
    name: "Burnt Flat Road",
    forestRoad: "3N02",
    summary: "Moderate road into John Bull country, camp or get the wheels dirty.",
    description:
      "Burnt Flat Road climbs through pinyon and Jeffrey pine east of Big Bear toward the John Bull area, linking to the 'Little John Bull' connector. A moderate ride with dispersed camping and access to rockier trails nearby.",
    distanceMiles: 3,
    difficulty: "Moderate",
    elevationFt: "7,000–7,600 ft",
    surface: "Dirt road with rocky, rutted sections",
    bestSeason: "May–October",
    access: {
      streetLegal: true,
      greenSticker: "no",
      note: "Per the MVUM, 3N02 is open to highway-legal vehicles only, plated bikes only; green-sticker bikes are not permitted, even though it heads toward the John Bull area.",
      source: MVUM,
    },
    highlights: [
      "Gateway to the John Bull area",
      "Dispersed camping",
      "Pinyon and Jeffrey pine",
    ],
    trailhead: {
      name: "Burnt Flat Rd / 3N02 (near Cactus Flat)",
      lat: 34.225,
      lng: -116.75,
    },
  },
  {
    id: "van-dusen-creek",
    name: "Van Dusen Creek Road",
    forestRoad: "3N07",
    summary: "Quiet, easy forest road behind the Holcomb Valley meadows.",
    description:
      "A simple, smooth dirt road winding behind the meadows of Holcomb Valley near Coyote Crag, beneath a canopy of pines. Mellow and scenic, with quiet dispersed campsites along the way.",
    distanceMiles: 2,
    difficulty: "Easy",
    elevationFt: "7,300–7,600 ft",
    surface: "Smooth graded dirt",
    bestSeason: "May–October",
    access: {
      streetLegal: true,
      greenSticker: "no",
      note: "Per the MVUM, 3N07 is open to highway-legal vehicles only, plated bikes only; green-sticker bikes are not permitted. A quiet, easy forest road.",
      source: MVUM,
    },
    highlights: [
      "Quiet pine-canopy cruising",
      "Dispersed campsites",
      "Behind the Holcomb Valley meadows",
    ],
    trailhead: {
      name: "Van Dusen Creek Rd / 3N07 (Holcomb Valley)",
      lat: 34.302,
      lng: -116.86,
    },
  },
];
