import "server-only";
import { and, eq, gte, inArray, lt, lte } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db, schema } from "@/db";
import { addDays, clinicTimeToUtc } from "./time";

import { computeSlots, isDayBookable, type AvailabilityData, type BookingRules, type Slot } from "./slot-engine";

export { computeSlots, isDayBookable, uniqueTimes, type AvailabilityData, type BookingRules, type Slot } from "./slot-engine";

const ACTIVE = ["PENDING", "CONFIRMED"] as const;

/** Cache tags: invalidated by every action that changes availability or rules. */
export const AVAILABILITY_TAG = "availability";
export const SETTINGS_TAG = "settings";

const DEFAULT_RULES: BookingRules = {
  id: 1,
  autoConfirm: true,
  minLeadHours: 2,
  maxDaysAhead: 60,
  cancelLimitHours: 24,
  maxActivePerEmail: 3,
};

/** Booking rules (one row), cached until an admin changes them. */
export const getRules = unstable_cache(
  async (): Promise<BookingRules> => (await db.query.settings.findFirst()) ?? DEFAULT_RULES,
  ["booking-rules-v1"],
  { tags: [SETTINGS_TAG], revalidate: 3600 },
);

/* ---------------------------------------------------------------------------
 * Data loading: everything needed for a window of days, in 2 queries
 * ------------------------------------------------------------------------- */

export async function loadAvailability(opts: {
  specialtyId: string;
  fromDay: string;
  toDay: string;
  doctorId?: string;
}): Promise<AvailabilityData> {
  const { specialtyId, fromDay, toDay, doctorId } = opts;
  const doctors = await db.query.doctors.findMany({
    where: and(
      eq(schema.doctors.specialtyId, specialtyId),
      eq(schema.doctors.active, true),
      doctorId ? eq(schema.doctors.id, doctorId) : undefined,
    ),
    columns: { id: true },
    with: {
      schedules: { columns: { weekday: true, startTime: true, endTime: true } },
      absences: {
        columns: { startsOn: true, endsOn: true },
        where: and(lte(schema.absences.startsOn, toDay), gte(schema.absences.endsOn, fromDay)),
      },
    },
  });
  if (doctors.length === 0) return { doctors: [], booked: [] };
  const booked = await db
    .select({ doctorId: schema.appointments.doctorId, startsAt: schema.appointments.startsAt, endsAt: schema.appointments.endsAt })
    .from(schema.appointments)
    .where(
      and(
        inArray(schema.appointments.doctorId, doctors.map((d) => d.id)),
        inArray(schema.appointments.status, [...ACTIVE]),
        gte(schema.appointments.startsAt, clinicTimeToUtc(fromDay, "00:00")),
        lt(schema.appointments.startsAt, clinicTimeToUtc(addDays(toDay, 1), "00:00")),
      ),
    );
  return { doctors, booked };
}

/** Free slots for one day (loads its own data: 2 queries). Used by the booking action to re-check a slot. */
export async function getFreeSlots(opts: {
  specialtyId: string;
  durationMin: number;
  day: string;
  doctorId?: string;
  rules: BookingRules;
  now?: Date;
}): Promise<Slot[]> {
  const { specialtyId, durationMin, day, doctorId, rules } = opts;
  if (!isDayBookable(day, rules, opts.now)) return [];
  const data = await loadAvailability({ specialtyId, fromDay: day, toDay: day, doctorId });
  return computeSlots(day, durationMin, data, rules, opts.now);
}

