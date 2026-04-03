import Link from "next/link";
import Image from "next/image";
import { requireSession } from "@/lib/session";
import { getRoomsByTenant } from "@/lib/queries/rooms";
import DeleteRoomButton from "@/components/admin/DeleteRoomButton";

export default async function ChambresPage() {
  const { tenantId } = await requireSession();
  const chambres = await getRoomsByTenant(tenantId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-3xl font-semibold text-warm-950">Chambres</h1>
        <Link
          href="/admin/chambres/new"
          className="bg-warm-900 text-white px-4 py-2 rounded-sm text-sm font-medium hover:bg-warm-800 transition-colors"
        >
          Nouvelle chambre
        </Link>
      </div>

      {chambres.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-sm border border-warm-300 shadow-sm">
          <p className="text-warm-500 text-sm">Aucune chambre pour l&apos;instant.</p>
          <Link
            href="/admin/chambres/new"
            className="text-sm text-warm-900 font-medium underline mt-2 inline-block"
          >
            Créer la première
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-sm border border-warm-300 shadow-sm divide-y divide-warm-200">
          {chambres.map((chambre) => (
            <div key={chambre.id} className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-4">
                {(() => {
                  const photos = Array.isArray(chambre.photos) ? chambre.photos as { url: string }[] : [];
                  const thumb = photos[0];
                  return thumb ? (
                    <div className="relative w-12 h-9 rounded-sm overflow-hidden flex-shrink-0 bg-warm-100">
                      <Image src={thumb.url} alt={chambre.name} fill className="object-cover" sizes="48px" />
                    </div>
                  ) : (
                    <div className="w-12 h-9 rounded-sm bg-warm-100 flex-shrink-0" />
                  );
                })()}
                <div>
                  <p className="text-sm font-semibold text-warm-950">{chambre.name}</p>
                  <p className="text-xs text-warm-500 mt-0.5">
                    {chambre.pricePerNight} €/nuit · {chambre.capacity} pers.
                    {!chambre.active && (
                      <span className="ml-2 text-orange-600 font-medium">Inactif</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href={`/admin/chambres/${chambre.id}/edit`}
                  className="text-xs text-warm-600 hover:text-warm-900 font-medium transition-colors"
                >
                  Modifier
                </Link>
                <DeleteRoomButton id={chambre.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
