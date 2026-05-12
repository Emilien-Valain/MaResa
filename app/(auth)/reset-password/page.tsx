"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  AuthField,
  AuthInput,
  AuthPrimaryButton,
  AuthShell,
} from "../_shell";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <AuthShell>
        <h1
          className="text-[22px] font-extrabold mb-1.5"
          style={{ color: "var(--admin-text)", letterSpacing: "-0.5px" }}
        >
          Lien invalide
        </h1>
        <p
          className="text-[13.5px] mb-6"
          style={{ color: "var(--admin-text-muted)" }}
        >
          Ce lien de réinitialisation est invalide ou a expiré.
        </p>
        <Link
          href="/forgot-password"
          className="block text-center text-[13px] font-semibold"
          style={{ color: "var(--admin-primary)" }}
        >
          Demander un nouveau lien
        </Link>
      </AuthShell>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: password, token }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message ?? "Le lien a expiré ou est invalide.");
      }

      router.push("/login?reset=success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <h1
        className="text-[22px] font-extrabold mb-1.5"
        style={{ color: "var(--admin-text)", letterSpacing: "-0.5px" }}
      >
        Nouveau mot de passe
      </h1>
      <p
        className="text-[13.5px] mb-7"
        style={{ color: "var(--admin-text-muted)" }}
      >
        Choisis un nouveau mot de passe pour ton compte.
      </p>

      <form onSubmit={handleSubmit} noValidate>
        <AuthField label="Nouveau mot de passe">
          <AuthInput
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </AuthField>

        <AuthField label="Confirmer le mot de passe">
          <AuthInput
            name="confirm"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
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

        <AuthPrimaryButton type="submit" loading={loading}>
          {loading ? "Enregistrement…" : "Enregistrer le mot de passe"}
        </AuthPrimaryButton>
      </form>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
