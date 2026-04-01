import Link from "next/link";
import PublicLayout from "@/components/public/PublicLayout";
import { requireTenant } from "@/lib/tenant-context";
import { getRoomsPublic } from "@/lib/queries/public";
import type { TenantConfig } from "@/lib/tenant-context";

export default async function HomePage() {
  const tenant = await requireTenant();
  const config = (tenant.config ?? {}) as TenantConfig;

  const allRooms = await getRoomsPublic(tenant.id);
  const featuredRooms = allRooms.slice(0, 3);

  const heroTitle = config.heroTitle ?? tenant.name;

  return (
    <PublicLayout>
      {/* Hero */}
      <section className="bg-gray-900 text-white px-6 py-24 text-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4 leading-tight">{heroTitle}</h1>
          <p className="text-lg text-gray-300 mb-8">
            Réservez votre séjour directement en ligne, simplement et rapidement.
          </p>
          <Link
            href="/chambres"
            className="inline-block bg-white text-gray-900 font-semibold px-8 py-3 rounded-full hover:bg-gray-100 transition-colors"
          >
            Voir les chambres
          </Link>
        </div>
      </section>

      {/* Chambres en vedette */}
      {featuredRooms.length > 0 && (
        <section className="px-6 py-16 max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Nos chambres</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredRooms.map((room) => (
              <div
                key={room.id}
                className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="bg-gray-100 h-40 flex items-center justify-center text-gray-400 text-sm">
                  Photo à venir
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-1">{room.name}</h3>
                  <p className="text-sm text-gray-500 mb-2">
                    {room.capacity} personne{room.capacity > 1 ? "s" : ""} ·{" "}
                    {parseFloat(room.pricePerNight).toFixed(0)} €/nuit
                  </p>
                  <Link
                    href={`/chambres/${room.slug}`}
                    className="inline-block mt-2 text-sm font-medium text-gray-900 underline hover:text-gray-600"
                  >
                    Réserver
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {allRooms.length > 3 && (
            <div className="text-center mt-8">
              <Link
                href="/chambres"
                className="inline-block border border-gray-900 text-gray-900 font-semibold px-6 py-2 rounded-full hover:bg-gray-900 hover:text-white transition-colors"
              >
                Voir toutes les chambres
              </Link>
            </div>
          )}
        </section>
      )}
    </PublicLayout>
  );
}
