/**
 * Seed helpers pour les tests E2E.
 * Chaque test qui modifie la DB doit appeler cleanup() dans afterEach/afterAll.
 *
 * Usage :
 *   const tenant = await seedTenant({ slug: "test-hotel" });
 *   await cleanupTenant(tenant.id);
 */

// TODO: implémenter une fois Drizzle en place (Phase 1.2)
// Les fonctions ci-dessous sont des stubs à remplir.

export async function seedTenant(_opts: { slug: string; domain?: string }) {
  // db.insert(tenants).values(...)
  throw new Error("seedTenant: Drizzle pas encore configuré");
}

export async function cleanupTenant(_tenantId: string) {
  // db.delete(tenants).where(eq(tenants.id, tenantId))
  throw new Error("cleanupTenant: Drizzle pas encore configuré");
}
