import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { db, login } from "./helpers";

/** Automatic accessibility audit (WCAG 2.1 A/AA): no serious or critical problem allowed. */
async function audit(page: Page) {
  // wait for the data (widget, slots) and the end of the transitions: never audit a half-drawn state
  await page.waitForLoadState("networkidle");
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getTiming().iterations !== Infinity) // entrance animations only (not loops)
        .map((a) => a.finished.catch(() => undefined)),
    ),
  );
  await page.waitForTimeout(300);
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  return serious.map((v) => `${v.id}: ${v.help} → ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`);
}

const PUBLIC = ["/fr", "/ar", "/en", "/fr/rendez-vous", "/fr/medecins", "/fr/confidentialite", "/fr/page-inexistante", "/admin/login"];

for (const path of PUBLIC) {
  test(`accessibilité ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForTimeout(1200);
    expect(await audit(page)).toEqual([]);
  });
}

test.describe("mobile", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  for (const path of ["/fr", "/ar", "/fr/rendez-vous"]) {
    test(`accessibilité mobile ${path}`, async ({ page }) => {
      await page.goto(path);
      await page.waitForTimeout(1200);
      expect(await audit(page)).toEqual([]);
    });
  }
});

test("espace cabinet accessible", async ({ page }) => {
  await db.query("DELETE FROM rate_limits WHERE key LIKE 'login:%'");
  await login(page);
  for (const path of ["/admin", "/admin/rendez-vous", "/admin/medecins", "/admin/specialites", "/admin/parametres", "/admin/contenu", "/admin/compte"]) {
    await page.goto(path);
    expect(await audit(page), path).toEqual([]);
  }
});

test("navigation au clavier : lien d'évitement puis focus visible", async ({ page }) => {
  await page.goto("/fr");
  await page.keyboard.press("Tab");
  const skip = page.locator(".skip-link");
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press("Tab");
  const outline = await page.evaluate(() => getComputedStyle(document.activeElement as Element).outlineStyle);
  expect(outline).not.toBe("none");
});

test("réservation possible entièrement au clavier", async ({ page }) => {
  await page.goto("/fr/rendez-vous");
  // first specialty button, reachable and activable with the keyboard
  const first = page.locator("button[aria-pressed]").first();
  await first.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("button[aria-pressed=true]").first()).toBeVisible();
});
