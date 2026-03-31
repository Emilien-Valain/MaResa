import { chromium } from "@playwright/test";
import { eq } from "drizzle-orm";
import { scryptAsync } from "@noble/hashes/scrypt.js";
import { hex } from "@better-auth/utils/hex";
import { randomBytes } from "crypto";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../db/schema";

const { tenants, users, accounts, properties } = schema;

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

async function seedTestAdmin(db: ReturnType<typeof drizzle>) {
  const email = process.env.TEST_ADMIN_EMAIL!;
  const password = process.env.TEST_ADMIN_PASSWORD!;

  // Tenant de test
  let tenant = await db.query.tenants.findFirst({
    where: eq(tenants.slug, "test-tenant"),
  });

  if (!tenant) {
    [tenant] = await db
      .insert(tenants)
      .values({ name: "Hôtel Test", slug: "test-tenant" })
      .returning();
  }

  // Property de test (requise pour créer des chambres)
  const existingProperty = await db.query.properties.findFirst({
    where: eq(properties.tenantId, tenant.id),
  });

  if (!existingProperty) {
    await db.insert(properties).values({
      tenantId: tenant.id,
      name: "Hôtel Test",
    });
  }

  // User de test
  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!existing) {
    const userId = generateId();
    const passwordHash = await hashPassword(password);

    await db.insert(users).values({
      id: userId,
      name: "Admin Test",
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
  }
}

export default async function globalSetup() {
  // Charger .env.test
  const { config } = await import("dotenv");
  config({ path: ".env.test" });

  const dbUrl = process.env.TEST_DATABASE_URL!;
  const pool = new Pool({ connectionString: dbUrl });
  const db = drizzle(pool, { schema });

  await seedTestAdmin(db);
  await pool.end();

  // Sauvegarder la session admin pour les tests qui en ont besoin
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto("http://localhost:3000/login");
  await page.fill('[name="email"]', process.env.TEST_ADMIN_EMAIL!);
  await page.fill('[name="password"]', process.env.TEST_ADMIN_PASSWORD!);
  await page.click('[type="submit"]');
  await page.waitForURL(/\/admin/);

  await page.context().storageState({ path: "e2e/.auth/admin.json" });
  await browser.close();
}
