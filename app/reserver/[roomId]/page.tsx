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
      <div className="max-w-2xl mx-auto px-6 py-16">
        {/* Breadcrumb */}
        <nav className="text-sm text-warm-500 mb-8 animate-fade-in">
          <Link href="/" className="hover:text-warm-900 transition-colors">Accueil</Link>
          <span className="mx-2 text-warm-300">/</span>
          <Link href="/chambres" className="hover:text-warm-900 transition-colors">Chambres</Link>
          <span className="mx-2 text-warm-300">/</span>
          <Link href={`/chambres/${room.slug}`} className="hover:text-warm-900 transition-colors">{room.name}</Link>
          <span className="mx-2 text-warm-300">/</span>
          <span className="text-warm-900">Réserver</span>
        </nav>

        <h1 className="font-heading text-3xl font-semibold text-warm-900 mb-2 animate-fade-up">
          Réserver — {room.name}
        </h1>
        <p className="text-warm-500 mb-8 animate-fade-up stagger-1">
          {room.capacity} personne{room.capacity > 1 ? "s" : ""} max ·{" "}
          {parseFloat(room.pricePerNight).toFixed(0)} €/nuit
        </p>

        <div className="border border-warm-200 rounded-sm p-6 bg-white shadow-sm animate-fade-up stagger-2">
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
