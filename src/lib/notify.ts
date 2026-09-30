import "server-only";
import { eq } from "drizzle-orm";
import { after } from "next/server";
import { db, schema } from "@/db";
import { getSite, getTexts } from "@/lib/content";
import { escapeHtml, sendEmail, siteUrl } from "@/lib/email";
import { hasLocale } from "@/lib/i18n";
import { safeError } from "@/lib/log";
import { formatLong } from "@/lib/time";
import { hashToken, newCancelToken } from "@/lib/tokens";

/**
 * Tells the patient when the clinic confirms or cancels their appointment.
 * Sent after the response (the receptionist does not wait for the mail server).
 * No medical information in the e-mail (no reason for the visit).
 */
export function notifyStatusChange(appointmentId: string, status: "CONFIRMED" | "CANCELLED") {
  after(async () => {
    try {
      const appt = await db.query.appointments.findFirst({
        where: eq(schema.appointments.id, appointmentId),
        with: { doctor: true, specialty: true },
      });
      if (!appt || appt.status !== status) return; // changed again in the meantime
      const locale = hasLocale(appt.locale) ? appt.locale : "fr";
      const [dict, site] = await Promise.all([getTexts(locale), getSite()]);
      const t = dict.email;
      const spec = site.specialties[appt.specialty.slug as keyof typeof site.specialties]?.name[locale] ?? appt.specialty.slug;
      const doctor = `${appt.doctor.title} ${appt.doctor.firstName} ${appt.doctor.lastName}`;

      let link: { url: string; label: string };
      if (status === "CONFIRMED") {
        // the cancellation token is only stored hashed: a fresh one is issued for this e-mail
        const token = newCancelToken();
        await db.update(schema.appointments).set({ cancelToken: hashToken(token) }).where(eq(schema.appointments.id, appt.id));
        link = { url: `${siteUrl()}/${locale}/rendez-vous/annuler/${token}`, label: t.cancel };
      } else {
        link = { url: `${siteUrl()}/${locale}/rendez-vous`, label: t.rebook };
      }
      const heading = status === "CONFIRMED" ? t.confirmed : t.cancelledByClinic;
      const lines = [
        `${t.hello} ${appt.patientName},`,
        heading,
        `${t.reference} : ${appt.reference}`,
        `${t.when} : ${formatLong(appt.startsAt, locale)}`,
        `${t.with} : ${doctor} — ${spec}`,
        `${site.identity.name} · ${site.identity.address[locale]}`,
      ];
      const dir = locale === "ar" ? "rtl" : "ltr";
      const html = `<div dir="${dir}" style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#111">
<p>${escapeHtml(lines[0])}</p><p><strong>${escapeHtml(heading)}</strong></p>
<p>${lines.slice(2).map(escapeHtml).join("<br>")}</p>
<p><a href="${link.url}">${escapeHtml(link.label)}</a></p></div>`;
      await sendEmail(appt.patientEmail, `${site.identity.name} — ${heading} (${appt.reference})`, html, [...lines, `${link.label} : ${link.url}`].join("\n"), site.identity.name);
    } catch (error) {
      console.error("[notify] status e-mail failed:", safeError(error));
    }
  });
}
