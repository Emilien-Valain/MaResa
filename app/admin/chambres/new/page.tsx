import { createRoom } from "@/lib/actions/rooms";
import RoomForm from "@/components/admin/RoomForm";

export default function NewChambrePage() {
  return (
    <div className="space-y-6 max-w-xl admin-fade-in">
      <h1
        className="text-[22px] font-extrabold"
        style={{ color: "var(--admin-text)", letterSpacing: "-0.5px" }}
      >
        Nouvelle chambre
      </h1>
      <RoomForm action={createRoom} />
    </div>
  );
}
