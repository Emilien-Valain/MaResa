import { and, asc, eq, isNull, or, gt, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { manualBlocks, bookingRules, pricingRules, rooms } from "@/db/schema";

// ── Manual Blocks ───────────────────────────────────────────────────────────

export async function getManualBlocksByTenant(tenantId: string) {
  return db
    .select({
      id: manualBlocks.id,
      tenantId: manualBlocks.tenantId,
      roomId: manualBlocks.roomId,
      roomName: rooms.name,
      startDate: manualBlocks.startDate,
      endDate: manualBlocks.endDate,
      recurring: manualBlocks.recurring,
      recurrenceType: manualBlocks.recurrenceType,
      recurrenceDays: manualBlocks.recurrenceDays,
      recurrenceUntil: manualBlocks.recurrenceUntil,
      createdAt: manualBlocks.createdAt,
    })
    .from(manualBlocks)
    .leftJoin(rooms, eq(manualBlocks.roomId, rooms.id))
    .where(eq(manualBlocks.tenantId, tenantId))
    .orderBy(asc(manualBlocks.startDate));
}

export async function getManualBlocksForCalendar(
  tenantId: string,
  from: Date,
  to: Date,
) {
  return db
    .select()
    .from(manualBlocks)
    .where(
      and(
        eq(manualBlocks.tenantId, tenantId),
        // Inclure les récurrents (pas de filtre date pour eux)
        // et les ponctuels qui chevauchent la période
        or(
          eq(manualBlocks.recurring, true),
          and(lt(manualBlocks.startDate, to), gt(manualBlocks.endDate, from)),
        ),
      ),
    );
}

// ── Booking Rules ───────────────────────────────────────────────────────────

export async function getBookingRulesByTenant(tenantId: string) {
  return db
    .select({
      id: bookingRules.id,
      tenantId: bookingRules.tenantId,
      roomId: bookingRules.roomId,
      roomName: rooms.name,
      validFrom: bookingRules.validFrom,
      validTo: bookingRules.validTo,
      minStay: bookingRules.minStay,
      maxStay: bookingRules.maxStay,
      allowedCheckInDays: bookingRules.allowedCheckInDays,
      allowedCheckOutDays: bookingRules.allowedCheckOutDays,
      priority: bookingRules.priority,
      createdAt: bookingRules.createdAt,
    })
    .from(bookingRules)
    .leftJoin(rooms, eq(bookingRules.roomId, rooms.id))
    .where(eq(bookingRules.tenantId, tenantId))
    .orderBy(asc(bookingRules.createdAt));
}

export async function getBookingRulesByRoom(roomId: string, tenantId: string) {
  return db
    .select()
    .from(bookingRules)
    .where(
      and(
        eq(bookingRules.tenantId, tenantId),
        eq(bookingRules.roomId, roomId),
      ),
    )
    .orderBy(asc(bookingRules.createdAt));
}

// ── Pricing Rules ───────────────────────────────────────────────────────────

export async function getPricingRulesByTenant(tenantId: string) {
  return db
    .select({
      id: pricingRules.id,
      tenantId: pricingRules.tenantId,
      roomId: pricingRules.roomId,
      roomName: rooms.name,
      name: pricingRules.name,
      validFrom: pricingRules.validFrom,
      validTo: pricingRules.validTo,
      daysOfWeek: pricingRules.daysOfWeek,
      fixedPrice: pricingRules.fixedPrice,
      percentageModifier: pricingRules.percentageModifier,
      priority: pricingRules.priority,
      active: pricingRules.active,
      createdAt: pricingRules.createdAt,
    })
    .from(pricingRules)
    .leftJoin(rooms, eq(pricingRules.roomId, rooms.id))
    .where(eq(pricingRules.tenantId, tenantId))
    .orderBy(asc(pricingRules.createdAt));
}

export async function getPricingRulesByRoom(roomId: string, tenantId: string) {
  return db
    .select()
    .from(pricingRules)
    .where(
      and(
        eq(pricingRules.tenantId, tenantId),
        eq(pricingRules.roomId, roomId),
      ),
    )
    .orderBy(asc(pricingRules.createdAt));
}
