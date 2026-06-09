import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { rooms } from "@/db/schema";
import { isRoomAvailable } from "@/lib/availability";
import { validateBookingRules } from "@/lib/booking-rules";
import { calculatePrice, type PriceBreakdown } from "@/lib/pricing";

/**
 * Seam d'admission des réservations — voir ADR-0008.
 *
 * Toute création de booking (publique ou manuelle) passe par `admitBooking`.
 * Le gate résout et autorise la chambre, contrôle la disponibilité contre les
 * Holds (lib/holds.ts), valide optionnellement les booking-rules, et calcule le
 * prix. Les appelants ne divergent qu'APRÈS l'admission (public → pending +
 * Stripe ; manuel → confirmed). Lève une erreur explicite (message FR) au rejet.
 */

export type AdmitInput = {
  roomId: string;
  tenantId: string;
  checkIn: Date;
  checkOut: Date;
};

export type AdmitOptions = {
  /** Valide les booking-rules (minStay, jours d'arrivée…). Public: true, manuel: false. */
  enforceRules?: boolean;
  /**
   * Autorise l'admission par-dessus un Hold existant — l'override admin du
   * thread #1. Réservé à l'intake manuel (case « Forcer »). Jamais en public.
   */
  allowOverlap?: boolean;
};

type Room = typeof rooms.$inferSelect;

export type Admission = { room: Room; breakdown: PriceBreakdown };

export async function admitBooking(
  { roomId, tenantId, checkIn, checkOut }: AdmitInput,
  { enforceRules = false, allowOverlap = false }: AdmitOptions = {},
): Promise<Admission> {
  // 1. La chambre doit appartenir au tenant et être active (isolation multi-tenant).
  //    Donne à l'intake manuel le contrôle d'ownership qui lui manquait.
  const [room] = await db
    .select()
    .from(rooms)
    .where(and(eq(rooms.id, roomId), eq(rooms.tenantId, tenantId), eq(rooms.active, true)))
    .limit(1);

  if (!room) {
    throw new Error("Chambre introuvable");
  }

  // 2. Disponibilité (Holds) — sauf override admin explicite.
  if (!allowOverlap) {
    const available = await isRoomAvailable(roomId, tenantId, checkIn, checkOut);
    if (!available) {
      throw new Error("Chambre non disponible pour ces dates");
    }
  }

  // 3. Règles de réservation — public uniquement.
  if (enforceRules) {
    const violations = await validateBookingRules(roomId, tenantId, checkIn, checkOut);
    if (violations.length > 0) {
      throw new Error(violations.map((v) => v.message).join(", "));
    }
  }

  // 4. Prix dynamique.
  const breakdown = await calculatePrice(roomId, tenantId, checkIn, checkOut);

  return { room, breakdown };
}
