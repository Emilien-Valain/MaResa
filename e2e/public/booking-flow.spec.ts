import { test, expect } from "@playwright/test";

/**
 * Spécification : Tests de non-régression > Public > Parcours de réservation
 * Référence Obsidian : Phase 4.2 + 4.3 — Pages publiques et moteur de réservation
 */

test.describe("Public — Parcours de réservation", () => {
  test.skip("page d'accueil affiche les informations de l'hôtel", async ({ page }) => {
    // TODO: implémenter une fois la Phase 4.2 développée
    await page.goto("/");
    await expect(page.getByRole("main")).toBeVisible();
  });

  test.skip("liste des chambres affiche les chambres actives avec prix", async ({ page }) => {
    // TODO: implémenter une fois la Phase 4.2 développée
    await page.goto("/chambres");
  });

  test.skip("détail d'une chambre affiche la galerie et le bouton de réservation", async ({ page }) => {
    // TODO: implémenter une fois la Phase 4.2 développée
  });

  test.skip("le date picker grise les jours indisponibles", async ({ page }) => {
    // TODO: implémenter une fois la Phase 4.3 + 3.1 développées
  });

  test.skip("formulaire de réservation complet crée un booking pending", async ({ page }) => {
    // TODO: implémenter une fois la Phase 4.3 développée
    // Vérifier : check-in, check-out, nb personnes, infos client, récapitulatif
  });

  test.skip("domaine inconnu retourne une 404 propre", async ({ page }) => {
    // TODO: implémenter une fois le routing multi-tenant en place (Phase 4.1)
  });
});
