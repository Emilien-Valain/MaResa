import Link from "next/link";
import BookingForm from "@/components/public/BookingForm";

type Room = {
  id: string;
  name: string;
  slug: string;
  pricePerNight: string;
  capacity: number;
};

export default function ClassicBookingFormBlock({
  room,
  tenantId,
  minPrice,
}: {
  room: Room;
  tenantId: string;
  minPrice: number;
}) {
  return (
    <section className="max-w-2xl mx-auto px-6 py-16">
      <nav className="text-sm text-warm-500 mb-8 animate-fade-in">
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

      <h1 className="font-heading text-3xl font-semibold text-warm-900 mb-2 animate-fade-up">
        Réserver — {room.name}
      </h1>
      <p className="text-warm-500 mb-8 animate-fade-up stagger-1">
        {room.capacity} personne{room.capacity > 1 ? "s" : ""} max ·{" "}
        {minPrice < parseFloat(room.pricePerNight)
          ? `à partir de ${minPrice.toFixed(0)} €/nuit`
          : `${parseFloat(room.pricePerNight).toFixed(0)} €/nuit`}
      </p>

      <div className="border border-warm-200 rounded-sm p-6 bg-white shadow-sm animate-fade-up stagger-2">
        <BookingForm
          room={{
            id: room.id,
            name: room.name,
            pricePerNight: room.pricePerNight,
            capacity: room.capacity,
          }}
          tenantId={tenantId}
          template="classic"
        />
      </div>
    </section>
  );
}
