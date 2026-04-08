"use server";

import { and, eq, isNull, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { pricingRules, rooms } from "@/db/schema";

export interface NightPrice {
  date: string; // YYYY-MM-DD
  price: number;
  basePrice: number;
  appliedRule: string | null;
}

export interface PriceBreakdown {
  nights: NightPrice[];
  totalPrice: number;
  minPricePerNight: number;
  maxPricePerNight: number;
}

type PricingRule = typeof pricingRules.$inferSelect;

/**
 * Calcule le prix pour chaque nuit dans [checkIn, checkOut[.
 * Le prix le plus haut gagne quand plusieurs règles s'appliquent.
 * Room-specific fixedPrice > Global percentageModifier/fixedPrice.
 */
export async function calculatePrice(
  roomId: string,
  tenantId: string,
  checkIn: Date,
  checkOut: Date,
): Promise<PriceBreakdown> {
  const [room, allRules] = await Promise.all([
    db
      .select({ pricePerNight: rooms.pricePerNight })
      .from(rooms)
      .where(eq(rooms.id, roomId))
      .then((r) => r[0]),
    db
      .select()
      .from(pricingRules)
      .where(
        and(
          eq(pricingRules.tenantId, tenantId),
          eq(pricingRules.active, true),
          or(eq(pricingRules.roomId, roomId), isNull(pricingRules.roomId)),
        ),
      ),
  ]);

  const basePrice = room ? parseFloat(room.pricePerNight) : 0;
  const roomRules = allRules.filter((r) => r.roomId !== null);
  const globalRules = allRules.filter((r) => r.roomId === null);

  const nightPrices: NightPrice[] = [];
  const cur = new Date(checkIn);
  cur.setUTCHours(0, 0, 0, 0);

  while (cur < checkOut) {
    const { price, ruleName } = resolveNightPrice(basePrice, cur, roomRules, globalRules);
    nightPrices.push({
      date: cur.toISOString().split("T")[0],
      price,
      basePrice,
      appliedRule: ruleName,
    });
    cur.setUTCDate(cur.getUTCDate() + 1);
  }

  const totalPrice = nightPrices.reduce((sum, n) => sum + n.price, 0);
  const prices = nightPrices.map((n) => n.price);

  return {
    nights: nightPrices,
    totalPrice,
    minPricePerNight: prices.length > 0 ? Math.min(...prices) : basePrice,
    maxPricePerNight: prices.length > 0 ? Math.max(...prices) : basePrice,
  };
}

/**
 * Retourne le prix minimum par nuit pour une chambre (pour "à partir de X€/nuit").
 * Considère le prix de base et les éventuelles promotions (pourcentage négatif).
 */
export async function getMinPricePerNight(
  roomId: string,
  tenantId: string,
): Promise<number> {
  const [room, allRules] = await Promise.all([
    db
      .select({ pricePerNight: rooms.pricePerNight })
      .from(rooms)
      .where(eq(rooms.id, roomId))
      .then((r) => r[0]),
    db
      .select()
      .from(pricingRules)
      .where(
        and(
          eq(pricingRules.tenantId, tenantId),
          eq(pricingRules.active, true),
          or(eq(pricingRules.roomId, roomId), isNull(pricingRules.roomId)),
        ),
      ),
  ]);

  const basePrice = room ? parseFloat(room.pricePerNight) : 0;

  if (allRules.length === 0) return basePrice;

  // Le min est soit le base price, soit un prix réduit par une promo
  let minPrice = basePrice;

  for (const rule of allRules) {
    if (rule.roomId !== null && rule.fixedPrice) {
      const fp = parseFloat(rule.fixedPrice);
      if (fp < minPrice) minPrice = fp;
    } else if (rule.percentageModifier) {
      const mod = parseFloat(rule.percentageModifier);
      const adjusted = basePrice * (1 + mod / 100);
      if (adjusted < minPrice) minPrice = adjusted;
    } else if (rule.fixedPrice) {
      const fp = parseFloat(rule.fixedPrice);
      if (fp < minPrice) minPrice = fp;
    }
  }

  return Math.max(0, Math.round(minPrice * 100) / 100);
}

/**
 * Résout le prix d'une nuit donnée.
 * 1. Filtre les rules par validFrom/validTo et daysOfWeek
 * 2. Room-specific fixedPrice → candidat
 * 3. Global percentageModifier → basePrice * (1 + mod/100)
 * 4. Le prix le plus haut gagne
 */
function resolveNightPrice(
  basePrice: number,
  date: Date,
  roomRules: PricingRule[],
  globalRules: PricingRule[],
): { price: number; ruleName: string | null } {
  const dayOfWeek = date.getUTCDay();

  const matchesRule = (rule: PricingRule): boolean => {
    // Vérifier la plage de dates
    if (rule.validFrom && date < new Date(rule.validFrom)) return false;
    if (rule.validTo && date > new Date(rule.validTo)) return false;
    // Vérifier le jour de la semaine
    if (rule.daysOfWeek) {
      const days = rule.daysOfWeek as number[];
      if (!days.includes(dayOfWeek)) return false;
    }
    return true;
  };

  let bestPrice = basePrice;
  let bestRuleName: string | null = null;

  // Room-specific rules avec fixedPrice
  for (const rule of roomRules) {
    if (!matchesRule(rule)) continue;
    if (rule.fixedPrice) {
      const fp = parseFloat(rule.fixedPrice);
      if (fp > bestPrice) {
        bestPrice = fp;
        bestRuleName = rule.name;
      }
    }
  }

  // Global rules
  for (const rule of globalRules) {
    if (!matchesRule(rule)) continue;
    let candidatePrice = basePrice;

    if (rule.fixedPrice) {
      candidatePrice = parseFloat(rule.fixedPrice);
    } else if (rule.percentageModifier) {
      const mod = parseFloat(rule.percentageModifier);
      candidatePrice = basePrice * (1 + mod / 100);
    }

    if (candidatePrice > bestPrice) {
      bestPrice = candidatePrice;
      bestRuleName = rule.name;
    }
  }

  return {
    price: Math.round(bestPrice * 100) / 100,
    ruleName: bestRuleName,
  };
}
