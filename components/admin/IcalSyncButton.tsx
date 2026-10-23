"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function IcalSyncButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const router = useRouter();

  async function handleSync() {
    setResult(null);
    setLoading(true);

    try {
      const res = await fetch("/api/admin/ical-sync", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setResult("Erreur de synchronisation");
      } else if (data.errors > 0) {
        setResult(`${data.synced} sync, ${data.errors} erreur${data.errors > 1 ? "s" : ""}`);
      } else if (data.synced > 0) {
        setResult(`${data.synced} calendrier${data.synced > 1 ? "s" : ""} synchronisé${data.synced > 1 ? "s" : ""}`);
      } else {
        setResult("Aucune source configurée");
      }

      router.refresh();
      setTimeout(() => setResult(null), 4000);
    } catch {
      setResult("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={loading}
        onClick={handleSync}
        className="admin-btn admin-btn--ghost"
      >
        {loading ? "Synchronisation…" : "Synchroniser"}
      </button>
      {result && (
        <span
          role="status"
          className="text-[12px]"
          style={{ color: "var(--admin-text-muted)" }}
        >
          {result}
        </span>
      )}
    </div>
  );
}
