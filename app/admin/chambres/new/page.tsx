import { createRoom } from "@/lib/actions/rooms";
import RoomForm from "@/components/admin/RoomForm";

export default function NewChambrePage() {
  return (
    <div className="space-y-6 max-w-xl admin-fade-in">
      <h1
        className="text-[24px] font-extrabold leading-tight"
        style={{ color: "var(--admin-text)", letterSpacing: "-0.6px" }}
      >
        Nouvelle chambre
      </h1>
      <RoomForm action={createRoom} />
    </div>
  );
}
