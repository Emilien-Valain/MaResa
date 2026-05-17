import Link from "next/link";
import PublicLayout from "@/components/public/PublicLayout";
import HomeHero from "@/components/public/sections/HomeHero";
import HomeStory from "@/components/public/sections/HomeStory";
import RoomPhoto from "@/components/public/RoomPhoto";
import LocationMap from "@/components/public/LocationMap";
import { requireTenant } from "@/lib/tenant-context";
import { getRoomsPublic } from "@/lib/queries/public";
import { getMinPricePerNight } from "@/lib/pricing";
import type { TenantConfig } from "@/lib/tenant-context";

export default async function HomePage() {
  const tenant = await requireTenant();
  const config = (tenant.config ?? {}) as TenantConfig;

  const allRooms = await getRoomsPublic(tenant.id);
  const featuredRoomsRaw = allRooms.slice(0, 3);
  const featuredRooms = await Promise.all(
    featuredRoomsRaw.map(async (room) => ({
      ...room,
      minPrice: await getMinPricePerNight(room.id, tenant.id),
    })),
  );

  return (
    <PublicLayout>
      <HomeHero tenant={tenant} config={config} />

      <HomeStory config={config} />

      {featuredRooms.length > 0 && (
        <section className="px-6 py-20 max-w-5xl mx-auto">
          <h2
            className="font-heading text-3xl font-semibold mb-10 animate-fade-up"
            style={{ color: "var(--color-primary)" }}
          >
            Nos chambres
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredRooms.map((room, i) => (
              <div
                key={room.id}
                className={`border rounded-sm overflow-hidden hover:shadow-md transition-shadow animate-fade-up stagger-${i + 2}`}
                style={{
                  borderColor:
                    "color-mix(in oklch, var(--color-primary) 15%, transparent)",
                }}
              >
                <RoomPhoto
                  photos={room.photos}
                  alt={room.name}
                  className="h-44"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
                <div className="p-5">
                  <h3
                    className="font-heading text-xl font-semibold mb-1"
                    style={{ color: "var(--color-primary)" }}
                  >
                    {room.name}
                  </h3>
                  <p className="text-sm text-warm-500 mb-2">
                    {room.capacity} personne{room.capacity > 1 ? "s" : ""} ·{" "}
                    {room.minPrice < parseFloat(room.pricePerNight)
                      ? `à partir de ${room.minPrice.toFixed(0)} €/nuit`
                      : `${parseFloat(room.pricePerNight).toFixed(0)} €/nuit`}
                  </p>
                  <Link
                    href={`/chambres/${room.slug}`}
                    className="inline-block mt-2 text-sm font-medium underline underline-offset-4 hover:decoration-amber-accent transition-colors"
                    style={{ color: "var(--color-primary)" }}
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
                className="inline-block border font-medium px-6 py-2.5 rounded-sm hover:opacity-80 transition-colors text-sm"
                style={{
                  borderColor: "var(--color-primary)",
                  color: "var(--color-primary)",
                }}
              >
                Voir toutes les chambres
              </Link>
            </div>
          )}
        </section>
      )}

      <LocationMap
        config={config}
        primaryColor={config.primaryColor ?? "#1c1917"}
        secondaryColor={config.secondaryColor ?? "#faf8f5"}
      />
    </PublicLayout>
  );
}
