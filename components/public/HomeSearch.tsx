"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

type Room = {
  id: string;
  name: string;
  slug: string;
  pricePerNight: string;
  capacity: number;
  description: string | null;
};

type SearchStatus = "idle" | "searching" | "done";

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

function addDay(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().split("T")[0];
}

export default function HomeSearch({ tenantId }: { tenantId: string }) {
  const today = getToday();

  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [status, setStatus] = useState<SearchStatus>("idle");
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);

  const checkOutRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!checkIn || !checkOut) return;

    const checkInDate = new Date(checkIn + "T00:00:00Z");
    const checkOutDate = new Date(checkOut + "T00:00:00Z");
    if (checkOutDate <= checkInDate) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setStatus("searching");
      try {
        const params = new URLSearchParams({ from: checkIn, to: checkOut, tenantId });
        const res = await fetch(`/api/rooms/available?${params}`, { cache: "no-store" });
        if (!res.ok) { setStatus("idle"); return; }
        const data = await res.json();
        setAvailableRooms(data.rooms ?? []);
        setStatus("done");
      } catch {
        setStatus("idle");
      }
    }, 400);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [checkIn, checkOut, tenantId]);

  const handleCheckInChange = (val: string) => {
    setCheckIn(val);
    setStatus("idle");
    if (!checkOut || val >= checkOut) {
      setCheckOut(addDay(val));
    }
    setTimeout(() => {
      try {
        checkOutRef.current?.showPicker();
      } catch {
        checkOutRef.current?.focus();
      }
    }, 50);
  };

  const handleCheckOutChange = (val: string) => {
    setCheckOut(val);
    setStatus("idle");
  };

  const nights =
    checkIn && checkOut
      ? Math.max(
          0,
          Math.round(
            (new Date(checkOut + "T00:00:00Z").getTime() -
              new Date(checkIn + "T00:00:00Z").getTime()) /
              (1000 * 60 * 60 * 24),
          ),
        )
      : 0;

  return (
    <div className="w-full">
      {/* Widget de recherche */}
      <div className="bg-white rounded-sm shadow-lg p-4 flex flex-col sm:flex-row gap-3 items-end">
        <div className="flex-1 min-w-0">
          <label className="block text-xs font-semibold text-warm-500 uppercase tracking-wide mb-1">
            Arrivée
          </label>
          <input
            type="date"
            value={checkIn}
            min={today}
            onChange={(e) => handleCheckInChange(e.target.value)}
            className="w-full border-0 border-b-2 border-warm-200 focus:border-warm-900 outline-none py-2 text-warm-900 font-medium text-sm bg-transparent transition-colors"
          />
        </div>

        <div className="hidden sm:block w-px h-10 bg-warm-200 self-end mb-2" />

        <div className="flex-1 min-w-0">
          <label className="block text-xs font-semibold text-warm-500 uppercase tracking-wide mb-1">
            Départ
          </label>
          <input
            ref={checkOutRef}
            type="date"
            value={checkOut}
            min={checkIn ? addDay(checkIn) : today}
            onChange={(e) => handleCheckOutChange(e.target.value)}
            className="w-full border-0 border-b-2 border-warm-200 focus:border-warm-900 outline-none py-2 text-warm-900 font-medium text-sm bg-transparent transition-colors"
          />
        </div>

        {nights > 0 && (
          <div className="text-xs text-warm-400 whitespace-nowrap pb-2">
            {nights} nuit{nights > 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Résultats */}
      {status === "searching" && (
        <div className="mt-8 flex items-center justify-center gap-2 text-warm-300 text-sm">
          <span className="inline-block w-4 h-4 border-2 border-warm-400 border-t-transparent rounded-full animate-spin" />
          Recherche des chambres disponibles…
        </div>
      )}

      {status === "done" && availableRooms.length === 0 && (
        <div className="mt-8 text-center text-warm-300 text-sm">
          Aucune chambre disponible pour ces dates.
        </div>
      )}

      {status === "done" && availableRooms.length > 0 && (
        <div className="mt-8">
          <p className="text-sm text-warm-300 mb-4">
            {availableRooms.length} chambre{availableRooms.length > 1 ? "s" : ""} disponible{availableRooms.length > 1 ? "s" : ""}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableRooms.map((room, i) => (
              <div
                key={room.id}
                className={`bg-white rounded-sm border border-warm-200 overflow-hidden hover:shadow-md transition-shadow animate-fade-up stagger-${i + 1}`}
              >
                <div className="bg-warm-100 h-36 flex items-center justify-center text-warm-400 text-sm">
                  Photo à venir
                </div>
                <div className="p-4">
                  <h3 className="font-heading text-lg font-semibold text-warm-900 mb-1">{room.name}</h3>
                  <p className="text-sm text-warm-500 mb-3">
                    {room.capacity} personne{room.capacity > 1 ? "s" : ""} ·{" "}
                    <span className="font-medium text-warm-700">
                      {parseFloat(room.pricePerNight).toFixed(0)} €/nuit
                    </span>
                    {nights > 0 && (
                      <span className="ml-1 text-warm-400">
                        · {(parseFloat(room.pricePerNight) * nights).toFixed(0)} € total
                      </span>
                    )}
                  </p>
                  <Link
                    href={`/reserver/${room.id}?checkIn=${checkIn}&checkOut=${checkOut}`}
                    className="block text-center text-sm font-medium bg-warm-900 text-warm-50 px-4 py-2 rounded-sm hover:bg-warm-800 transition-colors"
                  >
                    Réserver
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
