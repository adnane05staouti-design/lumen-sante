import { describe, expect, it } from "vitest";
import { addDays, clinicDay, clinicTime, clinicTimeToUtc, fromMinutes, toMinutes, weekdayOf } from "@/lib/time";

/** Casablanca is UTC+1, except during Ramadan (UTC+0). Every slot depends on these conversions. */
describe("clinic time zone (Africa/Casablanca)", () => {
  it("converts a normal day (UTC+1)", () => {
    expect(clinicTimeToUtc("2026-06-10", "10:00").toISOString()).toBe("2026-06-10T09:00:00.000Z");
  });
  it("converts a Ramadan day (UTC+0)", () => {
    expect(clinicTimeToUtc("2026-03-01", "10:00").toISOString()).toBe("2026-03-01T10:00:00.000Z");
  });
  it("round-trips instant → clinic day/time", () => {
    const at = clinicTimeToUtc("2026-11-03", "17:30");
    expect(clinicDay(at)).toBe("2026-11-03");
    expect(clinicTime(at)).toBe("17:30");
  });
  it("gives the clinic day at midnight boundaries", () => {
    // 23:30 UTC on June 10 is already June 11 in Casablanca (UTC+1)
    expect(clinicDay(new Date("2026-06-10T23:30:00Z"))).toBe("2026-06-11");
  });
});

describe("date helpers", () => {
  it("adds days across months and years", () => {
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });
  it("finds the weekday", () => {
    expect(weekdayOf("2026-09-28")).toBe(1); // Monday
    expect(weekdayOf("2026-10-04")).toBe(0); // Sunday
  });
  it("converts minutes", () => {
    expect(toMinutes("09:45")).toBe(585);
    expect(fromMinutes(585)).toBe("09:45");
  });
});
