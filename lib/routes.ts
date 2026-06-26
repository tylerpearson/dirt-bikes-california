import type { Route, Trailhead } from "./types";

/**
 * Big Bear–area OHV / dirt bike routes.
 *
 * ACCESS DATA: the streetLegal / greenSticker fields were researched against
 * U.S. Forest Service (San Bernardino NF) sources in June 2026 and are cited
 * per route. Street-legal plated vehicles are allowed on every route below;
 * green-sticker (non-street-legal) access is the part that varies, and on the
 * mixed roads it varies BY SEGMENT — read each note. Designations, seasonal
 * closures, and the MVUM change; confirm on the official Motor Vehicle Use Map
 * before riding. Trailhead coordinates, mileage, and elevation are approximate.
 *
 * Sticker rule note (CA, current): as of Jan 1 2025 red and green stickers are
 * treated as equally valid year-round in OHV-designated areas; a new tan sticker
 * replaces the red sticker for model-year 2022+ non-compliant bikes.
 */
export const routes: Route[] = [
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
      note: "Mostly street-legal only. Green-sticker (non-street-legal) bikes are allowed ONLY on the ~11-mile segment from the Crab Flats / 3N34 junction to road 3N56 — not toward Green Valley Lake, Big Bear, or Fawnskin. Current registration + spark arrestor required.",
      source: "USFS — Holcomb Valley OHV Road 3N16",
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
    id: "john-bull",
    name: "John Bull Trail",
    forestRoad: "3N10",
    summary: "Big Bear's legendary boulder-strewn rock crawl — for experts only.",
    description:
      "One of the most famous technical trails in Southern California, John Bull is a relentless field of granite boulders and step-ups. The Forest Service rates it black-diamond / most difficult. On a dirt bike it demands expert balance, line choice, and clutch control. Never ride it alone.",
    distanceMiles: 5,
    difficulty: "Expert",
    elevationFt: "7,200–7,800 ft",
    surface: "Large granite boulders and rock ledges",
    bestSeason: "June–September",
    access: {
      streetLegal: true,
      greenSticker: "yes",
      note: "Open to both street-legal and green-sticker vehicles — but green-sticker bikes must be TRAILERED to the trailhead; it's the only green-sticker trail in the immediate vicinity (no legal non-street-legal connector roads to reach it).",
      source: "USFS / Big Bear off-road trail guides",
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
      greenSticker: "unconfirmed",
      note: "Described as a technical 4x4 / high-clearance route, so plated vehicles are fine. Green-sticker (non-street-legal) access could NOT be confirmed from an authoritative source — verify on the MVUM before relying on it.",
      source: "Unconfirmed — check the San Bernardino NF MVUM",
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
    id: "coxey-road",
    name: "Coxey Road Connector",
    forestRoad: "3N14",
    summary: "Long, mellow graded road — the backbone of the backcountry.",
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
      note: "Street-legal only between Fawnskin and Holcomb Valley Rd. Green-sticker bikes ARE allowed from Holcomb Valley Rd (3N16) north to Grapevine Canyon Rd (4N16) and on to the forest boundary. Registration + spark arrestor required.",
      source: "USFS — Coxey OHV Road 3N14",
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
    id: "cactus-flats",
    name: "Cactus Flat OHV Area",
    forestRoad: "3N03",
    summary: "East-side OHV staging hub with a network of looping desert-edge trails.",
    description:
      "Off Highway 18 north of Big Bear, Cactus Flat is a designated OHV staging area (vault toilet, parking, signage) feeding Smarts Ranch Rd (3N03) and connectors like the Pinyon Trail through pinyon and juniper. Terrain ranges from easy dirt road to looser, sandier routes.",
    distanceMiles: 7,
    difficulty: "Moderate",
    elevationFt: "6,400–7,000 ft",
    surface: "Mixed dirt and sandy tread with rocky sections",
    bestSeason: "April–November",
    access: {
      streetLegal: true,
      greenSticker: "yes",
      note: "Designated OHV staging area — routes are open to plated, green-sticker (and historically red-sticker) vehicles. Spark arrestor + current registration required.",
      source: "USFS — Cactus Flat OHV Staging Area",
    },
    highlights: [
      "Established OHV staging and parking",
      "Network of connecting loops",
      "High-desert transition scenery",
    ],
    trailhead: {
      name: "Cactus Flat Staging Area (3N03)",
      lat: 34.221,
      lng: -116.732,
    },
  },
  {
    id: "arrastre-creek",
    name: "Arrastre Creek Road",
    forestRoad: "2N02",
    summary: "Long east-side graded road to the forest boundary — plated bikes only.",
    description:
      "Arrastre Creek Road runs ~13 miles from Baldwin Lake Road east to the forest boundary, climbing through Jeffrey pine and high-desert transition. A scenic, moderate ride — but street-legal vehicles only.",
    distanceMiles: 11,
    difficulty: "Moderate",
    elevationFt: "6,800–7,500 ft",
    surface: "Graded dirt with rocky, rutted sections",
    bestSeason: "May–October",
    access: {
      streetLegal: true,
      greenSticker: "no",
      note: "Street-legal vehicles only — non-street-legal (green-sticker) vehicles are NOT permitted on 2N02 (Arrastre Creek). Plated dual-sport bikes are fine.",
      source: "USFS — San Bernardino NF OHV roads",
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
];

/** Link to the full interactive Google Map centered on the trailhead. */
export function fullMapUrl(trailhead: Trailhead): string {
  const { lat, lng } = trailhead;
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}
