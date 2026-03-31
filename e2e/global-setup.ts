import { chromium } from "@playwright/test";
import { eq } from "drizzle-orm";
import { scryptAsync } from "@noble/hashes/scrypt.js";
import { hex } from "@better-auth/utils/hex";
import { randomBytes } from "crypto";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { tenants, users, accounts, properties } from "../db/schema";

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

export default async function globalSetup() {
  const { config } = await import("dotenv");
  config({ path: ".env.test" });

  const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL! });
  const db = drizzle(pool);

  const email = process.env.TEST_ADMIN_EMAIL!;
  const password = process.env.TEST_ADMIN_PASSWORD!;

  // Tenant de test
  let [tenant] = await db.select().from(tenants).where(eq(tenants.slug, "test-tenant"));

  if (!tenant) {
    [tenant] = await db
      .insert(tenants)
      .values({ name: "Hôtel Test", slug: "test-tenant" })
      .returning();
  }

  // Property de test
  const [existingProp] = await db.select().from(properties).where(eq(properties.tenantId, tenant.id));

  if (!existingProp) {
    await db.insert(properties).values({ tenantId: tenant.id, name: "Hôtel Test" });
  }

  // User de test
  const [existing] = await db.select().from(users).where(eq(users.email, email));

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

  await pool.end();

  // Sauvegarder la session admin
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto("http://localhost:3001/login");
  await page.fill('[name="email"]', email);
  await page.fill('[name="password"]', password);
  await page.click('[type="submit"]');
  await page.waitForURL(/\/admin/);

  await page.context().storageState({ path: "e2e/.auth/admin.json" });
  await browser.close();
}
