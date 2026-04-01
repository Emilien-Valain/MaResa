"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { bookings, rooms } from "@/db/schema";
import { isRoomAvailable } from "@/lib/availability";

/**
 * Server action publique pour créer une réservation.
 * Lit tenantId depuis les headers (injecté par le proxy — non falsifiable).
 */
export async function createBookingPublic(formData: FormData) {
  const headersList = await headers();
  const tenantId = headersList.get("x-tenant-id");

  if (!tenantId) {
    throw new Error("Tenant non trouvé");
  }

  const roomId = formData.get("roomId") as string;
  const checkInStr = formData.get("checkIn") as string;
  const checkOutStr = formData.get("checkOut") as string;
  const guestName = formData.get("guestName") as string;
  const guestEmail = formData.get("guestEmail") as string;
  const guestPhone = formData.get("guestPhone") as string | null;
  const guestCountStr = formData.get("guestCount") as string;

  // Validation
  if (!roomId || !checkInStr || !checkOutStr || !guestName || !guestEmail || !guestCountStr) {
    throw new Error("Champs obligatoires manquants");
  }

  const checkIn = new Date(checkInStr + "T00:00:00.000Z");
  const checkOut = new Date(checkOutStr + "T00:00:00.000Z");

  if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
    throw new Error("Dates invalides");
  }

  if (checkOut <= checkIn) {
    throw new Error("La date de départ doit être après la date d'arrivée");
  }

  const guestCount = parseInt(guestCountStr, 10);
  if (isNaN(guestCount) || guestCount < 1) {
    throw new Error("Nombre de personnes invalide");
  }

  // Vérifier que la chambre appartient au tenant
  const [room] = await db
    .select()
    .from(rooms)
    .where(and(eq(rooms.id, roomId), eq(rooms.tenantId, tenantId), eq(rooms.active, true)))
    .limit(1);

  if (!room) {
    throw new Error("Chambre introuvable");
  }

  // Double-check disponibilité
  const available = await isRoomAvailable(roomId, tenantId, checkIn, checkOut);
  if (!available) {
    throw new Error("Chambre non disponible pour ces dates");
  }

  // Calcul du prix
  const nights = Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
  const pricePerNight = parseFloat(room.pricePerNight);
  const totalPrice = (nights * pricePerNight).toFixed(2);

  // Insertion du booking
  const [booking] = await db
    .insert(bookings)
    .values({
      tenantId,
      roomId,
      checkIn,
      checkOut,
      totalPrice,
      status: "pending",
      guestName,
      guestEmail,
      guestPhone: guestPhone || null,
      guestCount,
      source: "direct",
    })
    .returning({ id: bookings.id });

  redirect("/reserver/confirmation?bookingId=" + booking.id);
}
