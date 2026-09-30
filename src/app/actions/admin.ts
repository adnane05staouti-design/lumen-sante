"use server";

import { and, asc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, schema } from "@/db";
import { audit, bumpSessionVersion, createMfaChallenge, createSession, destroySession, hashPassword, requireUser, verifyCredentials } from "@/lib/auth";
import { CATALOG_TAG } from "@/lib/availability";
import { clientKey, isRateLimited } from "@/lib/rate-limit";
import { AVAILABILITY_TAG, SETTINGS_TAG } from "@/lib/slots";
import { addDays, clinicDay, clinicTime, clinicTimeToUtc, isValidDay, toMinutes, weekdayOf } from "@/lib/time";
import { notifyStatusChange } from "@/lib/notify";

/** Public pages and cached availability must reflect admin changes at once. */
function refreshAvailability(catalog = false) {
  revalidateTag(AVAILABILITY_TAG, { expire: 0 });
  if (catalog) revalidateTag(CATALOG_TAG, { expire: 0 });
}

/** `mfa`: password accepted, 6-digit code now required. `codes`: recovery codes shown once. */
export type FormState = { ok?: boolean; error?: string; mfa?: boolean; codes?: string[]; conflict?: boolean } | undefined;

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const isoDay = z.string().refine(isValidDay);

/* ------------------------------------------------------------------ auth */

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase().slice(0, 254);
  const password = String(form.get("password") ?? "").slice(0, 200);
  if (!email || !password) return { error: "Identifiants requis." };

  // Brute-force protection:
  //  - 10 attempts / 15 min per network, 5 per (account + network): a stranger cannot lock the real user out;
  //  - 50 / 15 min per account from everywhere: stops a distributed attack on one account.
  const ip = await clientKey();
  if (
    (await isRateLimited(`login:ip:${ip}`, 10, 900)) ||
    (await isRateLimited(`login:acct-ip:${email}|${ip}`, 5, 900)) ||
    (await isRateLimited(`login:acct:${email}`, 50, 900))
  ) {
    return { error: "Trop de tentatives. Réessayez dans 15 minutes." };
  }
  const user = await verifyCredentials(email, password);
  if (!user) {
    // never store what was typed if it is not an e-mail (it could be a password typed in the wrong field)
    await audit(null, "login.failed", /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "(identifiant invalide)");
    return { error: "E-mail ou mot de passe incorrect." };
  }
  if (user.mfa) {
    // second factor: the session is only created once the 6-digit code is checked (actions/mfa.ts)
    await createMfaChallenge(user);
    return { mfa: true };
  }
  await createSession(user);
  await audit(user.id, "login.success", "");
  redirect("/admin");
}

export async function logout() {
  await destroySession(true);
  redirect("/admin/login");
}

/* ------------------------------------------------------------ appointments */

const STATUSES = ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"] as const;

/** "Completed" and "no-show" only make sense once the appointment has started. */
const AFTER_START = new Set(["COMPLETED", "NO_SHOW"]);

/** Allowed status changes (a cancelled or finished appointment is never re-opened). */
const TRANSITIONS: Record<string, readonly string[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["COMPLETED", "NO_SHOW", "CANCELLED"],
  CANCELLED: [],
  COMPLETED: [],
  NO_SHOW: ["COMPLETED"],
};

export async function setAppointmentStatus(id: string, status: (typeof STATUSES)[number]) {
  const user = await requireUser();
  if (!z.string().uuid().safeParse(id).success || !STATUSES.includes(status)) return;
  const appt = await db.query.appointments.findFirst({ where: eq(schema.appointments.id, id), columns: { status: true, startsAt: true } });
  if (!appt || !TRANSITIONS[appt.status]?.includes(status)) return;
  if (AFTER_START.has(status) && appt.startsAt.getTime() > Date.now()) return; // a future slot is never freed by mistake
  // conditional update: if someone else changed it at the same moment, nothing happens and nothing is logged
  const [changed] = await db
    .update(schema.appointments)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(schema.appointments.id, id), eq(schema.appointments.status, appt.status)))
    .returning({ id: schema.appointments.id });
  if (!changed) return;
  await audit(user.id, "appointment.status", `${id} ${appt.status} → ${status}`);
  // the patient is told when the clinic confirms or cancels (sent after the response)
  if (status === "CONFIRMED" || status === "CANCELLED") notifyStatusChange(id, status);
  refreshAvailability();
  revalidatePath("/admin", "layout");
}

/* ------------------------------------------------ planning changes vs bookings */

/** Future active appointments of a doctor (optionally inside a time range). */
async function upcomingAppointments(doctorId: string, from = new Date(), to?: Date) {
  return db
    .select({ startsAt: schema.appointments.startsAt, endsAt: schema.appointments.endsAt })
    .from(schema.appointments)
    .where(
      and(
        eq(schema.appointments.doctorId, doctorId),
        inArray(schema.appointments.status, ["PENDING", "CONFIRMED"]),
        gte(schema.appointments.startsAt, from),
        to ? lt(schema.appointments.startsAt, to) : undefined,
      ),
    )
    .orderBy(asc(schema.appointments.startsAt))
    .limit(200);
}

/** Planning changes never cancel appointments silently: the clinic sees them and decides. */
function conflictMessage(list: { startsAt: Date }[], what: string): FormState {
  const shown = list.slice(0, 5).map((a) => `${clinicDay(a.startsAt).split("-").reverse().join("/")} ${clinicTime(a.startsAt)}`);
  return {
    conflict: true,
    error: `${list.length} rendez-vous déjà pris ${what} : ${shown.join(", ")}${list.length > 5 ? "…" : ""}. Prévenez les patients (Rendez-vous → Annuler), ou cochez « Enregistrer quand même ».`,
  };
}

/* ----------------------------------------------------------------- doctors */

const doctorInput = z.object({
  title: z.string().trim().min(1).max(10),
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  specialtyId: z.string().uuid(),
  languages: z.string().trim().max(40),
  bioFr: z.string().trim().max(600),
  bioEn: z.string().trim().max(600),
  bioAr: z.string().trim().max(600),
  active: z.boolean(),
});

function readDoctor(form: FormData) {
  return doctorInput.safeParse({
    title: form.get("title") ?? "Dr",
    firstName: form.get("firstName"),
    lastName: form.get("lastName"),
    specialtyId: form.get("specialtyId"),
    languages: form.get("languages") ?? "fr,ar",
    bioFr: form.get("bioFr") ?? "",
    bioEn: form.get("bioEn") ?? "",
    bioAr: form.get("bioAr") ?? "",
    active: form.get("active") === "on",
  });
}

export async function createDoctor(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser("ADMIN");
  const parsed = readDoctor(form);
  if (!parsed.success) return { error: "Champs invalides." };
  const [row] = await db.insert(schema.doctors).values(parsed.data).returning({ id: schema.doctors.id });
  // default week: Monday–Friday 09:00–13:00 / 14:00–18:00
  await db.insert(schema.schedules).values(
    [1, 2, 3, 4, 5].flatMap((weekday) => [
      { doctorId: row.id, weekday, startTime: "09:00", endTime: "13:00" },
      { doctorId: row.id, weekday, startTime: "14:00", endTime: "18:00" },
    ]),
  );
  await audit(user.id, "doctor.create", `${parsed.data.firstName} ${parsed.data.lastName}`);
  refreshAvailability(true);
  revalidatePath("/", "layout");
  redirect(`/admin/medecins/${row.id}`);
}

export async function updateDoctor(id: string, _: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser("ADMIN");
  const parsed = readDoctor(form);
  if (!parsed.success || !z.string().uuid().safeParse(id).success) return { error: "Champs invalides." };
  if (!parsed.data.active && form.get("force") !== "on") {
    const booked = await upcomingAppointments(id);
    if (booked.length) return conflictMessage(booked, "avec ce médecin");
  }
  await db.update(schema.doctors).set(parsed.data).where(eq(schema.doctors.id, id));
  await audit(user.id, "doctor.update", id);
  refreshAvailability(true);
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Replaces the whole weekly schedule of a doctor. */
export async function saveSchedule(id: string, _: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser("ADMIN");
  if (!z.string().uuid().safeParse(id).success) return { error: "Médecin inconnu." };
  const rows: { doctorId: string; weekday: number; startTime: string; endTime: string }[] = [];
  for (let weekday = 0; weekday < 7; weekday++) {
    for (const part of ["am", "pm"]) {
      const start = String(form.get(`${weekday}-${part}-start`) ?? "");
      const end = String(form.get(`${weekday}-${part}-end`) ?? "");
      if (!start && !end) continue;
      if (!hhmm.safeParse(start).success || !hhmm.safeParse(end).success || start >= end) {
        return { error: `Horaire invalide (jour ${weekday}).` };
      }
      rows.push({ doctorId: id, weekday, startTime: start, endTime: end });
    }
  }
  // the morning and afternoon blocks of a day must not overlap
  for (let weekday = 0; weekday < 7; weekday++) {
    const blocks = rows.filter((r) => r.weekday === weekday).sort((a, b) => a.startTime.localeCompare(b.startTime));
    for (let i = 1; i < blocks.length; i++) {
      if (blocks[i].startTime < blocks[i - 1].endTime) return { error: `Plages qui se chevauchent (jour ${weekday}).` };
    }
  }
  if (form.get("force") !== "on") {
    // appointments that would fall outside the new hours
    const outside = (await upcomingAppointments(id)).filter((a) => {
      const day = clinicDay(a.startsAt);
      const start = toMinutes(clinicTime(a.startsAt));
      const end = start + Math.round((a.endsAt.getTime() - a.startsAt.getTime()) / 60_000);
      return !rows.some((r) => r.weekday === weekdayOf(day) && toMinutes(r.startTime) <= start && end <= toMinutes(r.endTime));
    });
    if (outside.length) return conflictMessage(outside, "en dehors des nouveaux horaires");
  }
  await db.transaction(async (tx) => {
    await tx.delete(schema.schedules).where(eq(schema.schedules.doctorId, id));
    if (rows.length) await tx.insert(schema.schedules).values(rows);
  });
  await audit(user.id, "doctor.schedule", id);
  refreshAvailability(true);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function addAbsence(id: string, _: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser("ADMIN");
  const parsed = z
    .object({ startsOn: isoDay, endsOn: isoDay, reason: z.string().trim().max(120) })
    .safeParse({ startsOn: form.get("startsOn"), endsOn: form.get("endsOn"), reason: form.get("reason") ?? "" });
  if (!parsed.success || parsed.data.startsOn > parsed.data.endsOn || !z.string().uuid().safeParse(id).success) {
    return { error: "Dates invalides." };
  }
  if (form.get("force") !== "on") {
    const from = clinicTimeToUtc(parsed.data.startsOn, "00:00");
    const to = clinicTimeToUtc(addDays(parsed.data.endsOn, 1), "00:00");
    const booked = await upcomingAppointments(id, from > new Date() ? from : new Date(), to);
    if (booked.length) return conflictMessage(booked, "pendant cette absence");
  }
  await db.insert(schema.absences).values({ doctorId: id, ...parsed.data });
  await audit(user.id, "doctor.absence.add", `${id} ${parsed.data.startsOn}→${parsed.data.endsOn}`);
  refreshAvailability();
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function deleteAbsence(doctorId: string, absenceId: string) {
  const user = await requireUser("ADMIN");
  if (!z.string().uuid().safeParse(absenceId).success || !z.string().uuid().safeParse(doctorId).success) return;
  await db.delete(schema.absences).where(and(eq(schema.absences.id, absenceId), eq(schema.absences.doctorId, doctorId)));
  await audit(user.id, "doctor.absence.delete", absenceId);
  refreshAvailability();
  revalidatePath("/admin", "layout");
}

/* ------------------------------------------------------------- specialties */

export async function updateSpecialty(id: string, _: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser("ADMIN");
  const parsed = z
    .object({ durationMin: z.coerce.number().int().min(10).max(180), active: z.boolean() })
    .safeParse({ durationMin: form.get("durationMin"), active: form.get("active") === "on" });
  if (!parsed.success || !z.string().uuid().safeParse(id).success) return { error: "Valeurs invalides." };
  await db.update(schema.specialties).set(parsed.data).where(eq(schema.specialties.id, id));
  await audit(user.id, "specialty.update", `${id} ${JSON.stringify(parsed.data)}`);
  refreshAvailability(true);
  revalidatePath("/", "layout");
  return { ok: true };
}

/* ---------------------------------------------------------------- settings */

export async function updateSettings(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser("ADMIN");
  const parsed = z
    .object({
      autoConfirm: z.boolean(),
      minLeadHours: z.coerce.number().int().min(0).max(168),
      maxDaysAhead: z.coerce.number().int().min(1).max(365),
      cancelLimitHours: z.coerce.number().int().min(0).max(168),
      maxActivePerEmail: z.coerce.number().int().min(1).max(20),
    })
    .safeParse({
      autoConfirm: form.get("autoConfirm") === "on",
      minLeadHours: form.get("minLeadHours"),
      maxDaysAhead: form.get("maxDaysAhead"),
      cancelLimitHours: form.get("cancelLimitHours"),
      maxActivePerEmail: form.get("maxActivePerEmail"),
    });
  if (!parsed.success) return { error: "Valeurs invalides." };
  await db.insert(schema.settings).values({ id: 1, ...parsed.data }).onConflictDoUpdate({ target: schema.settings.id, set: parsed.data });
  await audit(user.id, "settings.update", JSON.stringify(parsed.data));
  revalidateTag(SETTINGS_TAG, { expire: 0 });
  refreshAvailability();
  revalidatePath("/", "layout");
  return { ok: true };
}

/* ------------------------------------------------------------------- users */

export async function createUser(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser("ADMIN");
  const parsed = z
    .object({
      name: z.string().trim().min(2).max(80),
      email: z.string().trim().toLowerCase().email(),
      password, // same rules everywhere (length, 72-byte bcrypt limit, variety)
      role: z.enum(["ADMIN", "STAFF"]),
    })
    .safeParse({ name: form.get("name"), email: form.get("email"), password: form.get("password"), role: form.get("role") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Champs invalides." };
  const exists = await db.query.users.findFirst({ where: eq(schema.users.email, parsed.data.email) });
  if (exists) return { error: "Cet e-mail existe déjà." };
  await db.insert(schema.users).values({
    name: parsed.data.name,
    email: parsed.data.email,
    role: parsed.data.role,
    passwordHash: await hashPassword(parsed.data.password),
  });
  await audit(user.id, "user.create", `${parsed.data.email} (${parsed.data.role})`);
  revalidatePath("/admin/parametres");
  return { ok: true };
}

export async function toggleUser(id: string) {
  const me = await requireUser("ADMIN");
  if (id === me.id || !z.string().uuid().safeParse(id).success) return; // never lock yourself out
  const target = await db.query.users.findFirst({ where: eq(schema.users.id, id) });
  if (!target) return;
  await db.update(schema.users).set({ active: !target.active }).where(eq(schema.users.id, id));
  if (target.active) await bumpSessionVersion(id); // a disabled account is logged out everywhere
  await audit(me.id, target.active ? "user.disable" : "user.enable", target.email);
  revalidatePath("/admin/parametres");
}

/* --------------------------------------------------------------- passwords */

const password = z
  .string()
  .min(12, "12 caractères minimum.")
  .max(128, "128 caractères maximum.")
  // bcrypt only reads the first 72 bytes: longer passwords would be silently truncated
  .refine((p) => Buffer.byteLength(p, "utf8") <= 72, "72 octets maximum (environ 70 caractères).")
  .refine((p) => new Set(p).size >= 6, "Mot de passe trop simple.");

/** Any logged-in user changes their own password (current password required). Other sessions are closed. */
export async function changeOwnPassword(_: FormState, form: FormData): Promise<FormState> {
  const me = await requireUser();
  if (await isRateLimited(`pwd:${me.id}`, 5, 900)) return { error: "Trop de tentatives. Réessayez dans 15 minutes." };
  const current = String(form.get("current") ?? "");
  const next = String(form.get("next") ?? "");
  if (next !== String(form.get("confirm") ?? "")) return { error: "Les deux nouveaux mots de passe sont différents." };
  const parsed = password.safeParse(next);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  if (next.toLowerCase().includes(me.email.split("@")[0].toLowerCase())) return { error: "Le mot de passe ne doit pas contenir votre identifiant." };
  if (!(await verifyCredentials(me.email, current))) return { error: "Mot de passe actuel incorrect." };
  await db.update(schema.users).set({ passwordHash: await hashPassword(next) }).where(eq(schema.users.id, me.id));
  await bumpSessionVersion(me.id);
  const fresh = await verifyCredentials(me.email, next);
  if (fresh) await createSession(fresh); // this device stays connected, every other one is logged out
  await audit(me.id, "user.password", "");
  return { ok: true };
}

/** An administrator sets a new password for another account (forgotten password). */
export async function resetUserPassword(id: string, _: FormState, form: FormData): Promise<FormState> {
  const me = await requireUser("ADMIN");
  if (!z.string().uuid().safeParse(id).success || id === me.id) return { error: "Compte invalide." };
  const parsed = password.safeParse(String(form.get("password") ?? ""));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const target = await db.query.users.findFirst({ where: eq(schema.users.id, id), columns: { email: true } });
  if (!target) return { error: "Compte introuvable." };
  await db.update(schema.users).set({ passwordHash: await hashPassword(parsed.data) }).where(eq(schema.users.id, id));
  await bumpSessionVersion(id);
  await audit(me.id, "user.password.reset", target.email);
  return { ok: true };
}

/* --------------------------------------------------------- data protection */

/**
 * Loi 09-08: personal data is not kept longer than necessary.
 * Anonymises past appointments older than N months (statistics are kept, identities are erased).
 */
export async function anonymizeOldAppointments(_: FormState, form: FormData): Promise<FormState> {
  const me = await requireUser("ADMIN");
  const months = z.coerce.number().int().min(6).max(120).safeParse(form.get("months"));
  if (!months.success) return { error: "Durée invalide (6 à 120 mois)." };
  const before = new Date();
  before.setMonth(before.getMonth() - months.data);
  const rows = await db.execute(sql`
    UPDATE appointments
       SET patient_name = 'Patient anonymisé', patient_phone = '', patient_email = 'anonyme@invalid.local',
           reason = '', cancel_token = 'x' || md5(random()::text || id), updated_at = now()
     WHERE ends_at < ${before.toISOString()}::timestamptz AND patient_email <> 'anonyme@invalid.local'`);
  await audit(me.id, "data.anonymize", `${rows.rowCount ?? 0} rendez-vous (> ${months.data} mois)`);
  revalidatePath("/admin", "layout");
  return { ok: true, error: undefined };
}
