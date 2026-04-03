"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { bookings, payments, rooms, tenants } from "@/db/schema";
import { isRoomAvailable } from "@/lib/availability";
import { stripe } from "@/lib/stripe";
import type Stripe from "stripe";

/**
 * Server action publique pour créer une réservation.
 * Crée un booking pending + un payment pending + une Stripe Checkout Session,
 * puis redirige le client vers la page de paiement Stripe.
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

  // Récupérer le tenant (nom + compte Stripe Connect)
  const [tenant] = await db
    .select({ name: tenants.name, stripeAccountId: tenants.stripeAccountId })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

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

  // Créer la Stripe Checkout Session
  const amountCents = Math.round(parseFloat(totalPrice) * 100);

  const formatDate = (d: Date) =>
    d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });

  const origin = headersList.get("origin") ?? headersList.get("x-forwarded-proto") + "://" + headersList.get("host");

  // Si le tenant a un compte Stripe Connect, le paiement va directement chez lui (0% commission)
  const stripeAccountId = tenant?.stripeAccountId;

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: guestEmail,
    line_items: [
      {
        price_data: {
          currency: "eur",
          unit_amount: amountCents,
          product_data: {
            name: `${room.name} — ${nights} nuit${nights > 1 ? "s" : ""}`,
            description: `${formatDate(checkIn)} → ${formatDate(checkOut)} · ${tenant?.name ?? ""}`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      bookingId: booking.id,
      tenantId,
    },
    success_url: `${origin}/reserver/confirmation?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/reserver/${roomId}?cancelled=true`,
    expires_at: Math.floor(Date.now() / 1000) + 1800, // 30 minutes
  };

  // Stripe Connect : 100% du paiement va au tenant, les frais Stripe sont à sa charge
  if (stripeAccountId) {
    sessionParams.payment_intent_data = {
      on_behalf_of: stripeAccountId,
      transfer_data: {
        destination: stripeAccountId,
      },
    };
  }

  const session = await stripe.checkout.sessions.create(sessionParams);

  // Insérer le payment en DB
  await db.insert(payments).values({
    tenantId,
    bookingId: booking.id,
    stripeSessionId: session.id,
    amount: totalPrice,
    currency: "eur",
    status: "pending",
  });

  redirect(session.url!);
}
