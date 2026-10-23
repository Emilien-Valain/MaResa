"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";
import { Icon, type IconName } from "@/components/admin/icons";

type AccessibleTenant = {
  id: string;
  name: string;
  slug: string;
  isCurrent: boolean;
  adminUrl: string | null;
};

const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: "/admin", label: "Tableau de bord", icon: "Dashboard" },
  { href: "/admin/reservations", label: "Réservations", icon: "Reservations" },
  { href: "/admin/calendrier", label: "Calendrier", icon: "Calendar" },
  { href: "/admin/chambres", label: "Chambres", icon: "Rooms" },
  { href: "/admin/regles", label: "Règles", icon: "Rules" },
  { href: "/admin/parametres", label: "Paramètres", icon: "Settings" },
];

export default function Sidebar({
  userEmail,
  userName,
  currentTenantName,
  accessibleTenants,
  initialCollapsed,
}: {
  initialCollapsed: boolean;
  userEmail: string;
  userName?: string;
  currentTenantName: string;
  accessibleTenants: AccessibleTenant[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  // Lu côté serveur depuis le cookie (layout) : même rendu serveur et client, pas d'erreur d'hydratation.
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [hotelMenuOpen, setHotelMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    // Ouverture : le focus entre dans le tiroir. Fermeture : il revient au bouton menu.
    if (mobileOpen) drawerRef.current?.querySelector<HTMLElement>("nav a")?.focus();
    else if (wasOpen.current) menuButtonRef.current?.focus();
    wasOpen.current = mobileOpen;
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return setMobileOpen(false);
      if (e.key !== "Tab" || !drawerRef.current) return;
      // Tiroir modal : Tab boucle dans le tiroir au lieu de passer sous l'overlay.
      const items = [...drawerRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )].filter((el) => el.offsetParent !== null);
      const first = items[0];
      const last = items[items.length - 1];
      if (!first) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  function toggleCollapsed() {
    setCollapsed((c) => {
      const next = !c;
      document.cookie = `admin-sidebar-collapsed=${next ? "1" : "0"}; path=/admin; max-age=31536000; samesite=lax`;
      return next;
    });
  }

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  const isCollapsed = collapsed;
  const otherTenants = accessibleTenants.filter((t) => !t.isCurrent);
  const initials =
    (userName || userEmail || "")
      .split(/[\s.@]/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() ?? "")
      .join("") || "?";

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname === href || pathname.startsWith(href + "/");
  }

  // The mobile drawer always renders expanded; the collapsed rail is desktop-only.
  const renderAside = (isCollapsed: boolean) => (
    <aside
      data-admin-sidebar
      style={{
        width: isCollapsed ? 64 : 240,
        background: "var(--admin-sidebar-bg)",
      }}
      className="flex flex-col h-full flex-shrink-0 overflow-hidden transition-[width] duration-200 ease-out"
    >
      {/* Logo */}
      <div
        className={`border-b border-white/[0.07] flex items-center gap-2.5 ${
          isCollapsed ? "py-5 justify-center" : "px-4 py-5"
        }`}
      >
        <div
          className="w-[34px] h-[34px] rounded-[9px] flex items-center justify-center flex-shrink-0"
          style={{ background: "var(--admin-sidebar-accent)" }}
        >
          <span className="text-white font-extrabold text-[15px] tracking-tight">
            D
          </span>
        </div>
        {!isCollapsed && (
          <div className="leading-tight">
            <div className="text-white font-bold text-[15px] tracking-tight">
              DirectLoc
            </div>
            <div className="text-white/60 text-[12px] font-medium">
              Administration
            </div>
          </div>
        )}
      </div>

      {/* Hotel switcher */}
      {!isCollapsed && (
        <div className="px-3 py-2.5 border-b border-white/[0.07] relative">
          {otherTenants.length > 0 ? (
            <button
              onClick={() => setHotelMenuOpen((o) => !o)}
              aria-expanded={hotelMenuOpen}
              className="w-full bg-white/[0.07] border border-white/10 rounded-lg px-2.5 py-1.5 flex items-center gap-2 transition-colors hover:bg-white/[0.11] cursor-pointer"
            >
              <Icon.Hotel size={15} style={{ color: "var(--admin-sidebar-accent)" }} />
              <span className="flex-1 text-left text-[12.5px] font-semibold text-white truncate">
                {currentTenantName || "—"}
              </span>
              <Icon.ChevronDown
                size={13}
                className="text-white/60"
                style={{
                  transform: hotelMenuOpen ? "rotate(180deg)" : "none",
                  transition: "transform 0.15s",
                }}
              />
            </button>
          ) : (
            <div className="w-full bg-white/[0.07] border border-white/10 rounded-lg px-2.5 py-1.5 flex items-center gap-2">
              <Icon.Hotel size={15} style={{ color: "var(--admin-sidebar-accent)" }} />
              <span className="flex-1 text-[12.5px] font-semibold text-white truncate">
                {currentTenantName || "—"}
              </span>
            </div>
          )}

          {hotelMenuOpen && otherTenants.length > 0 && (
            <div className="mt-1 bg-black/20 rounded-lg border border-white/[0.08] overflow-hidden">
              <div className="px-3 py-2 text-white text-[12px] bg-white/10 font-semibold flex items-center gap-2">
                <span className="flex-1">{currentTenantName}</span>
                <Icon.Check
                  size={12}
                  style={{ color: "var(--admin-sidebar-accent)" }}
                />
              </div>
              {otherTenants.map((t) =>
                t.adminUrl ? (
                  <a
                    key={t.id}
                    href={t.adminUrl}
                    className="w-full px-3 py-2 flex text-[12px] text-white/55 hover:text-white hover:bg-white/[0.06] transition-colors"
                  >
                    {t.name}
                  </a>
                ) : (
                  <span
                    key={t.id}
                    className="block px-3 py-2 text-[12px] text-white/60 italic"
                  >
                    {t.name} (pas de domaine)
                  </span>
                ),
              )}
            </div>
          )}
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 py-2 overflow-y-auto">
        {NAV.map((item) => {
          const active = isActive(item.href);
          const IC = Icon[item.icon];
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              title={isCollapsed ? item.label : undefined}
              className={`w-full flex items-center gap-[11px] cursor-pointer transition-colors ${
                isCollapsed
                  ? "py-[11px] justify-center"
                  : "px-[14px] py-[10px]"
              } ${active ? "text-white bg-white/10" : "text-white/55 hover:text-white/85"}`}
              style={{
                borderLeft: `3px solid ${
                  active ? "var(--admin-sidebar-accent)" : "transparent"
                }`,
              }}
            >
              <IC size={18} />
              {!isCollapsed && (
                <span
                  className={`flex-1 text-left text-[13.5px] ${
                    active ? "font-semibold" : "font-medium"
                  }`}
                >
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div
        className={`border-t border-white/[0.07] flex items-center gap-2.5 ${
          isCollapsed ? "py-3 justify-center" : "p-3"
        }`}
      >
        <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
          <span className="text-white text-[12px] font-bold">{initials}</span>
        </div>
        {!isCollapsed && (
          <>
            <div className="flex-1 min-w-0 leading-tight">
              <div className="text-white text-[12.5px] font-semibold truncate">
                {userName || userEmail.split("@")[0]}
              </div>
              <div className="text-white/60 text-[12px] truncate">
                {userEmail}
              </div>
            </div>
            <button
              onClick={handleSignOut}
              aria-label="Déconnexion"
              className="text-white/60 hover:text-white/85 p-2 -m-1 rounded-md transition-colors flex-shrink-0"
            >
              <Icon.LogOut size={16} />
            </button>
          </>
        )}
      </div>
    </aside>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div
        className="lg:hidden flex items-center gap-2 px-4 py-1.5 border-b flex-shrink-0 z-20"
        style={{
          background: "var(--admin-surface)",
          borderColor: "var(--admin-border)",
        }}
      >
        <button
          ref={menuButtonRef}
          onClick={() => setMobileOpen(true)}
          aria-label="Ouvrir le menu"
          aria-expanded={mobileOpen}
          aria-controls="admin-drawer"
          className="flex items-center justify-center w-11 h-11 -ml-2 rounded-lg"
        >
          <Icon.Menu size={22} style={{ color: "var(--admin-text)" }} />
        </button>
        <span
          className="text-[15px] font-bold truncate"
          style={{ color: "var(--admin-text)" }}
        >
          {currentTenantName || "DirectLoc"}
        </span>
      </div>

      {/* Mobile overlay + drawer */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <div
        ref={drawerRef}
        id="admin-drawer"
        role={mobileOpen ? "dialog" : undefined}
        aria-modal={mobileOpen ? true : undefined}
        aria-label={mobileOpen ? "Navigation" : undefined}
        inert={!mobileOpen}
        className={`lg:hidden fixed top-0 bottom-0 left-0 z-50 transition-transform duration-200 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {renderAside(false)}
      </div>

      {/* Desktop */}
      <div className="hidden lg:flex relative">
        {renderAside(isCollapsed)}
        <button
          onClick={toggleCollapsed}
          aria-label={
            isCollapsed ? "Déplier la navigation" : "Replier la navigation"
          }
          className="absolute -right-3 top-[72px] w-6 h-6 rounded-full flex items-center justify-center cursor-pointer z-10"
          style={{
            background: "var(--admin-surface)",
            border: "1px solid var(--admin-border)",
            boxShadow: "var(--admin-shadow-sm)",
          }}
        >
          {isCollapsed ? (
            <Icon.ChevronRight
              size={12}
              style={{ color: "var(--admin-text-muted)" }}
            />
          ) : (
            <Icon.ChevronLeft
              size={12}
              style={{ color: "var(--admin-text-muted)" }}
            />
          )}
        </button>
      </div>
    </>
  );
}
