import { describe, expect, it } from "vitest";
import { computeDay, computeSlots, isDayBookable, takenTimes, uniqueTimes, type AvailabilityData, type BookingRules } from "@/lib/slot-engine";
import { clinicTimeToUtc } from "@/lib/time";

const rules: BookingRules = { id: 1, autoConfirm: true, minLeadHours: 2, maxDaysAhead: 60, cancelLimitHours: 24, maxActivePerEmail: 3 };
const DAY = "2026-10-05"; // a Monday
const NOW = new Date("2026-10-01T08:00:00Z");

const doctor = (id: string, extra: Partial<AvailabilityData["doctors"][number]> = {}) => ({
  id,
  schedules: [
    { weekday: 1, startTime: "09:00", endTime: "12:00" },
    { weekday: 1, startTime: "14:00", endTime: "16:00" },
  ],
  absences: [],
  ...extra,
});
const at = (time: string) => clinicTimeToUtc(DAY, time);

describe("computeSlots — business rules", () => {
  it("cuts the schedule into slots of the specialty duration", () => {
    const slots = computeSlots(DAY, 30, { doctors: [doctor("a")], booked: [] }, rules, NOW);
    expect(slots.map((s) => s.time)).toEqual(["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "14:00", "14:30", "15:00", "15:30"]);
  });

  it("never proposes a slot that does not fit before the end of the block", () => {
    const slots = computeSlots(DAY, 45, { doctors: [doctor("a")], booked: [] }, rules, NOW);
    expect(slots.map((s) => s.time)).toEqual(["09:00", "09:45", "10:30", "11:15", "14:00", "14:45"]);
  });

  it("removes slots overlapping an active appointment (not only the same start time)", () => {
    const booked = [{ doctorId: "a", startsAt: at("09:15"), endsAt: at("09:45") }];
    const slots = computeSlots(DAY, 30, { doctors: [doctor("a")], booked }, rules, NOW);
    expect(slots.map((s) => s.time)).not.toContain("09:00");
    expect(slots.map((s) => s.time)).not.toContain("09:30");
    expect(slots.map((s) => s.time)).toContain("10:00");
  });

  it("an appointment of another doctor does not block this doctor", () => {
    const booked = [{ doctorId: "b", startsAt: at("09:00"), endsAt: at("09:30") }];
    const slots = computeSlots(DAY, 30, { doctors: [doctor("a")], booked }, rules, NOW);
    expect(slots[0].time).toBe("09:00");
  });

  it("gives nothing on a day of absence", () => {
    const d = doctor("a", { absences: [{ startsOn: "2026-10-04", endsOn: "2026-10-06" }] });
    expect(computeSlots(DAY, 30, { doctors: [d], booked: [] }, rules, NOW)).toEqual([]);
  });

  it("gives nothing on a day the doctor does not work", () => {
    expect(computeSlots("2026-10-04", 30, { doctors: [doctor("a")], booked: [] }, rules, NOW)).toEqual([]); // Sunday
  });

  it("respects the minimum lead time", () => {
    const now = new Date(at("10:10").getTime() - 2 * 3600_000); // 2 h before 10:10
    const slots = computeSlots(DAY, 30, { doctors: [doctor("a")], booked: [] }, rules, now);
    expect(slots[0].time).toBe("10:30");
  });

  it("refuses days in the past or beyond the booking window", () => {
    expect(computeSlots("2026-09-30", 30, { doctors: [doctor("a")], booked: [] }, rules, NOW)).toEqual([]);
    expect(isDayBookable("2026-12-15", { ...rules, maxDaysAhead: 60 }, NOW)).toBe(false);
    expect(isDayBookable("2026-11-30", { ...rules, maxDaysAhead: 60 }, NOW)).toBe(true);
  });

  it("returns slots sorted, one per doctor, merged by uniqueTimes", () => {
    const slots = computeSlots(DAY, 60, { doctors: [doctor("b"), doctor("a")], booked: [] }, rules, NOW);
    expect(slots[0]).toMatchObject({ time: "09:00", doctorId: "a" });
    expect(slots[1]).toMatchObject({ time: "09:00", doctorId: "b" });
    const merged = uniqueTimes(slots);
    expect(merged.filter((s) => s.time === "09:00")).toHaveLength(1);
  });

  it("returns UTC instants consistent with the clinic time", () => {
    const [first] = computeSlots(DAY, 30, { doctors: [doctor("a")], booked: [] }, rules, NOW);
    expect(first.startsAt).toBe("2026-10-05T08:00:00.000Z"); // 09:00 in Casablanca (UTC+1)
  });

  it("rejects a zero or negative duration", () => {
    expect(computeSlots(DAY, 0, { doctors: [doctor("a")], booked: [] }, rules, NOW)).toEqual([]);
  });
});

describe("computeDay — booked times shown greyed out", () => {
  it("lists a booked time as taken, never as free", () => {
    const booked = [{ doctorId: "a", startsAt: at("09:00"), endsAt: at("09:30") }];
    const day = computeDay(DAY, 30, { doctors: [doctor("a")], booked }, rules, NOW);
    expect(day.free.map((s) => s.time)).not.toContain("09:00");
    expect(takenTimes(day)).toEqual(["09:00"]);
  });

  it("a time is only taken when no doctor is free at that time", () => {
    const booked = [{ doctorId: "a", startsAt: at("10:00"), endsAt: at("10:30") }];
    const both = computeDay(DAY, 30, { doctors: [doctor("a"), doctor("b")], booked }, rules, NOW);
    expect(takenTimes(both)).toEqual([]); // doctor b is still free at 10:00
    const all = [...booked, { doctorId: "b", startsAt: at("10:00"), endsAt: at("10:30") }];
    expect(takenTimes(computeDay(DAY, 30, { doctors: [doctor("a"), doctor("b")], booked: all }, rules, NOW))).toEqual(["10:00"]);
  });

  it("past times (inside the minimum delay) are neither free nor shown as booked", () => {
    const now = new Date(at("10:00").getTime() - 3600_000); // 09:00 local → 10:00 is inside the 2 h delay
    const booked = [{ doctorId: "a", startsAt: at("09:30"), endsAt: at("10:00") }];
    const day = computeDay(DAY, 30, { doctors: [doctor("a")], booked }, rules, now);
    expect(takenTimes(day)).toEqual([]);
    expect(day.free[0].time).toBe("11:00");
  });
});
