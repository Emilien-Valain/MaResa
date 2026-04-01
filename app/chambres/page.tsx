import Link from "next/link";
import PublicLayout from "@/components/public/PublicLayout";
import { requireTenant } from "@/lib/tenant-context";
import { getRoomsPublic } from "@/lib/queries/public";

export default async function ChambresPage() {
  const tenant = await requireTenant();
  const rooms = await getRoomsPublic(tenant.id);

  return (
    <PublicLayout>
      <div className="max-w-5xl mx-auto px-6 py-16">
        <h1 className="font-heading text-4xl font-semibold text-warm-900 mb-2 animate-fade-up">
          Nos chambres
        </h1>
        <p className="text-warm-500 mb-10 animate-fade-up stagger-1">
          {rooms.length} chambre{rooms.length !== 1 ? "s" : ""} disponible{rooms.length !== 1 ? "s" : ""}
        </p>

        {rooms.length === 0 ? (
          <div className="text-center py-16 text-warm-400">
            Aucune chambre disponible pour le moment.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((room, i) => (
              <div
                key={room.id}
                className={`border border-warm-200 rounded-sm overflow-hidden hover:shadow-md transition-shadow animate-fade-up stagger-${Math.min(i + 2, 6)}`}
              >
                <div className="bg-warm-100 h-44 flex items-center justify-center text-warm-400 text-sm">
                  Photo à venir
                </div>
                <div className="p-5">
                  <h2 className="font-heading text-xl font-semibold text-warm-900 mb-1">{room.name}</h2>
                  <p className="text-sm text-warm-500 mb-3">
                    {room.capacity} personne{room.capacity > 1 ? "s" : ""} ·{" "}
                    <span className="font-medium text-warm-700">
                      {parseFloat(room.pricePerNight).toFixed(0)} €/nuit
                    </span>
                  </p>
                  {room.description && (
                    <p className="text-sm text-warm-600 mb-4 line-clamp-3">
                      {room.description.length > 100
                        ? room.description.slice(0, 100) + "…"
                        : room.description}
                    </p>
                  )}
                  <Link
                    href={`/chambres/${room.slug}`}
                    className="inline-block text-sm font-medium bg-warm-900 text-warm-50 px-4 py-2 rounded-sm hover:bg-warm-800 transition-colors"
                  >
                    Voir la chambre
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
