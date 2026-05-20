"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/**
 * Carte interactive de la section « Nous trouver » du template Classic.
 *
 * Centre la carte sur les coordonnées du tenant, avec une épingle personnalisée
 * (carte « nom de l'établissement » + goutte ambrée) qui suit le pan/zoom.
 */
export default function NousTrouverMap({
  latitude,
  longitude,
  label,
  primaryColor,
  accentColor,
}: {
  latitude: number;
  longitude: number;
  label: string;
  primaryColor: string;
  accentColor: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false,
    }).setView([latitude, longitude], 14);

    // CartoDB Voyager — tons doux, plus colorés que Positron : passe bien avec
    // la palette verte/ambre du template Classic.
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      { subdomains: "abcd", maxZoom: 19 },
    ).addTo(map);

    L.control
      .attribution({ position: "bottomright", prefix: false })
      .addAttribution(
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OSM</a> &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>',
      )
      .addTo(map);

    L.control.zoom({ position: "topright" }).addTo(map);

    // Epingle custom : carte blanche bordée de couleur primaire + goutte ambrée.
    // L'iconAnchor étant impossible à calculer dynamiquement (largeur variable
    // selon la longueur du nom), on utilise un wrapper 0×0 et on positionne le
    // contenu via transform — la pointe de la goutte tombe exactement sur les
    // coordonnées.
    const safeLabel = label
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

    const html = `
      <div style="position:absolute;left:0;top:0;transform:translate(-50%,-100%);display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 4px 8px rgba(0,0,0,0.18));pointer-events:none;">
        <div style="background:#fff;border-radius:10px;padding:7px 13px;font-size:12.5px;font-weight:700;line-height:1.1;color:${primaryColor};white-space:nowrap;margin-bottom:4px;border:1.5px solid ${primaryColor};font-family:var(--font-sans, system-ui, sans-serif);">${safeLabel}</div>
        <svg width="32" height="42" viewBox="0 0 34 44" fill="none" aria-hidden="true">
          <path d="M17 2C8.7 2 2 8.7 2 17c0 11.3 15 25 15 25s15-13.7 15-25c0-8.3-6.7-15-15-15z" fill="${accentColor}" stroke="#fff" stroke-width="2.5" />
          <circle cx="17" cy="17" r="5.5" fill="#fff" />
        </svg>
      </div>
    `;

    const icon = L.divIcon({
      html,
      className: "",
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });

    L.marker([latitude, longitude], { icon, keyboard: false }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [latitude, longitude, label, primaryColor, accentColor]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full"
      aria-label={`Carte centrée sur ${label}`}
    />
  );
}
