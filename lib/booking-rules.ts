"use server";

import { and, eq, isNull, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { bookingRules } from "@/db/schema";
import { orderByPrecedence } from "@/lib/rule-precedence";

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
 * Retourne les règles effectives pour une chambre à une date d'arrivée donnée.
 *
 * Merge PAR CHAMP par précédence (ADR-0009) : chaque contrainte (minStay,
 * maxStay, allowedCheckInDays, allowedCheckOutDays) prend la valeur de la règle
 * applicable de plus haute précédence qui la définit (non-null). Une règle
 * chambre qui ne fixe que `minStay` ne fait donc plus disparaître les
 * `allowedCheckInDays` globaux — ils sont hérités. Précédence partagée avec le
 * pricing : priority → spécificité (chambre > global, fenêtre étroite > année) →
 * récence.
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

  // Applicables à la date d'arrivée, triées de la plus prioritaire à la moins.
  const ordered = orderByPrecedence(allRules, checkIn);

  // Pour chaque champ : la 1re règle de la liste ordonnée qui le définit gagne.
  const firstDefined = <V>(get: (r: (typeof ordered)[number]) => V | null | undefined): V | null => {
    for (const rule of ordered) {
      const v = get(rule);
      if (v !== null && v !== undefined) return v;
    }
    return null;
  };

  return {
    minStay: firstDefined((r) => r.minStay),
    maxStay: firstDefined((r) => r.maxStay),
    allowedCheckInDays: firstDefined((r) => r.allowedCheckInDays as number[] | null),
    allowedCheckOutDays: firstDefined((r) => r.allowedCheckOutDays as number[] | null),
  };
}
