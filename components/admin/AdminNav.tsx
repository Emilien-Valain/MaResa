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
  ];

  const otherTenants = accessibleTenants.filter((t) => !t.isCurrent);

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-14">
        <div className="flex items-center gap-6">
          {/* Tenant switcher */}
          <div className="relative">
            <button
              onClick={() => otherTenants.length > 0 && setSwitcherOpen(!switcherOpen)}
              className={`flex items-center gap-1.5 font-semibold text-gray-900 text-sm ${
                otherTenants.length > 0 ? "cursor-pointer hover:text-gray-600" : ""
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
                {/* Backdrop transparent pour fermer le dropdown */}
                <div className="fixed inset-0 z-10" onClick={() => setSwitcherOpen(false)} />
                <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                  {/* Tenant courant */}
                  <div className="px-3 py-2 text-xs text-gray-400 uppercase tracking-wide">
                    Tenant actif
                  </div>
                  <div className="px-3 py-2 text-sm font-medium text-gray-900 bg-gray-50">
                    {currentTenantName}
                  </div>
                  {/* Autres tenants */}
                  <div className="border-t border-gray-100 mt-1 pt-1">
                    <div className="px-3 py-2 text-xs text-gray-400 uppercase tracking-wide">
                      Changer de tenant
                    </div>
                    {otherTenants.map((t) =>
                      t.adminUrl ? (
                        <a
                          key={t.id}
                          href={t.adminUrl}
                          className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          onClick={() => setSwitcherOpen(false)}
                        >
                          {t.name}
                        </a>
                      ) : (
                        <span key={t.id} className="block px-3 py-2 text-sm text-gray-400">
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
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                  pathname === link.href
                    ? "bg-gray-100 text-gray-900 font-medium"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">{userEmail}</span>
          <button
            onClick={handleSignOut}
            className="text-xs text-gray-500 hover:text-gray-900 transition-colors"
          >
            Déconnexion
          </button>
        </div>
      </div>
    </nav>
  );
}
