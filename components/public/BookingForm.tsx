"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { createBookingPublic } from "@/lib/actions/bookings-public";
import type { TemplateName } from "@/lib/tenant-context";

type Room = {
  id: string;
  name: string;
  pricePerNight: string;
  capacity: number;
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

  return (
    <form action={createBookingPublic} className="space-y-6">
      <input type="hidden" name="roomId" value={room.id} />

      {wasCancelled && (
        <div className="bg-amber-50 border border-amber-200 rounded-sm p-4 text-sm text-amber-800">
          Le paiement a été annulé. Vous pouvez réessayer ci-dessous.
        </div>
      )}

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

      {rules &&
        (rules.minStay || rules.allowedCheckInDays || rules.allowedCheckOutDays) && (
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
                Arrivée : {rules.allowedCheckInDays.map((d) => DAY_NAMES_FR[d]).join(", ")}
              </span>
            )}
            {rules.allowedCheckOutDays && (
              <span>
                Départ : {rules.allowedCheckOutDays.map((d) => DAY_NAMES_FR[d]).join(", ")}
              </span>
            )}
          </div>
        )}

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
          defaultValue={1}
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

      {availability === "available" && violations.length === 0 && (
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
      )}

      <button
        type="submit"
        disabled={availability !== "available" || violations.length > 0}
        className={
          isBoutique
            ? "w-full py-4 text-[12px] font-semibold tracking-[0.12em] uppercase transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            : "w-full py-3 px-6 rounded-sm font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-warm-900 text-warm-50 hover:bg-warm-800 disabled:bg-warm-400"
        }
        style={
          isBoutique
            ? { background: "var(--color-primary)", color: "#fff" }
            : undefined
        }
      >
        Procéder au paiement
      </button>
    </form>
  );
}
