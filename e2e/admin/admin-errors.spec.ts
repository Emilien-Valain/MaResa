import { test, expect } from "@playwright/test";
import { confirmDialog, SAVED_BOOKING_URL } from "../helpers/confirm";

/**
 * Spécification : Tests de non-régression > Admin > Erreurs et confirmations
 *
 * Les erreurs restent dans l'admin (navigation visible, français, chemin de retour)
 * et les actions destructives passent par un dialog stylé, jamais par confirm().
 */

test.describe("Admin — 404 dans l'admin", () => {
  for (const url of [
    "/admin/reservations/00000000-0000-0000-0000-000000000000",
    "/admin/reservations/pas-un-uuid",
    "/admin/chambres/pas-un-uuid/edit",
    "/admin/chambres/00000000-0000-0000-0000-000000000000/edit",
    "/admin/page-qui-nexiste-pas",
  ]) {
    test(`${url} → 404 en français avec navigation et retour`, async ({ page }) => {
      const res = await page.goto(url);
      expect(res?.status()).toBe(404);
      await expect(page.getByRole("heading", { name: "Introuvable" })).toBeVisible();
      // Message valable pour toute URL, pas seulement réservation/chambre.
      await expect(page.getByText("Cette page n'existe pas")).toBeVisible();
      await expect(page.getByRole("link", { name: "Réservations" }).first()).toBeVisible();
      await page.getByRole("link", { name: "Voir les réservations" }).click();
      await expect(page).toHaveURL("/admin/reservations");
    });
  }
});

test.describe("Admin — Dialog de confirmation", () => {
  test("Retour et Échap ferment sans rien supprimer ; aucun confirm() natif", async ({ page }) => {
    let nativeDialog = false;
    page.on("dialog", async (d) => {
      nativeDialog = true;
      await d.dismiss();
    });

    const name = `Confirm ${Date.now().toString(36).slice(-5)}`;
    await page.goto("/admin/chambres/new");
    await page.fill('[name="nom"]', name);
    await page.fill('[name="prix"]', "80");
    await page.fill('[name="capacite"]', "2");
    await page.click('[type="submit"]');
    await expect(page).toHaveURL("/admin/chambres");

    const row = page.locator(`[data-room-name="${name}"]`);
    await row.getByRole("button", { name: "Supprimer" }).click();
    const dialog = page.locator("dialog[open]");
    await expect(dialog).toContainText(name);
    // Le focus démarre sur l'action sûre
    await expect(dialog.getByRole("button", { name: "Retour" })).toBeFocused();
    await dialog.getByRole("button", { name: "Retour" }).click();
    await expect(page.locator("dialog[open]")).toHaveCount(0);
    await expect(row).toHaveCount(1);

    await row.getByRole("button", { name: "Supprimer" }).click();
    await page.keyboard.press("Escape");
    await expect(page.locator("dialog[open]")).toHaveCount(0);
    await expect(row).toHaveCount(1);

    await row.getByRole("button", { name: "Supprimer" }).click();
    await confirmDialog(page);
    await expect(row).toHaveCount(0);
    expect(nativeDialog).toBe(false);
  });
});

test.describe("Admin — Suppression d'une chambre réservée", () => {
  const RUN = Date.now().toString(36).slice(-5);
  const EMAIL = `room-in-use-${RUN}@example.com`;

  test("refus expliqué dans le dialog, la chambre reste ; puis nettoyage", async ({ page }) => {
    const { deleteBookingsByEmail } = await import("../helpers/intake");
    const fs = await import("fs");
    const path = await import("path");
    const ctx = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "e2e", ".auth", "test-context.json"), "utf-8"),
    ) as { tenantId: string };

    const name = `Occupée ${RUN}`;
    await page.goto("/admin/chambres/new");
    await page.fill('[name="nom"]', name);
    await page.fill('[name="prix"]', "90");
    await page.fill('[name="capacite"]', "2");
    await page.click('[type="submit"]');
    await expect(page).toHaveURL("/admin/chambres");

    try {
      await page.goto("/admin/reservations/new");
      const select = page.locator('select[name="roomId"]');
      const value = await select.locator("option", { hasText: name }).getAttribute("value");
      await select.selectOption(value!);
      await page.fill('[name="guestName"]', `Client ${RUN}`);
      await page.fill('[name="guestEmail"]', EMAIL);
      const d = (n: number) => new Date(Date.now() + n * 86400000).toISOString().split("T")[0];
      await page.locator('[name="checkIn"]').fill(d(500));
      await page.locator('[name="checkOut"]').fill(d(502));
      await page.click('[type="submit"]');
      await expect(page).toHaveURL(SAVED_BOOKING_URL);

      await page.goto("/admin/chambres");
      const row = page.locator(`[data-room-name="${name}"]`);
      await row.getByRole("button", { name: "Supprimer" }).click();
      await confirmDialog(page);
      await expect(page.locator("dialog[open]")).toContainText("ne peut pas être supprimée");
      await page.keyboard.press("Escape");
      await expect(row).toHaveCount(1);
    } finally {
      await deleteBookingsByEmail(ctx.tenantId, EMAIL);
      await page.goto("/admin/chambres");
      const row = page.locator(`[data-room-name="${name}"]`);
      if (await row.count()) {
        await row.getByRole("button", { name: "Supprimer" }).click();
        await confirmDialog(page);
        await expect(row).toHaveCount(0);
      }
    }
  });
});
