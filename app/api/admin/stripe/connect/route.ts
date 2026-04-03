import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/session";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { tenants } from "@/db/schema";

/**
 * POST /api/admin/stripe/connect
 * Crée un compte Stripe Connect (si pas déjà fait) et retourne l'URL d'onboarding.
 */
export async function POST(request: NextRequest) {
  const { tenantId } = await requireSession();

  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  if (!tenant) {
    return NextResponse.json({ error: "Tenant introuvable" }, { status: 404 });
  }

  let accountId = tenant.stripeAccountId;

  // Créer un compte Connect si le tenant n'en a pas encore
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      country: "FR",
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_profile: {
        name: tenant.name,
      },
    });

    accountId = account.id;

    await db
      .update(tenants)
      .set({ stripeAccountId: accountId })
      .where(eq(tenants.id, tenantId));
  }

  // Générer le lien d'onboarding
  const origin = request.headers.get("origin") ?? "http://localhost:3000";

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${origin}/admin/parametres?stripe=refresh`,
    return_url: `${origin}/admin/parametres?stripe=success`,
    type: "account_onboarding",
  });

  return NextResponse.json({ url: accountLink.url });
}

/**
 * DELETE /api/admin/stripe/connect
 * Déconnecte le compte Stripe Connect du tenant.
 */
export async function DELETE() {
  const { tenantId } = await requireSession();

  await db
    .update(tenants)
    .set({ stripeAccountId: null })
    .where(eq(tenants.id, tenantId));

  return NextResponse.json({ ok: true });
}
