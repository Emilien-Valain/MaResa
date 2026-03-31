import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  decimal,
  index,
  unique,
} from "drizzle-orm/pg-core";

// ─── TENANTS ────────────────────────────────────────────────────────────────

export const tenants = pgTable(
  "tenants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    domain: text("domain").unique(),
    config: jsonb("config").notNull().default({}),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [index("tenants_domain_idx").on(table.domain)],
);

// ─── USERS (Better Auth — admins) ────────────────────────────────────────────
// IDs gérés par Better Auth (text/nanoid, pas uuid)
// Les champs emailVerified, image, updatedAt sont requis par Better Auth

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  // Champ custom : lie l'admin à son tenant
  tenantId: uuid("tenant_id").references(() => tenants.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── AUTH — Sessions ──────────────────────────────────────────────────────────

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  // tenantId en session évite un lookup DB dans le middleware
  tenantId: uuid("tenant_id").references(() => tenants.id),
});

// ─── AUTH — Accounts ──────────────────────────────────────────────────────────

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── AUTH — Verifications ────────────────────────────────────────────────────

export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── PROPERTIES ──────────────────────────────────────────────────────────────

export const properties = pgTable("properties", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id),
  name: text("name").notNull(),
  description: text("description"),
  address: text("address"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── ROOMS ───────────────────────────────────────────────────────────────────

export const rooms = pgTable(
  "rooms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    pricePerNight: decimal("price_per_night", {
      precision: 10,
      scale: 2,
    }).notNull(),
    capacity: integer("capacity").notNull().default(2),
    photos: jsonb("photos").notNull().default([]),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [index("rooms_slug_tenant_idx").on(table.tenantId, table.slug)],
);

// ─── BOOKINGS ────────────────────────────────────────────────────────────────

export const bookingStatusEnum = pgEnum("booking_status", [
  "pending",
  "confirmed",
  "cancelled",
  "completed",
]);

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id),
    checkIn: timestamp("check_in").notNull(),
    checkOut: timestamp("check_out").notNull(),
    totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
    status: bookingStatusEnum("status").notNull().default("pending"),
    guestName: text("guest_name").notNull(),
    guestEmail: text("guest_email").notNull(),
    guestPhone: text("guest_phone"),
    guestCount: integer("guest_count").notNull().default(1),
    notes: text("notes"),
    source: text("source").notNull().default("direct"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("bookings_room_dates_idx").on(
      table.roomId,
      table.checkIn,
      table.checkOut,
    ),
    index("bookings_tenant_idx").on(table.tenantId),
  ],
);

// ─── PAYMENTS ────────────────────────────────────────────────────────────────

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id),
  bookingId: uuid("booking_id")
    .notNull()
    .references(() => bookings.id),
  stripeSessionId: text("stripe_session_id").unique(),
  stripePaymentId: text("stripe_payment_id").unique(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("eur"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── ICAL SOURCES ────────────────────────────────────────────────────────────

export const icalSources = pgTable("ical_sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id),
  roomId: uuid("room_id")
    .notNull()
    .references(() => rooms.id),
  name: text("name").notNull(),
  url: text("url").notNull(),
  lastSyncAt: timestamp("last_sync_at"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── ICAL BLOCKS ─────────────────────────────────────────────────────────────

export const icalBlocks = pgTable(
  "ical_blocks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => icalSources.id),
    uid: text("uid").notNull(),
    summary: text("summary"),
    start: timestamp("start").notNull(),
    end: timestamp("end").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    unique().on(table.sourceId, table.uid),
    index("ical_blocks_room_dates_idx").on(
      table.roomId,
      table.start,
      table.end,
    ),
  ],
);
