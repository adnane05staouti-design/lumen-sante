import { addDays, clinicDay, clinicTimeToUtc, fromMinutes, toMinutes, weekdayOf } from "./time";

/**
 * Pure booking engine (no database, no framework): easy to unit-test.
 * The data comes from loadAvailability() in slots.ts.
 */

export type Slot = { doctorId: string; time: string; startsAt: string };
export type BookingRules = {
  id: number;
  autoConfirm: boolean;
  minLeadHours: number;
  maxDaysAhead: number;
  cancelLimitHours: number;
  maxActivePerEmail: number;
};

export type AvailabilityData = {
  doctors: {
    id: string;
    schedules: { weekday: number; startTime: string; endTime: string }[];
    absences: { startsOn: string; endsOn: string }[];
  }[];
  booked: { doctorId: string; startsAt: Date; endsAt: Date }[];
};

/** Is `day` inside the bookable window (today … today + maxDaysAhead)? */
export function isDayBookable(day: string, rules: BookingRules, now = new Date()) {
  const today = clinicDay(now);
  return day >= today && day <= addDays(today, rules.maxDaysAhead);
}

/* ---------------------------------------------------------------------------
 * Pure computation (no database): unit-tested in tests/unit/slots.test.ts
 * ------------------------------------------------------------------------- */

/**
 * Business rule engine: slots of one clinic-local day. A slot is free when it is
 *   – inside the doctor's weekly schedule,
 *   – not during an absence,
 *   – at least `minLeadHours` in the future and inside the booking window,
 *   – not overlapping an active (pending/confirmed) appointment.
 * `taken` lists the slots that meet every rule except the last one: already booked by someone
 * (shown greyed out to patients, never with any patient information).
 */
export function computeDay(day: string, durationMin: number, data: AvailabilityData, rules: BookingRules, now = new Date()): { free: Slot[]; taken: Slot[] } {
  if (!isDayBookable(day, rules, now) || durationMin <= 0) return { free: [], taken: [] };
  const weekday = weekdayOf(day);
  const earliest = now.getTime() + rules.minLeadHours * 3600_000;
  const free: Slot[] = [];
  const taken: Slot[] = [];
  for (const doctor of data.doctors) {
    if (doctor.absences.some((a) => a.startsOn <= day && a.endsOn >= day)) continue;
    const booked = data.booked.filter((b) => b.doctorId === doctor.id);
    for (const block of doctor.schedules) {
      if (block.weekday !== weekday) continue;
      for (let m = toMinutes(block.startTime); m + durationMin <= toMinutes(block.endTime); m += durationMin) {
        const time = fromMinutes(m);
        const start = clinicTimeToUtc(day, time);
        const end = new Date(start.getTime() + durationMin * 60_000);
        if (start.getTime() < earliest) continue;
        const slot = { doctorId: doctor.id, time, startsAt: start.toISOString() };
        (booked.some((b) => b.startsAt < end && b.endsAt > start) ? taken : free).push(slot);
      }
    }
  }
  const order = (a: Slot, b: Slot) => a.startsAt.localeCompare(b.startsAt) || a.doctorId.localeCompare(b.doctorId);
  return { free: free.sort(order), taken: taken.sort(order) };
}

/** Free slots only (used by the booking re-check on the server). */
export function computeSlots(day: string, durationMin: number, data: AvailabilityData, rules: BookingRules, now = new Date()): Slot[] {
  return computeDay(day, durationMin, data, rules, now).free;
}

/** Times that are fully booked: taken for at least one doctor and free for none. */
export function takenTimes(day: { free: Slot[]; taken: Slot[] }): string[] {
  const freeTimes = new Set(day.free.map((s) => s.time));
  return [...new Set(day.taken.map((s) => s.time))].filter((t) => !freeTimes.has(t)).sort();
}

/** Merge per-doctor slots into one list of times ("first available doctor" mode). */
export function uniqueTimes(slots: Slot[]): Slot[] {
  const seen = new Map<string, Slot>();
  for (const s of slots) if (!seen.has(s.time)) seen.set(s.time, s);
  return [...seen.values()];
}
