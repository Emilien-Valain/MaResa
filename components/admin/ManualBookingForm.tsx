"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { formatEuros } from "@/lib/utils";
import {
  createBookingManual,
  quoteManualBooking,
  type ManualBookingState,
} from "@/lib/actions/bookings";
import {
  AdminInput,
  AdminSelect,
  AdminTextarea,
  DateInput,
  Field,
  StatusBanner,
} from "@/components/admin/ui";

type RoomOption = { id: string; name: string; pricePerNight: string };

export default function ManualBookingForm({
  rooms,
  today,
  tomorrow,
  defaultRoomId,
}: {
  rooms: RoomOption[];
  today: string;
  tomorrow: string;
  defaultRoomId?: string;
}) {
  const [state, action, pending] = useActionState<ManualBookingState, FormData>(
    createBookingManual,
    null,
  );
  const v = state?.values ?? {};
  const fe = state?.fieldErrors ?? {};

  // Total en direct : l'hôte voit le prix AVANT d'enregistrer (même calcul que l'enregistrement).
  const formRef = useRef<HTMLFormElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [quote, setQuote] = useState<{ nights: number; total: number } | null>(null);
  const refreshQuote = () => {
    clearTimeout(timer.current);
    // Différé : le sélecteur de date met à jour le champ texte après l'événement.
    timer.current = setTimeout(async () => {
      const f = formRef.current;
      if (!f) return;
      const val = (n: string) => (f.elements.namedItem(n) as HTMLInputElement | null)?.value ?? "";
      setQuote(await quoteManualBooking(val("roomId"), val("checkIn"), val("checkOut")));
    }, 300);
  };
  useEffect(refreshQuote, [state]);
  // Le lien du conflit ouvre le mois de l'arrivée saisie (mois 0-indexé, comme le calendrier).
  const arrival = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(v.checkIn ?? "");
  const calendarHref = arrival
    ? `/admin/calendrier?year=${arrival[3]}&month=${Number(arrival[2]) - 1}`
    : "/admin/calendrier";

  return (
    <form
      // Remonte le formulaire à chaque réponse : les defaultValue (dont le <select>) reprennent la saisie.
      key={JSON.stringify(v)}
      ref={formRef}
      action={action}
      onChange={refreshQuote}
      style={{
        background: "var(--admin-surface)",
        border: "1px solid var(--admin-border)",
        borderRadius: "var(--admin-radius)",
        padding: 24,
      }}
    >
      {state?.error && (
        <div role="alert">
          <StatusBanner variant={state.conflict ? "warning" : "error"}>
            {state.error}
            {state.conflict && (
              <>
                {" "}
                <Link href={calendarHref} className="underline underline-offset-2">
                  Voir le calendrier
                </Link>
              </>
            )}
          </StatusBanner>
        </div>
      )}

      <Field label="Chambre *" error={fe.roomId}>
        <AdminSelect name="roomId" required defaultValue={v.roomId ?? defaultRoomId ?? ""}>
          <option value="">Sélectionner…</option>
          {rooms.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} — {formatEuros(c.pricePerNight)} / nuit
            </option>
          ))}
        </AdminSelect>
      </Field>

      <div className="grid grid-cols-2 gap-3.5">
        <Field label="Arrivée *" error={fe.checkIn}>
          <DateInput name="checkIn" required defaultValue={v.checkIn ?? today} />
        </Field>
        <Field label="Départ *" error={fe.checkOut}>
          <DateInput name="checkOut" required defaultValue={v.checkOut ?? tomorrow} />
        </Field>
      </div>

      <div
        aria-live="polite"
        className="mb-3.5 px-3.5 py-2.5 rounded-lg text-[13px] flex flex-wrap items-baseline justify-between gap-x-3"
        style={{ background: "var(--admin-surface-2)", color: "var(--admin-text-muted)" }}
      >
        {quote ? (
          <>
            <span>
              {quote.nights} nuit{quote.nights > 1 ? "s" : ""}, tarifs et règles appliqués
            </span>
            <span className="tabular-nums">
              Total calculé{" "}
              <strong className="text-[15px]" style={{ color: "var(--admin-text)" }}>
                {formatEuros(quote.total)}
              </strong>
            </span>
          </>
        ) : (
          <span>Choisissez une chambre et des dates pour voir le prix.</span>
        )}
      </div>

      <Field
        label="Prix convenu"
        hint="Optionnel : un total négocié avec le client remplace le prix calculé."
        error={fe.agreedPrice}
      >
        <AdminInput
          name="agreedPrice"
          type="text"
          inputMode="decimal"
          placeholder={quote ? String(quote.total) : "ex : 250"}
          defaultValue={v.agreedPrice}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3.5">
        <Field label="Nom client *" error={fe.guestName}>
          <AdminInput name="guestName" type="text" required defaultValue={v.guestName} />
        </Field>
        <Field label="Voyageurs *" error={fe.guestCount}>
          <AdminInput
            name="guestCount"
            type="number"
            min="1"
            required
            defaultValue={v.guestCount ?? 1}
          />
        </Field>
      </div>

      <Field label="Email client *" error={fe.guestEmail}>
        <AdminInput name="guestEmail" type="email" required defaultValue={v.guestEmail} />
      </Field>

      <Field label="Téléphone" error={fe.guestPhone}>
        <AdminInput name="guestPhone" type="tel" defaultValue={v.guestPhone} />
      </Field>

      <Field label="Notes internes">
        <AdminTextarea name="notes" rows={2} defaultValue={v.notes} />
      </Field>

      {/* « Forcer » n'apparaît qu'après un vrai conflit : c'est un override, pas un réglage. */}
      {state?.conflict && (
        <label
          className="flex items-start gap-2.5 pt-1 pb-1 cursor-pointer"
          style={{ color: "var(--admin-text)" }}
        >
          <input
            type="checkbox"
            name="force"
            className="mt-0.5"
            style={{ accentColor: "var(--admin-primary)" }}
          />
          <span className="text-[13px] leading-snug">
            Enregistrer quand même
            <span className="block text-[12px]" style={{ color: "var(--admin-text-muted)" }}>
              Uniquement pour reporter une réservation déjà prise ailleurs (téléphone, Airbnb…).
              Les deux séjours apparaîtront en même temps dans le calendrier.
            </span>
          </span>
        </label>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="admin-btn"
          style={{ background: "var(--admin-primary)", color: "#fff", border: "none" }}
        >
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
        <Link
          href="/admin/reservations"
          className="admin-btn"
          style={{ color: "var(--admin-text-muted)", background: "none", border: "none" }}
        >
          Retour
        </Link>
      </div>
    </form>
  );
}
