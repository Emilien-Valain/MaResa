"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";
import { manualBlocks, bookingRules, pricingRules, rooms } from "@/db/schema";
import {
  manualBlockSchema,
  bookingRuleSchema,
  pricingRuleSchema,
  parseFormData,
} from "@/lib/validation";

const REVALIDATE_PATHS = ["/admin/regles", "/admin/calendrier"];

function revalidateAll() {
  for (const path of REVALIDATE_PATHS) revalidatePath(path);
}

async function verifyRoomOwnership(roomId: string, tenantId: string) {
  const [room] = await db
    .select({ id: rooms.id })
    .from(rooms)
    .where(and(eq(rooms.id, roomId), eq(rooms.tenantId, tenantId)))
    .limit(1);
  if (!room) throw new Error("Chambre introuvable");
}

// ── Manual Blocks ───────────────────────────────────────────────────────────

export async function createManualBlock(formData: FormData) {
  const { tenantId } = await requireSession();
  const data = parseFormData(manualBlockSchema, formData);

  const roomId = data.roomId || null;
  if (roomId) await verifyRoomOwnership(roomId, tenantId);

  const isRecurring = data.recurring === "on";
  const recurrenceDays = isRecurring && data.recurrenceDays
    ? data.recurrenceDays.split(",").map(Number).filter((n) => n >= 0 && n <= 6)
    : [];

  await db.insert(manualBlocks).values({
    tenantId,
    roomId,
    startDate: new Date(data.startDate + "T00:00:00.000Z"),
    endDate: new Date(data.endDate + "T00:00:00.000Z"),
    recurring: isRecurring,
    recurrenceType: isRecurring ? "weekly" : null,
    recurrenceDays: isRecurring ? recurrenceDays : [],
    recurrenceUntil:
      isRecurring && data.recurrenceUntil
        ? new Date(data.recurrenceUntil + "T00:00:00.000Z")
        : null,
  });

  revalidateAll();
}

export async function deleteManualBlock(id: string) {
  const { tenantId } = await requireSession();
  await db
    .delete(manualBlocks)
    .where(and(eq(manualBlocks.id, id), eq(manualBlocks.tenantId, tenantId)));
  revalidateAll();
}

// ── Booking Rules ───────────────────────────────────────────────────────────

export async function createBookingRule(formData: FormData) {
  const { tenantId } = await requireSession();
  const data = parseFormData(bookingRuleSchema, formData);

  const roomId = data.roomId || null;
  if (roomId) await verifyRoomOwnership(roomId, tenantId);

  const parseDays = (s?: string) => {
    if (!s) return null;
    const days = s.split(",").map(Number).filter((n) => n >= 0 && n <= 6);
    return days.length > 0 ? days : null;
  };

  await db.insert(bookingRules).values({
    tenantId,
    roomId,
    validFrom: data.validFrom ? new Date(data.validFrom + "T00:00:00.000Z") : null,
    validTo: data.validTo ? new Date(data.validTo + "T00:00:00.000Z") : null,
    minStay: data.minStay ?? null,
    maxStay: data.maxStay ?? null,
    allowedCheckInDays: parseDays(data.allowedCheckInDays),
    allowedCheckOutDays: parseDays(data.allowedCheckOutDays),
  });

  revalidateAll();
}

export async function deleteBookingRule(id: string) {
  const { tenantId } = await requireSession();
  await db
    .delete(bookingRules)
    .where(and(eq(bookingRules.id, id), eq(bookingRules.tenantId, tenantId)));
  revalidateAll();
}

// ── Pricing Rules ───────────────────────────────────────────────────────────

export async function createPricingRule(formData: FormData) {
  const { tenantId } = await requireSession();
  const data = parseFormData(pricingRuleSchema, formData);

  const roomId = data.roomId || null;
  if (roomId) await verifyRoomOwnership(roomId, tenantId);

  const parseDays = (s?: string) => {
    if (!s) return null;
    const days = s.split(",").map(Number).filter((n) => n >= 0 && n <= 6);
    return days.length > 0 ? days : null;
  };

  await db.insert(pricingRules).values({
    tenantId,
    roomId,
    name: data.name,
    validFrom: data.validFrom ? new Date(data.validFrom + "T00:00:00.000Z") : null,
    validTo: data.validTo ? new Date(data.validTo + "T00:00:00.000Z") : null,
    daysOfWeek: parseDays(data.daysOfWeek),
    fixedPrice: data.fixedPrice && data.fixedPrice !== ""
      ? data.fixedPrice.replace(",", ".")
      : null,
    percentageModifier: data.percentageModifier && data.percentageModifier !== ""
      ? data.percentageModifier.replace(",", ".")
      : null,
  });

  revalidateAll();
}

export async function deletePricingRule(id: string) {
  const { tenantId } = await requireSession();
  await db
    .delete(pricingRules)
    .where(and(eq(pricingRules.id, id), eq(pricingRules.tenantId, tenantId)));
  revalidateAll();
}

export async function togglePricingRule(id: string) {
  const { tenantId } = await requireSession();

  const [rule] = await db
    .select({ active: pricingRules.active })
    .from(pricingRules)
    .where(and(eq(pricingRules.id, id), eq(pricingRules.tenantId, tenantId)))
    .limit(1);

  if (!rule) throw new Error("Règle introuvable");

  await db
    .update(pricingRules)
    .set({ active: !rule.active })
    .where(and(eq(pricingRules.id, id), eq(pricingRules.tenantId, tenantId)));

  revalidateAll();
}
