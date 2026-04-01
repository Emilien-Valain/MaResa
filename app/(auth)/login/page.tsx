"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/auth-client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await signIn.email({ email, password });

    if (result.error) {
      setError("Identifiants invalides.");
      setLoading(false);
      return;
    }

    router.push("/admin");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-warm-50">
      <div className="w-full max-w-sm animate-fade-up">
        <div className="bg-white rounded-sm border border-warm-200 shadow-sm p-8 space-y-6">
          <div>
            <h1 className="font-heading text-3xl font-semibold text-warm-900">Connexion</h1>
            <p className="text-sm text-warm-500 mt-1">Accédez à votre espace admin</p>
          </div>

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

            <div>
              <label className="block text-sm font-medium text-warm-700 mb-1.5">
                Mot de passe
              </label>
              <input
                name="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
              {loading ? "Connexion…" : "Se connecter"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
