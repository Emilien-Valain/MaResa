import Link from "next/link";
import RoomPhoto from "@/components/public/RoomPhoto";

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

export default function ClassicRoomListBlock({ rooms }: { rooms: Room[] }) {
  return (
    <section className="max-w-4xl mx-auto px-6 py-10 sm:py-12">
      <div className="mb-7 sm:mb-8 animate-fade-up">
        <div
          className="text-[13px] font-bold tracking-[0.08em] uppercase mb-1.5"
          style={{ color: "var(--color-amber-accent)" }}
        >
          {rooms.length} chambre{rooms.length !== 1 ? "s" : ""} disponible
          {rooms.length !== 1 ? "s" : ""}
        </div>
        <h1
          className="font-heading text-3xl sm:text-[32px] font-semibold text-warm-900"
          style={{ letterSpacing: "-0.01em" }}
        >
          Nos chambres
        </h1>
      </div>

      {rooms.length === 0 ? (
        <div
          className="text-center py-16 text-warm-400 border border-dashed rounded-lg"
          style={{ borderColor: "var(--classic-border)" }}
        >
          Aucune chambre disponible pour le moment.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {rooms.map((room, i) => {
            const showsMin =
              room.minPrice < parseFloat(room.pricePerNight);
            const displayPrice = showsMin
              ? room.minPrice
              : parseFloat(room.pricePerNight);

            return (
              <article
                key={room.id}
                className={`group bg-white border-[1.5px] rounded-2xl overflow-hidden grid grid-cols-1 sm:grid-cols-[220px_1fr] transition-all hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] animate-fade-up stagger-${Math.min(i + 2, 6)}`}
                style={{ borderColor: "var(--classic-border)" }}
              >
                {/* Photo */}
                <div className="relative">
                  <RoomPhoto
                    photos={room.photos}
                    alt={room.name}
                    className="h-44 sm:h-full sm:min-h-[180px]"
                    sizes="(max-width: 640px) 100vw, 220px"
                  />
                </div>

                {/* Info */}
                <div className="p-5 sm:p-6 flex flex-col justify-between gap-4">
                  <div>
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="min-w-0">
                        <h2
                          className="font-heading text-[19px] sm:text-xl font-bold text-warm-900 truncate"
                          style={{ letterSpacing: "-0.01em" }}
                        >
                          {room.name}
                        </h2>
                        <div className="text-xs sm:text-[13px] text-warm-500 mt-0.5">
                          Jusqu&apos;à {room.capacity} personne
                          {room.capacity > 1 ? "s" : ""}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div
                          className="font-heading font-bold leading-none"
                          style={{
                            color: "var(--color-primary)",
                            fontSize: "clamp(20px, 2.4vw, 24px)",
                            letterSpacing: "-0.02em",
                          }}
                        >
                          {showsMin && (
                            <span className="block text-[10px] font-sans font-semibold uppercase tracking-[0.06em] text-warm-500 mb-1">
                              à partir de
                            </span>
                          )}
                          {displayPrice.toFixed(0)} €
                        </div>
                        <div className="text-[11.5px] text-warm-500 mt-1">
                          par nuit
                        </div>
                      </div>
                    </div>
                    {room.description && (
                      <p className="text-[13.5px] text-warm-600 leading-[1.6] line-clamp-2 mb-3">
                        {room.description.length > 160
                          ? room.description.slice(0, 160) + "…"
                          : room.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-end">
                    <Link
                      href={`/chambres/${room.slug}`}
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-[13.5px] font-bold transition-all hover:brightness-110"
                      style={{
                        background: "var(--color-primary)",
                        color: "#fff",
                      }}
                    >
                      Réserver cette chambre
                      <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
