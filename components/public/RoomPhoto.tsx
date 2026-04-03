import Image from "next/image";

type Photo = {
  id: string;
  url: string;
  position: number;
};

/**
 * Affiche la photo principale d'une chambre, ou un placeholder.
 */
export default function RoomPhoto({
  photos,
  alt,
  className = "",
  sizes = "(max-width: 640px) 100vw, 400px",
}: {
  photos: unknown;
  alt: string;
  className?: string;
  sizes?: string;
}) {
  const photoList = Array.isArray(photos) ? (photos as Photo[]) : [];
  const sorted = [...photoList].sort((a, b) => a.position - b.position);
  const main = sorted[0];

  if (!main) {
    return (
      <div
        className={`bg-warm-100 flex items-center justify-center text-warm-400 text-sm ${className}`}
      >
        Photo à venir
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <Image
        src={main.url}
        alt={alt}
        fill
        className="object-cover"
        sizes={sizes}
      />
    </div>
  );
}
