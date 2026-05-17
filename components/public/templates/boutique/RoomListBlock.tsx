"use client";

import { useState } from "react";
import Link from "next/link";
import RoomPhoto from "@/components/public/RoomPhoto";

type Room = {
  id: string;
  name: string;
  slug: string;
  pricePerNight: string;
  capacity: number;
  description: string | null;
  photos: unknown;
  minPrice: number;
};

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);

export default function BoutiqueRoomListBlock({ rooms }: { rooms: Room[] }) {
  const [active, setActive] = useState(0);

  if (rooms.length === 0) {
    return (
      <section className="max-w-5xl mx-auto px-6 py-16 text-center">
        <p style={{ color: "color-mix(in oklch, var(--color-primary) 55%, transparent)" }}>
          Aucune chambre disponible pour le moment.
        </p>
      </section>
    );
  }

  const room = rooms[active];

  return (
    <>
      {/* Bandeau supérieur sombre */}
      <section
        className="px-6 pt-12 pb-9"
        style={{ background: "var(--color-primary)", color: "#fff" }}
      >
        <div className="max-w-5xl mx-auto">
          <div
            className="text-[11px] font-medium tracking-[0.18em] uppercase mb-2"
            style={{ color: "var(--color-secondary)" }}
          >
            Nos chambres
          </div>
          <h1
            className="font-heading font-semibold"
            style={{ fontSize: "clamp(32px, 5vw, 42px)", letterSpacing: "-0.01em" }}
          >
            {rooms.length} chambre{rooms.length > 1 ? "s" : ""} à découvrir
          </h1>
        </div>
      </section>

      {/* Onglets sticky */}
      <div
        className="sticky top-0 z-10 border-b overflow-x-auto"
        style={{
          background: "color-mix(in oklch, var(--color-primary) 92%, black)",
          borderColor: "rgba(255,255,255,0.08)",
        }}
      >
        <div className="max-w-5xl mx-auto px-6 flex gap-0 whitespace-nowrap">
          {rooms.map((r, i) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setActive(i)}
              className="py-4 px-5 text-[13.5px] transition-colors"
              style={{
                background: "transparent",
                border: "none",
                borderBottom: `2px solid ${active === i ? "var(--color-secondary)" : "transparent"}`,
                color: active === i ? "#fff" : "rgba(255,255,255,0.4)",
                fontWeight: active === i ? 500 : 400,
                cursor: "pointer",
              }}
            >
              {r.name}
              <span
                className="ml-2 text-xs"
                style={{ color: active === i ? "var(--color-secondary)" : "rgba(255,255,255,0.3)" }}
              >
                {fmt(parseFloat(r.pricePerNight))}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Détail chambre active */}
      <section
        key={room.id}
        className="max-w-5xl mx-auto px-6 py-12 animate-fade-in"
        style={{ color: "var(--color-primary)" }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-10">
          <div>
            <div className="overflow-hidden mb-3" style={{ aspectRatio: "16 / 10" }}>
              <RoomPhoto
                photos={room.photos}
                alt={room.name}
                className="w-full h-full"
                sizes="(max-width: 1024px) 100vw, 60vw"
              />
            </div>

            <div
              className="mt-8 pt-8 border-t"
              style={{ borderColor: "color-mix(in oklch, var(--color-primary) 15%, transparent)" }}
            >
              <h2
                className="font-heading text-2xl font-semibold mb-3"
                style={{ letterSpacing: "-0.01em" }}
              >
                La chambre
              </h2>
              {room.description && (
                <p
                  className="text-[15px] leading-[1.85] font-light"
                  style={{ color: "color-mix(in oklch, var(--color-primary) 65%, transparent)" }}
                >
                  {room.description}
                </p>
              )}
            </div>
          </div>

          {/* Sidebar prix */}
          <aside className="self-start lg:sticky lg:top-24">
            <div
              className="overflow-hidden bg-white border"
              style={{ borderColor: "color-mix(in oklch, var(--color-primary) 15%, transparent)" }}
            >
              <div className="px-7 py-6" style={{ background: "var(--color-primary)", color: "#fff" }}>
                <div className="font-heading text-[24px] font-semibold">{room.name}</div>
                <div
                  className="text-[12px] mt-1 tracking-[0.08em]"
                  style={{ color: "rgba(255,255,255,0.5)" }}
                >
                  {room.capacity} personne{room.capacity > 1 ? "s" : ""} max.
                </div>
              </div>
              <div className="px-7 py-6">
                <div
                  className="text-[11px] font-semibold tracking-[0.12em] uppercase mb-2"
                  style={{ color: "color-mix(in oklch, var(--color-primary) 50%, transparent)" }}
                >
                  À partir de
                </div>
                <div
                  className="font-heading text-[34px] font-bold leading-none"
                  style={{ letterSpacing: "-0.02em" }}
                >
                  {fmt(
                    room.minPrice < parseFloat(room.pricePerNight)
                      ? room.minPrice
                      : parseFloat(room.pricePerNight),
                  )}
                  <span className="text-base font-sans font-normal opacity-60"> / nuit</span>
                </div>

                <Link
                  href={`/reserver/${room.id}`}
                  className="block text-center mt-7 py-4 text-[12px] font-semibold tracking-[0.12em] uppercase transition-colors"
                  style={{ background: "var(--color-primary)", color: "#fff" }}
                >
                  Réserver cette chambre
                </Link>
                <Link
                  href={`/chambres/${room.slug}`}
                  className="block text-center mt-2 py-3 text-[12px] font-medium tracking-[0.05em] border"
                  style={{
                    color: "var(--color-primary)",
                    borderColor: "color-mix(in oklch, var(--color-primary) 25%, transparent)",
                  }}
                >
                  Plus de détails
                </Link>
              </div>
            </div>
          </aside>
        </div>

        {/* Navigation entre chambres */}
        <div
          className="flex justify-between items-center mt-12 pt-8 border-t"
          style={{ borderColor: "color-mix(in oklch, var(--color-primary) 15%, transparent)" }}
        >
          <button
            type="button"
            onClick={() => setActive((a) => Math.max(0, a - 1))}
            disabled={active === 0}
            className="text-sm font-medium flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ color: "var(--color-primary)" }}
          >
            ‹ Précédente
          </button>
          <span
            className="text-xs tracking-[0.1em]"
            style={{ color: "color-mix(in oklch, var(--color-primary) 50%, transparent)" }}
          >
            {active + 1} / {rooms.length}
          </span>
          <button
            type="button"
            onClick={() => setActive((a) => Math.min(rooms.length - 1, a + 1))}
            disabled={active === rooms.length - 1}
            className="text-sm font-medium flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ color: "var(--color-primary)" }}
          >
            Suivante ›
          </button>
        </div>
      </section>
    </>
  );
}
