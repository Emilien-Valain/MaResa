import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { bookings, payments, rooms, tenants, users, userTenants } from "@/db/schema";
import { stripe } from "@/lib/stripe";
import { sendBookingConfirmation, sendAdminNotification } from "@/lib/email";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Signature manquante" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch {
    return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const bookingId = session.metadata?.bookingId;
      const tenantId = session.metadata?.tenantId;

      if (!bookingId || !tenantId) break;

      // Mettre à jour le payment
      await db
        .update(payments)
        .set({
          status: "paid",
          stripePaymentId: session.payment_intent as string,
        })
        .where(eq(payments.stripeSessionId, session.id));

      // Mettre à jour le booking → confirmed
      await db
        .update(bookings)
        .set({ status: "confirmed", updatedAt: new Date() })
        .where(eq(bookings.id, bookingId));

      // Envoyer les emails (best-effort, ne pas bloquer le webhook)
      try {
        const [booking] = await db
          .select()
          .from(bookings)
          .where(eq(bookings.id, bookingId))
          .limit(1);

        const [room] = await db
          .select({ name: rooms.name })
          .from(rooms)
          .where(eq(rooms.id, booking.roomId))
          .limit(1);

        const [tenant] = await db
          .select({ name: tenants.name })
          .from(tenants)
          .where(eq(tenants.id, tenantId))
          .limit(1);

        const checkIn = new Date(booking.checkIn);
        const checkOut = new Date(booking.checkOut);
        const nights = Math.round(
          (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
        );

        const emailData = {
          guestName: booking.guestName,
          guestEmail: booking.guestEmail,
          roomName: room?.name ?? "Chambre",
          checkIn,
          checkOut,
          nights,
          totalPrice: parseFloat(booking.totalPrice).toFixed(2),
          hotelName: tenant?.name ?? "Hôtel",
        };

        // Email confirmation client
        await sendBookingConfirmation(emailData);

        // Email notification admin — trouver l'email des admins du tenant
        const adminMemberships = await db
          .select({ userId: userTenants.userId })
          .from(userTenants)
          .where(eq(userTenants.tenantId, tenantId));

        if (adminMemberships.length > 0) {
          const adminUserIds = adminMemberships.map((m) => m.userId);
          for (const userId of adminUserIds) {
            const [adminUser] = await db
              .select({ email: users.email })
              .from(users)
              .where(eq(users.id, userId))
              .limit(1);

            if (adminUser) {
              await sendAdminNotification({
                ...emailData,
                guestPhone: booking.guestPhone,
                adminEmail: adminUser.email,
              });
            }
          }
        }
      } catch (emailError) {
        console.error("Erreur envoi email après paiement:", emailError);
      }

      break;
    }

    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;
      const bookingId = session.metadata?.bookingId;

      if (!bookingId) break;

      // Mettre à jour le payment
      await db
        .update(payments)
        .set({ status: "expired" })
        .where(eq(payments.stripeSessionId, session.id));

      // Annuler le booking
      await db
        .update(bookings)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(eq(bookings.id, bookingId));

      break;
    }
  }

  return NextResponse.json({ received: true });
}
