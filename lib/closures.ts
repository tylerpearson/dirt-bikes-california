import type { AreaId } from "./areas"; // type-only import, no runtime cycle
import { todayPacific } from "./today";

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
 * July 12, 2026. All USFS entries re-verified November 14, 2026. Update against each forest's alerts page and the SBNF
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
      "The Forest Service closes the Coon Creek and Fish Creek roads to motor vehicles under a forest roads order it renews each summer. The current order runs through late July 2027.",
    kind: "order",
    orderNumber: "05-12-00-26-06",
    url: "https://www.fs.usda.gov/r05/sanbernardino/alerts/roads-closures-mt-fc-ranger-districts",
    effectiveThrough: "2027-07-29",
  },
  // Line Fire order 05-12-52-26-03 ended 2026-09-30 and was not renewed: the
  // alert is gone and the SBNF roads page (updated 2026-10-10) lists no
  // closure on 1N04 or 1N09. If a new order appears, restore a dated "fire"
  // entry with routeIds ["radford-front-line", "city-creek"] and roadIds ["1N04", "1N09"].
  {
    areaId: "san-gorgonio",
    routeIds: [],
    title: "Line Fire burn area advisory",
    summary:
      "The Line Fire closure on the Radford (1N04) and City Creek (1N09) roads ended in September 2026, and the Forest Service no longer lists either road as closed. The burned slopes above them can still drop rock and wash out after storms, so check road conditions after any rain.",
    kind: "advisory",
    url: "https://www.fs.usda.gov/r05/sanbernardino/conditions/roads",
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
  // Order 05-07-54-26-09 supersedes 05-07-54-25-14; Exhibit D closes 5N15.2
  // and 9N11.4 to motorized use.
  {
    areaId: "santa-barbara",
    routeIds: ["camuesa-road", "buckhorn-road"],
    roadIds: ["5N15.2", "9N11.4"],
    title: "Santa Barbara storm damage closure",
    summary:
      "A renewed storm damage order closes Camuesa Road and Buckhorn Road to motor vehicles, along with the Upper Oso OHV staging area. The current order runs through mid-September 2027.",
    kind: "storm",
    orderNumber: "05-07-54-26-09",
    url: "https://www.fs.usda.gov/r05/lospadres/alerts/special-closure-sbrd-storm-damage-recovery-0",
    effectiveThrough: "2027-09-15",
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

/**
 * The date after which a group of closures has fully lapsed: the latest
 * `effectiveThrough`, or undefined if the group is empty or any member is
 * undated (an undated closure never lapses). Rendered as
 * `data-closure-through` so the browser can hide lapsed notices without a
 * rebuild (see components/ClosureExpiry.tsx).
 */
export function closureThrough(closures: Closure[]): string | undefined {
  if (closures.length === 0) return undefined;
  let latest = "";
  for (const c of closures) {
    if (!c.effectiveThrough) return undefined;
    if (c.effectiveThrough > latest) latest = c.effectiveThrough;
  }
  return latest;
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
