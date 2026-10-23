import { type NextRequest, NextResponse } from "next/server";
import { getAvailableRooms } from "@/lib/availability";
import { getMinPricePerNight } from "@/lib/pricing";
import { isStayTooLong, isUuid, STAY_TOO_LONG_MESSAGE } from "@/lib/validation";

/**
 * GET /api/rooms/available?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Retourne les chambres actives du tenant disponibles pour la période donnée.
 * tenantId injecté par le middleware via x-tenant-id (ou query param pour les tests).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const tenantId =
    request.headers.get("x-tenant-id") ?? searchParams.get("tenantId");

  if (!from || !to || !tenantId) {
    return NextResponse.json(
      { error: "Paramètres manquants : from, to requis" },
      { status: 400 },
    );
  }

  // Un id non-UUID ferait planter Postgres (« invalid input syntax for type uuid ») → 500
  if (!isUuid(tenantId)) {
    return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
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

  if (isStayTooLong(checkIn, checkOut)) {
    return NextResponse.json({ error: STAY_TOO_LONG_MESSAGE }, { status: 400 });
  }

  const availableRooms = await getAvailableRooms(tenantId, checkIn, checkOut);

  // Ajouter le prix minimum par chambre (pour "à partir de X€/nuit")
  const roomsWithMinPrice = await Promise.all(
    availableRooms.map(async (room) => ({
      ...room,
      minPricePerNight: await getMinPricePerNight(room.id, tenantId),
    })),
  );

  return NextResponse.json({ rooms: roomsWithMinPrice });
}
