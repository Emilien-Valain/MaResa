import { type NextRequest, NextResponse } from "next/server";
import { isRoomAvailable, getBlockedDates } from "@/lib/availability";

/**
 * GET /api/availability
 *
 * Paramètres :
 *   roomId   — UUID de la chambre
 *   from     — date ISO (YYYY-MM-DD) de début
 *   to       — date ISO (YYYY-MM-DD) de fin (exclusive)
 *
 * tenantId :
 *   - En production : injecté par le middleware via l'en-tête `x-tenant-id`
 *     (résolution domain → tenant, Phase 4)
 *   - En test : passé en query param `tenantId` (jamais en production)
 *
 * Réponse :
 *   { available: boolean, blockedDates: string[] }
 *
 * Codes HTTP :
 *   200 — succès
 *   400 — paramètres manquants ou invalides
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const roomId = searchParams.get("roomId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  // tenantId : header injecté par le middleware en prod, query param pour les tests
  const tenantId =
    request.headers.get("x-tenant-id") ?? searchParams.get("tenantId");

  if (!roomId || !from || !to || !tenantId) {
    return NextResponse.json(
      { error: "Paramètres manquants : roomId, from, to, tenantId requis" },
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

  const [available, blockedDates] = await Promise.all([
    isRoomAvailable(roomId, tenantId, checkIn, checkOut),
    getBlockedDates(roomId, tenantId, checkIn, checkOut),
  ]);

  return NextResponse.json({
    available,
    blockedDates: blockedDates.map((d) => d.toISOString().split("T")[0]),
  });
}
