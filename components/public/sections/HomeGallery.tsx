import type { TenantConfig } from "@/lib/tenant-context";
import ClassicHomeGallery from "@/components/public/templates/classic/HomeGallery";

export default function HomeGallery({ config }: { config: TenantConfig }) {
  const photos = config.galleryPhotos ?? [];
  if (photos.length === 0) return null;

  // Pour l'instant la galerie n'est exposée que sur le template Classic.
  if (config.template === "boutique") return null;

  return <ClassicHomeGallery photos={photos} />;
}
