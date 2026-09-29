import { expect, test } from "@playwright/test";
import { book, cleanup, db, freeSlot, testEmail } from "./helpers";

test.beforeAll(cleanup);
test.afterAll(cleanup);

test.describe("Réservation", () => {
  test("parcours complet → confirmation → enregistrée en base → créneau retiré", async ({ page }) => {
    const slot = await freeSlot(page);
    const email = testEmail("full");
    await book(page, slot, email);
    await expect(page.getByText(/LS-[0-9A-F]{6}/)).toBeVisible();
    const { rows } = await db.query("SELECT status, patient_name, cancel_token FROM appointments WHERE patient_email = $1", [email]);
    expect(rows).toHaveLength(1);
    expect(["CONFIRMED", "PENDING"]).toContain(rows[0].status);
    const res = await page.request.get(`/api/slots?specialty=dentaire&day=${slot.day}&doctor=${slot.doctorId}`);
    const { slots, taken } = await res.json();
    expect(slots.map((s: { time: string }) => s.time)).not.toContain(slot.time);
    expect(taken).toContain(slot.time); // exposed as a booked time (no patient information)

    // the booked time is shown greyed out and cannot be clicked
    await page.goto(`/fr/rendez-vous?specialty=dentaire&day=${slot.day}&doctor=${slot.doctorId}`);
    const bookedButton = page.getByRole("button", { name: `${slot.time} — Déjà réservé` });
    await expect(bookedButton).toBeVisible();
    await expect(bookedButton).toBeDisabled();
  });

  test("annulation par le lien sécurisé", async ({ page }) => {
    const slot = await freeSlot(page, "dentaire", 1);
    const email = testEmail("cancel");
    await book(page, slot, email);
    await expect(page.getByText(/LS-[0-9A-F]{6}/)).toBeVisible();
    const { rows } = await db.query("SELECT cancel_token FROM appointments WHERE patient_email = $1", [email]);
    await page.goto(`/fr/rendez-vous/annuler/${rows[0].cancel_token}`);
    await page.getByRole("button", { name: /Confirmer l'annulation/ }).click();
    await expect(page.getByText(/a été annulé/)).toBeVisible();
    const after = await db.query("SELECT status FROM appointments WHERE patient_email = $1", [email]);
    expect(after.rows[0].status).toBe("CANCELLED");
  });

  test("lien d'annulation inventé → refusé", async ({ page }) => {
    await page.goto("/fr/rendez-vous/annuler/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    await expect(page.getByText(/n'est plus valide/)).toBeVisible();
  });

  test("champs invalides signalés, lien dans le nom refusé", async ({ page }) => {
    const slot = await freeSlot(page, "dentaire", 2);
    // invalid e-mail: the browser blocks the form, nothing is sent
    await book(page, slot, "pas-un-email", "dentaire", "Patient Test");
    expect(await page.locator("input[type=email]").evaluate((el: HTMLInputElement) => el.validity.valid)).toBe(false);
    // link in the name: refused by the server (anti-phishing)
    await page.fill("input[type=email]", testEmail("phish"));
    await page.getByLabel(/Nom et prénom/).fill("Visitez http://phishing.example");
    await page.getByRole("button", { name: /Confirmer le rendez-vous/ }).click();
    await expect(page.locator("p[role=alert]").first()).toBeVisible();
    const { rows } = await db.query("SELECT count(*)::int AS n FROM appointments WHERE patient_name LIKE '%phishing%'");
    expect(rows[0].n).toBe(0);
  });

  test("5 patients réservent le MÊME créneau en même temps → un seul réussit", async ({ browser }) => {
    const probe = await browser.newPage();
    const slot = await freeSlot(probe, "psychiatrie");
    await probe.close();
    const contexts = await Promise.all(Array.from({ length: 5 }, () => browser.newContext()));
    const pages = await Promise.all(contexts.map((c) => c.newPage()));
    // fill everything first, then submit all at once
    await Promise.all(
      pages.map(async (p, i) => {
        await p.goto(`/fr/rendez-vous?specialty=psychiatrie&day=${slot.day}&time=${slot.time}&doctor=${slot.doctorId}`);
        await p.getByRole("button", { name: /Continuer/ }).click();
        await p.fill("input[name=name]", `Course ${i}`);
        await p.fill("input[name=phone]", "+212 600 00 00 1" + i);
        await p.fill("input[name=email]", testEmail(`race${i}`));
        await p.check("input[name=consent]");
      }),
    );
    await Promise.all(pages.map((p) => p.getByRole("button", { name: /Confirmer le rendez-vous/ }).click()));
    await Promise.all(pages.map((p) => p.waitForTimeout(4000)));
    const { rows } = await db.query(
      "SELECT count(*)::int AS n FROM appointments WHERE doctor_id = $1 AND starts_at = $2 AND status IN ('PENDING','CONFIRMED')",
      [slot.doctorId, slot.startsAt],
    );
    expect(rows[0].n).toBe(1);
    await Promise.all(contexts.map((c) => c.close()));
  });

  test("la base refuse un chevauchement même avec une heure de début différente", async () => {
    const { rows } = await db.query("SELECT id, specialty_id FROM doctors WHERE active LIMIT 1");
    const d = rows[0];
    const start = new Date(Date.now() + 40 * 86_400_000);
    start.setUTCHours(3, 0, 0, 0); // 03:00 UTC: outside opening hours, never proposed to patients
    const insert = (s: Date, e: Date, tag: string) =>
      db.query(
        `INSERT INTO appointments (id, reference, doctor_id, specialty_id, starts_at, ends_at, status, patient_name, patient_phone, patient_email, cancel_token)
         VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, 'CONFIRMED', 'Test', '0600000000', $6, $7)`,
        [`E2E-${tag}-${Date.now()}`, d.id, d.specialty_id, s, e, testEmail(tag), `tok-${tag}-${Date.now()}-${Math.random()}`],
      );
    await insert(start, new Date(start.getTime() + 30 * 60_000), "a");
    const overlapping = insert(new Date(start.getTime() + 10 * 60_000), new Date(start.getTime() + 40 * 60_000), "b");
    await expect(overlapping).rejects.toMatchObject({ code: "23P01" });
  });
});
