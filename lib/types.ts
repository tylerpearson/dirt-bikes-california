export type Difficulty = "Easy" | "Moderate" | "Difficult" | "Expert";

/**
 * Green-sticker (non-street-legal OHV) access status for a route:
 * - "yes":         non-street-legal OHVs allowed on the route
 * - "partial":     allowed on some segments only (see note)
 * - "no":          street-legal (plated) vehicles only
 * - "unconfirmed": could not verify against an authoritative source
 *
 * Street-legal plated vehicles are allowed on every route listed here; the
 * green-sticker status is the part that varies. See `note` for specifics.
 */
export type GreenStickerStatus = "yes" | "partial" | "no" | "unconfirmed";

export type RouteAccess = {
  /** Street-legal plated vehicles allowed (true for all current routes). */
  streetLegal: boolean;
  greenSticker: GreenStickerStatus;
  /** The specifics a rider needs — where green-sticker is/ isn't allowed. */
  note: string;
  /** Short attribution for where the access info came from. */
  source: string;
};

export type Trailhead = {
  name: string;
  lat: number;
  lng: number;
};

export type Route = {
  id: string;
  name: string;
  /** Forest Service road number, e.g. "3N16". */
  forestRoad?: string;
  /** One-line hook shown under the title. */
  summary: string;
  /** 2–3 sentence ride detail. */
  description: string;
  distanceMiles: number;
  difficulty: Difficulty;
  /** Approximate elevation range, e.g. "6,800–7,500 ft". */
  elevationFt?: string;
  /** Surface / tread description. */
  surface: string;
  /** Best riding window, e.g. "May–October". */
  bestSeason: string;
  access: RouteAccess;
  highlights: string[];
  trailhead: Trailhead;
};
