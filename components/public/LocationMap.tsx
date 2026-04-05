"use client";

import dynamic from "next/dynamic";
import type { TenantConfig } from "@/lib/tenant-context";

// Leaflet a besoin de `window` — import dynamique SSR-off
const LeafletMap = dynamic(() => import("@/components/public/LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full animate-pulse bg-warm-100 rounded-sm" />
  ),
});

export default function LocationMap({
  config,
  primaryColor,
  secondaryColor,
}: {
  config: TenantConfig;
  primaryColor: string;
  secondaryColor: string;
}) {
  const { latitude, longitude, googleMapsUrl, address } = config;

  if (latitude == null || longitude == null) return null;

  return (
    <section className="px-6 py-16">
      <div className="max-w-5xl mx-auto">
        <h2
          className="font-heading text-3xl font-semibold mb-2 animate-fade-up"
          style={{ color: primaryColor }}
        >
          Nous trouver
        </h2>
        {address && (
          <p
            className="text-sm mb-6 opacity-60 animate-fade-up stagger-1"
            style={{ color: primaryColor }}
          >
            {address}
          </p>
        )}

        <div
          className="rounded-sm overflow-hidden shadow-sm animate-fade-up stagger-2"
          style={{ minHeight: "24rem" }}
        >
          <LeafletMap
            latitude={latitude}
            longitude={longitude}
            markerColor={primaryColor}
          />
        </div>

        {googleMapsUrl && (
          <div className="mt-4 flex flex-wrap gap-3 animate-fade-up stagger-3">
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-sm text-sm font-medium transition-all hover:brightness-90"
              style={{
                backgroundColor: primaryColor,
                color: secondaryColor,
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              Voir sur Google Maps
            </a>
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-sm text-sm font-medium border transition-colors hover:opacity-80"
              style={{
                borderColor: primaryColor,
                color: primaryColor,
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4"
              >
                <polygon points="3 11 22 2 13 21 11 13 3 11" />
              </svg>
              Itinéraire
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
