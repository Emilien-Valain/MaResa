import Link from "next/link";
import { notFound } from "next/navigation";
import PublicLayout from "@/components/public/PublicLayout";
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
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-gray-900">Accueil</Link>
          <span className="mx-2">/</span>
          <Link href="/chambres" className="hover:text-gray-900">Chambres</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900">{room.name}</span>
        </nav>

        {/* Photo placeholder */}
        <div className="bg-gray-100 rounded-xl h-64 flex items-center justify-center text-gray-400 mb-8">
          Photo à venir
        </div>

        {/* Contenu */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-3">{room.name}</h1>
            <div className="flex items-center gap-4 text-sm text-gray-500 mb-6">
              <span>{room.capacity} personne{room.capacity > 1 ? "s" : ""}</span>
              <span>·</span>
              <span className="text-lg font-semibold text-gray-900">
                {parseFloat(room.pricePerNight).toFixed(0)} €/nuit
              </span>
            </div>

            {room.description && (
              <div className="prose prose-gray max-w-none">
                <p className="text-gray-600 leading-relaxed">{room.description}</p>
              </div>
            )}
          </div>

          {/* CTA */}
          <div className="sm:w-48 flex-shrink-0">
            <Link
              href={`/reserver/${room.id}`}
              className="block text-center bg-gray-900 text-white font-semibold px-6 py-3 rounded-xl hover:bg-gray-700 transition-colors"
            >
              Réserver cette chambre
            </Link>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
