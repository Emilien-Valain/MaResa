import BookingForm from "@/components/public/BookingForm";
import type { Tenant, TenantConfig } from "@/lib/tenant-context";

type Room = {
  id: string;
  name: string;
  slug: string;
  pricePerNight: string;
  capacity: number;
};

export default function BoutiqueBookingFormBlock({
  room,
  tenant,
  config,
  minPrice,
}: {
  room: Room;
  tenant: Tenant;
  config: TenantConfig;
  minPrice: number;
}) {
  const fmt = (n: number) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <>
      <section
        className="px-6 pt-12 pb-9"
        style={{ background: "var(--color-primary)", color: "#fff" }}
      >
        <div className="max-w-5xl mx-auto">
          <div
            className="text-[11px] font-medium tracking-[0.18em] uppercase mb-2"
            style={{ color: "var(--color-secondary)" }}
          >
            {room.name}
          </div>
          <h1
            className="font-heading font-semibold"
            style={{ fontSize: "clamp(32px, 5vw, 42px)", letterSpacing: "-0.01em" }}
          >
            Vos coordonnées
          </h1>
        </div>
      </section>

      <section
        className="max-w-5xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-12"
        style={{ color: "var(--color-primary)" }}
      >
        <div>
          <BookingForm
            room={{
              id: room.id,
              name: room.name,
              pricePerNight: room.pricePerNight,
              capacity: room.capacity,
            }}
            tenantId={tenant.id}
            template="boutique"
          />
        </div>

        <aside className="space-y-4 self-start lg:sticky lg:top-24">
          <div
            className="p-7"
            style={{ background: "var(--color-primary)", color: "#fff" }}
          >
            <div
              className="text-[11px] tracking-[0.15em] uppercase mb-3"
              style={{ color: "rgba(255,255,255,0.45)" }}
            >
              Récapitulatif
            </div>
            <div className="font-heading text-[22px] font-semibold mb-1">{room.name}</div>
            <div className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
              {room.capacity} personne{room.capacity > 1 ? "s" : ""} max.
            </div>
            <div
              className="mt-6 pt-6 border-t flex justify-between items-baseline"
              style={{ borderColor: "rgba(255,255,255,0.1)" }}
            >
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
                À partir de
              </span>
              <span
                className="font-heading text-[28px] font-bold"
                style={{ color: "var(--color-secondary)" }}
              >
                {fmt(
                  minPrice < parseFloat(room.pricePerNight)
                    ? minPrice
                    : parseFloat(room.pricePerNight),
                )}
                <span className="text-xs font-sans font-normal opacity-70"> / nuit</span>
              </span>
            </div>
          </div>

          {(config.phone || config.email) && (
            <div
              className="p-6 bg-white border"
              style={{ borderColor: "color-mix(in oklch, var(--color-primary) 15%, transparent)" }}
            >
              <div
                className="text-[11px] font-semibold tracking-[0.12em] uppercase mb-3"
                style={{ color: "color-mix(in oklch, var(--color-primary) 50%, transparent)" }}
              >
                Besoin d&apos;aide ?
              </div>
              {config.phone && (
                <a
                  href={`tel:${config.phone}`}
                  className="block text-[14px] font-medium mb-1"
                  style={{ color: "var(--color-primary)" }}
                >
                  {config.phone}
                </a>
              )}
              {config.email && (
                <a
                  href={`mailto:${config.email}`}
                  className="block text-[13px]"
                  style={{ color: "color-mix(in oklch, var(--color-primary) 65%, transparent)" }}
                >
                  {config.email}
                </a>
              )}
            </div>
          )}
        </aside>
      </section>
    </>
  );
}
