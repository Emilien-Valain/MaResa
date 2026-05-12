"use client";

import { useState } from "react";
import {
  AuthField,
  AuthGhostButton,
  AuthInput,
  AuthPrimaryButton,
  AuthShell,
} from "../_shell";
import { Icon } from "@/components/admin/icons";

type Mode = "form" | "sent";

export default function ForgotPasswordPage() {
  const [mode, setMode] = useState<Mode>("form");
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.includes("@")) {
      setFieldError("Email invalide");
      return;
    }
    setFieldError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/request-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          redirectTo: "/reset-password",
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message ?? "Une erreur est survenue");
      }

      setMode("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      {mode === "form" ? (
        <>
          <h1
            className="text-[22px] font-extrabold mb-1.5"
            style={{ color: "var(--admin-text)", letterSpacing: "-0.5px" }}
          >
            Mot de passe oublié
          </h1>
          <p
            className="text-[13.5px] mb-7"
            style={{ color: "var(--admin-text-muted)" }}
          >
            Reçois un lien de réinitialisation par email.
          </p>

          <form onSubmit={handleSubmit} noValidate>
            <AuthField label="Email" error={fieldError}>
              <AuthInput
                name="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setFieldError(null);
                  setError(null);
                }}
                placeholder="vous@hotel.fr"
              />
            </AuthField>

            {error && (
              <p
                role="alert"
                className="mb-3 px-3 py-2 text-[12.5px] font-medium rounded-lg"
                style={{
                  background: "#FEE2E2",
                  border: "1px solid #FCA5A5",
                  color: "#991B1B",
                }}
              >
                {error}
              </p>
            )}

            <div className="mb-3">
              <AuthPrimaryButton type="submit" loading={loading}>
                {loading ? "Envoi…" : "Envoyer le lien"}
              </AuthPrimaryButton>
            </div>

            <AuthGhostButton
              type="button"
              onClick={() => (window.location.href = "/login")}
            >
              ← Retour
            </AuthGhostButton>
          </form>
        </>
      ) : (
        <div className="text-center py-5">
          <div
            className="mx-auto flex items-center justify-center mb-4"
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "#DCFCE7",
            }}
          >
            <Icon.Check size={26} style={{ color: "#16A34A" }} />
          </div>
          <h1
            className="text-[19px] font-extrabold mb-2"
            style={{ color: "var(--admin-text)", letterSpacing: "-0.4px" }}
          >
            Email envoyé
          </h1>
          <p
            className="text-[13.5px] mb-6 leading-[1.6]"
            style={{ color: "var(--admin-text-muted)" }}
          >
            Si cette adresse est associée à un compte, vous recevrez un email
            avec un lien de réinitialisation à{" "}
            <strong style={{ color: "var(--admin-text)" }}>{email}</strong>.
            Vérifie ta boîte de réception (et tes spams).
          </p>
          <button
            type="button"
            onClick={() => setMode("form")}
            style={{
              background: "transparent",
              border: "1px solid var(--admin-border)",
              borderRadius: 8,
              padding: "9px 16px",
              cursor: "pointer",
              color: "var(--admin-text-muted)",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            ← Retour à la connexion
          </button>
        </div>
      )}
    </AuthShell>
  );
}
