/**
 * Seeds the database: specialties from src/config/clinic.ts, demo doctors with weekly hours,
 * and the first administrator (ADMIN_EMAIL / ADMIN_PASSWORD).
 * Usage: npm run db:seed        (safe to run several times)
 */
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { clinic } from "../src/config/clinic";
import { specialtyInfo } from "../src/dictionaries/specialties";
import * as schema from "../src/db/schema";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

/** Fictional demo doctors: [first name, last name, "f" | "m"] */
const DEMO_DOCTORS: Record<string, [string, string, "f" | "m"][]> = {
  dentaire: [["Yasmine", "Alaoui", "f"], ["Karim", "Bennani", "m"]],
  ophtalmologie: [["Salma", "Idrissi", "f"]],
  psychiatrie: [["Omar", "Tazi", "m"]],
  dermatologie: [["Nadia", "Chraibi", "f"]],
  pediatrie: [["Mehdi", "Berrada", "m"]],
  cardiologie: [["Leila", "Fassi", "f"]],
};

/** Job title per specialty, in the three languages (masculine / feminine). */
const JOB: Record<string, { fr: [string, string]; en: string; ar: [string, string] }> = {
  dentaire: { fr: ["Chirurgien-dentiste", "Chirurgienne-dentiste"], en: "Dental surgeon", ar: ["طبيب أسنان", "طبيبة أسنان"] },
  ophtalmologie: { fr: ["Ophtalmologue", "Ophtalmologue"], en: "Ophthalmologist", ar: ["طبيب عيون", "طبيبة عيون"] },
  psychiatrie: { fr: ["Psychiatre", "Psychiatre"], en: "Psychiatrist", ar: ["طبيب نفسي", "طبيبة نفسية"] },
  dermatologie: { fr: ["Dermatologue", "Dermatologue"], en: "Dermatologist", ar: ["طبيب أمراض جلدية", "طبيبة أمراض جلدية"] },
  pediatrie: { fr: ["Pédiatre", "Pédiatre"], en: "Pediatrician", ar: ["طبيب أطفال", "طبيبة أطفال"] },
  cardiologie: { fr: ["Cardiologue", "Cardiologue"], en: "Cardiologist", ar: ["طبيب قلب", "طبيبة قلب"] },
};

function demoBio(slug: string, gender: "f" | "m") {
  const j = JOB[slug];
  const k = gender === "f" ? 1 : 0;
  return {
    bioFr: `${j?.fr[k] ?? "Médecin"} — profil de démonstration.`,
    bioEn: `${j?.en ?? "Doctor"} — demo profile.`,
    bioAr: `${j?.ar[k] ?? "طبيب"} — ملف تجريبي.`,
  };
}

async function main() {
  await db.insert(schema.settings).values({ id: 1 }).onConflictDoNothing();

  for (const [i, slug] of clinic.specialties.entries()) {
    await db
      .insert(schema.specialties)
      .values({ slug, durationMin: specialtyInfo[slug].duration, sortOrder: i })
      .onConflictDoNothing();
  }

  const existing = await db.query.doctors.findMany();
  if (existing.length === 0 && process.env.SEED_DEMO !== "false") {
    for (const slug of clinic.specialties) {
      const spec = await db.query.specialties.findFirst({ where: eq(schema.specialties.slug, slug) });
      if (!spec) continue;
      for (const [firstName, lastName, gender] of DEMO_DOCTORS[slug] ?? []) {
        const [doc] = await db
          .insert(schema.doctors)
          .values({
            firstName,
            lastName,
            specialtyId: spec.id,
            languages: "fr,ar,en",
            ...demoBio(slug, gender),
          })
          .returning();
        const rows = [1, 2, 3, 4, 5].flatMap((weekday) => [
          { doctorId: doc.id, weekday, startTime: "09:00", endTime: "13:00" },
          { doctorId: doc.id, weekday, startTime: "14:00", endTime: "18:00" },
        ]);
        rows.push({ doctorId: doc.id, weekday: 6, startTime: "09:00", endTime: "13:00" });
        await db.insert(schema.schedules).values(rows);
      }
    }
    console.log("✓ demo doctors created");
  } else {
    // earlier versions wrote clumsy demo bios ("Spécialiste en dentaire…"): refresh them
    let fixed = 0;
    for (const d of existing) {
      if (!d.bioFr.endsWith("(profil de démonstration).")) continue;
      const spec = await db.query.specialties.findFirst({ where: eq(schema.specialties.id, d.specialtyId) });
      const entry = spec && DEMO_DOCTORS[spec.slug]?.find(([f, l]) => f === d.firstName && l === d.lastName);
      if (!spec || !entry) continue;
      await db.update(schema.doctors).set(demoBio(spec.slug, entry[2])).where(eq(schema.doctors.id, d.id));
      fixed++;
    }
    if (fixed) console.log(`✓ ${fixed} demo bios corrected`);
  }

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (email && password) {
    if (password.length < 12) throw new Error("ADMIN_PASSWORD must be at least 12 characters.");
    const found = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
    if (!found) {
      await db.insert(schema.users).values({
        email,
        name: process.env.ADMIN_NAME ?? "Administrateur",
        role: "ADMIN",
        passwordHash: await bcrypt.hash(password, 12),
      });
      console.log(`✓ admin ${email} created`);
    }
  } else {
    console.log("ℹ set ADMIN_EMAIL and ADMIN_PASSWORD to create the first administrator");
  }
  console.log("✓ seed done");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
