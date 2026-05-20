"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import type { GalleryPhoto } from "@/lib/tenant-context";
import { GALLERY_MAX_PHOTOS } from "@/lib/gallery";

export default function GalleryPhotosUploader({
  initialPhotos,
}: {
  initialPhotos: GalleryPhoto[];
}) {
  const [photos, setPhotos] = useState<GalleryPhoto[]>(initialPhotos);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const captionDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const upload = useCallback(async (files: FileList | File[]) => {
    setError(null);
    setUploading(true);

    const formData = new FormData();
    for (const file of Array.from(files)) {
      formData.append("photos", file);
    }

    try {
      const res = await fetch("/api/admin/gallery-photos", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erreur lors de l'upload");
        return;
      }
      setPhotos(data.galleryPhotos);
    } catch {
      setError("Erreur réseau");
    } finally {
      setUploading(false);
    }
  }, []);

  const deletePhoto = useCallback(async (photoId: string) => {
    setError(null);
    try {
      const res = await fetch("/api/admin/gallery-photos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erreur lors de la suppression");
        return;
      }
      setPhotos(data.galleryPhotos);
    } catch {
      setError("Erreur réseau");
    }
  }, []);

  const persist = useCallback(async (list: GalleryPhoto[]) => {
    try {
      await fetch("/api/admin/gallery-photos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photos: list.map((p) => ({ id: p.id, caption: p.caption })),
        }),
      });
    } catch {
      // ordre déjà mis à jour localement
    }
  }, []);

  const updateCaption = (id: string, caption: string) => {
    setPhotos((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, caption } : p));
      if (captionDebounce.current) clearTimeout(captionDebounce.current);
      captionDebounce.current = setTimeout(() => persist(next), 500);
      return next;
    });
  };

  const handleDragStart = (idx: number) => setDraggedIdx(idx);

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === idx) return;
    const updated = [...photos];
    const [moved] = updated.splice(draggedIdx, 1);
    updated.splice(idx, 0, moved);
    setDraggedIdx(idx);
    setPhotos(updated);
  };

  const handleDragEnd = () => {
    if (draggedIdx !== null) persist(photos);
    setDraggedIdx(null);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) upload(e.dataTransfer.files);
  };

  const remainingSlots = GALLERY_MAX_PHOTOS - photos.length;

  return (
    <div className="space-y-4">
      <div
        className="text-[11.5px] font-bold uppercase mb-1.5"
        style={{
          color: "var(--admin-text-muted)",
          letterSpacing: "0.06em",
        }}
      >
        Photos d&apos;illustration{" "}
        <span
          className="font-medium normal-case tracking-normal"
          style={{ color: "var(--admin-text-subtle)" }}
        >
          (de 0 à {GALLERY_MAX_PHOTOS}, la page s&apos;adapte)
        </span>
      </div>

      {photos.length > 0 && (
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}
          data-testid="gallery-photos-list"
        >
          {photos.map((photo, idx) => (
            <div
              key={photo.id}
              data-testid="gallery-photo-item"
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragEnd={handleDragEnd}
              className="group relative overflow-hidden cursor-grab active:cursor-grabbing transition-all"
              style={{
                borderRadius: 10,
                border: `2px solid ${
                  draggedIdx === idx
                    ? "var(--admin-primary)"
                    : "var(--admin-border)"
                }`,
                opacity: draggedIdx === idx ? 0.6 : 1,
                transform: draggedIdx === idx ? "scale(0.95)" : "none",
                background: "var(--admin-surface)",
              }}
            >
              <div className="relative aspect-[4/3]">
                <Image
                  src={photo.url}
                  alt={photo.caption || `Photo ${idx + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 50vw, 200px"
                />
                <button
                  type="button"
                  onClick={() => deletePhoto(photo.id)}
                  className="absolute top-1.5 right-1.5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    background: "rgba(220, 38, 38, 0.85)",
                    color: "#fff",
                    fontSize: 12,
                    border: "none",
                    cursor: "pointer",
                  }}
                  aria-label={`Supprimer la photo ${idx + 1}`}
                  title="Supprimer"
                >
                  ✕
                </button>
              </div>
              <div className="px-2.5 py-2">
                <input
                  type="text"
                  value={photo.caption ?? ""}
                  onChange={(e) => updateCaption(photo.id, e.target.value)}
                  placeholder="Description (optionnel)"
                  maxLength={80}
                  aria-label={`Description de la photo ${idx + 1}`}
                  className="admin-field"
                  style={{ padding: "6px 10px", fontSize: 12.5 }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {remainingSlots > 0 && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleFileDrop}
          onClick={() => fileInputRef.current?.click()}
          className="text-center cursor-pointer transition-colors"
          style={{
            border: `2px dashed ${
              dragOver ? "var(--admin-primary)" : "var(--admin-border)"
            }`,
            borderRadius: 10,
            padding: "28px 24px",
            background: dragOver
              ? "var(--admin-primary-light)"
              : "var(--admin-surface-2)",
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            data-testid="gallery-photo-input"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                upload(e.target.files);
                e.target.value = "";
              }
            }}
          />

          {uploading ? (
            <div
              className="text-[13px]"
              style={{ color: "var(--admin-text-muted)" }}
            >
              <span className="inline-block animate-spin mr-2">⏳</span>
              Upload en cours…
            </div>
          ) : (
            <>
              <p
                className="text-[13px] font-semibold"
                style={{ color: "var(--admin-text)" }}
              >
                Glisse des images ici ou clique pour sélectionner
              </p>
              <p
                className="text-[11.5px] mt-1"
                style={{ color: "var(--admin-text-subtle)" }}
              >
                JPEG, PNG ou WebP · {remainingSlots} place
                {remainingSlots > 1 ? "s" : ""} restante
                {remainingSlots > 1 ? "s" : ""}
              </p>
            </>
          )}
        </div>
      )}

      {error && (
        <p
          className="text-[13px] font-semibold"
          style={{ color: "#DC2626" }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
