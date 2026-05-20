import Link from "next/link";

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
};

const formatDate = (d: Date) =>
  d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const CheckIcon = () => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export default function ClassicConfirmationBlock({
  isPaid,
  guestName,
  guestEmail,
  roomName,
  checkIn,
  checkOut,
  nights,
  totalPrice,
  reference,
}: Props) {
  return (
    <section className="max-w-xl mx-auto px-6 py-12 sm:py-16 text-center">
      <div
        className="w-[72px] h-[72px] rounded-full flex items-center justify-center mx-auto mb-6 animate-fade-up"
        style={{
          background: "#DCFCE7",
          border: "3px solid #16A34A",
          color: "#16A34A",
        }}
      >
        <CheckIcon />
      </div>

      <div
        className="text-[13px] font-bold tracking-[0.08em] uppercase mb-2.5 animate-fade-up stagger-1"
        style={{ color: "var(--color-amber-accent)" }}
      >
        {isPaid ? "Réservation confirmée" : "Paiement en cours"}
      </div>

      <h1
        className="font-heading text-3xl sm:text-[30px] font-bold text-warm-900 mb-3 animate-fade-up stagger-2"
        style={{ letterSpacing: "-0.01em" }}
      >
        {isPaid ? `Merci, ${guestName} !` : "Vérification en cours"}
      </h1>

      <p className="text-[15px] text-warm-500 leading-[1.7] mb-8 animate-fade-up stagger-3">
        {isPaid ? (
          <>
            Votre séjour est confirmé. Un email de confirmation a été envoyé à{" "}
            <strong className="text-warm-900">{guestEmail}</strong>.
          </>
        ) : (
          <>Votre paiement est en cours de vérification, ne rechargez pas la page.</>
        )}
      </p>

      <div
        className="bg-white border-[1.5px] rounded-2xl overflow-hidden text-left mb-7 animate-fade-up stagger-4"
        style={{ borderColor: "var(--classic-border)" }}
      >
        <div
          className="px-5 py-4 flex justify-between items-center"
          style={{ background: "var(--color-primary)", color: "#fff" }}
        >
          <div>
            <div className="text-[11px] opacity-60 uppercase tracking-[0.08em] mb-0.5">
              Référence
            </div>
            <div className="font-mono text-lg font-bold tracking-[-0.01em]">
              {reference}
            </div>
          </div>
          <div
            className="rounded-md px-3 py-1.5 text-xs font-bold"
            style={{ background: "#DCFCE7", color: "#15803D" }}
          >
            {isPaid ? "Confirmée" : "En attente"}
          </div>
        </div>

        <dl className="px-5 py-5">
          {(
            [
              ["Chambre", roomName ?? "—"],
              ["Arrivée", formatDate(checkIn)],
              ["Départ", formatDate(checkOut)],
              ["Durée", `${nights} nuit${nights > 1 ? "s" : ""}`],
              ["Total", `${parseFloat(totalPrice).toFixed(2)} €`],
            ] as Array<[string, string]>
          ).map(([k, v]) => (
            <div
              key={k}
              className="flex justify-between text-[13.5px] py-2.5 border-b last:border-b-0"
              style={{ borderColor: "var(--classic-border)" }}
            >
              <dt className="text-warm-500">{k}</dt>
              <dd className="font-semibold text-warm-900">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <Link
        href="/"
        className="inline-block px-7 py-3 rounded-lg font-bold text-[13.5px] transition-all hover:brightness-110 animate-fade-up stagger-5"
        style={{ background: "var(--color-primary)", color: "#fff" }}
      >
        Retour à l&apos;accueil
      </Link>
    </section>
  );
}
