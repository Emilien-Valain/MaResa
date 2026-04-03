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
      <label className="block text-sm font-medium text-warm-800 mb-1.5">
        Photos <span className="text-warm-500 font-normal">(max 10, 5 Mo chacune)</span>
      </label>

      {/* Grille de photos existantes */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map((photo, idx) => (
            <div
              key={photo.id}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragEnd={handleDragEnd}
              className={`group relative aspect-[4/3] rounded-sm overflow-hidden border-2 cursor-grab active:cursor-grabbing transition-all ${
                draggedIdx === idx
                  ? "border-amber-accent opacity-60 scale-95"
                  : "border-warm-200 hover:border-warm-400"
              }`}
            >
              <Image
                src={photo.url}
                alt={`Photo ${idx + 1}`}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 50vw, 200px"
              />

              {/* Badge position */}
              {idx === 0 && (
                <span className="absolute top-1.5 left-1.5 bg-warm-900/80 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-sm">
                  Principale
                </span>
              )}

              {/* Bouton supprimer */}
              <button
                type="button"
                onClick={() => deletePhoto(photo.id)}
                className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-600/80 hover:bg-red-600 text-white rounded-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                title="Supprimer"
              >
                ✕
              </button>

              {/* Handle visuel */}
              <div className="absolute bottom-1.5 left-1.5 text-warm-50/70 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">
                ⠿ Glisser
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Zone de drop / bouton d'ajout */}
      {photos.length < 10 && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleFileDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-sm px-6 py-8 text-center cursor-pointer transition-colors ${
            dragOver
              ? "border-amber-accent bg-amber-50"
              : "border-warm-300 hover:border-warm-400 hover:bg-warm-50"
          }`}
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
            <div className="text-sm text-warm-500">
              <span className="inline-block animate-spin mr-2">⏳</span>
              Upload en cours…
            </div>
          ) : (
            <div>
              <p className="text-sm text-warm-600 font-medium">
                Glissez des images ici ou cliquez pour sélectionner
              </p>
              <p className="text-xs text-warm-400 mt-1">
                JPEG, PNG ou WebP · {10 - photos.length} place{10 - photos.length > 1 ? "s" : ""} restante{10 - photos.length > 1 ? "s" : ""}
              </p>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 font-medium">{error}</p>
      )}
    </div>
  );
}
