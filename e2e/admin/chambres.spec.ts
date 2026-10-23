import { test, expect, type Page } from "@playwright/test";
import fs from "fs";
import path from "path";
import { confirmDialog } from "../helpers/confirm";
import { deleteRoomsByName, deleteRoomsByNameFragment, getRoomsByName } from "../helpers/intake";

const ctx = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "e2e", ".auth", "test-context.json"), "utf-8"),
) as { tenantId: string };

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

// ─── Helper : cibler une carte de chambre par son nom et y agir ───────────────
// La refonte UI de la liste utilise une grille de cartes avec data-room-name.

function roomRow(page: Page, name: string) {
  return page.locator(`[data-room-name="${name}"]`).first();
}

// ─── Happy path — cycle CRUD ──────────────────────────────────────────────────

test.describe("Admin — Gestion des chambres", () => {
  // Le cycle CRUD laisse « Suite CRUD … Modifiée » derrière lui : on nettoie tout ce qui porte ce RUN_ID.
  test.afterAll(() => deleteRoomsByNameFragment(ctx.tenantId, RUN_ID));

  test("liste des chambres est accessible depuis /admin/chambres", async ({ page }) => {
    await page.goto("/admin/chambres");
    await expect(page.getByRole("heading", { name: /chambres/i })).toBeVisible();
    await expect(page.getByRole("link", { name: "Ajouter une chambre" })).toBeVisible();
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

  test("chambre sans photo : « Ajouter une photo » mène à l'envoi de photos", async ({ page }) => {
    await page.goto("/admin/chambres");
    await roomRow(page, CRUD_NAME).getByRole("link", { name: "Ajouter une photo" }).click();
    await expect(page).toHaveURL(/\/admin\/chambres\/.+\/edit#photos$/);
    await expect(page.locator("#photos")).toBeInViewport();
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
    // Vérifier que NOTRE chambre affiche le badge Inactive
    await expect(roomRow(page, CRUD_NAME_EDITED).getByText("Inactive")).toBeVisible();

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

    await roomRow(page, deleteName).getByRole("button", { name: "Supprimer" }).click();
    await confirmDialog(page);
    // Cibler la LIGNE (data-room-name), pas getByText : un toast de succès contient
    // le nom de la chambre et matcherait getByText → flake. toHaveCount(0) auto-retry.
    await expect(page.locator(`[data-room-name="${deleteName}"]`)).toHaveCount(0);
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
    await roomRow(page, name).getByRole("button", { name: "Supprimer" }).click();
    await confirmDialog(page);
  });

  // ─── Cas limites ─────────────────────────────────────────────────────────────

  test("prix = 0 — rejeté par la validation (prix doit être > 0)", async ({ page }) => {
    await page.goto("/admin/chambres/new");
    await page.fill('[name="nom"]', `Prix Zéro ${RUN_ID}`);
    await page.fill('[name="prix"]', "0");
    await page.fill('[name="capacite"]', "1");
    await page.click('[type="submit"]');
    // La page reste sur /new — la validation Zod rejette le prix à 0
    await expect(page).toHaveURL(/\/admin\/chambres\/new/);
    // … avec le message sur le champ et la saisie conservée.
    await expect(page.getByText("Le prix doit être supérieur à 0").first()).toBeVisible();
    await expect(page.locator('[name="prix"]')).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator('[name="nom"]')).toHaveValue(`Prix Zéro ${RUN_ID}`);
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
      const row = roomRow(page, longName);
      if (await row.isVisible()) {
        await row.getByRole("button", { name: "Supprimer" }).click();
        await confirmDialog(page);
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
    await roomRow(page, name).getByRole("button", { name: "Supprimer" }).click();
    await confirmDialog(page);
  });

  // ─── Slugs publics uniques (audit 09) ────────────────────────────────────────

  async function createRoomViaForm(page: Page, name: string, description: string) {
    await page.goto("/admin/chambres/new");
    await page.fill('[name="nom"]', name);
    await page.locator('textarea[name="description"]').fill(description);
    await page.fill('[name="prix"]', "90");
    await page.fill('[name="capacite"]', "2");
    await page.click('[type="submit"]');
    await expect(page).toHaveURL("/admin/chambres");
  }

  async function saveRoomForm(page: Page, roomId: string, name?: string) {
    await page.goto(`/admin/chambres/${roomId}/edit`);
    if (name) await page.fill('[name="nom"]', name);
    await page.click('[type="submit"]');
    await expect(page).toHaveURL("/admin/chambres");
  }

  test("deux chambres du même nom — slugs distincts, les deux pages publiques accessibles", async ({ page }) => {
    const name = `Chambre Jumelle ${RUN_ID}`;
    await createRoomViaForm(page, name, `Première jumelle ${RUN_ID}`);
    await createRoomViaForm(page, name, `Seconde jumelle ${RUN_ID}`);

    const [first, second] = await getRoomsByName(ctx.tenantId, name);
    expect(first.slug).toBe(`chambre-jumelle-${RUN_ID}`);
    expect(second.slug).not.toBe(first.slug);

    await page.goto(`/chambres/${first.slug}`);
    await expect(page.getByText(`Première jumelle ${RUN_ID}`)).toBeVisible();
    await page.goto(`/chambres/${second.slug}`);
    await expect(page.getByText(`Seconde jumelle ${RUN_ID}`)).toBeVisible();

    // Ré-enregistrer sans changer le nom ne doit pas déplacer les URLs
    await saveRoomForm(page, first.id);
    await saveRoomForm(page, second.id);
    expect(await getRoomsByName(ctx.tenantId, name)).toEqual([first, second]);
  });

  test("renommer une chambre avec le nom d'une autre — pas d'erreur, slug unique", async ({ page }) => {
    const nameA = `Chambre Source ${RUN_ID}`;
    const nameB = `Chambre Cible ${RUN_ID}`;
    await createRoomViaForm(page, nameA, `Description source ${RUN_ID}`);
    await createRoomViaForm(page, nameB, `Description cible ${RUN_ID}`);
    const [b] = await getRoomsByName(ctx.tenantId, nameB);

    await saveRoomForm(page, b.id, nameA);

    const [a, renamed] = await getRoomsByName(ctx.tenantId, nameA);
    expect(renamed.id).toBe(b.id);
    expect(renamed.slug).not.toBe(a.slug);
    await page.goto(`/chambres/${a.slug}`);
    await expect(page.getByText(`Description source ${RUN_ID}`)).toBeVisible();
    await page.goto(`/chambres/${renamed.slug}`);
    await expect(page.getByText(`Description cible ${RUN_ID}`)).toBeVisible();
  });

  test("nom sans lettres latines — slug non vide, page publique accessible", async ({ page }) => {
    // Nom fixe (pas de RUN_ID latin, sinon le slug ne serait plus vide) → nettoyage par nom exact
    const name = "客房測試";
    await deleteRoomsByName(ctx.tenantId, name);
    try {
      await createRoomViaForm(page, name, `Chambre non latine ${RUN_ID}`);
      const [room] = await getRoomsByName(ctx.tenantId, name);
      expect(room.slug).not.toBe("");
      const response = await page.goto(`/chambres/${room.slug}`);
      expect(response?.status()).toBe(200);
      await expect(page.getByText(`Chambre non latine ${RUN_ID}`)).toBeVisible();
    } finally {
      await deleteRoomsByName(ctx.tenantId, name);
    }
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
      const row = roomRow(page, xssPayload);
      if (await row.isVisible()) {
        // Contenu textuel présent → pas interprété comme HTML
        await row.getByRole("button", { name: "Supprimer" }).click();
        await confirmDialog(page);
      }
    }

    expect(xssFired).toBe(false);
  });

  test("les chambres d'un tenant ne sont pas visibles par un autre tenant", async ({ page }) => {
    // Le global-setup crée un tenant "rival-hotel" avec une chambre "Suite Rival"
    // L'admin connecté appartient au tenant principal — il ne doit pas voir la chambre rival
    await page.goto("/admin/chambres");
    await expect(page.getByText("Suite Rival")).not.toBeVisible();
  });
});
