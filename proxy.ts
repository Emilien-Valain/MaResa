import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { and, eq } from "drizzle-orm";
import { tenants, userTenants } from "@/db/schema";

// ── Cache in-memory tenant (5 min) ──────────────────────────────────────────

type CachedTenant = {
  id: string;
  slug: string;
  name: string;
  domain: string | null;
  config: unknown;
  createdAt: Date | null;
  expiresAt: number;
};

const tenantCache = new Map<string, CachedTenant>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function resolveTenant(host: string): Promise<CachedTenant | null> {
  const now = Date.now();

  const cached = tenantCache.get(host);
  if (cached && cached.expiresAt > now) {
    return cached;
  }

  let tenant: Omit<CachedTenant, "expiresAt"> | undefined;

  if (host === "localhost" || host.endsWith(".localhost")) {
    // En dev local : lookup par slug
    // - localhost seul → PUBLIC_TENANT_SLUG dans .env.local
    // - <slug>.localhost → slug extrait du sous-domaine
    const slug = host === "localhost"
      ? process.env.PUBLIC_TENANT_SLUG
      : host.replace(/\.localhost$/, "");

    if (!slug) return null;

    const [row] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.slug, slug))
      .limit(1);

    tenant = row ?? undefined;
  } else {
    // En production : lookup par domain
    const [row] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.domain, host))
      .limit(1);

    tenant = row ?? undefined;
  }

  if (!tenant) {
    return null;
  }

  const cached2: CachedTenant = { ...tenant, expiresAt: now + CACHE_TTL_MS };
  tenantCache.set(host, cached2);
  return cached2;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Routes login et API → passe-plat ────────────────────────────────────
  if (pathname.startsWith("/login") || pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // ── Résolution tenant (nécessaire pour toutes les routes) ────────────────
  const hostHeader = request.headers.get("host") ?? "";
  const host = hostHeader.split(":")[0];

  const tenant = await resolveTenant(host);

  if (!tenant) {
    return new NextResponse("Not Found", { status: 404 });
  }

  // ── Protection des routes /admin ─────────────────────────────────────────
  if (pathname.startsWith("/admin")) {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Vérifier que l'utilisateur a accès au tenant courant (many-to-many)
    const membership = await db.query.userTenants.findFirst({
      where: and(
        eq(userTenants.userId, session.user.id),
        eq(userTenants.tenantId, tenant.id),
      ),
    });
    if (!membership) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // ── Injecter x-tenant-id dans les headers de la requête ─────────────────
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-tenant-id", tenant.id);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    // Exclut les fichiers statiques et les routes auth
    "/((?!api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
