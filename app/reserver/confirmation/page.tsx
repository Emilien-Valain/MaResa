import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import PublicLayout from "@/components/public/PublicLayout";
import { db } from "@/lib/db";
import { bookings, payments, rooms } from "@/db/schema";

export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ bookingId?: string; session_id?: string }>;
}) {
  const { bookingId, session_id } = await searchParams;

  const headersList = await headers();
  const tenantId = headersList.get("x-tenant-id");

  if (!tenantId) {
    notFound();
  }

  let booking;

  if (session_id) {
    // Retour depuis Stripe — retrouver le booking via la session Stripe
    const [payment] = await db
      .select({ bookingId: payments.bookingId })
      .from(payments)
      .where(and(eq(payments.stripeSessionId, session_id), eq(payments.tenantId, tenantId)))
      .limit(1);

    if (!payment) {
      notFound();
    }

    [booking] = await db
      .select()
      .from(bookings)
      .where(and(eq(bookings.id, payment.bookingId), eq(bookings.tenantId, tenantId)))
      .limit(1);
  } else if (bookingId) {
    [booking] = await db
      .select()
      .from(bookings)
      .where(and(eq(bookings.id, bookingId), eq(bookings.tenantId, tenantId)))
      .limit(1);
  }

  if (!booking) {
    notFound();
  }

  const [room] = await db
    .select({ name: rooms.name })
    .from(rooms)
    .where(eq(rooms.id, booking.roomId))
    .limit(1);

  const checkIn = new Date(booking.checkIn);
  const checkOut = new Date(booking.checkOut);

  const formatDate = (d: Date) =>
    d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  const nights = Math.round(
    (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
  );

  // Le webhook peut ne pas encore avoir été traité — le statut peut être "pending" ou "confirmed"
  const isPaid = booking.status === "confirmed";

  return (
    <PublicLayout>
      <div className="max-w-2xl mx-auto px-6 py-20 text-center">
        {/* Icône succès */}
        <div className="w-16 h-16 bg-green-50 border border-green-200 rounded-full flex items-center justify-center mx-auto mb-6 animate-fade-up">
          <svg
            className="w-8 h-8 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        <h1 className="font-heading text-4xl font-semibold text-warm-900 mb-3 animate-fade-up stagger-1">
          {isPaid ? "Paiement confirmé !" : "Paiement en cours de traitement"}
        </h1>
        <p className="text-warm-500 mb-10 animate-fade-up stagger-2">
          {isPaid
            ? "Votre réservation est confirmée. Vous recevrez un email de confirmation sous peu."
            : "Votre paiement est en cours de vérification. Vous recevrez un email de confirmation dès qu'il sera validé."}
        </p>

        {/* Récapitulatif */}
        <div className="border border-warm-200 rounded-sm p-6 bg-white shadow-sm text-left mb-10 animate-fade-up stagger-3">
          <h2 className="font-heading text-xl font-semibold text-warm-900 mb-4">Récapitulatif</h2>
          <dl className="space-y-3">
            <div className="flex justify-between text-sm">
              <dt className="text-warm-500">Client</dt>
              <dd className="font-medium text-warm-900">{booking.guestName}</dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-warm-500">Email</dt>
              <dd className="font-medium text-warm-900">{booking.guestEmail}</dd>
            </div>
            {room && (
              <div className="flex justify-between text-sm">
                <dt className="text-warm-500">Chambre</dt>
                <dd className="font-medium text-warm-900">{room.name}</dd>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <dt className="text-warm-500">Arrivée</dt>
              <dd className="font-medium text-warm-900">{formatDate(checkIn)}</dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-warm-500">Départ</dt>
              <dd className="font-medium text-warm-900">{formatDate(checkOut)}</dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-warm-500">Durée</dt>
              <dd className="font-medium text-warm-900">
                {nights} nuit{nights > 1 ? "s" : ""}
              </dd>
            </div>
            <div className="flex justify-between text-sm border-t border-warm-100 pt-3 mt-3">
              <dt className="font-medium text-warm-900">Total</dt>
              <dd className="font-heading text-lg font-semibold text-warm-900">
                {parseFloat(booking.totalPrice).toFixed(2)} €
              </dd>
            </div>
          </dl>
        </div>

        <Link
          href="/"
          className="inline-block bg-warm-900 text-warm-50 font-medium px-8 py-3 rounded-sm hover:bg-warm-800 transition-colors animate-fade-up stagger-4"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    </PublicLayout>
  );
}
