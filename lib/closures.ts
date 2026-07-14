import type { AreaId } from "./areas"; // type-only import, no runtime cycle

/**
 * Current forest / land-manager closures affecting guide areas. Hand-maintained
 * on purpose: USFS Region 5 publishes no machine-readable closure feed (orders
 * live as web pages and PDFs), so there is nothing to fetch. Entries carry the
 * order's end date and self-expire (see `isActive`); the build warns when a
 * dated entry has lapsed so it gets renewed or removed.
 *
 * Joined to routes at render time by `components/AreaGuide.tsx`. Decoupled from
 * the three route generators, so regenerating routes never touches this file.
 */
export type ClosureKind = "fire" | "storm" | "order" | "advisory";

export type Closure = {
  areaId: AreaId;
  /** Curated route ids affected. Empty = area-level notice (banner only, no card badges). */
  routeIds: string[];
  /**
   * MVUM road numbers, matched exactly against overview GeoJSON `properties.id`
   * (e.g. "1N02", "5N15.2"). Lets the map grey roads even when no curated route
   * is hit. A road id with no GeoJSON feature is harmless (summary-only).
   */
  roadIds?: string[];
  /** Short label, e.g. "Radford Fire closure area". */
  title: string;
  /** 1–2 sentences, follows AGENTS.md prose style (no em dashes, no stacked compounds). */
  summary: string;
  kind: ClosureKind;
  /** Forest order number, e.g. "05-12-52-24-06". Omit for advisories with no order. */
  orderNumber?: string;
  /** Official alert / order / conditions page. */
  url: string;
  /** ISO YYYY-MM-DD end date. Omit for undated closures (never auto-hides). */
  effectiveThrough?: string;
  /** Display override for the end date, e.g. "September 2026". */
  effectiveThroughText?: string;
};

/**
 * All facts below were verified against official USFS/BLM sources on
 * July 12, 2026. Update against each forest's alerts page and the SBNF
 * conditions/roads page; do not "correct" from memory.
 */
export const CLOSURES: Closure[] = [
  // ---- San Gorgonio (San Bernardino NF) ------------------------------------
  {
    areaId: "san-gorgonio",
    routeIds: ["coon-creek-jumpoff", "fish-creek-meadows"],
    roadIds: ["1N02", "1N05"],
    title: "Coon Creek and Fish Creek annual closure",
    summary:
      "The Forest Service closes the Coon Creek and Fish Creek roads under an annual order that runs into mid-summer. This is a seasonal gate closure, so check whether it has been renewed before you plan a ride here.",
    kind: "order",
    orderNumber: "05-12-00-25-04",
    url: "https://www.fs.usda.gov/r05/sanbernardino/conditions/roads",
    effectiveThrough: "2026-07-21",
  },
  {
    areaId: "san-gorgonio",
    routeIds: ["radford-front-line", "city-creek"],
    roadIds: ["1N04", "1N09"],
    title: "Line Fire burned area closure",
    summary:
      "The Line Fire burned area closure keeps the Radford and City Creek front country roads shut while crews stabilize the slopes. Expect the order to be extended if the ground stays unstable.",
    kind: "fire",
    orderNumber: "05-12-52-26-03",
    url: "https://www.fs.usda.gov/r05/sanbernardino/alerts/line-fire-area-closure",
    effectiveThrough: "2026-09-30",
  },
  // ---- Santa Ana Mountains (Cleveland NF) ----------------------------------
  {
    areaId: "santa-ana",
    routeIds: ["trabuco-canyon", "long-canyon"],
    roadIds: ["6S13", "6S05"],
    title: "Airport Fire burned area closure",
    summary:
      "The Airport Fire burned area closure keeps Trabuco Canyon and Long Canyon shut on the Trabuco district. Fire-damaged closures like this one tend to run for a couple of seasons, so confirm before planning around them.",
    kind: "fire",
    orderNumber: "02-26-09",
    url: "https://www.fs.usda.gov/r05/cleveland/alerts/airport-fire-burned-area-closure",
    effectiveThrough: "2027-05-26",
  },
  // ---- Santa Barbara backcountry (Los Padres NF) ---------------------------
  {
    areaId: "santa-barbara",
    routeIds: ["camuesa-road", "buckhorn-road"],
    roadIds: ["5N15.2", "9N11.4"],
    title: "Santa Barbara storm damage closure",
    summary:
      "A special closure covers storm-damaged roads on the Santa Barbara district, including Camuesa Road and Buckhorn Road. Washouts and slides can take a while to repair, so verify the roads have reopened before making the drive.",
    kind: "storm",
    orderNumber: "05-07-54-25-14",
    url: "https://www.fs.usda.gov/r05/lospadres/alerts/special-closure-sbrd-storm-damage-recovery",
    effectiveThrough: "2026-09-17",
  },
  // ---- Big Bear (San Bernardino NF): area-level, no curated route hit -------
  {
    areaId: "big-bear",
    routeIds: [],
    roadIds: ["2N06", "2N10", "2N21"],
    title: "Radford Fire closure area",
    summary:
      "The Radford Fire closure area sits south of the lake and shuts a cluster of roads there (2N06, 2N10, 2N10D, and 2N21). None of the guide's Big Bear routes run through it, but plan around it if you explore off the listed roads.",
    kind: "fire",
    orderNumber: "05-12-52-24-06",
    url: "https://www.fs.usda.gov/r05/sanbernardino/alerts/radford-fire-closure-area",
    effectiveThrough: "2026-12-31",
  },
  // ---- Lake Arrowhead (San Bernardino NF): area-level ----------------------
  {
    areaId: "lake-arrowhead",
    routeIds: [],
    roadIds: ["3N34C"],
    title: "Deep Creek and Aztec Falls closure",
    summary:
      "A closure covers the Deep Creek corridor and the Aztec Falls side. Crab Flats (3N34) and the 2W01 singletrack stay open, but the creek corridor and the Splinters Cabin side are closed, with the boundary at the Devils Hole end.",
    kind: "order",
    orderNumber: "05-12-52-25-02",
    url: "https://www.fs.usda.gov/r05/sanbernardino/alerts/deep-creek-area-closure-aztec-falls",
    effectiveThrough: "2027-06-07",
  },
  // ---- Mt Pinos (Los Padres NF): area-level --------------------------------
  {
    areaId: "mt-pinos",
    routeIds: [],
    roadIds: ["8N40"],
    title: "Dry Canyon closure",
    summary:
      "The Dry Canyon road (8N40) is closed on the Lockwood Valley side. No guide route runs through it, so this is a heads-up for riders exploring that corner.",
    kind: "order",
    orderNumber: "05-07-57-25-05",
    url: "https://www.fs.usda.gov/r05/lospadres/alerts",
    effectiveThrough: "2027-03-26",
  },
  // ---- San Luis Obispo (Los Padres NF): advisory, order already expired -----
  {
    areaId: "san-luis-obispo",
    routeIds: [],
    title: "Gifford Fire burn area advisory",
    summary:
      "The Gifford Fire closure order expired in spring 2026, but the burn scar sits against Sierra Madre Road and the Pozo country. Roads there can still be washed out or gated, so check with the Santa Lucia district before you go.",
    kind: "advisory",
    url: "https://www.fs.usda.gov/r05/lospadres/alerts",
  },
  // ---- Jawbone (BLM Ridgecrest): advisory ----------------------------------
  {
    areaId: "jawbone",
    routeIds: [],
    title: "WEMO route closures nearby",
    summary:
      "Court-ordered WEMO route closures affect the Rand Mountains and Red Mountain area to the south. Jawbone Canyon and Dove Springs themselves are open, but stay on signed routes if you range that way.",
    kind: "advisory",
    url: "https://www.blm.gov/office/ridgecrest-field-office",
  },
  // ---- El Paso Mountains (BLM Ridgecrest): advisory -------------------------
  {
    areaId: "el-paso",
    routeIds: [],
    title: "WEMO route closures nearby",
    summary:
      "The same court-ordered WEMO route closures affect land near the El Paso Mountains. The Redrock Randsburg road (R43) is unaffected, but check current route signing before you ride the side trails.",
    kind: "advisory",
    url: "https://www.blm.gov/office/ridgecrest-field-office",
  },
];

/** Today's date as YYYY-MM-DD in the closures' home time zone (Pacific). */
function todayPacific(): string {
  // en-CA yields ISO-ordered YYYY-MM-DD, which compares correctly as a string.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Whether a closure is still in effect on the given date (defaults to today,
 * Pacific). Undated closures (no `effectiveThrough`) are always active until
 * removed from the registry by hand. ISO dates compare correctly as strings.
 */
export function isActive(c: Closure, on: string = todayPacific()): boolean {
  if (!c.effectiveThrough) return true;
  return on <= c.effectiveThrough;
}

/** Active closures for an area, in registry order. */
export function activeClosures(areaId: AreaId): Closure[] {
  return CLOSURES.filter((c) => c.areaId === areaId && isActive(c));
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "July 21, 2026" from "2026-07-21", formatted without time-zone drift. */
function formatIsoDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

/**
 * The "closed through …" meta phrase for a closure, or "" when there is nothing
 * to say (advisories carry no closure date). Non-advisory closures with no end
 * date read "until further notice".
 */
export function closedThroughLabel(c: Closure): string {
  if (c.kind === "advisory") return "";
  if (c.effectiveThroughText) return `closed through ${c.effectiveThroughText}`;
  if (c.effectiveThrough) return `closed through ${formatIsoDate(c.effectiveThrough)}`;
  return "closed until further notice";
}

// Warn at build time about entries whose order has lapsed, so the registry gets
// renewed or trimmed. Freshly expired entries still show until removed by hand.
if (typeof process !== "undefined" && process.env?.NODE_ENV !== "test") {
  const today = todayPacific();
  for (const c of CLOSURES) {
    if (c.effectiveThrough && today > c.effectiveThrough) {
      console.warn(
        `[closures] expired: ${c.areaId} "${c.title}" ended ${c.effectiveThrough} — verify and remove or update lib/closures.ts`,
      );
    }
  }
}
