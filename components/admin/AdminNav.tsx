"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";

type AccessibleTenant = {
  id: string;
  name: string;
  slug: string;
  isCurrent: boolean;
  adminUrl: string | null;
};

export default function AdminNav({
  userEmail,
  currentTenantName,
  accessibleTenants,
}: {
  userEmail: string;
  currentTenantName: string;
  accessibleTenants: AccessibleTenant[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const links = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/chambres", label: "Chambres" },
    { href: "/admin/reservations", label: "Réservations" },
    { href: "/admin/calendrier", label: "Calendrier" },
    { href: "/admin/parametres", label: "Paramètres" },
  ];

  const otherTenants = accessibleTenants.filter((t) => !t.isCurrent);

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  return (
    <nav className="bg-warm-900 text-warm-100">
      <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-14">
        <div className="flex items-center gap-6">
          {/* Tenant switcher */}
          <div className="relative">
            <button
              onClick={() => otherTenants.length > 0 && setSwitcherOpen(!switcherOpen)}
              className={`flex items-center gap-1.5 font-heading text-lg font-semibold text-white ${
                otherTenants.length > 0 ? "cursor-pointer hover:text-amber-accent" : ""
              }`}
            >
              {currentTenantName || "MaRésa"}
              {otherTenants.length > 0 && (
                <svg
                  className={`w-3.5 h-3.5 transition-transform ${switcherOpen ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              )}
            </button>

            {switcherOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setSwitcherOpen(false)} />
                <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-sm shadow-lg border border-warm-200 py-1 z-20 animate-slide-down">
                  <div className="px-3 py-2 text-xs text-warm-500 uppercase tracking-wide">
                    Tenant actif
                  </div>
                  <div className="px-3 py-2 text-sm font-medium text-warm-900 bg-warm-100">
                    {currentTenantName}
                  </div>
                  <div className="border-t border-warm-200 mt-1 pt-1">
                    <div className="px-3 py-2 text-xs text-warm-500 uppercase tracking-wide">
                      Changer de tenant
                    </div>
                    {otherTenants.map((t) =>
                      t.adminUrl ? (
                        <a
                          key={t.id}
                          href={t.adminUrl}
                          className="block px-3 py-2 text-sm text-warm-700 hover:bg-warm-100 transition-colors"
                          onClick={() => setSwitcherOpen(false)}
                        >
                          {t.name}
                        </a>
                      ) : (
                        <span key={t.id} className="block px-3 py-2 text-sm text-warm-400">
                          {t.name} (pas de domaine)
                        </span>
                      ),
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-sm text-sm transition-colors ${
                  pathname === link.href
                    ? "bg-white/15 text-white font-medium"
                    : "text-warm-300 hover:text-white hover:bg-white/10"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-warm-400">{userEmail}</span>
          <button
            onClick={handleSignOut}
            className="text-xs text-warm-300 hover:text-white transition-colors"
          >
            Déconnexion
          </button>
        </div>
      </div>
    </nav>
  );
}
