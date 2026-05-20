/**
 * Restaure la portion « contenu vitrine » de la config du tenant test
 * aux valeurs canoniques posées par global-setup. À appeler en afterAll
 * dans les suites qui modifient storyStats / address / etc., sinon les
 * tests publics qui attendent ces valeurs (ex. classic-sections) cassent.
 *
 * Ne touche pas aux autres clés de config (galleryPhotos, heroPhoto, etc.).
 */

import { eq } from "drizzle-orm";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { tenants } from "../../db/schema";

const TEST_TENANT_SLUG = "test-tenant";

export const SEEDED_STORY_STATS = [
  { value: "5", label: "Chambres", sub: "d'exception" },
  { value: "12", label: "Hectares", sub: "d'oliveraie" },
  { value: "1820", label: "Mas d'époque", sub: "restauré en 2019" },
  { value: "25 m", label: "Piscine", sub: "chauffée" },
];

export async function resetTenantContentSeed() {
  const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL! });
  const db = drizzle(pool);

  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.slug, TEST_TENANT_SLUG));

  if (!tenant) {
    await pool.end();
    throw new Error("Tenant test introuvable — global-setup a-t-il tourné ?");
  }

  const currentConfig = (tenant.config ?? {}) as Record<string, unknown>;

  // Repart de l'état seedé, en supprimant les surcharges textuelles laissées
  // par les tests (heroTitle "Titre Hero Rxxx", storyTitle, etc.).
  const next = {
    ...currentConfig,
    heroEyebrow: undefined,
    heroTitle: undefined,
    heroSubtitle: undefined,
    storyEyebrow: undefined,
    storyTitle: undefined,
    storyText: undefined,
    footerTagline: undefined,
    storyStats: SEEDED_STORY_STATS,
    address: "Route des Vignes\n84480 Bonnieux",
    phone: "+33 4 90 00 00 00",
    email: "contact@mas-provencal.fr",
    latitude: 43.8233,
    longitude: 5.3076,
  };

  await db.update(tenants).set({ config: next }).where(eq(tenants.id, tenant.id));
  await pool.end();
}
