import { and, eq, sql } from "drizzle-orm";
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
 *
 * L'insertion (`persist`) se fait DANS la transaction de l'admission, sous un
 * verrou par chambre : deux demandes simultanées sur les mêmes nuits ne peuvent
 * plus passer toutes deux le contrôle de dispo avant que l'une ait écrit.
 */

export type AdmitInput = {
  roomId: string;
  tenantId: string;
  checkIn: Date;
  checkOut: Date;
  guestCount: number;
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

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Les dates chevauchent un Hold existant : l'intake manuel peut alors proposer « Forcer ». */
export class RoomUnavailableError extends Error {
  constructor() {
    super("Chambre non disponible pour ces dates");
    this.name = "RoomUnavailableError";
  }
}

/** Plus de voyageurs que la capacité de la chambre. */
export class CapacityError extends Error {
  constructor(capacity: number) {
    super(`Cette chambre accueille ${capacity} personne${capacity > 1 ? "s" : ""} maximum`);
    this.name = "CapacityError";
  }
}

/** Les dates violent une booking-rule (minStay, jour d'arrivée…) ; le message est prêt à afficher. */
export class BookingRulesError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BookingRulesError";
  }
}

export async function admitBooking<T>(
  { roomId, tenantId, checkIn, checkOut, guestCount }: AdmitInput,
  { enforceRules = false, allowOverlap = false }: AdmitOptions,
  persist: (tx: Tx, admission: Admission) => Promise<T>,
): Promise<T> {
  // Tout passe par `tx` : une admission ne doit jamais réclamer une 2e connexion
  // du pool en tenant déjà la sienne (sinon N admissions simultanées = deadlock).
  return db.transaction(async (tx) => {
    // Verrou relâché au commit, donc après l'insertion : l'admission suivante
    // de la même chambre lit la réservation qu'on vient d'écrire.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${roomId}))`);

    // 1. La chambre doit appartenir au tenant et être active (isolation multi-tenant).
    //    Donne à l'intake manuel le contrôle d'ownership qui lui manquait.
    const [room] = await tx
      .select()
      .from(rooms)
      .where(and(eq(rooms.id, roomId), eq(rooms.tenantId, tenantId), eq(rooms.active, true)))
      .limit(1);

    if (!room) {
      throw new Error("Chambre introuvable");
    }
    if (guestCount > room.capacity) {
      throw new CapacityError(room.capacity);
    }

    // 2. Disponibilité (Holds) — sauf override admin explicite.
    if (!allowOverlap) {
      const available = await isRoomAvailable(roomId, tenantId, checkIn, checkOut, tx);
      if (!available) {
        throw new RoomUnavailableError();
      }
    }

    // 3. Règles de réservation — public uniquement.
    if (enforceRules) {
      const violations = await validateBookingRules(roomId, tenantId, checkIn, checkOut, tx);
      if (violations.length > 0) {
        throw new BookingRulesError(violations.map((v) => v.message).join(", "));
      }
    }

    // 4. Prix dynamique.
    const breakdown = await calculatePrice(roomId, tenantId, checkIn, checkOut, tx);

    return persist(tx, { room, breakdown });
  });
}
