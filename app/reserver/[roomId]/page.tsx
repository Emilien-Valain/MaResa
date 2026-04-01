import Link from "next/link";
import { notFound } from "next/navigation";
import PublicLayout from "@/components/public/PublicLayout";
import BookingForm from "@/components/public/BookingForm";
import { requireTenant } from "@/lib/tenant-context";
import { getRoomByIdPublic } from "@/lib/queries/public";

export default async function ReserverPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  const tenant = await requireTenant();
  const room = await getRoomByIdPublic(tenant.id, roomId);

  if (!room) {
    notFound();
  }

  return (
    <PublicLayout>
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-gray-900">Accueil</Link>
          <span className="mx-2">/</span>
          <Link href="/chambres" className="hover:text-gray-900">Chambres</Link>
          <span className="mx-2">/</span>
          <Link href={`/chambres/${room.slug}`} className="hover:text-gray-900">{room.name}</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900">Réserver</span>
        </nav>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Réserver — {room.name}</h1>
        <p className="text-gray-500 mb-8">
          {room.capacity} personne{room.capacity > 1 ? "s" : ""} max ·{" "}
          {parseFloat(room.pricePerNight).toFixed(0)} €/nuit
        </p>

        <div className="border border-gray-200 rounded-xl p-6 bg-white shadow-sm">
          <BookingForm
            room={{
              id: room.id,
              name: room.name,
              pricePerNight: room.pricePerNight,
              capacity: room.capacity,
            }}
            tenantId={tenant.id}
          />
        </div>
      </div>
    </PublicLayout>
  );
}
