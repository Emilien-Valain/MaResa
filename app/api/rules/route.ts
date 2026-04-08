import { type NextRequest, NextResponse } from "next/server";
import { getEffectiveRules } from "@/lib/booking-rules";

/**
 * GET /api/rules?roomId=...&checkIn=YYYY-MM-DD
 *
 * Retourne les règles de réservation effectives pour une chambre.
 * Utilisé par le formulaire de réservation côté client.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const roomId = searchParams.get("roomId");
  const checkInStr = searchParams.get("checkIn");
  const tenantId =
    request.headers.get("x-tenant-id") ?? searchParams.get("tenantId");

  if (!roomId || !tenantId) {
    return NextResponse.json(
      { error: "Paramètres manquants : roomId requis" },
      { status: 400 },
    );
  }

  const checkIn = checkInStr
    ? new Date(checkInStr + "T00:00:00.000Z")
    : new Date();

  const rules = await getEffectiveRules(roomId, tenantId, checkIn);

  return NextResponse.json(rules);
}
