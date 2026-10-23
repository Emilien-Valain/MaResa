import { test, expect, type APIRequestContext } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { Pool } from "pg";
import { resetTenantContentSeed } from "../helpers/seed-tenant-config";

/**
 * Spécification : Tests de non-régression > Admin > Paramètres (écritures concurrentes)
 *
 * Régression `.scratch/audit-2026-10/issues/10` : chaque écrivain de
 * `tenants.config` relisait tout le JSON puis le réécrivait en entier — une
 * sauvegarde qui atterrissait pendant un upload photo (sharp, lent) était
 * silencieusement écrasée. On provoque le chevauchement avec des images 24 Mpx :
 * l'upload lit la config, traite les images (≥ 1 s), puis écrit.
 */

const ctx = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "e2e", ".auth", "test-context.json"), "utf-8"),
) as { tenantId: string };

const RUN_ID = `R${Date.now().toString(36).slice(-6)}`;

// 6000×4000 uni : léger à envoyer (< 5 Mo), coûteux à décoder/redimensionner.
const bigJpeg = () =>
  sharp({ create: { width: 6000, height: 4000, channels: 3, background: "#b4a27c" } })
    .jpeg()
    .toBuffer();

async function readConfig(): Promise<Record<string, unknown>> {
  const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL! });
  try {
    const { rows } = await pool.query("select config from tenants where id = $1", [ctx.tenantId]);
    return rows[0].config;
  } finally {
    await pool.end();
  }
}

async function clearPhotos(request: APIRequestContext) {
  await request.delete("/api/admin/hero-photo");
  const photos = ((await readConfig()).galleryPhotos ?? []) as { id: string }[];
  for (const p of photos) {
    await request.delete("/api/admin/gallery-photos", { data: { photoId: p.id } });
  }
}

test.describe("Admin — Paramètres : sauvegardes concurrentes de la config", () => {
  test.setTimeout(90_000);

  test.beforeEach(async ({ request }) => {
    await clearPhotos(request);
  });

  test.afterEach(async ({ request }) => {
    await clearPhotos(request);
  });

  test.afterAll(async () => {
    await resetTenantContentSeed();
  });

  test("upload galerie lent + sauvegarde Contenu en parallèle → les deux sont conservés", async ({ page }) => {
    const heroTitle = `Titre concurrent ${RUN_ID}`;
    const img = await bigJpeg();

    await page.goto("/admin/parametres?tab=content");
    await page.waitForLoadState("networkidle");

    // L'upload part d'abord (il lit la config), la sauvegarde atterrit pendant sharp.
    const form = new FormData();
    for (let i = 0; i < 4; i++) {
      form.append("photos", new Blob([new Uint8Array(img)], { type: "image/jpeg" }), `race-${RUN_ID}-${i}.jpg`);
    }
    let uploadDoneAt = 0;
    const upload = page.request
      .post("/api/admin/gallery-photos", { multipart: form, timeout: 60_000 })
      .then((r) => ((uploadDoneAt = Date.now()), r));

    await page.locator('[name="heroTitle"]').fill(heroTitle);
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByText("Contenu mis à jour")).toBeVisible({ timeout: 15_000 });
    const savedAt = Date.now();

    const res = await upload;
    expect(res.ok(), await res.text()).toBe(true);
    // Sans chevauchement le test ne prouve rien : l'upload doit finir après la sauvegarde.
    expect(uploadDoneAt).toBeGreaterThan(savedAt);

    const config = await readConfig();
    expect(config.heroTitle).toBe(heroTitle);
    expect(config.galleryPhotos).toHaveLength(4);
  });

  test("upload hero + upload galerie simultanés → les deux photos sont conservées", async ({ request }) => {
    const img = await bigJpeg();
    const [hero, gallery] = await Promise.all([
      request.post("/api/admin/hero-photo", {
        multipart: { photo: { name: `hero-${RUN_ID}.jpg`, mimeType: "image/jpeg", buffer: img } },
        timeout: 60_000,
      }),
      request.post("/api/admin/gallery-photos", {
        multipart: { photos: { name: `gal-${RUN_ID}.jpg`, mimeType: "image/jpeg", buffer: img } },
        timeout: 60_000,
      }),
    ]);
    expect(hero.ok(), await hero.text()).toBe(true);
    expect(gallery.ok(), await gallery.text()).toBe(true);

    const config = await readConfig();
    expect(config.heroPhoto).toMatchObject({ id: (await hero.json()).heroPhoto.id });
    expect(config.galleryPhotos).toHaveLength(1);
  });

  test("vider un champ le retire bien de la config (clé absente, pas de résidu)", async ({ page }) => {
    await page.goto("/admin/parametres?tab=content");
    await page.waitForLoadState("networkidle");
    await page.locator('[name="footerTagline"]').fill(`Tagline ${RUN_ID}`);
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByText("Contenu mis à jour")).toBeVisible({ timeout: 15_000 });
    expect((await readConfig()).footerTagline).toBe(`Tagline ${RUN_ID}`);

    await page.reload();
    await page.waitForLoadState("networkidle");
    await page.locator('[name="footerTagline"]').fill("");
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByText("Contenu mis à jour")).toBeVisible({ timeout: 15_000 });

    const config = await readConfig();
    expect(config).not.toHaveProperty("footerTagline");
    // Les clés non concernées par le formulaire sont intactes.
    expect(config.address).toBe("Route des Vignes\n84480 Bonnieux");
  });
});
