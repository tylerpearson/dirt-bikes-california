/**
 * Date helpers for closure expiry. Kept separate from lib/closures.ts because
 * that module warns at import time; this one is safe to import in client
 * components.
 */

/** A date as YYYY-MM-DD in Pacific time (the closures' home time zone). */
export function todayPacific(now: Date = new Date()): string {
  // en-CA yields ISO-ordered YYYY-MM-DD, which compares correctly as a string.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Whether an ISO end date has passed as of `today`. Undefined = never lapses. */
export function hasLapsed(through: string | undefined, today: string): boolean {
  return !!through && today > through;
}
