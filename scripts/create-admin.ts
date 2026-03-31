/**
 * Crée un tenant et un utilisateur admin en ligne de commande.
 *
 * Usage :
 *   npm run create-admin -- \
 *     --name "Hôtel du Coin" \
 *     --slug "hotel-du-coin" \
 *     --domain "hotelducoin.fr" \
 *     --email "contact@hotelducoin.fr" \
 *     --password "motdepasse"
 */

import { eq } from "drizzle-orm";
import { scryptAsync } from "@noble/hashes/scrypt.js";
import { hex } from "@better-auth/utils/hex";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { tenants, users, accounts, properties } from "@/db/schema";

// Même algo que Better Auth — doit rester synchronisé avec
// node_modules/better-auth/dist/crypto/password.mjs
async function hashPassword(password: string): Promise<string> {
  const salt = hex.encode(randomBytes(16));
  const key = await scryptAsync(password.normalize("NFKC"), salt, {
    N: 16384,
    r: 16,
    p: 1,
    dkLen: 64,
    maxmem: 128 * 16384 * 16 * 2,
  });
  return `${salt}:${hex.encode(key)}`;
}

function generateId(): string {
  return randomBytes(16).toString("base64url");
}

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

  // 1. Créer le tenant (idempotent sur le slug)
  const existing = await db.query.tenants.findFirst({
    where: eq(tenants.slug, slug),
  });

  const tenant =
    existing ??
    (await db.insert(tenants).values({ name, slug, domain }).returning())[0];

  console.log(
    existing
      ? `ℹ Tenant existant réutilisé : ${tenant.name} (${tenant.id})`
      : `✓ Tenant créé : ${tenant.name} (${tenant.id})`,
  );

  // 2. Créer la property par défaut si absente (1 tenant = 1 property)
  const existingProp = await db.query.properties.findFirst({
    where: eq(properties.tenantId, tenant.id),
  });
  if (!existingProp) {
    await db.insert(properties).values({ tenantId: tenant.id, name });
    console.log(`✓ Propriété créée : ${name}`);
  }

  // 3. Vérifier si l'email existe déjà
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (existingUser) {
    console.log(`ℹ Utilisateur déjà existant : ${email}`);
    process.exit(0);
  }

  // 3. Créer l'utilisateur + compte email/password au format Better Auth
  const userId = generateId();
  const passwordHash = await hashPassword(password);

  await db.insert(users).values({
    id: userId,
    name,
    email,
    emailVerified: true,
    tenantId: tenant.id,
  });

  await db.insert(accounts).values({
    id: generateId(),
    accountId: userId,
    providerId: "credential",
    userId,
    password: passwordHash,
  });

  console.log(`✓ Admin créé : ${email}`);
  console.log(`  Tenant : ${tenant.name} (slug: ${tenant.slug})`);
  if (domain) console.log(`  Domaine : ${domain}`);

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
