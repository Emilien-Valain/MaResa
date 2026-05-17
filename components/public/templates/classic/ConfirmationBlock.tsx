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
    <section className="max-w-2xl mx-auto px-6 py-20 text-center">
      <div className="w-16 h-16 bg-green-50 border border-green-200 rounded-full flex items-center justify-center mx-auto mb-6 animate-fade-up">
        <svg
          className="w-8 h-8 text-green-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>

      <h1 className="font-heading text-4xl font-semibold text-warm-900 mb-3 animate-fade-up stagger-1">
        {isPaid ? `Merci, ${guestName} !` : "Paiement en cours de traitement"}
      </h1>
      <p className="text-warm-500 mb-10 animate-fade-up stagger-2">
        {isPaid
          ? "Votre réservation est confirmée. Vous recevrez un email sous peu."
          : "Votre paiement est en cours de vérification."}
      </p>

      <div className="border border-warm-200 rounded-sm overflow-hidden bg-white shadow-sm text-left mb-8 animate-fade-up stagger-3">
        <div
          className="flex justify-between items-center px-5 py-4"
          style={{
            background: "var(--color-primary)",
            color: "var(--color-secondary)",
          }}
        >
          <div>
            <div className="text-[11px] opacity-60 uppercase tracking-[0.08em] mb-0.5">
              Référence
            </div>
            <div className="font-mono text-lg font-bold">{reference}</div>
          </div>
          <div className="bg-green-100 text-green-700 rounded-sm px-3 py-1 text-xs font-bold">
            Confirmée
          </div>
        </div>
        <div className="px-5 py-5">
          {[
            ["Email", guestEmail],
            ["Chambre", roomName ?? "—"],
            ["Arrivée", formatDate(checkIn)],
            ["Départ", formatDate(checkOut)],
            ["Durée", `${nights} nuit${nights > 1 ? "s" : ""}`],
            ["Total", `${parseFloat(totalPrice).toFixed(2)} €`],
          ].map(([k, v]) => (
            <div
              key={k}
              className="flex justify-between text-sm py-2.5 border-b border-warm-100 last:border-b-0"
            >
              <dt className="text-warm-500">{k}</dt>
              <dd className="font-medium text-warm-900">{v}</dd>
            </div>
          ))}
        </div>
      </div>

      <Link
        href="/"
        className="inline-block bg-warm-900 text-warm-50 font-medium px-8 py-3 rounded-sm hover:bg-warm-800 transition-colors animate-fade-up stagger-4"
      >
        Retour à l&apos;accueil
      </Link>
    </section>
  );
}
