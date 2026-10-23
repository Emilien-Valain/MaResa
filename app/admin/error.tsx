"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import Link from "next/link";
import { Card } from "@/components/admin/ui";

// Rendu dans le layout admin : la navigation reste disponible pour repartir.
export default function AdminError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Card style={{ padding: "40px 28px", maxWidth: 560 }}>
      <h1
        className="text-[24px] font-extrabold leading-tight"
        style={{ color: "var(--admin-text)", letterSpacing: "-0.6px" }}
      >
        Cette page n&apos;a pas pu s&apos;afficher
      </h1>
      <p className="text-[14px] mt-2 leading-[1.55]" style={{ color: "var(--admin-text-muted)" }}>
        Ce qui était déjà enregistré n&apos;est pas perdu. Réessayez ; si le problème continue, contactez DirectLoc
        {error.digest ? (
          <>
            {" "}en indiquant le code <code className="font-mono text-[13px]">{error.digest}</code>
          </>
        ) : null}
        .
      </p>
      <div className="flex flex-wrap gap-2 mt-6">
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="admin-btn"
          style={{ background: "var(--admin-primary)", color: "#fff", border: "none" }}
        >
          Réessayer
        </button>
        <Link href="/admin" className="admin-btn admin-btn--ghost">
          Tableau de bord
        </Link>
      </div>
    </Card>
  );
}
