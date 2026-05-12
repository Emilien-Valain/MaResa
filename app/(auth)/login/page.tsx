"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "@/lib/auth-client";
import {
  AuthField,
  AuthInput,
  AuthPrimaryButton,
  AuthShell,
} from "../_shell";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resetSuccess = searchParams.get("reset") === "success";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const fe: { email?: string; password?: string } = {};
    if (!email.includes("@")) fe.email = "Email invalide";
    if (!password) fe.password = "Mot de passe requis";
    if (Object.keys(fe).length) {
      setFieldErrors(fe);
      return;
    }
    setFieldErrors({});
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
    <AuthShell>
      <h1
        className="text-[22px] font-extrabold mb-1.5"
        style={{ color: "var(--admin-text)", letterSpacing: "-0.5px" }}
      >
        Connexion
      </h1>
      <p
        className="text-[13.5px] mb-7"
        style={{ color: "var(--admin-text-muted)" }}
      >
        Accède au back-office de ton hôtel.
      </p>

      {resetSuccess && (
        <div
          className="mb-4 px-3 py-2 text-[12.5px] font-semibold rounded-lg"
          style={{
            background: "#DCFCE7",
            border: "1px solid #86EFAC",
            color: "#15803D",
          }}
        >
          Mot de passe réinitialisé. Connecte-toi avec ton nouveau mot de passe.
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <AuthField label="Email" error={fieldErrors.email}>
          <AuthInput
            name="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setFieldErrors({});
              setError(null);
            }}
            placeholder="vous@hotel.fr"
          />
        </AuthField>

        <AuthField label="Mot de passe" error={fieldErrors.password}>
          <AuthInput
            name="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setFieldErrors({});
              setError(null);
            }}
            placeholder="••••••••"
          />
        </AuthField>

        <div className="text-right -mt-2 mb-4">
          <Link
            href="/forgot-password"
            className="text-[12.5px] font-semibold"
            style={{ color: "var(--admin-primary)" }}
          >
            Mot de passe oublié ?
          </Link>
        </div>

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
          {loading ? "Connexion…" : "Se connecter →"}
        </AuthPrimaryButton>
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
