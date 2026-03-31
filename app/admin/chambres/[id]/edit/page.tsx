import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { getRoomByIdAndTenant } from "@/lib/queries/rooms";
import { updateRoom } from "@/lib/actions/rooms";
import RoomForm from "@/components/admin/RoomForm";

export default async function EditChambrePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { tenantId } = await requireSession();
  const chambre = await getRoomByIdAndTenant(id, tenantId);
  if (!chambre) notFound();

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-2xl font-semibold text-gray-900">
        Modifier — {chambre.name}
      </h1>
      <RoomForm action={updateRoom.bind(null, id)} defaultValues={chambre} />
    </div>
  );
}
