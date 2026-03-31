"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";

export default function AdminNav({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const router = useRouter();

  const links = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/chambres", label: "Chambres" },
    { href: "/admin/reservations", label: "Réservations" },
    { href: "/admin/calendrier", label: "Calendrier" },
  ];

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-14">
        <div className="flex items-center gap-6">
          <span className="font-semibold text-gray-900 text-sm">MaRésa</span>
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
