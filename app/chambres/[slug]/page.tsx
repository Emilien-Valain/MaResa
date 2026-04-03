import Link from "next/link";
import { notFound } from "next/navigation";
import PublicLayout from "@/components/public/PublicLayout";
import RoomGallery from "@/components/public/RoomGallery";
import { requireTenant } from "@/lib/tenant-context";
import { getRoomBySlugPublic } from "@/lib/queries/public";

export default async function ChambreDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tenant = await requireTenant();
  const room = await getRoomBySlugPublic(tenant.id, slug);

  if (!room) {
    notFound();
  }

  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto px-6 py-16">
        {/* Breadcrumb */}
        <nav className="text-sm text-warm-500 mb-8 animate-fade-in">
          <Link href="/" className="hover:text-warm-900 transition-colors">Accueil</Link>
          <span className="mx-2 text-warm-300">/</span>
          <Link href="/chambres" className="hover:text-warm-900 transition-colors">Chambres</Link>
          <span className="mx-2 text-warm-300">/</span>
          <span className="text-warm-900">{room.name}</span>
        </nav>

        {/* Galerie photos */}
        <div className="mb-10 animate-fade-up">
          <RoomGallery photos={room.photos} alt={room.name} />
        </div>

        {/* Contenu */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-8 animate-fade-up stagger-1">
          <div className="flex-1">
            <h1 className="font-heading text-4xl font-semibold text-warm-900 mb-3">{room.name}</h1>
            <div className="flex items-center gap-4 text-sm text-warm-500 mb-6">
              <span>{room.capacity} personne{room.capacity > 1 ? "s" : ""}</span>
              <span className="text-warm-300">·</span>
              <span className="font-heading text-2xl font-semibold text-warm-900">
                {parseFloat(room.pricePerNight).toFixed(0)} €<span className="text-sm font-sans text-warm-500 font-normal">/nuit</span>
              </span>
            </div>

            {room.description && (
              <p className="text-warm-600 leading-relaxed">{room.description}</p>
            )}
          </div>

          {/* CTA */}
          <div className="sm:w-52 flex-shrink-0">
            <Link
              href={`/reserver/${room.id}`}
              className="block text-center bg-warm-900 text-warm-50 font-medium px-6 py-3 rounded-sm hover:bg-warm-800 transition-colors"
            >
              Réserver cette chambre
            </Link>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
