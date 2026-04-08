import fs from "fs";
import path from "path";
import { chromium } from "@playwright/test";
import { eq } from "drizzle-orm";
import { scryptAsync } from "@noble/hashes/scrypt.js";
import { hex } from "@better-auth/utils/hex";
import { randomBytes } from "crypto";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { tenants, users, accounts, properties, rooms, bookings, userTenants, manualBlocks, bookingRules, pricingRules, icalSources, icalBlocks } from "../db/schema";

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

  // ── Tenant de test ──────────────────────────────────────────────────────────

  let [tenant] = await db.select().from(tenants).where(eq(tenants.slug, "test-tenant"));

  if (!tenant) {
    [tenant] = await db
      .insert(tenants)
      .values({ name: "Hôtel Test", slug: "test-tenant" })
      .returning();
  }

  // ── Property de test ────────────────────────────────────────────────────────

  let [property] = await db.select().from(properties).where(eq(properties.tenantId, tenant.id));

  if (!property) {
    [property] = await db
      .insert(properties)
      .values({ tenantId: tenant.id, name: "Hôtel Test" })
      .returning();
  }

  // ── User admin de test ──────────────────────────────────────────────────────

  const [existing] = await db.select().from(users).where(eq(users.email, email));

  const userId = existing?.id ?? generateId();

  if (!existing) {
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

  // Ajouter l'accès au tenant (idempotent)
  await db
    .insert(userTenants)
    .values({ userId, tenantId: tenant.id })
    .onConflictDoNothing();

  // ── Chambre de test pour l'API de disponibilité (Phase 3) ──────────────────
  // Chambre dédiée aux tests d'API — ne pas utiliser pour les tests admin UI

  let [apiRoom] = await db
    .select()
    .from(rooms)
    .where(eq(rooms.slug, "chambre-api-test"));

  if (!apiRoom) {
    [apiRoom] = await db
      .insert(rooms)
      .values({
        tenantId: tenant.id,
        propertyId: property.id,
        name: "Chambre API Test",
        slug: "chambre-api-test",
        pricePerNight: "100.00",
        capacity: 2,
      })
      .returning();
  }

  // ── Réservation de test pour l'API de disponibilité ─────────────────────────
  // Dates fixes en juin 2026 — loin des tests admin (qui utilisent addDays(5..30))
  // Statut : confirmed (bloque la chambre)

  const bookingCheckIn = new Date("2026-06-10T00:00:00.000Z");
  const bookingCheckOut = new Date("2026-06-15T00:00:00.000Z");

  const existingBookings = await db
    .select()
    .from(bookings)
    .where(eq(bookings.roomId, apiRoom.id));

  const hasTestBooking = existingBookings.some(
    (b) =>
      new Date(b.checkIn).toISOString() === bookingCheckIn.toISOString() &&
      new Date(b.checkOut).toISOString() === bookingCheckOut.toISOString(),
  );

  if (!hasTestBooking) {
    await db.insert(bookings).values({
      tenantId: tenant.id,
      roomId: apiRoom.id,
      checkIn: bookingCheckIn,
      checkOut: bookingCheckOut,
      totalPrice: "500.00",
      status: "confirmed",
      guestName: "Test API Réservation",
      guestEmail: "api-test@example.com",
      guestCount: 2,
      source: "manual",
    });
  }

  // ── Blocage iCal de test ─────────────────────────────────────────────────────
  // Source iCal fictive + un ical_block pour tester l'indisponibilité iCal
  // Dates : 2026-06-20 → 2026-06-23 sur la chambre API Test

  await db.delete(icalBlocks).where(eq(icalBlocks.roomId, apiRoom.id));
  await db.delete(icalSources).where(eq(icalSources.roomId, apiRoom.id));

  const [icalSource] = await db
    .insert(icalSources)
    .values({
      tenantId: tenant.id,
      roomId: apiRoom.id,
      name: "Airbnb Test",
      url: "https://example.com/ical-test.ics",
      active: true,
    })
    .returning();

  await db.insert(icalBlocks).values({
    tenantId: tenant.id,
    roomId: apiRoom.id,
    sourceId: icalSource.id,
    uid: "ical-test-block-001",
    summary: "Réservation Airbnb Test",
    start: new Date("2026-06-20T00:00:00.000Z"),
    end: new Date("2026-06-23T00:00:00.000Z"),
  });

  // ── 2e tenant (pour les tests d'isolation multi-tenant) ────────────────────

  let [rivalTenant] = await db.select().from(tenants).where(eq(tenants.slug, "rival-hotel"));

  if (!rivalTenant) {
    [rivalTenant] = await db
      .insert(tenants)
      .values({ name: "Hôtel Rival", slug: "rival-hotel" })
      .returning();
  }

  let [rivalProperty] = await db.select().from(properties).where(eq(properties.tenantId, rivalTenant.id));

  if (!rivalProperty) {
    [rivalProperty] = await db
      .insert(properties)
      .values({ tenantId: rivalTenant.id, name: "Hôtel Rival" })
      .returning();
  }

  let [rivalRoom] = await db.select().from(rooms).where(eq(rooms.slug, "chambre-rival-test"));

  if (!rivalRoom) {
    [rivalRoom] = await db
      .insert(rooms)
      .values({
        tenantId: rivalTenant.id,
        propertyId: rivalProperty.id,
        name: "Suite Rival",
        slug: "chambre-rival-test",
        pricePerNight: "200.00",
        capacity: 3,
      })
      .returning();
  }

  // Réservation du tenant rival (ne doit jamais fuiter vers le tenant principal)
  const rivalBookingCheckIn = new Date("2026-06-10T00:00:00.000Z");
  const rivalBookingCheckOut = new Date("2026-06-15T00:00:00.000Z");

  const existingRivalBookings = await db
    .select()
    .from(bookings)
    .where(eq(bookings.roomId, rivalRoom.id));

  if (existingRivalBookings.length === 0) {
    await db.insert(bookings).values({
      tenantId: rivalTenant.id,
      roomId: rivalRoom.id,
      checkIn: rivalBookingCheckIn,
      checkOut: rivalBookingCheckOut,
      totalPrice: "1000.00",
      status: "confirmed",
      guestName: "Client Rival Secret",
      guestEmail: "rival-secret@example.com",
      guestCount: 2,
      source: "manual",
    });
  }

  // ── Écrire le contexte de test (tenantId, roomId, rival, iCal) ──────────────

  const authDir = path.join(process.cwd(), "e2e", ".auth");
  fs.mkdirSync(authDir, { recursive: true });
  fs.writeFileSync(
    path.join(authDir, "test-context.json"),
    JSON.stringify({
      tenantId: tenant.id,
      apiRoomId: apiRoom.id,
      bookedCheckIn: "2026-06-10",
      bookedCheckOut: "2026-06-15",
      icalBlockStart: "2026-06-20",
      icalBlockEnd: "2026-06-23",
      rivalTenantId: rivalTenant.id,
      rivalRoomId: rivalRoom.id,
    }),
  );

  // ── Nettoyage des règles de tests précédents ───────────────────────────────
  await db.delete(manualBlocks).where(eq(manualBlocks.tenantId, tenant.id));
  await db.delete(bookingRules).where(eq(bookingRules.tenantId, tenant.id));
  await db.delete(pricingRules).where(eq(pricingRules.tenantId, tenant.id));

  await pool.end();

  // ── Sauvegarder la session admin ────────────────────────────────────────────

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
