import Link from "next/link";
import BookingForm from "@/components/public/BookingForm";

type Room = {
  id: string;
  name: string;
  slug: string;
  pricePerNight: string;
  capacity: number;
  photos?: unknown;
};

/**
 * Bloc « Réserver » du template Classic.
 *
 * Le 2-col (form + sidebar réactive) est désormais géré par `BookingForm` :
 * ici on rend juste le fil d'Ariane, le titre, puis le composant client.
 */
export default function ClassicBookingFormBlock({
  room,
  tenantId,
}: {
  room: Room;
  tenantId: string;
  /** Préservé pour compatibilité avec la signature du dispatcher ; non utilisé
   * dans cette version (le sidebar lit le minPrice via room.pricePerNight et
   * /api/pricing). */
  minPrice?: number;
}) {
  return (
    <section className="max-w-4xl mx-auto px-6 py-10 sm:py-12">
      <nav className="text-[13px] text-warm-500 mb-6 animate-fade-in">
        <Link href="/" className="hover:text-warm-900 transition-colors">
          Accueil
        </Link>
        <span className="mx-2 text-warm-300">/</span>
        <Link href="/chambres" className="hover:text-warm-900 transition-colors">
          Chambres
        </Link>
        <span className="mx-2 text-warm-300">/</span>
        <Link
          href={`/chambres/${room.slug}`}
          className="hover:text-warm-900 transition-colors"
        >
          {room.name}
        </Link>
        <span className="mx-2 text-warm-300">/</span>
        <span className="text-warm-900">Réserver</span>
      </nav>

      <div className="mb-7 sm:mb-8 animate-fade-up">
        <div
          className="text-[13px] font-bold tracking-[0.08em] uppercase mb-1.5"
          style={{ color: "var(--color-amber-accent)" }}
        >
          {room.name}
        </div>
        <h1
          className="font-heading text-3xl sm:text-[32px] font-semibold text-warm-900"
          style={{ letterSpacing: "-0.01em" }}
        >
          Vos coordonnées
        </h1>
      </div>

      <BookingForm
        room={{
          id: room.id,
          name: room.name,
          pricePerNight: room.pricePerNight,
          capacity: room.capacity,
          photos: room.photos,
        }}
        tenantId={tenantId}
        template="classic"
      />
    </section>
  );
}
