"use client";

import dynamic from "next/dynamic";

// Leaflet a besoin de `window` — chargement SSR-off via un wrapper client.
const NousTrouverMap = dynamic(
  () => import("@/components/public/templates/classic/NousTrouverMap"),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 w-full h-full animate-pulse bg-[#EAF2ED]" />
    ),
  },
);

export default NousTrouverMap;
