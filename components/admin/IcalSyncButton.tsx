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
        style={{
          padding: "6px 14px",
          background: "var(--admin-surface-2)",
          color: "var(--admin-text)",
          border: "1px solid var(--admin-border)",
          borderRadius: 7,
          fontSize: 13,
          fontWeight: 600,
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.5 : 1,
          transition: "background 0.15s",
        }}
      >
        {loading ? "Sync…" : "Synchroniser"}
      </button>
      {result && (
        <span
          className="text-[12px]"
          style={{ color: "var(--admin-text-muted)" }}
        >
          {result}
        </span>
      )}
    </div>
  );
}
