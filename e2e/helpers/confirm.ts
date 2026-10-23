import type { Page } from "@playwright/test";

/** Valide le dialog de confirmation stylé (ConfirmButton) actuellement ouvert. */
export async function confirmDialog(page: Page) {
  await page.locator("dialog[open] [data-confirm]").click();
}

/**
 * Soumet /admin/reservations/new. Avec `force`, la case « Enregistrer quand même »
 * n'apparaît qu'après un conflit de disponibilité : on la coche alors et on resoumet.
 */
/** Après enregistrement, l'hôte arrive sur le détail de la réservation créée. */
export const SAVED_BOOKING_URL = /\/admin\/reservations\/[0-9a-f-]{36}\?enregistree=1$/;

export async function submitManualBookingForm(page: Page, force = false) {
  await page.click('[type="submit"]');
  if (!force) return;
  const outcome = await Promise.race([
    page.waitForURL(SAVED_BOOKING_URL, { timeout: 15000 }).then(() => "saved").catch(() => null),
    page.getByText("Ces dates chevauchent").waitFor({ timeout: 15000 }).then(() => "conflict").catch(() => null),
  ]);
  if (outcome === "conflict") {
    await page.locator('input[name="force"]').check();
    await page.click('[type="submit"]');
  }
}
