"use client";

import { deleteRoom } from "@/lib/actions/rooms";

export default function DeleteRoomButton({ id }: { id: string }) {
  async function handleDelete() {
    if (!confirm("Supprimer cette chambre ?")) return;
    await deleteRoom(id);
  }

  return (
    <button
      onClick={handleDelete}
      className="text-xs text-red-500 hover:text-red-700 transition-colors"
    >
      Supprimer
    </button>
  );
}
