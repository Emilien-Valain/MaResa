"use server";

import { and, eq, isNull, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { pricingRules, rooms } from "@/db/schema";
import { orderByPrecedence } from "@/lib/rule-precedence";

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
/** Forme exploitable par la primitive de précédence (daysOfWeek typé). */
type ResolvableRule = Omit<PricingRule, "daysOfWeek"> & { daysOfWeek: number[] | null };

const HORIZON_DAYS = 365;

/**
 * Charge le prix de base + les règles actives (chambre + globales) d'un tenant,
 * avec `daysOfWeek` typé pour la primitive de précédence.
 */
async function loadPricingContext(roomId: string, tenantId: string) {
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
  const rules: ResolvableRule[] = allRules.map((r) => ({
    ...r,
    daysOfWeek: r.daysOfWeek as number[] | null,
  }));
  return { basePrice, rules };
}

/**
 * Calcule le prix pour chaque nuit dans [checkIn, checkOut[.
 * Résolution par précédence (ADR-0006 / ADR-0009) : la règle gagnante est
 * appliquée directement — une promo (prix < base) est facturée telle quelle.
 */
export async function calculatePrice(
  roomId: string,
  tenantId: string,
  checkIn: Date,
  checkOut: Date,
): Promise<PriceBreakdown> {
  const { basePrice, rules } = await loadPricingContext(roomId, tenantId);

  const nightPrices: NightPrice[] = [];
  const cur = new Date(checkIn);
  cur.setUTCHours(0, 0, 0, 0);

  while (cur < checkOut) {
    const { price, ruleName } = resolveNightPrice(basePrice, new Date(cur), rules);
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
 * Prix minimum par nuit pour une chambre (« à partir de X€/nuit »).
 * Dérivé du MÊME résolveur sur un horizon forward → l'affichage ne peut pas
 * mentir sur le prix réellement facturé (display == charge, ADR-0006).
 */
export async function getMinPricePerNight(
  roomId: string,
  tenantId: string,
): Promise<number> {
  const { basePrice, rules } = await loadPricingContext(roomId, tenantId);
  if (rules.length === 0) return basePrice;

  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);

  let min = Infinity;
  const cur = new Date(start);
  for (let i = 0; i < HORIZON_DAYS; i++) {
    const { price } = resolveNightPrice(basePrice, new Date(cur), rules);
    if (price < min) min = price;
    cur.setUTCDate(cur.getUTCDate() + 1);
  }

  return Math.max(0, Math.round(min * 100) / 100);
}

/**
 * Résout le prix d'une nuit : élit la règle gagnante par précédence et applique
 * sa valeur directement (`fixedPrice`, ou `base × (1 + modificateur/100)`),
 * bornée à 0. Pas de plancher au prix de base — une promo peut descendre dessous.
 */
function resolveNightPrice(
  basePrice: number,
  date: Date,
  rules: ResolvableRule[],
): { price: number; ruleName: string | null } {
  const winner = orderByPrecedence(rules, date)[0];
  if (!winner) return { price: Math.round(basePrice * 100) / 100, ruleName: null };

  let price = basePrice;
  if (winner.fixedPrice !== null) {
    price = parseFloat(winner.fixedPrice);
  } else if (winner.percentageModifier !== null) {
    price = basePrice * (1 + parseFloat(winner.percentageModifier) / 100);
  }

  return {
    price: Math.max(0, Math.round(price * 100) / 100),
    ruleName: winner.name,
  };
}
