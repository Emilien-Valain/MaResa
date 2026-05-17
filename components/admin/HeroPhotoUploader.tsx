"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import type { HeroPhoto } from "@/lib/tenant-context";

export default function HeroPhotoUploader({
  initialPhoto,
}: {
  initialPhoto: HeroPhoto | null | undefined;
}) {
  const [photo, setPhoto] = useState<HeroPhoto | null>(initialPhoto ?? null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setError(null);
    setUploading(true);
    const fd = new FormData();
    fd.append("photo", file);

    try {
      const res = await fetch("/api/admin/hero-photo", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erreur lors de l'upload");
        return;
      }
      setPhoto(data.heroPhoto);
    } catch {
      setError("Erreur réseau");
    } finally {
      setUploading(false);
    }
  }

  async function remove() {
    setError(null);
    try {
      const res = await fetch("/api/admin/hero-photo", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erreur lors de la suppression");
        return;
      }
      setPhoto(null);
    } catch {
      setError("Erreur réseau");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-4">
        <div
          className="overflow-hidden flex items-center justify-center"
          style={{
            width: 200,
            height: 120,
            borderRadius: 8,
            border: `1px ${photo ? "solid" : "dashed"} var(--admin-border)`,
            background: "var(--admin-surface-2)",
          }}
        >
          {photo ? (
            <Image
              src={photo.url}
              alt="Photo du hero"
              width={200}
              height={120}
              className="object-cover w-full h-full"
            />
          ) : (
            <span
              className="text-[11px]"
              style={{ color: "var(--admin-text-subtle)" }}
            >
              aucune photo
            </span>
          )}
        </div>

        <div className="space-y-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            style={{
              padding: "8px 16px",
              background: "var(--admin-primary)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: uploading ? "not-allowed" : "pointer",
              opacity: uploading ? 0.6 : 1,
            }}
          >
            {uploading ? "Upload…" : photo ? "Remplacer" : "Choisir une image"}
          </button>

          {photo && (
            <button
              type="button"
              onClick={remove}
              className="ml-2"
              style={{
                padding: "8px 16px",
                background: "transparent",
                color: "var(--admin-text-muted)",
                border: "1px solid var(--admin-border)",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Supprimer
            </button>
          )}

          <p
            className="text-[11.5px]"
            style={{ color: "var(--admin-text-subtle)" }}
          >
            JPEG, PNG ou WebP · 5 Mo max · redimensionnée à 2400×1600
          </p>
        </div>
      </div>

      {error && (
        <p className="text-[13px] font-semibold" style={{ color: "#DC2626" }}>
          {error}
        </p>
      )}
    </div>
  );
}
