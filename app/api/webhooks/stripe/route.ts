import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import Stripe from "stripe";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { bookings, payments, rooms, tenants, users, userTenants } from "@/db/schema";
import { stripe } from "@/lib/stripe";
import {
  sendBookingConfirmation,
  sendAdminNotification,
  sendBookingCancellation,
  sendPaidAfterCancellationAlert,
} from "@/lib/email";
import type { TenantConfig } from "@/lib/tenant-context";

/** Emails des admins du tenant (destinataires des notifications hôte). */
async function tenantAdminEmails(tenantId: string): Promise<string[]> {
  const rows = await db
    .select({ email: users.email })
    .from(userTenants)
    .innerJoin(users, eq(users.id, userTenants.userId))
    .where(eq(userTenants.tenantId, tenantId));
  return rows.map((r) => r.email);
}

async function loadEmailContext(bookingId: string, tenantId: string) {
  const [booking] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);
  if (!booking) return null;

  const [room] = await db
    .select({ name: rooms.name })
    .from(rooms)
    .where(eq(rooms.id, booking.roomId))
    .limit(1);

  const [tenant] = await db
    .select({ name: tenants.name, config: tenants.config })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  const config = (tenant?.config ?? {}) as TenantConfig;
  const checkIn = new Date(booking.checkIn);
  const checkOut = new Date(booking.checkOut);
  const nights = Math.round(
    (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
  );

  return {
    booking,
    emailData: {
      guestName: booking.guestName,
      guestEmail: booking.guestEmail,
      roomName: room?.name ?? "Chambre",
      checkIn,
      checkOut,
      nights,
      totalPrice: parseFloat(booking.totalPrice).toFixed(2),
      hotelName: tenant?.name ?? "Hôtel",
      config,
    },
  };
}

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

      // Transition légale + idempotence : ne confirmer QUE depuis `pending`.
      // Stripe livre chaque événement au moins une fois (retries) ; une livraison
      // dupliquée, ou un événement tardif sur un booking déjà confirmé/annulé,
      // n'affecte aucune ligne — on n'envoie alors pas d'email en double et on ne
      // « ressuscite » pas un booking annulé.
      const confirmed = await db
        .update(bookings)
        .set({ status: "confirmed", updatedAt: new Date() })
        .where(and(eq(bookings.id, bookingId), eq(bookings.status, "pending")))
        .returning({ id: bookings.id });

      if (confirmed.length === 0) {
        await handlePaidAfterCancellation(session, bookingId, tenantId);
        break;
      }

      // Mettre à jour le payment
      await db
        .update(payments)
        .set({
          status: "paid",
          stripePaymentId: session.payment_intent as string,
        })
        .where(eq(payments.stripeSessionId, session.id));

      // Envoyer les emails (best-effort, ne pas bloquer le webhook)
      try {
        const ctx = await loadEmailContext(bookingId, tenantId);
        if (ctx) {
          const { booking, emailData } = ctx;

          // Email confirmation client (avec message personnalisé si configuré)
          await sendBookingConfirmation({
            ...emailData,
            confirmationMessage: emailData.config.confirmationMessage,
          });

          for (const adminEmail of await tenantAdminEmails(tenantId)) {
            await sendAdminNotification({
              ...emailData,
              guestPhone: booking.guestPhone,
              adminEmail,
            });
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
      const tenantId = session.metadata?.tenantId;

      if (!bookingId) break;

      // Transition légale + idempotence : n'annuler QUE depuis `pending`.
      // Un booking déjà confirmé (paiement abouti) ne doit pas être annulé par un
      // événement `expired` tardif/dupliqué, et on n'envoie pas un second email
      // d'annulation sur une re-livraison.
      const cancelled = await db
        .update(bookings)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(and(eq(bookings.id, bookingId), eq(bookings.status, "pending")))
        .returning({ id: bookings.id });

      if (cancelled.length === 0) break;

      // Mettre à jour le payment
      await db
        .update(payments)
        .set({ status: "expired" })
        .where(eq(payments.stripeSessionId, session.id));

      // Envoyer l'email d'annulation au client (best-effort)
      if (tenantId) {
        try {
          const [booking] = await db
            .select()
            .from(bookings)
            .where(eq(bookings.id, bookingId))
            .limit(1);

          if (booking) {
            const [room] = await db
              .select({ name: rooms.name })
              .from(rooms)
              .where(eq(rooms.id, booking.roomId))
              .limit(1);

            const [tenant] = await db
              .select({ name: tenants.name, config: tenants.config })
              .from(tenants)
              .where(eq(tenants.id, tenantId))
              .limit(1);

            const config = (tenant?.config ?? {}) as TenantConfig;

            await sendBookingCancellation({
              guestName: booking.guestName,
              guestEmail: booking.guestEmail,
              roomName: room?.name ?? "Chambre",
              checkIn: new Date(booking.checkIn),
              checkOut: new Date(booking.checkOut),
              hotelName: tenant?.name ?? "Hôtel",
              config,
              reason: "payment_expired",
            });
          }
        } catch (emailError) {
          console.error("Erreur envoi email annulation:", emailError);
        }
      }

      break;
    }
  }

  return NextResponse.json({ received: true });
}

/**
 * Paiement abouti sur un booking annulé entre-temps (annulation admin pendant
 * que le client était sur Stripe Checkout). On ne ressuscite pas le booking,
 * mais l'argent est bien encaissé : on marque le payment `paid` et on alerte
 * l'hôte pour qu'il rembourse. Pas de remboursement automatique (décision).
 * Idempotent : seul le passage `pending → paid` du payment déclenche l'alerte.
 */
async function handlePaidAfterCancellation(
  session: Stripe.Checkout.Session,
  bookingId: string,
  tenantId: string,
) {
  const [booking] = await db
    .select({ status: bookings.status })
    .from(bookings)
    .where(and(eq(bookings.id, bookingId), eq(bookings.tenantId, tenantId)))
    .limit(1);
  if (booking?.status !== "cancelled") return;

  const stripePaymentId = session.payment_intent as string;
  const paid = await db
    .update(payments)
    .set({ status: "paid", stripePaymentId })
    .where(and(eq(payments.stripeSessionId, session.id), eq(payments.status, "pending")))
    .returning({ id: payments.id });
  if (paid.length === 0) return;

  console.error(
    `[stripe] Paiement reçu sur une réservation annulée — booking ${bookingId}, payment_intent ${stripePaymentId} : remboursement à faire`,
  );

  try {
    const ctx = await loadEmailContext(bookingId, tenantId);
    if (!ctx) return;
    for (const adminEmail of await tenantAdminEmails(tenantId)) {
      await sendPaidAfterCancellationAlert({ ...ctx.emailData, adminEmail, stripePaymentId });
    }
  } catch (emailError) {
    console.error("Erreur envoi alerte paiement après annulation:", emailError);
  }
}
