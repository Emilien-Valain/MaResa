"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";

type Photo = {
  id: string;
  filename: string;
  url: string;
  position: number;
};

export default function RoomPhotosUploader({
  roomId,
  initialPhotos,
}: {
  roomId: string;
  initialPhotos: Photo[];
}) {
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const upload = useCallback(
    async (files: FileList | File[]) => {
      setError(null);
      setUploading(true);

      const formData = new FormData();
      for (const file of Array.from(files)) {
        formData.append("photos", file);
      }

      try {
        const res = await fetch(`/api/admin/rooms/${roomId}/photos`, {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Erreur lors de l'upload");
          return;
        }

        setPhotos(data.photos);
      } catch {
        setError("Erreur réseau");
      } finally {
        setUploading(false);
      }
    },
    [roomId],
  );

  const deletePhoto = useCallback(
    async (photoId: string) => {
      setError(null);
      try {
        const res = await fetch(`/api/admin/rooms/${roomId}/photos`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ photoId }),
        });

        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Erreur lors de la suppression");
          return;
        }

        setPhotos(data.photos);
      } catch {
        setError("Erreur réseau");
      }
    },
    [roomId],
  );

  const reorder = useCallback(
    async (newPhotos: Photo[]) => {
      setPhotos(newPhotos);

      try {
        await fetch(`/api/admin/rooms/${roomId}/photos`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ photoIds: newPhotos.map((p) => p.id) }),
        });
      } catch {
        // Silently fail — order is already updated locally
      }
    },
    [roomId],
  );

  // Drag & drop reorder
  const handleDragStart = (idx: number) => {
    setDraggedIdx(idx);
  };

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
    if (draggedIdx !== null) {
      reorder(photos);
    }
    setDraggedIdx(null);
  };

  // File drop zone
  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      upload(e.dataTransfer.files);
    }
  };

  return (
    <div className="space-y-4">
      <div
        className="text-[11.5px] font-bold uppercase mb-1.5"
        style={{
          color: "var(--admin-text-muted)",
          letterSpacing: "0.06em",
        }}
      >
        Photos{" "}
        <span
          className="font-medium normal-case tracking-normal"
          style={{ color: "var(--admin-text-subtle)" }}
        >
          (max 10, 5 Mo chacune)
        </span>
      </div>

      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map((photo, idx) => (
            <div
              key={photo.id}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragEnd={handleDragEnd}
              className="group relative aspect-[4/3] overflow-hidden cursor-grab active:cursor-grabbing transition-all"
              style={{
                borderRadius: 10,
                border: `2px solid ${
                  draggedIdx === idx
                    ? "var(--admin-primary)"
                    : "var(--admin-border)"
                }`,
                opacity: draggedIdx === idx ? 0.6 : 1,
                transform: draggedIdx === idx ? "scale(0.95)" : "none",
              }}
            >
              <Image
                src={photo.url}
                alt={`Photo ${idx + 1}`}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 50vw, 200px"
              />

              {idx === 0 && (
                <span
                  className="absolute top-1.5 left-1.5 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                  style={{ background: "rgba(28, 25, 23, 0.8)" }}
                >
                  Principale
                </span>
              )}

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
                title="Supprimer"
              >
                ✕
              </button>

              <div
                className="absolute bottom-1.5 left-1.5 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: "rgba(255,255,255,0.85)" }}
              >
                ⠿ Glisser
              </div>
            </div>
          ))}
        </div>
      )}

      {photos.length < 10 && (
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
            padding: "32px 24px",
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
                JPEG, PNG ou WebP · {10 - photos.length} place
                {10 - photos.length > 1 ? "s" : ""} restante
                {10 - photos.length > 1 ? "s" : ""}
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
