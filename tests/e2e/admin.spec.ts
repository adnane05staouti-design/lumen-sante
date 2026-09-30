import { expect, test } from "@playwright/test";
import { base32Decode, base32Encode, currentStep, totpCode } from "../../src/lib/totp";
import { book, cleanup, db, freeSlot, login, testEmail } from "./helpers";

test.beforeAll(cleanup);
test.afterAll(cleanup);

test.describe("Espace cabinet : accès", () => {
  test("sans connexion → page de connexion", async ({ page }) => {
    for (const p of ["/admin", "/admin/rendez-vous", "/admin/contenu", "/admin/parametres"]) {
      await page.goto(p);
      await expect(page).toHaveURL(/\/admin\/login$/);
    }
  });

  test("mauvais mot de passe et tentative d'injection refusés", async ({ page }) => {
    await page.goto("/admin/login");
    for (const [email, pwd] of [
      [process.env.ADMIN_EMAIL!, "mauvais-mot-de-passe"],
      ["' OR '1'='1", "' OR '1'='1"],
    ]) {
      await page.fill("input[name=email]", email);
      await page.fill("input[name=password]", pwd);
      await page.locator("form button").first().click();
      await expect(page.getByText(/incorrect|Identifiants/)).toBeVisible();
    }
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test("cookie de session falsifié → refusé", async ({ page, context, baseURL }) => {
    const fake = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4Iiwic3YiOjB9.invalidsignature";
    await context.addCookies([{ name: "lumen_session", value: fake, url: baseURL! }]);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test("cookie sécurisé : HttpOnly + SameSite", async ({ page, context }) => {
    await login(page);
    const cookie = (await context.cookies()).find((c) => c.name === "lumen_session");
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe("Lax");
  });

  test("la déconnexion invalide aussi l'ancien cookie (vol de session)", async ({ page, context, browser, baseURL }) => {
    await login(page);
    const stolen = (await context.cookies()).find((c) => c.name === "lumen_session")!;
    await page.getByRole("button", { name: /Déconnexion/ }).click();
    await expect(page).toHaveURL(/\/admin\/login$/);
    const attacker = await browser.newContext();
    await attacker.addCookies([{ name: "lumen_session", value: stolen.value, url: baseURL! }]);
    const p = await attacker.newPage();
    await p.goto("/admin");
    await expect(p).toHaveURL(/\/admin\/login$/);
    await attacker.close();
  });

  test("un compte Secrétariat n'accède pas aux pages Administrateur", async ({ page, browser }) => {
    await login(page);
    const email = testEmail("staff");
    await page.goto("/admin/parametres");
    await page.fill("form:has(select[name=role]) input[name=name]", "Secrétaire E2E");
    await page.fill("form:has(select[name=role]) input[name=email]", email);
    await page.fill("form:has(select[name=role]) input[name=password]", "Secretaire#2026-e2e");
    await page.selectOption("select[name=role]", "STAFF");
    await page.getByRole("button", { name: "Créer le compte" }).click();
    await expect(page.getByText("Compte créé.")).toBeVisible();

    const staff = await (await browser.newContext()).newPage();
    await login(staff, email, "Secretaire#2026-e2e");
    for (const p of ["/admin/parametres", "/admin/contenu", "/admin/medecins", "/admin/specialites"]) {
      await staff.goto(p);
      await expect(staff).toHaveURL(/\/admin$/);
    }
    await staff.goto("/admin/rendez-vous");
    await expect(staff).toHaveURL(/\/admin\/rendez-vous/);
  });

  test("blocage après trop de tentatives", async ({ page }) => {
    await page.goto("/admin/login");
    for (let i = 0; i < 6; i++) {
      await page.fill("input[name=email]", "cible@lumen.test");
      await page.fill("input[name=password]", `essai-${i}`);
      // wait for the server answer before the next try (a click while pending is ignored)
      await Promise.all([page.waitForResponse((r) => r.request().method() === "POST"), page.locator("form button").first().click()]);
    }
    await expect(page.getByText(/Trop de tentatives/)).toBeVisible();
  });
});

test.describe("Double authentification (2FA)", () => {
  test("activation, codes de secours, connexion en 2 étapes, code refusé, réinitialisation par l'admin", async ({ page, browser }) => {
    await db.query("DELETE FROM rate_limits WHERE key LIKE 'login:%' OR key LIKE 'mfa%'");
    // a dedicated account (the main administrator is never modified by the tests)
    await login(page);
    const email = testEmail("mfa");
    const password = "Double-Auth#2026-e2e";
    await page.goto("/admin/parametres");
    await page.fill("form:has(select[name=role]) input[name=name]", "Compte 2FA E2E");
    await page.fill("form:has(select[name=role]) input[name=email]", email);
    await page.fill("form:has(select[name=role]) input[name=password]", password);
    await page.getByRole("button", { name: "Créer le compte" }).click();
    await expect(page.getByText("Compte créé.")).toBeVisible();

    const user = await (await browser.newContext()).newPage();
    await login(user, email, password);
    await expect(user.getByText(/activez la double authentification/)).toBeVisible();
    await user.goto("/admin/compte");
    await user.getByRole("button", { name: "Activer la double authentification" }).click();
    await expect(user.getByAltText(/QR code/)).toBeVisible();
    const key = (await user.locator("p.font-mono").textContent())!.replace(/\s/g, "");
    const secret = base32Encode(base32Decode(key));

    await user.fill("input[name=code]", "000000");
    await user.getByRole("button", { name: "Activer" }).click();
    await expect(user.getByText(/Code incorrect/)).toBeVisible();
    await user.fill("input[name=code]", totpCode(secret, currentStep()));
    await user.getByRole("button", { name: "Activer" }).click();
    await expect(user.getByText("Double authentification activée.")).toBeVisible();
    const codes = (await user.locator("ul.font-mono li").allTextContents()).map((c) => c.trim());
    expect(codes).toHaveLength(8);

    const row = await db.query("SELECT totp_secret, totp_enabled, recovery_codes FROM users WHERE email = $1", [email]);
    expect(row.rows[0].totp_enabled).toBe(true);
    expect(row.rows[0].totp_secret).not.toContain(secret); // stored encrypted
    expect(JSON.stringify(row.rows[0].recovery_codes)).not.toContain(codes[0]); // only fingerprints

    // login: the password alone is no longer enough
    const again = await (await browser.newContext()).newPage();
    await again.goto("/admin/login");
    await again.fill("input[name=email]", email);
    await again.fill("input[name=password]", password);
    await again.locator("form button").first().click();
    await expect(again.getByText(/Code à 6 chiffres/)).toBeVisible();
    await again.goto("/admin");
    await expect(again).toHaveURL(/\/admin\/login$/); // no session before the code
    await again.fill("input[name=email]", email);
    await again.fill("input[name=password]", password);
    await again.locator("form button").first().click();
    await again.fill("input[name=code]", "123456");
    await again.getByRole("button", { name: "Vérifier" }).click();
    await expect(again.getByText("Code incorrect.")).toBeVisible();
    await again.fill("input[name=code]", codes[0]); // recovery code
    await again.getByRole("button", { name: "Vérifier" }).click();
    await expect(again).toHaveURL(/\/admin$/);

    // a recovery code only works once
    const third = await (await browser.newContext()).newPage();
    await third.goto("/admin/login");
    await third.fill("input[name=email]", email);
    await third.fill("input[name=password]", password);
    await third.locator("form button").first().click();
    await third.fill("input[name=code]", codes[0]);
    await third.getByRole("button", { name: "Vérifier" }).click();
    await expect(third.getByText("Code incorrect.")).toBeVisible();

    // lost phone: the administrator resets the 2FA; the user's sessions are closed
    await page.goto("/admin/parametres");
    page.once("dialog", (d) => d.accept());
    await page.locator("li", { hasText: email }).getByRole("button", { name: "Réinitialiser la 2FA" }).click();
    await expect(page.locator("li", { hasText: email }).first()).toContainText("sans 2FA"); // first match: the accounts list
    await again.goto("/admin");
    await expect(again).toHaveURL(/\/admin\/login$/);
  });
});

test.describe("Espace cabinet : fonctions", () => {
  test.beforeEach(async () => db.query("DELETE FROM rate_limits WHERE key LIKE 'login:%'"));

  test("tableau de bord et pages principales s'affichent", async ({ page }) => {
    await login(page);
    for (const p of ["/admin", "/admin/rendez-vous", "/admin/medecins", "/admin/specialites", "/admin/parametres", "/admin/contenu", "/admin/compte"]) {
      const res = await page.goto(p);
      expect(res?.status(), p).toBe(200);
      await expect(page.locator("h1")).toBeVisible();
    }
  });

  test("contenu du site : modification visible puis retour à l'original", async ({ page }) => {
    await login(page);
    await page.goto("/admin/contenu?tab=appel");
    const field = page.locator('input[name="t|cta.title|fr"]');
    const save = page.locator('form:has(input[name="t|cta.title|fr"]) button[type=submit]');
    const original = await field.inputValue(); // the clinic's own text is put back at the end
    await field.fill("Titre de test E2E");
    await save.click();
    await expect(page.getByText("Enregistré.")).toBeVisible();
    expect(await (await page.request.get("/fr")).text()).toContain("Titre de test E2E");

    await page.reload();
    await field.fill(original);
    await save.click();
    await expect(page.getByText("Enregistré.")).toBeVisible();
    expect(await (await page.request.get("/fr")).text()).not.toContain("Titre de test E2E");
  });

  test("recherche d'un patient sur toutes les dates, confirmation puis absent → venu", async ({ page }) => {
    const slot = await freeSlot(page, "dermatologie", 1);
    await book(page, slot, testEmail("admin-flow"), "dermatologie", "Patient Recherche");
    const ref = (await page.getByText(/^LS-[0-9A-F]{6}$/).first().textContent())!.trim();

    await login(page);
    await page.goto(`/admin/rendez-vous?range=all&q=${ref}`);
    const row = page.locator("tr", { hasText: ref });
    await expect(row).toBeVisible();
    for (const [button, status] of [["Confirmer", "CONFIRMED"], ["Absent", "NO_SHOW"], ["Terminé", "COMPLETED"]] as const) {
      const current = await db.query("SELECT status FROM appointments WHERE reference = $1", [ref]);
      if (current.rows[0].status === status) continue; // already there (auto-confirmation enabled)
      await row.getByRole("button", { name: button }).click();
      await expect.poll(async () => (await db.query("SELECT status FROM appointments WHERE reference = $1", [ref])).rows[0].status).toBe(status);
    }
  });

  test("horaires qui se chevauchent refusés", async ({ page }) => {
    await login(page);
    await page.goto("/admin/medecins");
    await page.locator('a[href^="/admin/medecins/"]').first().click();
    await page.fill('input[name="1-am-start"]', "09:00");
    await page.fill('input[name="1-am-end"]', "15:00");
    await page.fill('input[name="1-pm-start"]', "14:00");
    await page.fill('input[name="1-pm-end"]', "18:00");
    await page.locator('form:has(input[name="1-am-start"]) button[type=submit]').click();
    await expect(page.getByText(/chevauchent/)).toBeVisible();
  });
});
