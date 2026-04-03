"use client";

import { useState } from "react";
import Image from "next/image";

type Photo = {
  id: string;
  url: string;
  position: number;
};

export default function RoomGallery({
  photos,
  alt,
}: {
  photos: unknown;
  alt: string;
}) {
  const photoList = Array.isArray(photos) ? (photos as Photo[]) : [];
  const sorted = [...photoList].sort((a, b) => a.position - b.position);
  const [activeIdx, setActiveIdx] = useState(0);

  if (sorted.length === 0) {
    return (
      <div className="bg-warm-100 rounded-sm h-72 flex items-center justify-center text-warm-400">
        Photo à venir
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Photo principale */}
      <div className="relative aspect-[16/9] rounded-sm overflow-hidden bg-warm-100">
        <Image
          src={sorted[activeIdx].url}
          alt={`${alt} — photo ${activeIdx + 1}`}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 768px"
          priority
        />
      </div>

      {/* Miniatures */}
      {sorted.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {sorted.map((photo, idx) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => setActiveIdx(idx)}
              className={`relative w-16 h-12 rounded-sm overflow-hidden flex-shrink-0 border-2 transition-all ${
                idx === activeIdx
                  ? "border-warm-900 opacity-100"
                  : "border-transparent opacity-60 hover:opacity-90"
              }`}
            >
              <Image
                src={photo.url}
                alt={`${alt} — miniature ${idx + 1}`}
                fill
                className="object-cover"
                sizes="64px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
