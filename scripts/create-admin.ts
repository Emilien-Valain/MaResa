/**
 * Crée un tenant et un utilisateur admin en ligne de commande.
 *
 * Usage :
 *   npx tsx scripts/create-admin.ts \
 *     --name "Hôtel du Coin" \
 *     --slug "hotel-du-coin" \
 *     --domain "hotelducoin.fr" \
 *     --email "contact@hotelducoin.fr" \
 *     --password "motdepasse"
 */

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { tenants, users } from "@/db/schema";

async function main() {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const idx = args.indexOf(flag);
    return idx !== -1 ? args[idx + 1] : undefined;
  };

  const name = get("--name");
  const slug = get("--slug");
  const domain = get("--domain");
  const email = get("--email");
  const password = get("--password");

  if (!name || !slug || !email || !password) {
    console.error(
      "Usage: --name <name> --slug <slug> --email <email> --password <password> [--domain <domain>]",
    );
    process.exit(1);
  }

  // 1. Créer le tenant
  const [tenant] = await db
    .insert(tenants)
    .values({ name, slug, domain })
    .returning();

  console.log(`✓ Tenant créé : ${tenant.name} (${tenant.id})`);

  // 2. Créer l'utilisateur via Better Auth
  const result = await auth.api.signUpEmail({
    body: { name, email, password },
  });

  if (!result?.user) {
    console.error("Erreur lors de la création de l'utilisateur");
    process.exit(1);
  }

  // 3. Associer l'utilisateur au tenant
  await db
    .update(users)
    .set({ tenantId: tenant.id })
    .where(eq(users.id, result.user.id));

  console.log(`✓ Admin créé : ${email}`);
  console.log(`  Tenant : ${tenant.name} (slug: ${tenant.slug})`);
  if (domain) console.log(`  Domaine : ${domain}`);

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
