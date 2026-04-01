import { createRoom } from "@/lib/actions/rooms";
import RoomForm from "@/components/admin/RoomForm";

export default function NewChambrePage() {
  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="font-heading text-3xl font-semibold text-warm-900">Nouvelle chambre</h1>
      <RoomForm action={createRoom} />
    </div>
  );
}
