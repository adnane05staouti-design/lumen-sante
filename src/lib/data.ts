import "server-only";
import { asc, eq } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { CATALOG_TAG } from "@/lib/availability";
import { safeError } from "@/lib/log";
import { clinic, type SpecialtyId } from "@/config/clinic";
import { db, schema } from "@/db";

/** Specialties enabled both in the clinic config and in the database (admin can switch them off). */
async function loadActiveSpecialties() {
  const rows = await db.query.specialties.findMany({
    where: eq(schema.specialties.active, true),
    orderBy: [asc(schema.specialties.sortOrder)],
  });
  return rows
    .filter((r) => (clinic.specialties as string[]).includes(r.slug))
    .map((r) => ({ id: r.id, slug: r.slug as SpecialtyId, durationMin: r.durationMin }));
}

async function loadPublicDoctors() {
  const rows = await db.query.doctors.findMany({
    where: eq(schema.doctors.active, true),
    with: { specialty: true, schedules: true },
    orderBy: [asc(schema.doctors.lastName)],
  });
  return rows
    .filter((d) => d.specialty.active && (clinic.specialties as string[]).includes(d.specialty.slug))
    .map((d) => ({
      id: d.id,
      name: `${d.title} ${d.firstName} ${d.lastName}`,
      initials: `${d.firstName[0] ?? ""}${d.lastName[0] ?? ""}`,
      specialty: d.specialty.slug as SpecialtyId,
      bio: { fr: d.bioFr, en: d.bioEn, ar: d.bioAr },
      languages: d.languages.split(",").map((l) => l.trim()).filter(Boolean),
      weekdays: [...new Set(d.schedules.map((s) => s.weekday))].sort(),
    }));
}

/** Cached: public pages read these on every request; admin changes refresh them (revalidateTag). */
export const getActiveSpecialties = unstable_cache(loadActiveSpecialties, ["active-specialties-v1"], { tags: [CATALOG_TAG], revalidate: 3600 });
export const getPublicDoctors = unstable_cache(loadPublicDoctors, ["public-doctors-v1"], { tags: [CATALOG_TAG], revalidate: 3600 });

/** Live figures for the home page (falls back to 0 if the database is unreachable at build time). */
export async function getHomeCounts(): Promise<{ doctors: number; specialties: number }> {
  try {
    const [specialties, doctors] = await Promise.all([getActiveSpecialties(), getPublicDoctors()]);
    return { doctors: doctors.length, specialties: specialties.length };
  } catch (error) {
    console.error("[home] could not count doctors/specialties:", safeError(error));
    return { doctors: 0, specialties: clinic.specialties.length };
  }
}
