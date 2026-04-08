"use server";

import { and, eq, isNull, or, lte, gte } from "drizzle-orm";
import { db } from "@/lib/db";
import { bookingRules } from "@/db/schema";

const DAY_NAMES_FR = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

export interface RuleViolation {
  rule: "minStay" | "maxStay" | "checkInDay" | "checkOutDay";
  message: string;
}

/**
 * Valide une réservation contre les règles actives.
 * Retourne un tableau vide si tout est valide.
 * Les règles par chambre override les règles globales (pas de merge).
 */
export async function validateBookingRules(
  roomId: string,
  tenantId: string,
  checkIn: Date,
  checkOut: Date,
): Promise<RuleViolation[]> {
  const effective = await getEffectiveRules(roomId, tenantId, checkIn);
  const nights = Math.round(
    (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
  );

  const violations: RuleViolation[] = [];

  if (effective.minStay !== null && nights < effective.minStay) {
    violations.push({
      rule: "minStay",
      message: `Séjour minimum de ${effective.minStay} nuit${effective.minStay > 1 ? "s" : ""}`,
    });
  }

  if (effective.maxStay !== null && nights > effective.maxStay) {
    violations.push({
      rule: "maxStay",
      message: `Séjour maximum de ${effective.maxStay} nuit${effective.maxStay > 1 ? "s" : ""}`,
    });
  }

  if (effective.allowedCheckInDays !== null) {
    const dayOfWeek = checkIn.getUTCDay();
    if (!effective.allowedCheckInDays.includes(dayOfWeek)) {
      const allowed = effective.allowedCheckInDays.map((d) => DAY_NAMES_FR[d]).join(", ");
      violations.push({
        rule: "checkInDay",
        message: `Arrivée autorisée uniquement le ${allowed}`,
      });
    }
  }

  if (effective.allowedCheckOutDays !== null) {
    const dayOfWeek = checkOut.getUTCDay();
    if (!effective.allowedCheckOutDays.includes(dayOfWeek)) {
      const allowed = effective.allowedCheckOutDays.map((d) => DAY_NAMES_FR[d]).join(", ");
      violations.push({
        rule: "checkOutDay",
        message: `Départ autorisé uniquement le ${allowed}`,
      });
    }
  }

  return violations;
}

/**
 * Retourne les règles effectives pour une chambre à une date donnée.
 * Room-specific override global entièrement (pas de merge par champ).
 */
export async function getEffectiveRules(
  roomId: string,
  tenantId: string,
  checkIn: Date,
): Promise<{
  minStay: number | null;
  maxStay: number | null;
  allowedCheckInDays: number[] | null;
  allowedCheckOutDays: number[] | null;
}> {
  const allRules = await db
    .select()
    .from(bookingRules)
    .where(
      and(
        eq(bookingRules.tenantId, tenantId),
        or(eq(bookingRules.roomId, roomId), isNull(bookingRules.roomId)),
      ),
    );

  // Filtrer par validité saisonnière
  const matchingRules = allRules.filter((rule) => {
    if (!rule.validFrom && !rule.validTo) return true; // année entière
    if (rule.validFrom && checkIn < new Date(rule.validFrom)) return false;
    if (rule.validTo && checkIn > new Date(rule.validTo)) return false;
    return true;
  });

  // Séparer room-specific et global
  const roomRules = matchingRules.filter((r) => r.roomId !== null);
  const globalRules = matchingRules.filter((r) => r.roomId === null);

  // Si des règles room-specific existent, elles overrident complètement les globales
  const effectiveRules = roomRules.length > 0 ? roomRules : globalRules;

  if (effectiveRules.length === 0) {
    return { minStay: null, maxStay: null, allowedCheckInDays: null, allowedCheckOutDays: null };
  }

  // Parmi les règles effectives, prendre la plus restrictive
  // (priorité la plus haute, puis la plus spécifique saisonnièrement)
  const sorted = effectiveRules.sort((a, b) => {
    // Saisonnière > année entière
    const aSpecific = a.validFrom ? 1 : 0;
    const bSpecific = b.validFrom ? 1 : 0;
    if (aSpecific !== bSpecific) return bSpecific - aSpecific;
    return b.priority - a.priority;
  });

  const best = sorted[0];
  return {
    minStay: best.minStay,
    maxStay: best.maxStay,
    allowedCheckInDays: best.allowedCheckInDays as number[] | null,
    allowedCheckOutDays: best.allowedCheckOutDays as number[] | null,
  };
}
