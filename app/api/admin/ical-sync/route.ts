import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { syncTenantIcalSources } from "@/lib/ical-sync";

/**
 * POST /api/admin/ical-sync
 *
 * Déclenche la sync iCal pour le tenant courant (authentifié).
 */
export async function POST() {
  const { tenantId } = await requireSession();

  try {
    const results = await syncTenantIcalSources(tenantId);
    return NextResponse.json(results);
  } catch (err) {
    console.error("[iCal manual sync] Erreur:", err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
