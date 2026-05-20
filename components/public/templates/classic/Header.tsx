"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import MobileNav from "@/components/public/MobileNav";
import type { Tenant, TenantConfig } from "@/lib/tenant-context";

type Step = 1 | 2 | 3;

/**
 * Détermine l'étape du tunnel de réservation à partir du pathname.
 * Renvoie null si on n'est pas dans le tunnel.
 */
function getBookingStep(pathname: string): Step | null {
  if (
    pathname === "/chambres" ||
    pathname.startsWith("/chambres/")
  ) {
    return 1;
  }
  if (pathname.startsWith("/reserver/confirmation")) return 3;
  if (pathname.startsWith("/reserver/")) return 2;
  return null;
}

/**
 * URL vers laquelle pointe le bouton « retour » selon l'étape courante.
 * (On évite de jouer avec l'history côté client : Next-Link gère le routing.)
 */
function backHrefFor(pathname: string, step: Step): string {
  if (step === 1) return "/";
  if (step === 2) return "/chambres";
  // step 3 : on revient à la liste — il n'y a pas de "retour" naturel
  return "/chambres";
}

const ChevronLeft = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const Check = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

function StepIndicator({ step }: { step: Step }) {
  const labels: Array<{ idx: Step; label: string }> = [
    { idx: 1, label: "Chambres" },
    { idx: 2, label: "Réserver" },
    { idx: 3, label: "Confirmation" },
  ];

  return (
    <ol
      className="hidden md:flex items-center gap-1.5"
      aria-label="Progression de la réservation"
    >
      {labels.map((s, i) => {
        const active = step === s.idx;
        const done = step > s.idx;
        return (
          <li key={s.idx} className="flex items-center gap-1.5">
            {i > 0 && (
              <span
                aria-hidden="true"
                className="block w-6 h-px"
                style={{
                  background: done
                    ? "var(--color-amber-accent)"
                    : "rgba(255,255,255,0.2)",
                }}
              />
            )}
            <div className="flex items-center gap-1.5">
              <span
                className="flex items-center justify-center rounded-full text-[11px] font-bold"
                style={{
                  width: 22,
                  height: 22,
                  background: done
                    ? "var(--color-amber-accent)"
                    : active
                    ? "#fff"
                    : "rgba(255,255,255,0.15)",
                  color: done
                    ? "#fff"
                    : active
                    ? "var(--color-primary)"
                    : "rgba(255,255,255,0.5)",
                }}
                aria-current={active ? "step" : undefined}
              >
                {done ? <Check /> : s.idx}
              </span>
              <span
                className="text-xs"
                style={{
                  color: active ? "#fff" : "rgba(255,255,255,0.5)",
                  fontWeight: active ? 600 : 400,
                }}
              >
                {s.label}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default function ClassicHeader({
  tenant,
  config,
  primaryColor,
  secondaryColor,
}: {
  tenant: Tenant;
  config: TenantConfig;
  primaryColor: string;
  secondaryColor: string;
}) {
  const pathname = usePathname();
  const step = getBookingStep(pathname);
  const inFlow = step !== null;

  return (
    <header
      className="sticky top-0 z-30 px-6 py-4"
      style={{ backgroundColor: "var(--color-primary)", color: "#fff" }}
    >
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-6 min-h-[44px]">
        <div className="flex items-center gap-4 min-w-0">
          {inFlow && (
            <Link
              href={backHrefFor(pathname, step)}
              aria-label="Étape précédente"
              className="w-9 h-9 flex items-center justify-center rounded-md transition-colors hover:bg-white/10"
              style={{ background: "rgba(255,255,255,0.12)", color: "#fff" }}
            >
              <ChevronLeft />
            </Link>
          )}
          <Link
            href="/"
            className="hover:opacity-80 transition-opacity min-w-0"
          >
            {config.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={config.logoUrl} alt={tenant.name} className="h-9 object-contain" />
            ) : (
              <span className="font-heading text-xl sm:text-2xl font-semibold tracking-tight truncate block">
                {tenant.name}
              </span>
            )}
          </Link>
        </div>

        {inFlow ? (
          <StepIndicator step={step} />
        ) : (
          /* Desktop nav (homepage / autres pages) */
          <nav
            className="hidden md:flex items-center gap-7 text-sm"
            aria-label="Navigation principale"
          >
            <Link
              href="/chambres"
              className="opacity-80 hover:opacity-100 transition-opacity tracking-wide"
            >
              Chambres
            </Link>
            <Link
              href="/#nous-trouver"
              className="opacity-80 hover:opacity-100 transition-opacity tracking-wide"
            >
              Nous trouver
            </Link>
            <Link
              href="/chambres"
              className="px-5 py-2.5 rounded-sm text-sm font-medium transition-all hover:brightness-90"
              style={{ backgroundColor: secondaryColor, color: primaryColor }}
            >
              Réserver
            </Link>
          </nav>
        )}

        <MobileNav primaryColor={primaryColor} secondaryColor={secondaryColor} />
      </div>
    </header>
  );
}
