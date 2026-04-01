import { relations } from "drizzle-orm";
import {
  tenants,
  users,
  userTenants,
  properties,
  rooms,
  bookings,
  payments,
  icalSources,
  icalBlocks,
} from "./schema";

export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(users),
  userTenants: many(userTenants),
  properties: many(properties),
  rooms: many(rooms),
  bookings: many(bookings),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, { fields: [users.tenantId], references: [tenants.id] }),
  userTenants: many(userTenants),
}));

export const userTenantsRelations = relations(userTenants, ({ one }) => ({
  user: one(users, { fields: [userTenants.userId], references: [users.id] }),
  tenant: one(tenants, { fields: [userTenants.tenantId], references: [tenants.id] }),
}));

export const propertiesRelations = relations(properties, ({ one, many }) => ({
  tenant: one(tenants, { fields: [properties.tenantId], references: [tenants.id] }),
  rooms: many(rooms),
}));

export const roomsRelations = relations(rooms, ({ one, many }) => ({
  tenant: one(tenants, { fields: [rooms.tenantId], references: [tenants.id] }),
  property: one(properties, { fields: [rooms.propertyId], references: [properties.id] }),
  bookings: many(bookings),
  icalSources: many(icalSources),
  icalBlocks: many(icalBlocks),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  tenant: one(tenants, { fields: [bookings.tenantId], references: [tenants.id] }),
  room: one(rooms, { fields: [bookings.roomId], references: [rooms.id] }),
  payment: one(payments, { fields: [bookings.id], references: [payments.bookingId] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  tenant: one(tenants, { fields: [payments.tenantId], references: [tenants.id] }),
  booking: one(bookings, { fields: [payments.bookingId], references: [bookings.id] }),
}));

export const icalSourcesRelations = relations(icalSources, ({ one, many }) => ({
  tenant: one(tenants, { fields: [icalSources.tenantId], references: [tenants.id] }),
  room: one(rooms, { fields: [icalSources.roomId], references: [rooms.id] }),
  blocks: many(icalBlocks),
}));

export const icalBlocksRelations = relations(icalBlocks, ({ one }) => ({
  tenant: one(tenants, { fields: [icalBlocks.tenantId], references: [tenants.id] }),
  room: one(rooms, { fields: [icalBlocks.roomId], references: [rooms.id] }),
  source: one(icalSources, { fields: [icalBlocks.sourceId], references: [icalSources.id] }),
}));
