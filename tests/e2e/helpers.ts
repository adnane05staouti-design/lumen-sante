import { expect, type Page } from "@playwright/test";
import { Pool } from "pg";

export const db = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });

/** Test e-mails all look like e2e+<something>@lumen.test so they can be cleaned up. */
export const testEmail = (tag: string) => `e2e+${tag}-${Date.now()}@lumen.test`;

export async function cleanup() {
  await db.query("DELETE FROM appointments WHERE patient_email LIKE 'e2e+%@lumen.test'");
  await db.query("DELETE FROM users WHERE email LIKE 'e2e+%@lumen.test'");
  await db.query("DELETE FROM rate_limits WHERE key LIKE 'book:%' OR key LIKE 'login:%' OR key LIKE 'pwd:%'");
}

/** A free slot a few days ahead, found through the public API. */
export async function freeSlot(page: Page, specialty = "dentaire", skip = 0) {
  for (let offset = 3; offset < 30; offset++) {
    const day = new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
    const res = await page.request.get(`/api/slots?specialty=${specialty}&day=${day}`);
    const { slots } = (await res.json()) as { slots: { time: string; startsAt: string; doctorId: string }[] };
    if (slots.length > skip) return { day, ...slots[skip] };
  }
  throw new Error("no free slot found");
}

export async function login(page: Page, email = process.env.ADMIN_EMAIL!, password = process.env.ADMIN_PASSWORD!) {
  await page.goto("/admin/login");
  await page.fill("input[name=email]", email);
  await page.fill("input[name=password]", password);
  await page.locator("form button").first().click();
  await expect(page).toHaveURL(/\/admin$/);
}

/** Fills and submits the booking form for a pre-selected slot. */
export async function book(page: Page, slot: { day: string; time: string }, email: string, specialty = "dentaire", name = "Patient Test") {
  await page.goto(`/fr/rendez-vous?specialty=${specialty}&day=${slot.day}&time=${slot.time}`);
  await expect(page.locator("button[aria-pressed=true]", { hasText: slot.time })).toBeVisible();
  await page.getByRole("button", { name: /Continuer/ }).click();
  await page.fill("input[name=name]", name);
  await page.fill("input[name=phone]", "+212 600 11 22 33");
  await page.fill("input[name=email]", email);
  await page.check("input[name=consent]");
  await page.getByRole("button", { name: /Confirmer le rendez-vous/ }).click();
}
