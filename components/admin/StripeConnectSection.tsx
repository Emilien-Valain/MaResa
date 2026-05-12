"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { SettingsSection, StatusBanner } from "@/components/admin/ui";

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
    if (
      !confirm(
        "Déconnecter votre compte Stripe ? Les paiements ne seront plus possibles.",
      )
    ) {
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

  const isFullyConnected =
    status?.connected && status.chargesEnabled && status.detailsSubmitted;
  const needsCompletion = status?.connected && !status.detailsSubmitted;

  return (
    <SettingsSection
      title="Paiement Stripe"
      desc="Reçois les paiements directement sur ton compte Stripe. MaRésa ne prélève aucune commission."
    >
      {stripeParam === "success" && (
        <StatusBanner variant="success">
          Configuration Stripe mise à jour avec succès.
        </StatusBanner>
      )}
      {stripeParam === "refresh" && (
        <StatusBanner variant="warning">
          La session a expiré. Clique ci-dessous pour reprendre la configuration.
        </StatusBanner>
      )}

      {isFullyConnected ? (
        <>
          <div
            className="mb-4"
            style={{
              padding: 16,
              background: "linear-gradient(135deg, #635BFF 0%, #4D43E8 100%)",
              borderRadius: 10,
              color: "#fff",
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div
                className="font-extrabold"
                style={{ fontSize: 18, letterSpacing: "-0.5px" }}
              >
                stripe
              </div>
              <span
                style={{
                  fontSize: 11.5,
                  background: "rgba(255,255,255,0.2)",
                  padding: "3px 10px",
                  borderRadius: 12,
                  fontWeight: 600,
                }}
              >
                Connecté
              </span>
            </div>
            <div
              className="opacity-70"
              style={{ fontSize: 12.5, marginBottom: 4 }}
            >
              Compte Stripe
            </div>
            <div
              className="font-mono font-semibold"
              style={{ fontSize: 14 }}
            >
              {status.accountId}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <StatusItem ok={status.chargesEnabled} label="Paiements par carte" />
            <StatusItem ok={status.payoutsEnabled} label="Virements" />
          </div>

          <div className="flex gap-2.5 mt-4">
            <a
              href="https://dashboard.stripe.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center"
              style={{
                padding: 9,
                background: "var(--admin-surface-2)",
                border: "1px solid var(--admin-border)",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                color: "var(--admin-text)",
                textDecoration: "none",
              }}
            >
              Ouvrir le Dashboard Stripe ↗
            </a>
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={loading}
              style={{
                padding: "9px 16px",
                background: "transparent",
                border: "1px solid #DC2626",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                color: "#DC2626",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.5 : 1,
              }}
            >
              Déconnecter
            </button>
          </div>
        </>
      ) : needsCompletion ? (
        <>
          <p
            className="text-[13px] mb-3"
            style={{ color: "var(--admin-text-muted)" }}
          >
            La configuration de votre compte Stripe n&apos;est pas terminée.
            Reprenez l&apos;onboarding pour activer les paiements.
          </p>
          <button
            type="button"
            onClick={handleConnect}
            disabled={loading}
            style={{
              padding: "10px 20px",
              background: "#635BFF",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 13.5,
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Chargement…" : "Reprendre la configuration"}
          </button>
        </>
      ) : (
        <div
          className="text-center"
          style={{
            padding: 24,
            background: "var(--admin-surface-2)",
            borderRadius: 10,
            border: "1px dashed var(--admin-border)",
          }}
        >
          <div
            className="font-bold mb-1.5"
            style={{ fontSize: 15, color: "var(--admin-text)" }}
          >
            Aucun compte Stripe connecté
          </div>
          <div
            className="text-[13px] mb-4 mx-auto"
            style={{
              color: "var(--admin-text-muted)",
              maxWidth: 360,
            }}
          >
            Connecte ton compte Stripe pour activer les paiements en ligne sur ton site.
          </div>
          <button
            type="button"
            onClick={handleConnect}
            disabled={loading}
            style={{
              padding: "10px 20px",
              background: "#635BFF",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 13.5,
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Chargement…" : "Connecter Stripe →"}
          </button>
        </div>
      )}
    </SettingsSection>
  );
}

function StatusItem({ ok, label }: { ok?: boolean; label: string }) {
  return (
    <div
      className="flex items-center gap-2"
      style={{
        padding: "10px 12px",
        background: "var(--admin-surface-2)",
        borderRadius: 8,
        border: "1px solid var(--admin-border-light)",
      }}
    >
      <span
        className="rounded-full"
        style={{
          width: 8,
          height: 8,
          background: ok ? "#16A34A" : "var(--admin-border)",
          flexShrink: 0,
        }}
      />
      <span
        className="text-[13px] font-medium"
        style={{ color: "var(--admin-text)" }}
      >
        {label}
      </span>
    </div>
  );
}
