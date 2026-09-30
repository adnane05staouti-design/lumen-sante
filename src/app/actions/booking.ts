"use server";

import { randomBytes } from "node:crypto";
import { and, count, eq, gt, inArray, sql } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { getSpecialtyBySlug } from "@/lib/availability";
import { getSite, getTexts } from "@/lib/content";
import { escapeHtml, sendEmail, siteUrl } from "@/lib/email";
import { hasLocale, type Locale } from "@/lib/i18n";
import { safeError } from "@/lib/log";
import { clientKey, isRateLimited } from "@/lib/rate-limit";
import { AVAILABILITY_TAG, getFreeSlots, getRules } from "@/lib/slots";
import { clinicDay, formatLong } from "@/lib/time";
import { normalizePhone } from "@/lib/phone";
import { hashToken, newCancelToken } from "@/lib/tokens";

/* Free slots are read through the cached GET routes /api/slots and /api/availability. */

/* ------------------------------------------------------------ create booking */

/** A name never contains a link (blocks using the clinic's e-mail to send phishing). */
const noLink = (v: string) => !/(https?:|www\.|:\/\/|\.(com|net|org|ma|fr|io|ru|xyz|top)\b)/i.test(v);

const bookingInput = z.object({
  locale: z.string().max(5),
  specialty: z.string().min(1).max(40),
  doctorId: z.string().uuid().optional(),
  startsAt: z.string().datetime(),
  name: z.string().trim().min(2).max(80).refine(noLink),
  // stored in one standard form (+212612345678) so the clinic can always call back
  phone: z
    .string()
    .max(30)
    .transform((v, ctx) => normalizePhone(v) ?? (ctx.addIssue({ code: z.ZodIssueCode.custom }), z.NEVER)),
  email: z.string().trim().toLowerCase().email().max(120),
  reason: z.string().trim().max(200).refine(noLink).optional().default(""),
  consent: z.boolean().refine((v) => v === true),
  website: z.string().max(0).optional(), // honeypot: must stay empty
});

export type BookingResult =
  | { ok: true; reference: string; startsAt: string; doctor: string; status: "PENDING" | "CONFIRMED" }
  | { ok: false; error: "invalid" | "rate" | "taken" | "limit" | "server"; fields?: string[] };

/** 8 characters without ambiguous letters (0/O, 1/I): ~40 bits, easy to read over the phone. */
const REF_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const referenceOf = () => `LS-${[...randomBytes(8)].map((b) => REF_ALPHABET[b % 32]).join("")}`;

class LimitReached extends Error {}
const pgCode = (e: unknown) => (e as { code?: string }).code ?? (e as { cause?: { code?: string } }).cause?.code;
const pgConstraint = (e: unknown) => (e as { constraint?: string }).constraint ?? (e as { cause?: { constraint?: string } }).cause?.constraint;

export async function createAppointment(input: z.input<typeof bookingInput>): Promise<BookingResult> {
  try {
    return await book(input);
  } catch (error) {
    // database or network problem before the insertion: a clear message, never a crash
    console.error("[booking] failed:", safeError(error));
    return { ok: false, error: "server" };
  }
}

async function book(input: z.input<typeof bookingInput>): Promise<BookingResult> {
  const parsed = bookingInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "invalid", fields: [...new Set(parsed.error.issues.map((i) => String(i.path[0])))] };
  }
  const data = parsed.data;
  const locale: Locale = hasLocale(data.locale) ? data.locale : "fr";

  // 10 bookings per hour per network (IPv6: per /64). Generous enough for shared mobile IPs (CGNAT).
  if (await isRateLimited(`book:${await clientKey()}`, 10, 3600)) return { ok: false, error: "rate" };

  const specialty = await getSpecialtyBySlug(data.specialty);
  if (!specialty) return { ok: false, error: "invalid" };
  const rules = await getRules();

  // Re-check availability on the server: never trust the time sent by the browser
  const start = new Date(data.startsAt);
  const slots = await getFreeSlots({
    specialtyId: specialty.id,
    durationMin: specialty.durationMin,
    day: clinicDay(start),
    doctorId: data.doctorId,
    rules,
  });
  const candidates = slots.filter((s) => s.startsAt === start.toISOString());
  if (candidates.length === 0) return { ok: false, error: "taken" };

  const status = rules.autoConfirm ? "CONFIRMED" : "PENDING";
  // the patient gets the token by e-mail; the database only keeps its fingerprint
  const cancelToken = newCancelToken();

  // Try each available doctor. The database refuses a concurrent double booking:
  // unique index (same start, 23505) and exclusion constraint (overlapping times, 23P01).
  for (let i = 0; i < candidates.length; i++) {
    const slot = candidates[i];
    const reference = referenceOf();
    try {
      await db.transaction(async (tx) => {
        // Per-e-mail limit, checked and written atomically (parallel requests cannot bypass it)
        await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${data.email}))`);
        const [{ active }] = await tx
          .select({ active: count() })
          .from(schema.appointments)
          .where(
            and(
              eq(schema.appointments.patientEmail, data.email),
              inArray(schema.appointments.status, ["PENDING", "CONFIRMED"]),
              gt(schema.appointments.startsAt, new Date()),
            ),
          );
        if (active >= rules.maxActivePerEmail) throw new LimitReached();
        await tx.insert(schema.appointments).values({
          reference,
          doctorId: slot.doctorId,
          specialtyId: specialty.id,
          startsAt: start,
          endsAt: new Date(start.getTime() + specialty.durationMin * 60_000),
          status,
          patientName: data.name,
          patientPhone: data.phone,
          patientEmail: data.email,
          reason: data.reason,
          locale,
          cancelToken: hashToken(cancelToken),
        });
      });
    } catch (error) {
      if (error instanceof LimitReached) return { ok: false, error: "limit" };
      // (very unlikely) two bookings drew the same reference: same doctor tried again with a new one
      if (pgCode(error) === "23505" && pgConstraint(error)?.includes("reference")) {
        i--;
        continue;
      }
      if (pgCode(error) === "23505" || pgCode(error) === "23P01") continue; // slot taken meanwhile: next doctor
      console.error("[booking] insert failed:", safeError(error));
      return { ok: false, error: "server" };
    }

    revalidateTag(AVAILABILITY_TAG, { expire: 0 });
    const doctor = await db.query.doctors.findFirst({ where: eq(schema.doctors.id, slot.doctorId), columns: { title: true, firstName: true, lastName: true } });
    const doctorName = doctor ? `${doctor.title} ${doctor.firstName} ${doctor.lastName}` : "";
    // e-mails are sent after the response: the patient does not wait for the mail server
    after(async () => {
      await sendConfirmation({ locale, to: data.email, name: data.name, reference, start, doctorName, specialty: data.specialty, cancelToken, status });
      await notifyClinic({ reference, start, doctorName, specialty: data.specialty, name: data.name, phone: data.phone, status });
    });
    return { ok: true, reference, startsAt: start.toISOString(), doctor: doctorName, status };
  }
  return { ok: false, error: "taken" };
}

async function sendConfirmation(p: {
  locale: Locale;
  to: string;
  name: string;
  reference: string;
  start: Date;
  doctorName: string;
  specialty: string;
  cancelToken: string;
  status: "PENDING" | "CONFIRMED";
}) {
  const [dict, site] = await Promise.all([getTexts(p.locale), getSite()]);
  const t = dict.email;
  const when = formatLong(p.start, p.locale);
  const spec = site.specialties[p.specialty as keyof typeof site.specialties]?.name[p.locale] ?? p.specialty;
  const cancelUrl = `${siteUrl()}/${p.locale}/rendez-vous/annuler/${p.cancelToken}`;
  const heading = p.status === "CONFIRMED" ? t.confirmed : t.pending;
  const lines = [
    `${t.hello} ${p.name},`,
    heading,
    `${t.reference} : ${p.reference}`,
    `${t.when} : ${when}`,
    `${t.with} : ${p.doctorName} — ${spec}`,
    `${site.identity.name} · ${site.identity.address[p.locale]}`,
    `${t.cancel} : ${cancelUrl}`,
  ];
  const dir = p.locale === "ar" ? "rtl" : "ltr";
  const html = `<div dir="${dir}" style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#111">
<p>${escapeHtml(lines[0])}</p><p><strong>${escapeHtml(heading)}</strong></p>
<p>${lines.slice(2, 6).map(escapeHtml).join("<br>")}</p>
<p><a href="${cancelUrl}">${escapeHtml(t.cancel)}</a></p></div>`;
  await sendEmail(p.to, `${site.identity.name} — ${heading} (${p.reference})`, html, lines.join("\n"), site.identity.name);
}

/** Short notice to the clinic's contact address (no health information: no reason, no e-mail). */
async function notifyClinic(p: {
  reference: string;
  start: Date;
  doctorName: string;
  specialty: string;
  name: string;
  phone: string;
  status: "PENDING" | "CONFIRMED";
}) {
  const site = await getSite();
  const to = site.identity.email;
  if (!to || to.endsWith(".example")) return;
  const spec = site.specialties[p.specialty as keyof typeof site.specialties]?.name.fr ?? p.specialty;
  const lines = [
    p.status === "PENDING" ? "Nouvelle demande de rendez-vous à confirmer." : "Nouveau rendez-vous confirmé.",
    `Référence : ${p.reference}`,
    `Date : ${formatLong(p.start, "fr")}`,
    `Avec : ${p.doctorName} — ${spec}`,
    `Patient : ${p.name} · ${p.phone}`,
    `Espace cabinet : ${siteUrl()}/admin/rendez-vous`,
  ];
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#111"><p>${lines.map(escapeHtml).join("<br>")}</p></div>`;
  await sendEmail(to, `${p.status === "PENDING" ? "À confirmer" : "Nouveau RDV"} — ${p.reference}`, html, lines.join("\n"), site.identity.name);
}

/* ------------------------------------------------------------------ cancel */

export async function cancelByToken(token: string): Promise<{ ok: boolean; error?: "notfound" | "late" | "done" }> {
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{20,64}$/.test(token)) return { ok: false, error: "notfound" };
  if (await isRateLimited(`cancel:${await clientKey()}`, 20, 3600)) return { ok: false, error: "notfound" };
  const appt = await db.query.appointments.findFirst({ where: eq(schema.appointments.cancelToken, hashToken(token)) });
  if (!appt) return { ok: false, error: "notfound" };
  if (appt.status !== "PENDING" && appt.status !== "CONFIRMED") return { ok: false, error: "done" };
  const rules = await getRules();
  if (appt.startsAt.getTime() - Date.now() < rules.cancelLimitHours * 3600_000) return { ok: false, error: "late" };
  const [cancelled] = await db
    .update(schema.appointments)
    .set({ status: "CANCELLED", updatedAt: new Date() })
    .where(and(eq(schema.appointments.id, appt.id), inArray(schema.appointments.status, ["PENDING", "CONFIRMED"])))
    .returning({ id: schema.appointments.id });
  if (!cancelled) return { ok: false, error: "done" }; // already cancelled at the same moment
  revalidateTag(AVAILABILITY_TAG, { expire: 0 });
  return { ok: true };
}
