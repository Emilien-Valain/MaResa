"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { createBookingPublic } from "@/lib/actions/bookings-public";

type Room = {
  id: string;
  name: string;
  pricePerNight: string;
  capacity: number;
};

type AvailabilityStatus = "idle" | "checking" | "available" | "unavailable";

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
}: {
  room: Room;
  tenantId: string;
}) {
  const today = getToday();
  const tomorrow = getTomorrow();
  const searchParams = useSearchParams();

  const [checkIn, setCheckIn] = useState(searchParams.get("checkIn") ?? today);
  const [checkOut, setCheckOut] = useState(searchParams.get("checkOut") ?? tomorrow);
  const [availability, setAvailability] = useState<AvailabilityStatus>("idle");
  const [nights, setNights] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

        if (data.available) {
          const n = Math.round(
            (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24),
          );
          setNights(n);
          setTotalPrice(n * parseFloat(room.pricePerNight));
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

  const inputClass =
    "w-full border border-warm-200 rounded-sm px-3 py-2.5 text-sm text-warm-900 bg-warm-50/50 focus:outline-none focus:ring-2 focus:ring-amber-accent/40 focus:border-amber-accent transition-colors";

  return (
    <form action={createBookingPublic} className="space-y-6">
      <input type="hidden" name="roomId" value={room.id} />

      {/* Dates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="checkIn" className="block text-sm font-medium text-warm-700 mb-1.5">
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
          />
        </div>
        <div>
          <label htmlFor="checkOut" className="block text-sm font-medium text-warm-700 mb-1.5">
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
          />
        </div>
      </div>

      {/* Badge disponibilité */}
      <div className="min-h-[28px]">
        {availability === "checking" && (
          <span className="inline-flex items-center gap-1.5 text-sm text-warm-500">
            <span className="inline-block w-3 h-3 border-2 border-warm-400 border-t-transparent rounded-full animate-spin" />
            Vérification de la disponibilité…
          </span>
        )}
        {availability === "available" && (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-sm px-3 py-1">
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            Disponible
          </span>
        )}
        {availability === "unavailable" && (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-sm px-3 py-1">
            <span className="w-2 h-2 bg-red-500 rounded-full" />
            Non disponible pour ces dates
          </span>
        )}
      </div>

      {/* Nombre de personnes */}
      <div>
        <label htmlFor="guestCount" className="block text-sm font-medium text-warm-700 mb-1.5">
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
        />
        <p className="text-xs text-warm-500 mt-1">Capacité maximale : {room.capacity} personnes</p>
      </div>

      {/* Informations client */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="guestName" className="block text-sm font-medium text-warm-700 mb-1.5">
            Nom complet <span className="text-red-500">*</span>
          </label>
          <input
            id="guestName"
            type="text"
            name="guestName"
            required
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="guestEmail" className="block text-sm font-medium text-warm-700 mb-1.5">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            id="guestEmail"
            type="email"
            name="guestEmail"
            required
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="guestPhone" className="block text-sm font-medium text-warm-700 mb-1.5">
          Téléphone
        </label>
        <input
          id="guestPhone"
          type="tel"
          name="guestPhone"
          className={inputClass}
        />
      </div>

      {/* Récapitulatif prix */}
      {availability === "available" && (
        <div className="bg-warm-50 border border-warm-200 rounded-sm p-4">
          <div className="flex justify-between text-sm text-warm-600">
            <span>
              {parseFloat(room.pricePerNight).toFixed(0)} € × {nights} nuit{nights > 1 ? "s" : ""}
            </span>
            <span className="font-semibold text-warm-900">{totalPrice.toFixed(2)} €</span>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={availability !== "available"}
        className="w-full py-3 px-6 rounded-sm font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-warm-900 text-warm-50 hover:bg-warm-800 disabled:bg-warm-400"
      >
        Enregistrer la réservation
      </button>
    </form>
  );
}
