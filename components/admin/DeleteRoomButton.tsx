"use client";

import { deleteRoom } from "@/lib/actions/rooms";
import { ConfirmButton } from "@/components/admin/ConfirmButton";

export default function DeleteRoomButton({ id, name }: { id: string; name: string }) {
  return (
    <ConfirmButton
      title={`Supprimer la chambre « ${name} » ?`}
      message="Elle disparaîtra du site et de l'administration. Une chambre qui a déjà des réservations ne peut pas être supprimée : désactivez-la plutôt depuis « Modifier »."
      confirmLabel="Supprimer la chambre"
      onConfirm={() => deleteRoom(id)}
      className="text-xs text-red-700 hover:text-red-800 transition-colors min-h-11 md:min-h-0 px-2 -mr-2"
    >
      Supprimer
    </ConfirmButton>
  );
}
