import Link from "next/link";
import type { Tenant, TenantConfig } from "@/lib/tenant-context";

type Props = {
  isPaid: boolean;
  guestName: string;
  guestEmail: string;
  roomName: string | null;
  checkIn: Date;
  checkOut: Date;
  nights: number;
  totalPrice: string;
  reference: string;
  tenant: Tenant;
  config: TenantConfig;
};

const formatDate = (d: Date) =>
  d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

export default function BoutiqueConfirmationBlock({
  isPaid,
  guestName,
  guestEmail,
  roomName,
  checkIn,
  checkOut,
  nights,
  totalPrice,
  reference,
  tenant,
  config,
}: Props) {
  return (
    <>
      <section
        className="px-6 py-20 text-center"
        style={{ background: "var(--color-primary)", color: "#fff" }}
      >
        <div className="max-w-xl mx-auto">
          <div
            className="w-14 h-14 mx-auto mb-7 rounded-full flex items-center justify-center"
            style={{ border: "1.5px solid var(--color-secondary)" }}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: "var(--color-secondary)" }}
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div
            className="text-[11px] font-medium tracking-[0.2em] uppercase mb-4"
            style={{ color: "var(--color-secondary)" }}
          >
            {isPaid ? "Réservation confirmée" : "Paiement en cours"}
          </div>
          <h1
            className="font-heading font-semibold leading-[1.1] mb-4"
            style={{ fontSize: "clamp(34px, 5vw, 46px)", letterSpacing: "-0.01em" }}
          >
            À très bientôt, <em className="italic font-normal">{guestName}.</em>
          </h1>
          <p
            className="text-[15px] font-light leading-[1.7]"
            style={{ color: "rgba(255,255,255,0.55)" }}
          >
            Un e-mail de confirmation a été envoyé à{" "}
            <span style={{ color: "rgba(255,255,255,0.85)" }}>{guestEmail}</span>.
          </p>
        </div>
      </section>

      <section
        className="max-w-2xl mx-auto px-6 py-12"
        style={{ color: "var(--color-primary)" }}
      >
        <div
          className="border overflow-hidden mb-6"
          style={{ borderColor: "color-mix(in oklch, var(--color-primary) 15%, transparent)" }}
        >
          <div
            className="flex justify-between items-center px-6 py-5 border-b"
            style={{
              background: "color-mix(in oklch, var(--color-secondary) 100%, transparent)",
              borderColor: "color-mix(in oklch, var(--color-primary) 12%, transparent)",
            }}
          >
            <div>
              <div
                className="text-[10px] tracking-[0.15em] uppercase mb-1"
                style={{ color: "color-mix(in oklch, var(--color-primary) 50%, transparent)" }}
              >
                Référence
              </div>
              <div className="font-mono text-lg font-bold tracking-[0.05em]">{reference}</div>
            </div>
            <div
              className="text-xs font-semibold px-3 py-1.5"
              style={{
                background: "#F0FDF4",
                border: "1px solid #86EFAC",
                color: "#166534",
              }}
            >
              Confirmée
            </div>
          </div>
          <div className="px-6 py-6 bg-white">
            {[
              ["Chambre", roomName ?? "—"],
              ["Arrivée", formatDate(checkIn)],
              ["Départ", formatDate(checkOut)],
              ["Durée", `${nights} nuit${nights > 1 ? "s" : ""}`],
              ["Total", `${parseFloat(totalPrice).toFixed(2)} €`],
            ].map(([k, v]) => (
              <div
                key={k}
                className="flex justify-between text-sm py-2.5 border-b last:border-b-0"
                style={{
                  borderColor: "color-mix(in oklch, var(--color-primary) 12%, transparent)",
                }}
              >
                <dt style={{ color: "color-mix(in oklch, var(--color-primary) 60%, transparent)" }}>
                  {k}
                </dt>
                <dd className="font-semibold">{v}</dd>
              </div>
            ))}
          </div>
        </div>

        <div
          className="text-center p-7 border bg-white"
          style={{ borderColor: "color-mix(in oklch, var(--color-primary) 15%, transparent)" }}
        >
          <div className="font-heading text-xl font-semibold mb-2">{tenant.name}</div>
          {config.address && (
            <div
              className="text-sm leading-relaxed"
              style={{ color: "color-mix(in oklch, var(--color-primary) 60%, transparent)" }}
            >
              {config.address}
            </div>
          )}
          <div
            className="text-sm mt-1"
            style={{ color: "color-mix(in oklch, var(--color-primary) 60%, transparent)" }}
          >
            {[config.phone, config.email].filter(Boolean).join(" · ")}
          </div>
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/"
            className="inline-block py-3 px-8 text-[12px] font-semibold tracking-[0.12em] uppercase"
            style={{ background: "var(--color-primary)", color: "#fff" }}
          >
            Retour à l&apos;accueil
          </Link>
        </div>
      </section>
    </>
  );
}
