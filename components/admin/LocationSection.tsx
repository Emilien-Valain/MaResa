"use client";

import { useState, useRef } from "react";
import { useFormAction } from "@/components/admin/useFormAction";
import { updateLocation } from "@/lib/actions/location";
import {
  AdminInput,
  Field,
  SettingsSection,
  StatusBanner,
} from "@/components/admin/ui";

type LocationSectionProps = {
  googleMapsUrl?: string;
  latitude?: number;
  longitude?: number;
};

function parseCoordinates(raw: string): { lat: string; lng: string } | null {
  const cleaned = raw.trim();
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
  const form = useFormAction(updateLocation, {
    prepare: (fd) => {
      fd.set("latitude", lat);
      fd.set("longitude", lng);
    },
  });
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
      if (coordsRef.current) coordsRef.current.value = "";
    }
  }

  return (
    <SettingsSection
      title="Adresse et carte"
      desc="L'adresse apparaît dans les confirmations et sur la page contact. La carte est affichée sur le site public."
    >
      {form.saved && (
        <StatusBanner variant="success">
          Localisation mise à jour avec succès.
        </StatusBanner>
      )}
      {form.error && <StatusBanner variant="error">{form.error}</StatusBanner>}

      <form
        onSubmit={form.onSubmit}
      >
        <Field
          label="Lien Google Maps"
          error={form.fieldError("googleMapsUrl")}
          hint="Lien de partage de votre établissement depuis Google Maps. Vos clients pourront y laisser un avis."
        >
          <AdminInput
            id="loc-google-url"
            name="googleMapsUrl"
            type="url"
            defaultValue={googleMapsUrl ?? ""}
            placeholder="https://maps.app.goo.gl/... ou https://www.google.com/maps/place/..."
          />
        </Field>

        <Field
          label="Coordonnées GPS"
          hint="Clic droit sur Google Maps → copier les coordonnées, puis collez-les ici."
        >
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
            style={{
              width: "100%",
              padding: "9px 12px",
              border: "1.5px solid var(--admin-border)",
              borderRadius: 8,
              fontSize: 13.5,
              color: "var(--admin-text)",
              background: "var(--admin-surface)",
              outline: "none",
              fontFamily: "inherit",
              transition: "border-color 0.15s",
            }}
            onFocus={(e) =>
              (e.currentTarget.style.borderColor = "var(--admin-primary)")
            }
            onBlur={(e) =>
              (e.currentTarget.style.borderColor = "var(--admin-border)")
            }
          />
        </Field>

        <div className="grid grid-cols-2 gap-3.5">
          <Field label="Latitude" error={form.fieldError("latitude")}>
            <AdminInput
              id="loc-latitude"
              type="text"
              inputMode="decimal"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="48.8566"
            />
          </Field>
          <Field label="Longitude" error={form.fieldError("longitude")}>
            <AdminInput
              id="loc-longitude"
              type="text"
              inputMode="decimal"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              placeholder="2.3522"
            />
          </Field>
        </div>

        {hasLocation && (
          <div
            className="mt-3 overflow-hidden"
            style={{
              border: "1px solid var(--admin-border)",
              borderRadius: 8,
            }}
          >
            <iframe
              title="Aperçu de la localisation"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${parseFloat(lng) - 0.01}%2C${parseFloat(lat) - 0.007}%2C${parseFloat(lng) + 0.01}%2C${parseFloat(lat) + 0.007}&layer=mapnik&marker=${lat}%2C${lng}`}
              className="w-full h-48 border-0"
            />
          </div>
        )}

        <div className="flex justify-end mt-4">
          <button
            type="submit"
            disabled={form.pending}
            style={{
              padding: "9px 18px",
              background: "var(--admin-primary)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: form.pending ? "wait" : "pointer",
              opacity: form.pending ? 0.7 : 1,
            }}
          >
            {form.pending ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </SettingsSection>
  );
}
