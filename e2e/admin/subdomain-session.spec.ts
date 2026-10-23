import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import { deleteBookingsByEmail } from "../helpers/intake";
import { submitManualBookingForm } from "../helpers/confirm";

/**
 * Spécification : Tests de non-régression > Admin > Session sur sous-domaine
 *
 * Le redirect() d'une server action est rendu par un fetch interne de Next vers
 * `localhost` : le proxy doit résoudre le tenant via x-forwarded-host, sinon
 * l'hôte atterrit sur « Connexion » après avoir enregistré (bug P0 2026-10-22).
 * Sur `localhost` nu le bug est invisible (même tenant) : on passe donc par
 * `<slug>.localhost`, comme en prod avec un domaine par hôte.
 */

const ctx = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "e2e", ".auth", "test-context.json"), "utf-8"),
) as { tenantId: string };

const BASE = "http://test-tenant.localhost:3001";
const EMAIL = "subdomain-redirect@example.com";

test.use({ storageState: { cookies: [], origins: [] } });

test.afterAll(() => deleteBookingsByEmail(ctx.tenantId, EMAIL));

test("sous-domaine : enregistrer une réservation manuelle ne renvoie pas vers Connexion", async ({ page }) => {
  await page.goto(`${BASE}/login`);
  await page.fill('[name="email"]', process.env.TEST_ADMIN_EMAIL!);
  await page.fill('[name="password"]', process.env.TEST_ADMIN_PASSWORD!);
  await Promise.all([page.waitForURL(/\/admin/), page.click('button[type="submit"]')]);

  await page.goto(`${BASE}/admin/reservations/new`);
  await page.locator('select[name="roomId"]').selectOption({ index: 1 });
  await page.fill('[name="guestName"]', "Sous-domaine Redirect");
  await page.fill('[name="guestEmail"]', EMAIL);
  await submitManualBookingForm(page, true);

  await expect(page.getByRole("heading", { name: "Connexion" })).toHaveCount(0);
  await expect(page.getByText("Sous-domaine Redirect").first()).toBeVisible();
});
