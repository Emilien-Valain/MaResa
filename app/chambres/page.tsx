import Link from "next/link";
import PublicLayout from "@/components/public/PublicLayout";
import { requireTenant } from "@/lib/tenant-context";
import { getRoomsPublic } from "@/lib/queries/public";

export default async function ChambresPage() {
  const tenant = await requireTenant();
  const rooms = await getRoomsPublic(tenant.id);

  return (
    <PublicLayout>
      <div className="max-w-5xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Nos chambres</h1>
        <p className="text-gray-500 mb-8">
          {rooms.length} chambre{rooms.length !== 1 ? "s" : ""} disponible{rooms.length !== 1 ? "s" : ""}
        </p>

        {rooms.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            Aucune chambre disponible pour le moment.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((room) => (
              <div
                key={room.id}
                className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="bg-gray-100 h-44 flex items-center justify-center text-gray-400 text-sm">
                  Photo à venir
                </div>
                <div className="p-5">
                  <h2 className="font-semibold text-gray-900 text-lg mb-1">{room.name}</h2>
                  <p className="text-sm text-gray-500 mb-3">
                    {room.capacity} personne{room.capacity > 1 ? "s" : ""} ·{" "}
                    <span className="font-medium text-gray-700">
                      {parseFloat(room.pricePerNight).toFixed(0)} €/nuit
                    </span>
                  </p>
                  {room.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                      {room.description.length > 100
                        ? room.description.slice(0, 100) + "…"
                        : room.description}
                    </p>
                  )}
                  <Link
                    href={`/chambres/${room.slug}`}
                    className="inline-block text-sm font-medium bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
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
