/**
 * Crée un tenant et un utilisateur admin en ligne de commande.
 *
 * Usage :
 *   npm run create-admin -- \
 *     --name "Hôtel du Coin" \
 *     --slug "hotel-du-coin" \
 *     --domain "hotelducoin.fr" \
 *     --email "contact@hotelducoin.fr" \
 *     --password "motdepasse" \
 *     --template boutique        # optionnel, défaut : classic
 */

import { eq } from "drizzle-orm";
import { scryptAsync } from "@noble/hashes/scrypt.js";
import { hex } from "@better-auth/utils/hex";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { tenants, users, accounts, properties, userTenants } from "@/db/schema";
import type { TemplateName } from "@/lib/tenant-context";

const VALID_TEMPLATES: TemplateName[] = ["classic", "boutique"];

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
  const templateArg = get("--template");

  if (!name || !slug || !email || !password) {
    console.error(
      "Usage: --name <name> --slug <slug> --email <email> --password <password> [--domain <domain>] [--template classic|boutique]",
    );
    process.exit(1);
  }

  if (templateArg && !VALID_TEMPLATES.includes(templateArg as TemplateName)) {
    console.error(`Template invalide : "${templateArg}". Valeurs possibles : ${VALID_TEMPLATES.join(", ")}`);
    process.exit(1);
  }

  const template = (templateArg as TemplateName | undefined) ?? "classic";

  // 1. Créer le tenant (idempotent sur le slug)
  const existing = await db.query.tenants.findFirst({
    where: eq(tenants.slug, slug),
  });

  const tenant =
    existing ??
    (await db.insert(tenants).values({ name, slug, domain, config: { template } }).returning())[0];

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

  let userId: string;

  if (existingUser) {
    userId = existingUser.id;
    console.log(`ℹ Utilisateur déjà existant : ${email}`);
  } else {
    // 3. Créer l'utilisateur + compte email/password au format Better Auth
    userId = generateId();
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
  }

  // 4. Ajouter l'accès au tenant (idempotent)
  await db
    .insert(userTenants)
    .values({ userId, tenantId: tenant.id })
    .onConflictDoNothing();

  console.log(`✓ Accès au tenant : ${tenant.name} (slug: ${tenant.slug})`);
  if (domain) console.log(`  Domaine : ${domain}`);
  console.log(`  Template : ${template}`);

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
