import { expect, test } from "@playwright/test";

const LOCALES = [
  { lang: "fr", dir: "ltr", h1: /médecine/ },
  { lang: "en", dir: "ltr", h1: /medicine/i },
  { lang: "ar", dir: "rtl", h1: /الطب/ },
];

test.describe("Pages publiques", () => {
  for (const { lang, dir, h1 } of LOCALES) {
    test(`accueil ${lang}: langue, sens, titre, aucune erreur console`, async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
      const res = await page.goto(`/${lang}`);
      expect(res?.status()).toBe(200);
      await expect(page.locator("html")).toHaveAttribute("lang", lang);
      await expect(page.locator("html")).toHaveAttribute("dir", dir);
      await expect(page.locator("h1")).toContainText(h1);
      await page.waitForTimeout(1500);
      expect(errors).toEqual([]);
    });
  }

  test("la racine redirige vers une langue", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/(fr|en|ar)$/);
  });

  for (const path of ["/fr/medecins", "/fr/rendez-vous", "/fr/confidentialite", "/ar/confidentialite", "/en/rendez-vous"]) {
    test(`page ${path} répond`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      await expect(page.locator("h1")).toBeVisible();
    });
  }

  test("page 404 personnalisée et traduite", async ({ page }) => {
    const res = await page.goto("/ar/cette-page-nexiste-pas");
    expect(res?.status()).toBe(404);
    await expect(page.getByText("404")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("الصفحة غير موجودة");
    await expect(page).toHaveTitle(/الصفحة غير موجودة/); // browser tab translated too
  });

  test("la page de réservation rappelle les numéros d'urgence", async ({ page }) => {
    await page.goto("/fr/rendez-vous");
    await expect(page.getByRole("note")).toContainText("141");
  });

  test("le consentement renvoie vers la politique de confidentialité", async ({ page }) => {
    await page.goto("/fr");
    await expect(page.locator('footer a[href="/fr/confidentialite"]')).toBeVisible();
  });

  test("robots.txt et sitemap.xml", async ({ request }) => {
    expect((await request.get("/robots.txt")).status()).toBe(200);
    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.status()).toBe(200);
    expect(await sitemap.text()).toContain("/fr");
  });

  for (const width of [360, 768, 1024, 1440, 1920]) {
    test(`aucun défilement horizontal à ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      for (const path of ["/fr", "/ar", "/fr/rendez-vous", "/fr/medecins"]) {
        await page.goto(path);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(overflow, `${path} déborde de ${overflow}px`).toBeLessThanOrEqual(1);
      }
    });
  }
});

test.describe("En-têtes de sécurité", () => {
  test("pages publiques", async ({ request }) => {
    const res = await request.get("/fr");
    const h = res.headers();
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["strict-transport-security"]).toContain("max-age=");
    expect(h["referrer-policy"]).toBeTruthy();
    expect(h["x-powered-by"]).toBeUndefined();
  });
  test("espace admin jamais mis en cache ni indexé", async ({ request }) => {
    const res = await request.get("/admin/login");
    expect(res.headers()["cache-control"]).toContain("no-store");
    expect(res.headers()["x-robots-tag"]).toContain("noindex");
  });
});

test.describe("API de disponibilités", () => {
  test("refuse les paramètres invalides", async ({ request }) => {
    for (const q of ["specialty=<script>", "specialty=dentaire&day=2026-13-45", "specialty=dentaire&day=x", "specialty=dentaire&day=2026-10-10&doctor=1%27%20OR%201=1"]) {
      const url = q.includes("day") ? `/api/slots?${q}` : `/api/availability?${q}`;
      expect((await request.get(url)).status(), url).toBe(400);
    }
  });
  test("réponse publique mise en cache par le CDN", async ({ request }) => {
    const res = await request.get("/api/availability?specialty=dentaire");
    expect(res.status()).toBe(200);
    expect(res.headers()["cache-control"]).toContain("s-maxage");
    const body = await res.json();
    expect(Array.isArray(body.days)).toBe(true);
  });
  test("date impossible refusée (30 février)", async ({ request }) => {
    const res = await request.get("/api/slots?specialty=dentaire&day=2027-02-30");
    expect(res.status()).toBe(400);
  });

  test("spécialité inconnue", async ({ request }) => {
    for (const url of ["/api/availability?specialty=inconnue", "/api/slots?specialty=inconnue&day=2030-01-07"]) {
      const res = await request.get(url);
      expect(res.status(), url).toBe(404);
    }
  });
});

test("contrôle de santé pour la supervision", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.status()).toBe(200);
  expect(res.headers()["cache-control"]).toContain("no-store");
  expect(await res.json()).toEqual({ status: "ok" });
});
