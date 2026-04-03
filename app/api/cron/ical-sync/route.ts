import { NextRequest, NextResponse } from "next/server";
import { syncAllIcalSources } from "@/lib/ical-sync";

/**
 * GET /api/cron/ical-sync
 *
 * Déclenche la synchronisation de toutes les sources iCal actives.
 * Protégé par un secret partagé (CRON_SECRET) pour éviter les appels non autorisés.
 *
 * Usage Coolify : ajouter un cron job qui appelle cette URL toutes les 15 min :
 *   curl -s -H "Authorization: Bearer $CRON_SECRET" https://domaine/api/cron/ical-sync
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;

  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const results = await syncAllIcalSources();
    return NextResponse.json(results);
  } catch (err) {
    console.error("[iCal cron] Erreur:", err);
    return NextResponse.json(
      { error: "Sync failed" },
      { status: 500 },
    );
  }
}
