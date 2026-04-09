"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
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

      setSent(true);
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
              Mot de passe oublié
            </h1>
            <p className="text-sm text-warm-500 mt-1">
              Entrez votre email pour recevoir un lien de réinitialisation
            </p>
          </div>

          {sent ? (
            <div className="space-y-4">
              <p className="text-sm text-warm-700 bg-warm-100 border border-warm-200 rounded-sm px-3 py-3">
                Si cette adresse est associée à un compte, vous recevrez un email avec un lien
                de réinitialisation. Vérifiez aussi vos spams.
              </p>
              <Link
                href="/login"
                className="block text-center text-sm text-warm-600 hover:text-warm-900 transition-colors"
              >
                {"\u2190"} Retour à la connexion
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-warm-700 mb-1.5">
                  Email
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                {loading ? "Envoi\u2026" : "Envoyer le lien"}
              </button>

              <Link
                href="/login"
                className="block text-center text-sm text-warm-600 hover:text-warm-900 transition-colors"
              >
                {"\u2190"} Retour à la connexion
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
