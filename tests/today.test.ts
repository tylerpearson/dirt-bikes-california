import { describe, expect, it } from "vitest";
import { hasLapsed, todayPacific } from "@/lib/today";

describe("todayPacific", () => {
  it("reads as the prior day just before midnight Pacific (PDT, UTC-7)", () => {
    expect(todayPacific(new Date("2026-07-22T06:30:00Z"))).toBe("2026-07-21");
  });

  it("rolls to the new day right after midnight Pacific (PDT, UTC-7)", () => {
    expect(todayPacific(new Date("2026-07-22T08:00:00Z"))).toBe("2026-07-22");
  });

  it("uses the PST offset (UTC-8) in winter", () => {
    expect(todayPacific(new Date("2026-01-15T07:59:00Z"))).toBe("2026-01-14");
  });
});

describe("hasLapsed", () => {
  it("never lapses when there is no end date", () => {
    expect(hasLapsed(undefined, "2030-01-01")).toBe(false);
  });

  it("is not lapsed on the end date itself (inclusive)", () => {
    expect(hasLapsed("2026-07-21", "2026-07-21")).toBe(false);
  });

  it("is lapsed the day after the end date", () => {
    expect(hasLapsed("2026-07-21", "2026-07-22")).toBe(true);
  });
});
