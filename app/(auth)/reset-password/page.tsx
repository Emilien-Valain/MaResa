"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-warm-50">
        <div className="w-full max-w-sm animate-fade-up">
          <div className="bg-white rounded-sm border border-warm-200 shadow-sm p-8 space-y-4">
            <h1 className="font-heading text-3xl font-semibold text-warm-900">
              Lien invalide
            </h1>
            <p className="text-sm text-warm-600">
              Ce lien de réinitialisation est invalide ou a expiré.
            </p>
            <Link
              href="/forgot-password"
              className="block text-center text-sm text-warm-600 hover:text-warm-900 transition-colors"
            >
              Demander un nouveau lien
            </Link>
          </div>
        </div>
      </div>
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
    <div className="min-h-screen flex items-center justify-center bg-warm-50">
      <div className="w-full max-w-sm animate-fade-up">
        <div className="bg-white rounded-sm border border-warm-200 shadow-sm p-8 space-y-6">
          <div>
            <h1 className="font-heading text-3xl font-semibold text-warm-900">
              Nouveau mot de passe
            </h1>
            <p className="text-sm text-warm-500 mt-1">
              Choisissez un nouveau mot de passe pour votre compte
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-warm-700 mb-1.5">
                Nouveau mot de passe
              </label>
              <input
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-warm-200 rounded-sm px-3 py-2.5 text-sm text-warm-900 bg-warm-50/50 focus:outline-none focus:ring-2 focus:ring-amber-accent/40 focus:border-amber-accent transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-warm-700 mb-1.5">
                Confirmer le mot de passe
              </label>
              <input
                name="confirm"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full border border-warm-200 rounded-sm px-3 py-2.5 text-sm text-warm-900 bg-warm-50/50 focus:outline-none focus:ring-2 focus:ring-amber-accent/40 focus:border-amber-accent transition-colors"
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-sm px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-warm-900 text-warm-50 rounded-sm px-4 py-2.5 text-sm font-medium hover:bg-warm-800 disabled:opacity-50 transition-colors"
            >
              {loading ? "Enregistrement..." : "Enregistrer le mot de passe"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
