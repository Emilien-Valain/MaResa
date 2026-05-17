import type { TenantConfig } from "@/lib/tenant-context";
import ClassicRoomListBlock from "@/components/public/templates/classic/RoomListBlock";
import BoutiqueRoomListBlock from "@/components/public/templates/boutique/RoomListBlock";

type Room = {
  id: string;
  name: string;
  slug: string;
  pricePerNight: string;
  capacity: number;
  description: string | null;
  photos: unknown;
  minPrice: number;
};

export default function RoomListSection({
  rooms,
  config,
}: {
  rooms: Room[];
  config: TenantConfig;
}) {
  if (config.template === "boutique") {
    return <BoutiqueRoomListBlock rooms={rooms} />;
  }
  return <ClassicRoomListBlock rooms={rooms} />;
}
