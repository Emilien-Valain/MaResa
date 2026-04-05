"use client";

import { useState, useRef } from "react";
import { updateLocation } from "@/lib/actions/location";

type LocationSectionProps = {
  googleMapsUrl?: string;
  latitude?: number;
  longitude?: number;
};

/**
 * Parse une chaîne "lat, lng" ou "lat lng" en deux valeurs.
 * Retourne null si le format ne correspond pas.
 */
function parseCoordinates(raw: string): { lat: string; lng: string } | null {
  const cleaned = raw.trim();
  // Accepte "48.8566, 2.3522" ou "48.8566 2.3522" ou "48.8566,2.3522"
  const match = cleaned.match(/^(-?\d+[.,]?\d*)\s*[,;\s]\s*(-?\d+[.,]?\d*)$/);
  if (!match) return null;
  return {
    lat: match[1].replace(",", "."),
    lng: match[2].replace(",", "."),
  };
}

export default function LocationSection({
  googleMapsUrl,
  latitude,
  longitude,
}: LocationSectionProps) {
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lat, setLat] = useState(latitude?.toString() ?? "");
  const [lng, setLng] = useState(longitude?.toString() ?? "");
  const coordsRef = useRef<HTMLInputElement>(null);

  const hasLocation =
    lat !== "" && lng !== "" && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng));

  function handleCoordsPaste(value: string) {
    const parsed = parseCoordinates(value);
    if (parsed) {
      setLat(parsed.lat);
      setLng(parsed.lng);
      // Vider le champ de collage après le split
      if (coordsRef.current) coordsRef.current.value = "";
    }
  }

  return (
    <section className="bg-white border border-warm-300 rounded-sm shadow-sm">
      <div className="px-6 py-4 border-b border-warm-200">
        <h2 className="font-heading text-lg font-semibold text-warm-950">
          Localisation
        </h2>
        <p className="text-xs text-warm-500 mt-0.5">
          Indiquez l&apos;emplacement de votre établissement pour l&apos;afficher
          sur votre page d&apos;accueil. Ajoutez votre lien Google Maps pour
          permettre aux clients de laisser un avis.
        </p>
      </div>

      <div className="px-6 py-5">
        {saved && (
          <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-sm text-sm text-green-800">
            Localisation mise à jour avec succès.
          </div>
        )}
        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-sm text-sm text-red-800">
            {error}
          </div>
        )}

        <form
          action={async (formData) => {
            // Injecter lat/lng depuis le state (pas depuis les hidden inputs du DOM)
            formData.set("latitude", lat);
            formData.set("longitude", lng);
            setSaved(false);
            setError(null);
            try {
              await updateLocation(formData);
              setSaved(true);
            } catch (e) {
              setError(
                e instanceof Error ? e.message : "Erreur lors de la sauvegarde",
              );
            }
          }}
          className="space-y-4"
        >
          <div>
            <label
              htmlFor="loc-google-url"
              className="block text-xs font-medium text-warm-700 mb-1"
            >
              Lien Google Maps
            </label>
            <input
              id="loc-google-url"
              name="googleMapsUrl"
              type="url"
              defaultValue={googleMapsUrl ?? ""}
              placeholder="https://maps.app.goo.gl/... ou https://www.google.com/maps/place/..."
              className="w-full border border-warm-200 rounded-sm px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-accent/40"
            />
            <p className="text-xs text-warm-400 mt-1">
              Collez le lien de partage de votre établissement depuis Google
              Maps. Vos clients pourront y laisser un avis.
            </p>
          </div>

          {/* Champ pour coller les coordonnées d'un coup */}
          <div>
            <label
              htmlFor="loc-coords"
              className="block text-xs font-medium text-warm-700 mb-1"
            >
              Coordonnées GPS
            </label>
            <input
              ref={coordsRef}
              id="loc-coords"
              type="text"
              placeholder="Collez les coordonnées : 48.8566, 2.3522"
              onChange={(e) => handleCoordsPaste(e.target.value)}
              onPaste={(e) => {
                const input = e.currentTarget;
                setTimeout(() => {
                  handleCoordsPaste(input.value);
                }, 0);
              }}
              className="w-full border border-warm-200 rounded-sm px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-accent/40"
            />
            <p className="text-xs text-warm-400 mt-1">
              Clic droit sur Google Maps → copier les coordonnées, puis collez-les ici.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="loc-latitude"
                className="block text-xs font-medium text-warm-700 mb-1"
              >
                Latitude
              </label>
              <input
                id="loc-latitude"
                type="text"
                inputMode="decimal"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="48.8566"
                className="w-full border border-warm-200 rounded-sm px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-accent/40"
              />
            </div>
            <div>
              <label
                htmlFor="loc-longitude"
                className="block text-xs font-medium text-warm-700 mb-1"
              >
                Longitude
              </label>
              <input
                id="loc-longitude"
                type="text"
                inputMode="decimal"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="2.3522"
                className="w-full border border-warm-200 rounded-sm px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-accent/40"
              />
            </div>
          </div>

          {/* Aperçu de la carte */}
          {hasLocation && (
            <div className="mt-2 border border-warm-200 rounded-sm overflow-hidden">
              <iframe
                title="Aperçu de la localisation"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${parseFloat(lng) - 0.01}%2C${parseFloat(lat) - 0.007}%2C${parseFloat(lng) + 0.01}%2C${parseFloat(lat) + 0.007}&layer=mapnik&marker=${lat}%2C${lng}`}
                className="w-full h-48 border-0"
              />
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium bg-warm-900 text-white rounded-sm hover:bg-warm-800 transition-colors"
            >
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
