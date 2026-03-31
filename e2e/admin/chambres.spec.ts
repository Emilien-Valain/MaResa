import { test, expect } from "@playwright/test";

/**
 * Spécification : Tests de non-régression > Admin > Gestion des chambres
 * Référence Obsidian : Phase 2.2 — Admin : gestion des chambres
 *
 * Stratégie : happy path → edge cases → sécurité → nettoyage.
 *
 * Règle de nettoyage :
 * - Toutes les chambres créées utilisent un RUN_ID unique → pas de collision entre runs.
 * - Chaque test isolé (edge case) supprime sa chambre à la fin.
 * - Le cycle CRUD principal supprime la chambre dans le test "suppression".
 * - Les `getByText` peuvent retourner plusieurs éléments (runs précédents) → on cible via le filtre de row.
 */

// Identifiant unique par exécution pour éviter les collisions inter-runs
const RUN_ID = Date.now().toString(36).slice(-6);

// Noms utilisés dans le cycle CRUD (partagés entre tests ordonnés)
const CRUD_NAME = `Suite CRUD ${RUN_ID}`;
const CRUD_NAME_EDITED = `Suite CRUD ${RUN_ID} Modifiée`;

// ─── Helper : cibler une row par son nom et y agir ────────────────────────────

function roomRow(page: Parameters<Parameters<typeof test>[1]>[0], name: string) {
  return page
    .locator("div.flex.items-center.justify-between")
    .filter({ hasText: name })
    .first();
}

// ─── Happy path — cycle CRUD ──────────────────────────────────────────────────

test.describe("Admin — Gestion des chambres", () => {
  test("liste des chambres est accessible depuis /admin/chambres", async ({ page }) => {
    await page.goto("/admin/chambres");
    await expect(page.getByRole("heading", { name: /chambres/i })).toBeVisible();
    await expect(page.getByRole("link", { name: "Nouvelle chambre" })).toBeVisible();
  });

  test("création d'une chambre avec tous les champs obligatoires", async ({ page }) => {
    await page.goto("/admin/chambres/new");
    await page.fill('[name="nom"]', CRUD_NAME);
    await page.fill('[name="prix"]', "150");
    await page.fill('[name="capacite"]', "2");
    await page.click('[type="submit"]');
    await expect(page).toHaveURL("/admin/chambres");
    await expect(roomRow(page, CRUD_NAME)).toBeVisible();
  });

  test("modification d'une chambre existante", async ({ page }) => {
    await page.goto("/admin/chambres");
    await roomRow(page, CRUD_NAME).getByRole("link", { name: "Modifier" }).click();
    await expect(page).toHaveURL(/\/admin\/chambres\/.+\/edit/);
    await page.fill('[name="nom"]', CRUD_NAME_EDITED);
    await page.click('[type="submit"]');
    await expect(page).toHaveURL("/admin/chambres");
    await expect(roomRow(page, CRUD_NAME_EDITED)).toBeVisible();
  });

  test("désactiver une chambre affiche le badge Inactif dans la liste", async ({ page }) => {
    await page.goto("/admin/chambres");
    await roomRow(page, CRUD_NAME_EDITED).getByRole("link", { name: "Modifier" }).click();
    await expect(page).toHaveURL(/\/admin\/chambres\/.+\/edit/);

    const checkbox = page.locator('[name="actif"]');
    if (await checkbox.isChecked()) await checkbox.uncheck();
    await page.click('[type="submit"]');
    await expect(page).toHaveURL("/admin/chambres");
    // Vérifier que NOTRE chambre affiche le badge Inactif
    await expect(roomRow(page, CRUD_NAME_EDITED).getByText("Inactif")).toBeVisible();

    // Remettre active (nettoyage état pour le reste de la suite)
    await roomRow(page, CRUD_NAME_EDITED).getByRole("link", { name: "Modifier" }).click();
    const cb2 = page.locator('[name="actif"]');
    if (!(await cb2.isChecked())) await cb2.check();
    await page.click('[type="submit"]');
  });

  test("suppression d'une chambre sans réservation — disparaît de la liste", async ({ page }) => {
    // Créer une chambre dédiée à la suppression (garantie sans réservation)
    const deleteName = `Chambre Delete ${RUN_ID}`;
    await page.goto("/admin/chambres/new");
    await page.fill('[name="nom"]', deleteName);
    await page.fill('[name="prix"]', "50");
    await page.fill('[name="capacite"]', "1");
    await page.click('[type="submit"]');
    await expect(page).toHaveURL("/admin/chambres");
    await expect(roomRow(page, deleteName)).toBeVisible();

    page.on("dialog", (d) => d.accept());
    await roomRow(page, deleteName).getByRole("button", { name: "Supprimer" }).click();
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(deleteName)).not.toBeVisible();
  });

  // ─── Régression : property manquante ─────────────────────────────────────────

  test("création d'une chambre fonctionne même si aucune property n'existe encore", async ({ page }) => {
    // Régression : createRoom doit auto-créer la property plutôt que de lever une erreur
    const name = `Sans Property ${RUN_ID}`;
    await page.goto("/admin/chambres/new");
    await page.fill('[name="nom"]', name);
    await page.fill('[name="prix"]', "80");
    await page.fill('[name="capacite"]', "1");
    await page.click('[type="submit"]');
    await expect(page).toHaveURL("/admin/chambres");
    await expect(roomRow(page, name)).toBeVisible();

    // Nettoyage
    page.on("dialog", (d) => d.accept());
    await roomRow(page, name).getByRole("button", { name: "Supprimer" }).click();
  });

  // ─── Cas limites ─────────────────────────────────────────────────────────────

  test("prix = 0 — chambre créée sans erreur", async ({ page }) => {
    const name = `Prix Zéro ${RUN_ID}`;
    await page.goto("/admin/chambres/new");
    await page.fill('[name="nom"]', name);
    await page.fill('[name="prix"]', "0");
    await page.fill('[name="capacite"]', "1");
    await page.click('[type="submit"]');
    await expect(page).toHaveURL("/admin/chambres");
    await expect(roomRow(page, name)).toBeVisible();
    // Nettoyage
    page.on("dialog", (d) => d.accept());
    await roomRow(page, name).getByRole("button", { name: "Supprimer" }).click();
  });

  test("nom très long (500 caractères) — pas de crash serveur", async ({ page }) => {
    const longName = `Long${RUN_ID}` + "A".repeat(490);
    await page.goto("/admin/chambres/new");
    await page.fill('[name="nom"]', longName);
    await page.fill('[name="prix"]', "50");
    await page.fill('[name="capacite"]', "1");
    await page.click('[type="submit"]');
    const title = await page.title();
    expect(title).not.toMatch(/500|Internal Server Error/i);
    // Nettoyage si créée
    if (page.url().endsWith("/admin/chambres")) {
      page.on("dialog", (d) => d.accept());
      const row = roomRow(page, longName.slice(0, 20));
      if (await row.isVisible()) {
        await row.getByRole("button", { name: "Supprimer" }).click();
      }
    }
  });

  test("description optionnelle acceptée", async ({ page }) => {
    const name = `Chambre Desc ${RUN_ID}`;
    await page.goto("/admin/chambres/new");
    await page.fill('[name="nom"]', name);
    await page.locator('textarea[name="description"]').fill("Une belle chambre avec vue sur les Alpes.");
    await page.fill('[name="prix"]', "120");
    await page.fill('[name="capacite"]', "3");
    await page.click('[type="submit"]');
    await expect(page).toHaveURL("/admin/chambres");
    await expect(roomRow(page, name)).toBeVisible();
    // Nettoyage
    page.on("dialog", (d) => d.accept());
    await roomRow(page, name).getByRole("button", { name: "Supprimer" }).click();
  });

  // ─── Cas d'erreur ────────────────────────────────────────────────────────────

  test("accès à une chambre inexistante → 404, pas 500", async ({ page }) => {
    const response = await page.goto(
      "/admin/chambres/00000000-0000-0000-0000-000000000000/edit",
    );
    expect(response?.status()).toBe(404);
  });

  // ─── Sécurité ────────────────────────────────────────────────────────────────

  test("XSS dans le nom de chambre — texte échappé, aucun script exécuté", async ({ page }) => {
    let xssFired = false;
    page.on("dialog", async (dialog) => {
      // Accepter les confirmations de suppression, échouer si c'est un alert XSS
      if (/xss/i.test(dialog.message())) {
        xssFired = true;
      }
      await dialog.accept();
    });

    const xssPayload = `<script>alert('xss-${RUN_ID}')</script>`;
    await page.goto("/admin/chambres/new");
    await page.fill('[name="nom"]', xssPayload);
    await page.fill('[name="prix"]', "100");
    await page.fill('[name="capacite"]', "2");
    await page.click('[type="submit"]');

    expect(xssFired).toBe(false);

    if (page.url().endsWith("/admin/chambres")) {
      // Le texte "<script>..." doit apparaître brut dans la liste
      const row = roomRow(page, "alert(");
      if (await row.isVisible()) {
        // Contenu textuel présent → pas interprété comme HTML
        await row.getByRole("button", { name: "Supprimer" }).click();
      }
    }

    expect(xssFired).toBe(false);
  });

  test.skip("les chambres d'un tenant ne sont pas visibles par un autre tenant", async ({ page }) => {
    // TODO: nécessite deux tenants en DB de test — implémenter quand seed.ts est prêt
  });
});
