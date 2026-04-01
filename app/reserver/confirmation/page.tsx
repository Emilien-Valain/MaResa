import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import PublicLayout from "@/components/public/PublicLayout";
import { db } from "@/lib/db";
import { bookings, rooms } from "@/db/schema";

export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ bookingId?: string }>;
}) {
  const { bookingId } = await searchParams;

  if (!bookingId) {
    notFound();
  }

  const headersList = await headers();
  const tenantId = headersList.get("x-tenant-id");

  if (!tenantId) {
    notFound();
  }

  const [booking] = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.id, bookingId), eq(bookings.tenantId, tenantId)))
    .limit(1);

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

  return (
    <PublicLayout>
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        {/* Icône succès */}
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
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

        <h1 className="text-3xl font-bold text-gray-900 mb-3">Réservation reçue !</h1>
        <p className="text-gray-500 mb-8">
          Nous vous contacterons pour confirmer votre réservation.
        </p>

        {/* Récapitulatif */}
        <div className="border border-gray-200 rounded-xl p-6 bg-white shadow-sm text-left mb-8">
          <h2 className="font-semibold text-gray-900 mb-4">Récapitulatif</h2>
          <dl className="space-y-3">
            <div className="flex justify-between text-sm">
              <dt className="text-gray-500">Client</dt>
              <dd className="font-medium text-gray-900">{booking.guestName}</dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-gray-500">Email</dt>
              <dd className="font-medium text-gray-900">{booking.guestEmail}</dd>
            </div>
            {room && (
              <div className="flex justify-between text-sm">
                <dt className="text-gray-500">Chambre</dt>
                <dd className="font-medium text-gray-900">{room.name}</dd>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <dt className="text-gray-500">Arrivée</dt>
              <dd className="font-medium text-gray-900">{formatDate(checkIn)}</dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-gray-500">Départ</dt>
              <dd className="font-medium text-gray-900">{formatDate(checkOut)}</dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-gray-500">Durée</dt>
              <dd className="font-medium text-gray-900">
                {nights} nuit{nights > 1 ? "s" : ""}
              </dd>
            </div>
            <div className="flex justify-between text-sm border-t border-gray-100 pt-3 mt-3">
              <dt className="font-medium text-gray-900">Total</dt>
              <dd className="font-semibold text-gray-900">
                {parseFloat(booking.totalPrice).toFixed(2)} €
              </dd>
            </div>
          </dl>
        </div>

        <Link
          href="/"
          className="inline-block bg-gray-900 text-white font-semibold px-8 py-3 rounded-full hover:bg-gray-700 transition-colors"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    </PublicLayout>
  );
}
