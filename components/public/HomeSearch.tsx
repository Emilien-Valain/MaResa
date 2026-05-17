"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import RoomPhoto from "@/components/public/RoomPhoto";
import type { TemplateName } from "@/lib/tenant-context";

type Room = {
  id: string;
  name: string;
  slug: string;
  pricePerNight: string;
  minPricePerNight?: number;
  capacity: number;
  description: string | null;
  photos: unknown;
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

export default function HomeSearch({
  tenantId,
  template = "classic",
}: {
  tenantId: string;
  template?: TemplateName;
}) {
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

  if (template === "boutique") {
    return (
      <div className="w-full">
        <div
          className="backdrop-blur-md border flex flex-col sm:flex-row gap-0 items-stretch overflow-hidden"
          style={{
            background: "rgba(255,255,255,0.05)",
            borderColor: "rgba(255,255,255,0.12)",
          }}
        >
          <div className="flex-1 px-6 py-4">
            <label
              htmlFor="search-checkin"
              className="block text-[10px] font-semibold tracking-[0.18em] uppercase mb-1.5"
              style={{ color: "rgba(255,255,255,0.45)" }}
            >
              Arrivée
            </label>
            <input
              id="search-checkin"
              type="date"
              value={checkIn}
              min={today}
              onChange={(e) => handleCheckInChange(e.target.value)}
              className="w-full bg-transparent border-none outline-none text-white text-[15px] font-medium cursor-pointer [color-scheme:dark]"
            />
          </div>

          <div className="hidden sm:block w-px self-stretch" style={{ background: "rgba(255,255,255,0.12)" }} />

          <div className="flex-1 px-6 py-4">
            <label
              htmlFor="search-checkout"
              className="block text-[10px] font-semibold tracking-[0.18em] uppercase mb-1.5"
              style={{ color: "rgba(255,255,255,0.45)" }}
            >
              Départ
            </label>
            <input
              id="search-checkout"
              ref={checkOutRef}
              type="date"
              value={checkOut}
              min={checkIn ? addDay(checkIn) : today}
              onChange={(e) => handleCheckOutChange(e.target.value)}
              className="w-full bg-transparent border-none outline-none text-white text-[15px] font-medium cursor-pointer [color-scheme:dark]"
            />
          </div>

          <button
            type="button"
            disabled
            className="px-7 py-4 text-[12px] font-semibold tracking-[0.12em] uppercase whitespace-nowrap"
            style={{ background: "var(--color-secondary)", color: "var(--color-primary)" }}
          >
            {nights > 0 ? `${nights} nuit${nights > 1 ? "s" : ""}` : "Voir"}
          </button>
        </div>

        <div aria-live="polite" aria-atomic="true">
          {status === "searching" && (
            <div className="mt-8 flex items-center justify-center gap-2 text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
              <span className="inline-block w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "rgba(255,255,255,0.4)" }} aria-hidden="true" />
              Recherche en cours…
            </div>
          )}
          {status === "done" && availableRooms.length === 0 && (
            <div className="mt-8 text-center text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
              Aucune chambre disponible pour ces dates.
            </div>
          )}
        </div>

        {status === "done" && availableRooms.length > 0 && (
          <div className="mt-12 text-left">
            <p className="text-xs uppercase tracking-[0.18em] mb-6" style={{ color: "var(--color-secondary)" }}>
              {availableRooms.length} chambre{availableRooms.length > 1 ? "s" : ""} disponible{availableRooms.length > 1 ? "s" : ""}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {availableRooms.map((room, i) => (
                <div
                  key={room.id}
                  className={`overflow-hidden animate-fade-up stagger-${Math.min(i + 1, 6)}`}
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}
                >
                  <RoomPhoto photos={room.photos} alt={room.name} className="h-44" sizes="(max-width: 640px) 100vw, 33vw" />
                  <div className="p-5">
                    <h3 className="font-heading text-xl font-semibold text-white mb-1">{room.name}</h3>
                    <p className="text-[13px] mb-4" style={{ color: "rgba(255,255,255,0.55)" }}>
                      {room.capacity} pers. · {" "}
                      <span className="font-medium" style={{ color: "var(--color-secondary)" }}>
                        {room.minPricePerNight !== undefined && room.minPricePerNight !== parseFloat(room.pricePerNight)
                          ? `dès ${room.minPricePerNight.toFixed(0)} €`
                          : `${parseFloat(room.pricePerNight).toFixed(0)} €`}
                        /nuit
                      </span>
                    </p>
                    <Link
                      href={`/reserver/${room.id}?checkIn=${checkIn}&checkOut=${checkOut}`}
                      className="block text-center text-[12px] font-semibold tracking-[0.12em] uppercase py-3"
                      style={{ background: "var(--color-secondary)", color: "var(--color-primary)" }}
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

  // Classic
  return (
    <div className="w-full">
      <div className="bg-white rounded-sm shadow-lg p-4 flex flex-col sm:flex-row gap-3 items-end">
        <div className="flex-1 min-w-0 w-full">
          <label htmlFor="search-checkin" className="block text-sm font-semibold text-warm-500 uppercase tracking-wide mb-1.5">
            Arrivée
          </label>
          <input
            id="search-checkin"
            type="date"
            value={checkIn}
            min={today}
            onChange={(e) => handleCheckInChange(e.target.value)}
            className="w-full border-0 border-b-2 border-warm-200 focus:border-warm-900 focus-visible:ring-2 focus-visible:ring-amber-accent/40 outline-none py-2.5 text-warm-900 font-medium text-base bg-transparent transition-colors"
          />
        </div>

        <div className="hidden sm:block w-px h-10 bg-warm-200 self-end mb-2" />

        <div className="flex-1 min-w-0 w-full">
          <label htmlFor="search-checkout" className="block text-sm font-semibold text-warm-500 uppercase tracking-wide mb-1.5">
            Départ
          </label>
          <input
            id="search-checkout"
            ref={checkOutRef}
            type="date"
            value={checkOut}
            min={checkIn ? addDay(checkIn) : today}
            onChange={(e) => handleCheckOutChange(e.target.value)}
            className="w-full border-0 border-b-2 border-warm-200 focus:border-warm-900 focus-visible:ring-2 focus-visible:ring-amber-accent/40 outline-none py-2.5 text-warm-900 font-medium text-base bg-transparent transition-colors"
          />
        </div>

        {nights > 0 && (
          <div className="text-sm text-warm-400 whitespace-nowrap pb-2">
            {nights} nuit{nights > 1 ? "s" : ""}
          </div>
        )}
      </div>

      <div aria-live="polite" aria-atomic="true">
        {status === "searching" && (
          <div className="mt-8 flex items-center justify-center gap-2 text-warm-300 text-sm">
            <span className="inline-block w-4 h-4 border-2 border-warm-400 border-t-transparent rounded-full animate-spin" aria-hidden="true" />
            Recherche des chambres disponibles…
          </div>
        )}

        {status === "done" && availableRooms.length === 0 && (
          <div className="mt-8 text-center text-warm-300 text-sm">
            Aucune chambre disponible pour ces dates.
          </div>
        )}
      </div>

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
                <RoomPhoto
                  photos={room.photos}
                  alt={room.name}
                  className="h-36"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
                <div className="p-4">
                  <h3 className="font-heading text-lg font-semibold text-warm-900 mb-1">{room.name}</h3>
                  <p className="text-sm text-warm-500 mb-3">
                    {room.capacity} personne{room.capacity > 1 ? "s" : ""} ·{" "}
                    <span className="font-medium text-warm-700">
                      {room.minPricePerNight !== undefined &&
                      room.minPricePerNight !== parseFloat(room.pricePerNight)
                        ? `à partir de ${room.minPricePerNight.toFixed(0)} €/nuit`
                        : `${parseFloat(room.pricePerNight).toFixed(0)} €/nuit`}
                    </span>
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
