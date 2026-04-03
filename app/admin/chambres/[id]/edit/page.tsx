import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { getRoomByIdAndTenant } from "@/lib/queries/rooms";
import { updateRoom } from "@/lib/actions/rooms";
import RoomForm from "@/components/admin/RoomForm";
import RoomPhotosUploader from "@/components/admin/RoomPhotosUploader";
import type { RoomPhoto } from "@/app/api/admin/rooms/[id]/photos/route";

export default async function EditChambrePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { tenantId } = await requireSession();
  const chambre = await getRoomByIdAndTenant(id, tenantId);
  if (!chambre) notFound();

  const photos = (chambre.photos ?? []) as RoomPhoto[];

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="font-heading text-3xl font-semibold text-warm-950">
        Modifier — {chambre.name}
      </h1>
      <RoomForm action={updateRoom.bind(null, id)} defaultValues={chambre} />

      <div className="bg-white p-6 rounded-sm border border-warm-300 shadow-sm">
        <RoomPhotosUploader roomId={id} initialPhotos={photos} />
      </div>
    </div>
  );
}
