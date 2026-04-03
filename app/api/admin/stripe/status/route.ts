import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/session";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { tenants } from "@/db/schema";

/**
 * GET /api/admin/stripe/status
 * Retourne le statut du compte Stripe Connect du tenant.
 */
export async function GET() {
  const { tenantId } = await requireSession();

  const [tenant] = await db
    .select({ stripeAccountId: tenants.stripeAccountId })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  if (!tenant?.stripeAccountId) {
    return NextResponse.json({ connected: false });
  }

  try {
    const account = await stripe.accounts.retrieve(tenant.stripeAccountId);

    return NextResponse.json({
      connected: true,
      accountId: account.id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
    });
  } catch {
    return NextResponse.json({ connected: false });
  }
}
