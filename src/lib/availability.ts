import "server-only";
import { and, eq } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db, schema } from "@/db";
import { computeDay, takenTimes, uniqueTimes, type Slot } from "./slot-engine";
import { AVAILABILITY_TAG, getRules, loadAvailability } from "./slots";
import { addDays, clinicDay, weekdayOf } from "./time";

/**
 * Cached availability, shared by every visitor.
 * Thousands of simultaneous visitors cost a handful of queries per minute: the result is cached
 * (and, through the /api routes, also at the CDN) and refreshed as soon as something changes
 * (booking, cancellation, schedule, absence, rules → revalidateTag).
 * A booking is always re-checked against the database, so a cached slot can never be double-booked.
 */

export const CATALOG_TAG = "catalog";

/** Active specialty by slug (cached). */
export const getSpecialtyBySlug = unstable_cache(
  async (slug: string) =>
    (await db.query.specialties.findFirst({
      where: and(eq(schema.specialties.slug, slug), eq(schema.specialties.active, true)),
      columns: { id: true, slug: true, durationMin: true },
    })) ?? null,
  ["specialty-by-slug-v1"],
  { tags: [CATALOG_TAG], revalidate: 3600 },
);

export type WidgetAvailability = {
  /** next bookable days (clinic time) on which a doctor of this specialty works */
  days: string[];
  /** first free slot within two weeks */
  next: { day: string; time: string } | null;
  /** working days of the next two weeks that are fully booked (shown greyed out) */
  full: string[];
  today: string;
  tomorrow: string;
};

const WINDOW_DAYS = 14;

/** Home widget: 5 bookable days + the next free slot. 3 queries at most, then cached for 60 s. */
export const getWidgetAvailability = unstable_cache(
  async (slug: string, today: string): Promise<WidgetAvailability> => {
    const base = { days: [] as string[], next: null, full: [] as string[], today, tomorrow: addDays(today, 1) };
    const specialty = await getSpecialtyBySlug(slug);
    if (!specialty) return base;
    const rules = await getRules();
    const toDay = addDays(today, Math.min(rules.maxDaysAhead, WINDOW_DAYS));
    const data = await loadAvailability({ specialtyId: specialty.id, fromDay: today, toDay });
    const weekdays = new Set(data.doctors.flatMap((d) => d.schedules.map((s) => s.weekday)));

    const days: string[] = [];
    const full: string[] = [];
    let next: WidgetAvailability["next"] = null;
    for (let d = today; d <= toDay; d = addDays(d, 1)) {
      if (!weekdays.has(weekdayOf(d))) continue;
      if (days.length < 5) days.push(d);
      const { free, taken } = computeDay(d, specialty.durationMin, data, rules);
      if (!next && free.length) next = { day: d, time: free[0].time };
      if (free.length === 0 && taken.length > 0) full.push(d); // every slot of the day is booked
    }
    return { ...base, days, next, full };
  },
  ["widget-availability-v2"],
  { tags: [AVAILABILITY_TAG, CATALOG_TAG], revalidate: 60 },
);

/** Free and already-booked times of one day (2 queries, cached 30 s). */
export const getDaySlots = unstable_cache(
  async (slug: string, day: string, doctorId: string | null): Promise<{ slots: Slot[]; taken: string[] } | null> => {
    const specialty = await getSpecialtyBySlug(slug);
    if (!specialty) return null;
    const rules = await getRules();
    const data = await loadAvailability({ specialtyId: specialty.id, fromDay: day, toDay: day, doctorId: doctorId ?? undefined });
    const result = computeDay(day, specialty.durationMin, data, rules);
    // only times are exposed for booked slots: never who booked them
    return { slots: doctorId ? result.free : uniqueTimes(result.free), taken: takenTimes(result) };
  },
  ["day-slots-v2"],
  { tags: [AVAILABILITY_TAG, CATALOG_TAG], revalidate: 30 },
);

export const todayInClinic = () => clinicDay(new Date());
