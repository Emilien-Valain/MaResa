import { type NextRequest, NextResponse } from "next/server";
import { calculatePrice } from "@/lib/pricing";

/**
 * GET /api/pricing?roomId=...&from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Retourne le détail du prix par nuit pour une chambre et une période.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const roomId = searchParams.get("roomId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const tenantId =
    request.headers.get("x-tenant-id") ?? searchParams.get("tenantId");

  if (!roomId || !from || !to || !tenantId) {
    return NextResponse.json(
      { error: "Paramètres manquants : roomId, from, to requis" },
      { status: 400 },
    );
  }

  const checkIn = new Date(from + "T00:00:00.000Z");
  const checkOut = new Date(to + "T00:00:00.000Z");

  if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
    return NextResponse.json(
      { error: "Dates invalides. Format attendu : YYYY-MM-DD" },
      { status: 400 },
    );
  }

  if (checkOut <= checkIn) {
    return NextResponse.json(
      { error: "La date de départ doit être après la date d'arrivée" },
      { status: 400 },
    );
  }

  const breakdown = await calculatePrice(roomId, tenantId, checkIn, checkOut);

  return NextResponse.json(breakdown);
}
