import Link from "next/link";
import PublicLayout from "@/components/public/PublicLayout";
import HomeSearch from "@/components/public/HomeSearch";
import RoomPhoto from "@/components/public/RoomPhoto";
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
      {/* Hero + moteur de recherche */}
      <section className="bg-warm-900 text-warm-50 px-6 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="font-heading text-5xl sm:text-6xl font-semibold mb-4 leading-tight animate-fade-up">
            {heroTitle}
          </h1>
          <p className="text-lg text-warm-300 mb-12 animate-fade-up stagger-1">
            Choisissez vos dates et trouvez votre chambre.
          </p>
          <div className="animate-fade-up stagger-2">
            <HomeSearch tenantId={tenant.id} />
          </div>
        </div>
      </section>

      {/* Chambres en vedette */}
      {featuredRooms.length > 0 && (
        <section className="px-6 py-20 max-w-5xl mx-auto">
          <h2 className="font-heading text-3xl font-semibold text-warm-900 mb-10 animate-fade-up">
            Nos chambres
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredRooms.map((room, i) => (
              <div
                key={room.id}
                className={`border border-warm-200 rounded-sm overflow-hidden hover:shadow-md transition-shadow animate-fade-up stagger-${i + 2}`}
              >
                <RoomPhoto
                  photos={room.photos}
                  alt={room.name}
                  className="h-44"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
                <div className="p-5">
                  <h3 className="font-heading text-xl font-semibold text-warm-900 mb-1">{room.name}</h3>
                  <p className="text-sm text-warm-500 mb-2">
                    {room.capacity} personne{room.capacity > 1 ? "s" : ""} ·{" "}
                    {parseFloat(room.pricePerNight).toFixed(0)} €/nuit
                  </p>
                  <Link
                    href={`/chambres/${room.slug}`}
                    className="inline-block mt-2 text-sm font-medium text-warm-900 underline underline-offset-4 decoration-warm-300 hover:decoration-amber-accent transition-colors"
                  >
                    Voir la chambre
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {allRooms.length > 3 && (
            <div className="text-center mt-10">
              <Link
                href="/chambres"
                className="inline-block border border-warm-900 text-warm-900 font-medium px-6 py-2.5 rounded-sm hover:bg-warm-900 hover:text-warm-50 transition-colors text-sm"
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
