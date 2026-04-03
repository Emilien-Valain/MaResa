"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

type StripeStatus = {
  connected: boolean;
  accountId?: string;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  detailsSubmitted?: boolean;
};

export default function StripeConnectSection({
  hasAccount,
}: {
  hasAccount: boolean;
}) {
  const searchParams = useSearchParams();
  const stripeParam = searchParams.get("stripe");

  const [status, setStatus] = useState<StripeStatus | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (hasAccount) {
      fetch("/api/admin/stripe/status")
        .then((r) => r.json())
        .then(setStatus);
    }
  }, [hasAccount]);

  async function handleConnect() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/stripe/connect", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm("Déconnecter votre compte Stripe ? Les paiements ne seront plus possibles.")) {
      return;
    }
    setLoading(true);
    try {
      await fetch("/api/admin/stripe/connect", { method: "DELETE" });
      setStatus(null);
      window.location.reload();
    } finally {
      setLoading(false);
    }
  }

  const isFullyConnected = status?.connected && status.chargesEnabled && status.detailsSubmitted;
  const needsCompletion = status?.connected && !status.detailsSubmitted;

  return (
    <section className="bg-white border border-warm-300 rounded-sm shadow-sm">
      <div className="px-6 py-4 border-b border-warm-200">
        <h2 className="font-heading text-lg font-semibold text-warm-950">Paiement Stripe</h2>
        <p className="text-xs text-warm-500 mt-0.5">
          Connectez votre compte Stripe pour recevoir les paiements des réservations directement.
        </p>
      </div>

      <div className="px-6 py-5">
        {stripeParam === "success" && (
          <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-sm text-sm text-green-800">
            Configuration Stripe mise à jour avec succès.
          </div>
        )}
        {stripeParam === "refresh" && (
          <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-sm text-sm text-amber-800">
            La session a expiré. Cliquez ci-dessous pour reprendre la configuration.
          </div>
        )}

        {isFullyConnected ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-sm px-3 py-1.5">
                <span className="w-2 h-2 bg-green-500 rounded-full" />
                Connecté
              </span>
              <span className="text-xs text-warm-400">{status.accountId}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <StatusDot ok={status.chargesEnabled} />
                <span className="text-warm-700">Paiements par carte</span>
              </div>
              <div className="flex items-center gap-2">
                <StatusDot ok={status.payoutsEnabled} />
                <span className="text-warm-700">Virements</span>
              </div>
            </div>

            <button
              onClick={handleDisconnect}
              disabled={loading}
              className="text-xs text-red-600 hover:text-red-800 transition-colors disabled:opacity-50"
            >
              Déconnecter le compte Stripe
            </button>
          </div>
        ) : needsCompletion ? (
          <div className="space-y-3">
            <p className="text-sm text-amber-700">
              La configuration de votre compte Stripe n&apos;est pas terminée. Reprenez l&apos;onboarding pour activer les paiements.
            </p>
            <button
              onClick={handleConnect}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium bg-warm-900 text-white rounded-sm hover:bg-warm-800 transition-colors disabled:opacity-50"
            >
              {loading ? "Chargement…" : "Reprendre la configuration"}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-warm-600">
              Aucun compte Stripe connecté. Les réservations ne peuvent pas être payées en ligne.
            </p>
            <button
              onClick={handleConnect}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium bg-warm-900 text-white rounded-sm hover:bg-warm-800 transition-colors disabled:opacity-50"
            >
              {loading ? "Chargement…" : "Connecter Stripe"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function StatusDot({ ok }: { ok?: boolean }) {
  return (
    <span
      className={`w-2 h-2 rounded-full ${ok ? "bg-green-500" : "bg-warm-300"}`}
    />
  );
}
