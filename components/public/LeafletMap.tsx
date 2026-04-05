"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Marqueur SVG custom inline — évite de dépendre des assets Leaflet
const markerSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40">
  <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.268 21.732 0 14 0z" fill="MARKER_COLOR"/>
  <circle cx="14" cy="13" r="5.5" fill="white" opacity="0.9"/>
</svg>`;

export default function LeafletMap({
  latitude,
  longitude,
  markerColor = "#1c1917",
}: {
  latitude: number;
  longitude: number;
  markerColor?: string;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false,
    }).setView([latitude, longitude], 15);

    // CartoDB Positron — style épuré, tons neutres
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      {
        subdomains: "abcd",
        maxZoom: 19,
      },
    ).addTo(map);

    // Attribution discrète en bas à droite
    L.control
      .attribution({ position: "bottomright", prefix: false })
      .addAttribution(
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OSM</a> &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>',
      )
      .addTo(map);

    // Marqueur SVG custom
    const svg = markerSvg.replace("MARKER_COLOR", markerColor);
    const icon = L.divIcon({
      html: svg,
      className: "",
      iconSize: [28, 40],
      iconAnchor: [14, 40],
    });

    L.marker([latitude, longitude], { icon }).addTo(map);

    // Zoom control discret en bas à droite
    L.control.zoom({ position: "bottomright" }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [latitude, longitude, markerColor]);

  return (
    <div
      ref={mapRef}
      className="w-full h-full"
      style={{ minHeight: "inherit" }}
    />
  );
}
