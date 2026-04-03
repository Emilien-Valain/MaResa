"use client";

import { useState } from "react";
import Link from "next/link";

export default function MobileNav({
  primaryColor,
  secondaryColor,
  iconColor,
}: {
  primaryColor: string;
  secondaryColor: string;
  /** Couleur de l'icône burger — par défaut secondaryColor */
  iconColor?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      {/* Burger button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
        className="w-10 h-10 flex items-center justify-center rounded-sm transition-colors"
        style={{ color: iconColor ?? secondaryColor }}
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          {open ? (
            <>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </>
          ) : (
            <>
              <line x1="4" y1="7" x2="20" y2="7" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="17" x2="20" y2="17" />
            </>
          )}
        </svg>
      </button>

      {/* Dropdown overlay */}
      {open && (
        <nav
          className="absolute left-0 right-0 top-full z-50 border-t animate-slide-down"
          style={{
            backgroundColor: primaryColor,
            borderColor: "rgba(255,255,255,0.1)",
          }}
        >
          <div className="px-6 py-4 flex flex-col gap-1">
            <Link
              href="/chambres"
              onClick={() => setOpen(false)}
              className="block py-3 text-sm tracking-wide opacity-80 hover:opacity-100 transition-opacity"
              style={{ color: secondaryColor }}
            >
              Chambres
            </Link>
            <Link
              href="/chambres"
              onClick={() => setOpen(false)}
              className="block py-3 px-4 mt-1 rounded-sm text-sm font-medium text-center transition-all hover:brightness-90"
              style={{
                backgroundColor: secondaryColor,
                color: primaryColor,
              }}
            >
              Réserver
            </Link>
          </div>
        </nav>
      )}
    </div>
  );
}
