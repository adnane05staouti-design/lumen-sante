import "server-only";
import { clinic } from "@/config/clinic";

const clean = (name: string) => process.env[name]?.trim().replace(/^["']|["']$/g, "").trim() || undefined;

export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/**
 * Sends an e-mail through the Resend HTTP API.
 * Without RESEND_API_KEY (local development) the message is only logged.
 * Never throws: a failed e-mail must not cancel an appointment.
 */
export async function sendEmail(to: string, subject: string, html: string, text: string, senderName: string = clinic.name) {
  const apiKey = clean("RESEND_API_KEY");
  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      // never write patient data or cancellation links into production logs
      console.error("[email] RESEND_API_KEY is missing: e-mail not sent.");
    } else {
      console.info(`[email] (dev, not sent) to=${to} subject="${subject}"\n${text}`);
    }
    return;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: clean("EMAIL_FROM") ?? `${senderName.replace(/[<>"]/g, "")} <onboarding@resend.dev>`,
        to: [to],
        subject,
        html,
        text,
      }),
    });
    if (!res.ok) console.error(`[email] Resend refused: ${res.status}`);
  } catch (error) {
    console.error("[email] could not reach Resend:", (error as Error).message);
  }
}

export { siteUrl } from "./site";
