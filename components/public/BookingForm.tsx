"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { createBookingPublic } from "@/lib/actions/bookings-public";
import RoomPhoto from "@/components/public/RoomPhoto";
import type { TemplateName } from "@/lib/tenant-context";

type Room = {
  id: string;
  name: string;
  pricePerNight: string;
  capacity: number;
  /** Optional — utilisé uniquement par le sidebar du template Classic. */
  photos?: unknown;
};

type AvailabilityStatus = "idle" | "checking" | "available" | "unavailable";

interface RuleViolation {
  rule: string;
  message: string;
}

interface NightPrice {
  date: string;
  price: number;
  basePrice: number;
  appliedRule: string | null;
}

interface EffectiveRules {
  minStay: number | null;
  maxStay: number | null;
  allowedCheckInDays: number[] | null;
  allowedCheckOutDays: number[] | null;
}

const DAY_NAMES_FR = [
  "dimanche",
  "lundi",
  "mardi",
  "mercredi",
  "jeudi",
  "vendredi",
  "samedi",
];

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

function getTomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

function addDay(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().split("T")[0];
}

const fmtCurrency = (n: number): string =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);

const fmtDateShort = (s: string): string =>
  new Date(s + "T12:00:00").toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
  });

export default function BookingForm({
  room,
  tenantId,
  template = "classic",
}: {
  room: Room;
  tenantId: string;
  template?: TemplateName;
}) {
  const today = getToday();
  const tomorrow = getTomorrow();
  const searchParams = useSearchParams();
  const wasCancelled = searchParams.get("cancelled") === "true";

  const [checkIn, setCheckIn] = useState(searchParams.get("checkIn") ?? today);
  const [checkOut, setCheckOut] = useState(searchParams.get("checkOut") ?? tomorrow);
  const [guestCount, setGuestCount] = useState(1);
  const [availability, setAvailability] = useState<AvailabilityStatus>("idle");
  const [nights, setNights] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);
  const [nightPrices, setNightPrices] = useState<NightPrice[]>([]);
  const [violations, setViolations] = useState<RuleViolation[]>([]);
  const [rules, setRules] = useState<EffectiveRules | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const params = new URLSearchParams({ roomId: room.id, tenantId });
    fetch(`/api/rules?${params}`, { cache: "no-store" })
      .then((r) => r.json())
      .then(setRules)
      .catch(() => {});
  }, [room.id, tenantId]);

  useEffect(() => {
    if (!checkIn || !checkOut) {
      setAvailability("idle");
      return;
    }

    const checkInDate = new Date(checkIn + "T00:00:00Z");
    const checkOutDate = new Date(checkOut + "T00:00:00Z");
    if (checkOutDate <= checkInDate) {
      setAvailability("idle");
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setAvailability("checking");
      try {
        const params = new URLSearchParams({
          roomId: room.id,
          from: checkIn,
          to: checkOut,
          tenantId,
        });
        const res = await fetch(`/api/availability?${params}`, { cache: "no-store" });
        if (!res.ok) {
          setAvailability("idle");
          return;
        }
        const data = await res.json();
        setViolations(data.violations ?? []);

        if (data.available) {
          const pricingParams = new URLSearchParams({
            roomId: room.id,
            from: checkIn,
            to: checkOut,
            tenantId,
          });
          const pricingRes = await fetch(`/api/pricing?${pricingParams}`, {
            cache: "no-store",
          });
          if (pricingRes.ok) {
            const pricing = await pricingRes.json();
            setNights(pricing.nights.length);
            setTotalPrice(pricing.totalPrice);
            setNightPrices(pricing.nights);
          } else {
            const n = Math.round(
              (checkOutDate.getTime() - checkInDate.getTime()) /
                (1000 * 60 * 60 * 24),
            );
            setNights(n);
            setTotalPrice(n * parseFloat(room.pricePerNight));
            setNightPrices([]);
          }
          setAvailability("available");
        } else {
          setAvailability("unavailable");
        }
      } catch {
        setAvailability("idle");
      }
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [checkIn, checkOut, room.id, room.pricePerNight, tenantId]);

  const handleCheckInChange = (val: string) => {
    setCheckIn(val);
    if (val >= checkOut) {
      setCheckOut(addDay(val));
    }
  };

  // ── Styling helpers per template ─────────────────────────────────────────
  const isBoutique = template === "boutique";
  const isClassic = !isBoutique;

  const inputClass = isBoutique
    ? "w-full bg-transparent border-0 border-b py-3 text-[15px] text-[color:var(--color-primary)] outline-none transition-colors font-light focus:border-[color:var(--color-primary)]"
    : "w-full border border-warm-200 rounded-sm px-3 py-2.5 text-sm text-warm-900 bg-warm-50/50 focus:outline-none focus:ring-2 focus:ring-amber-accent/40 focus:border-amber-accent transition-colors";

  const inputBorderStyle = isBoutique
    ? { borderBottomColor: "color-mix(in oklch, var(--color-primary) 20%, transparent)" }
    : undefined;

  const labelClass = isBoutique
    ? "block text-[10px] font-semibold tracking-[0.14em] uppercase mb-1"
    : "block text-sm font-medium text-warm-700 mb-1.5";

  const labelStyle = isBoutique
    ? { color: "color-mix(in oklch, var(--color-primary) 55%, transparent)" }
    : undefined;

  // ── Form pieces (réutilisés dans les deux layouts) ───────────────────────

  const cancelledWarning = wasCancelled ? (
    <div className="bg-amber-50 border border-amber-200 rounded-sm p-4 text-sm text-amber-800">
      Le paiement a été annulé. Vous pouvez réessayer ci-dessous.
    </div>
  ) : null;

  const dateRow = (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label htmlFor="checkIn" className={labelClass} style={labelStyle}>
          Date d&apos;arrivée
        </label>
        <input
          id="checkIn"
          type="date"
          name="checkIn"
          required
          min={today}
          value={checkIn}
          onChange={(e) => handleCheckInChange(e.target.value)}
          className={inputClass}
          style={inputBorderStyle}
        />
      </div>
      <div>
        <label htmlFor="checkOut" className={labelClass} style={labelStyle}>
          Date de départ
        </label>
        <input
          id="checkOut"
          type="date"
          name="checkOut"
          required
          min={checkIn ? addDay(checkIn) : tomorrow}
          value={checkOut}
          onChange={(e) => setCheckOut(e.target.value)}
          className={inputClass}
          style={inputBorderStyle}
        />
      </div>
    </div>
  );

  const rulesInfo =
    rules &&
    (rules.minStay || rules.allowedCheckInDays || rules.allowedCheckOutDays) ? (
      <div
        className="text-xs space-x-3"
        style={{
          color: isBoutique
            ? "color-mix(in oklch, var(--color-primary) 50%, transparent)"
            : undefined,
        }}
      >
        {rules.minStay && (
          <span>
            Min. {rules.minStay} nuit{rules.minStay > 1 ? "s" : ""}
          </span>
        )}
        {rules.maxStay && (
          <span>
            Max. {rules.maxStay} nuit{rules.maxStay > 1 ? "s" : ""}
          </span>
        )}
        {rules.allowedCheckInDays && (
          <span>
            Arrivée :{" "}
            {rules.allowedCheckInDays.map((d) => DAY_NAMES_FR[d]).join(", ")}
          </span>
        )}
        {rules.allowedCheckOutDays && (
          <span>
            Départ :{" "}
            {rules.allowedCheckOutDays.map((d) => DAY_NAMES_FR[d]).join(", ")}
          </span>
        )}
      </div>
    ) : null;

  const availabilityIndicator = (
    <div className="min-h-[28px] space-y-2">
      {availability === "checking" && (
        <span className="inline-flex items-center gap-1.5 text-sm text-warm-500">
          <span className="inline-block w-3 h-3 border-2 border-warm-400 border-t-transparent rounded-full animate-spin" />
          Vérification de la disponibilité…
        </span>
      )}
      {availability === "available" && violations.length === 0 && (
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-sm px-3 py-1">
          <span className="w-2 h-2 bg-green-500 rounded-full" />
          Disponible
        </span>
      )}
      {availability === "unavailable" && violations.length === 0 && (
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-sm px-3 py-1">
          <span className="w-2 h-2 bg-red-500 rounded-full" />
          Non disponible pour ces dates
        </span>
      )}
      {violations.length > 0 && (
        <div className="space-y-1">
          {violations.map((v, i) => (
            <span
              key={i}
              className="block text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-sm px-3 py-1"
            >
              {v.message}
            </span>
          ))}
        </div>
      )}
    </div>
  );

  const guestCountInput = (
    <div>
      <label htmlFor="guestCount" className={labelClass} style={labelStyle}>
        Nombre de personnes
      </label>
      <input
        id="guestCount"
        type="number"
        name="guestCount"
        required
        min={1}
        max={room.capacity}
        value={guestCount}
        onChange={(e) => {
          const v = parseInt(e.target.value, 10);
          if (Number.isNaN(v)) {
            setGuestCount(1);
          } else {
            setGuestCount(Math.min(Math.max(1, v), room.capacity));
          }
        }}
        className={inputClass}
        style={inputBorderStyle}
      />
      <p
        className="text-xs mt-1"
        style={{
          color: isBoutique
            ? "color-mix(in oklch, var(--color-primary) 50%, transparent)"
            : undefined,
        }}
      >
        Capacité maximale : {room.capacity} personnes
      </p>
    </div>
  );

  const identityRow = (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label htmlFor="guestName" className={labelClass} style={labelStyle}>
          Nom complet <span className="text-red-500">*</span>
        </label>
        <input
          id="guestName"
          type="text"
          name="guestName"
          required
          className={inputClass}
          style={inputBorderStyle}
        />
      </div>
      <div>
        <label htmlFor="guestEmail" className={labelClass} style={labelStyle}>
          Email <span className="text-red-500">*</span>
        </label>
        <input
          id="guestEmail"
          type="email"
          name="guestEmail"
          required
          className={inputClass}
          style={inputBorderStyle}
        />
      </div>
    </div>
  );

  const phoneInput = (
    <div>
      <label htmlFor="guestPhone" className={labelClass} style={labelStyle}>
        Téléphone
      </label>
      <input
        id="guestPhone"
        type="tel"
        name="guestPhone"
        className={inputClass}
        style={inputBorderStyle}
      />
    </div>
  );

  const hasValidPricing =
    availability === "available" && violations.length === 0 && totalPrice > 0;

  const inlineBreakdown = hasValidPricing ? (
    <div
      className={
        isBoutique
          ? "p-5 bg-white border space-y-2"
          : "bg-warm-50 border border-warm-200 rounded-sm p-4 space-y-2"
      }
      style={
        isBoutique
          ? { borderColor: "color-mix(in oklch, var(--color-primary) 15%, transparent)" }
          : undefined
      }
    >
      {nightPrices.length > 0 && nightPrices.some((n) => n.appliedRule) ? (
        <>
          <div className="space-y-1">
            {nightPrices.map((np) => (
              <div
                key={np.date}
                className="flex justify-between text-xs"
                style={
                  isBoutique
                    ? { color: "color-mix(in oklch, var(--color-primary) 55%, transparent)" }
                    : { color: "var(--color-warm-500, #78716C)" }
                }
              >
                <span>
                  {new Date(np.date + "T00:00:00Z").toLocaleDateString("fr-FR", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                  {np.appliedRule && (
                    <span className="ml-1 text-amber-600">({np.appliedRule})</span>
                  )}
                </span>
                <span>{np.price.toFixed(2)} €</span>
              </div>
            ))}
          </div>
          <div
            className="pt-2 mt-2 flex justify-between text-sm border-t"
            style={
              isBoutique
                ? { borderColor: "color-mix(in oklch, var(--color-primary) 15%, transparent)" }
                : undefined
            }
          >
            <span>
              {nights} nuit{nights > 1 ? "s" : ""}
            </span>
            <span className="font-semibold">{totalPrice.toFixed(2)} €</span>
          </div>
        </>
      ) : (
        <div className="flex justify-between text-sm">
          <span>
            {parseFloat(room.pricePerNight).toFixed(0)} € × {nights} nuit
            {nights > 1 ? "s" : ""}
          </span>
          <span className="font-semibold">{totalPrice.toFixed(2)} €</span>
        </div>
      )}
    </div>
  ) : null;

  const submitBtn = (
    <button
      type="submit"
      disabled={availability !== "available" || violations.length > 0}
      data-testid="booking-submit"
      className={
        isBoutique
          ? "w-full py-4 text-[12px] font-semibold tracking-[0.12em] uppercase transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          : "w-full py-3.5 px-6 rounded-lg font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-white hover:brightness-110 disabled:hover:brightness-100"
      }
      style={
        isBoutique
          ? { background: "var(--color-primary)", color: "#fff" }
          : { background: "var(--color-primary)" }
      }
    >
      {isClassic && hasValidPricing
        ? `Payer ${fmtCurrency(totalPrice)} et confirmer`
        : "Procéder au paiement"}
    </button>
  );

  // ── Layout Classic : 2 colonnes form + sidebar réactive ──────────────────

  if (isClassic) {
    const reassuranceBanner = (
      <div
        className="rounded-lg p-3.5 flex gap-2.5 items-start border"
        style={{
          background: "var(--classic-cream)",
          borderColor: "var(--classic-border)",
          color: "var(--color-primary)",
        }}
      >
        <svg
          className="flex-shrink-0 mt-px"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <p className="text-[12.5px] text-warm-600 leading-[1.6]">
          Annulation gratuite jusqu&apos;à 7 jours avant l&apos;arrivée. Paiement
          sécurisé par Stripe. Confirmation par email immédiate.
        </p>
      </div>
    );

    return (
      <form action={createBookingPublic}>
        <input type="hidden" name="roomId" value={room.id} />
        <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-7 items-start">
          {/* Form column */}
          <div
            className="bg-white border rounded-2xl p-6 sm:p-7 space-y-5"
            style={{ borderColor: "var(--classic-border)" }}
          >
            {cancelledWarning}
            {dateRow}
            {rulesInfo}
            {availabilityIndicator}
            {guestCountInput}
            {identityRow}
            {phoneInput}
            {reassuranceBanner}
            {submitBtn}
          </div>

          {/* Reactive summary sidebar */}
          <aside
            className="md:sticky md:top-24"
            data-testid="booking-summary"
          >
            <SummaryCard
              room={room}
              checkIn={checkIn}
              checkOut={checkOut}
              guestCount={guestCount}
              nights={nights}
              totalPrice={totalPrice}
              nightPrices={nightPrices}
              hasValidPricing={hasValidPricing}
              availability={availability}
            />
          </aside>
        </div>
      </form>
    );
  }

  // ── Layout par défaut (Boutique) : flux vertical ─────────────────────────

  return (
    <form action={createBookingPublic} className="space-y-6">
      <input type="hidden" name="roomId" value={room.id} />
      {cancelledWarning}
      {dateRow}
      {rulesInfo}
      {availabilityIndicator}
      {guestCountInput}
      {identityRow}
      {phoneInput}
      {inlineBreakdown}
      {submitBtn}
    </form>
  );
}

// ── Reactive booking summary (Classic) ─────────────────────────────────────

function SummaryCard({
  room,
  checkIn,
  checkOut,
  guestCount,
  nights,
  totalPrice,
  nightPrices,
  hasValidPricing,
  availability,
}: {
  room: Room;
  checkIn: string;
  checkOut: string;
  guestCount: number;
  nights: number;
  totalPrice: number;
  nightPrices: NightPrice[];
  hasValidPricing: boolean;
  availability: AvailabilityStatus;
}) {
  const basePrice = parseFloat(room.pricePerNight);
  const hasPerNightRules =
    nightPrices.length > 0 && nightPrices.some((n) => n.appliedRule);

  return (
    <div
      className="bg-white border rounded-2xl overflow-hidden"
      style={{ borderColor: "var(--classic-border)" }}
    >
      <RoomPhoto
        photos={room.photos}
        alt={room.name}
        className="h-32"
        sizes="(max-width: 768px) 100vw, 320px"
      />
      <div className="p-5">
        <div
          className="font-heading text-[17px] font-bold text-warm-900"
          style={{ letterSpacing: "-0.01em" }}
        >
          {room.name}
        </div>
        <div className="text-[12.5px] text-warm-500 mt-0.5">
          Jusqu&apos;à {room.capacity} personne{room.capacity > 1 ? "s" : ""}
        </div>

        <dl className="mt-4 space-y-0">
          <SummaryRow
            label="Arrivée"
            value={checkIn ? fmtDateShort(checkIn) : "—"}
            testId="booking-summary-checkin"
          />
          <SummaryRow
            label="Départ"
            value={checkOut ? fmtDateShort(checkOut) : "—"}
            testId="booking-summary-checkout"
          />
          <SummaryRow
            label="Durée"
            value={
              nights > 0 ? `${nights} nuit${nights > 1 ? "s" : ""}` : "—"
            }
            testId="booking-summary-nights"
          />
          <SummaryRow
            label="Voyageurs"
            value={`${guestCount} pers.`}
            testId="booking-summary-guests"
          />
        </dl>

        <div
          className="my-4 h-px"
          style={{ background: "var(--classic-border)" }}
        />

        {hasValidPricing ? (
          <div className="space-y-1.5">
            {hasPerNightRules ? (
              <div className="space-y-1">
                {nightPrices.map((np) => (
                  <div
                    key={np.date}
                    className="flex justify-between text-[11.5px] text-warm-500"
                  >
                    <span>
                      {new Date(np.date + "T00:00:00Z").toLocaleDateString(
                        "fr-FR",
                        { weekday: "short", day: "numeric", month: "short" },
                      )}
                      {np.appliedRule && (
                        <span className="ml-1 text-amber-600">
                          ({np.appliedRule})
                        </span>
                      )}
                    </span>
                    <span>{fmtCurrency(np.price)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex justify-between text-[12.5px] text-warm-600">
                <span>
                  {fmtCurrency(basePrice)} × {nights} nuit
                  {nights > 1 ? "s" : ""}
                </span>
                <span>{fmtCurrency(totalPrice)}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-[12px] text-warm-500 leading-[1.5]">
            {availability === "checking"
              ? "Vérification du tarif…"
              : availability === "unavailable"
              ? "Choisissez d'autres dates pour voir le tarif."
              : "Sélectionnez des dates valides pour voir le total."}
          </div>
        )}

        <div
          className="mt-4 rounded-lg px-3.5 py-3 flex justify-between items-center"
          style={{
            background:
              "color-mix(in oklch, var(--color-primary) 7%, white)",
          }}
        >
          <span className="text-sm font-bold text-warm-900">Total</span>
          <span
            data-testid="booking-summary-total"
            className="font-heading text-xl font-bold"
            style={{
              color: "var(--color-primary)",
              letterSpacing: "-0.02em",
            }}
          >
            {hasValidPricing ? fmtCurrency(totalPrice) : "—"}
          </span>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  testId,
}: {
  label: string;
  value: string;
  testId: string;
}) {
  return (
    <div
      className="flex justify-between py-1.5 border-b last:border-b-0"
      style={{ borderColor: "var(--classic-border)" }}
    >
      <dt className="text-[13px] text-warm-500">{label}</dt>
      <dd
        className="text-[13px] font-semibold text-warm-900"
        data-testid={testId}
      >
        {value}
      </dd>
    </div>
  );
}
