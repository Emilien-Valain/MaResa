import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { db } from "@/lib/db";
import { bookings, rooms, tenants } from "@/db/schema";

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  cancelled: "Annulée",
  completed: "Terminée",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const headersList = await headers();

  // Le middleware proxy gère l'auth et injecte x-tenant-id
  const tenantId = headersList.get("x-tenant-id");
  if (!tenantId) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Load booking
  const [booking] = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.id, id), eq(bookings.tenantId, tenantId)))
    .limit(1);

  if (!booking) {
    return new Response("Not found", { status: 404 });
  }

  // Load room and tenant
  const [room] = await db
    .select({ name: rooms.name })
    .from(rooms)
    .where(eq(rooms.id, booking.roomId))
    .limit(1);

  const [tenant] = await db
    .select({ name: tenants.name, config: tenants.config })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  const config = (tenant?.config ?? {}) as Record<string, string>;

  // Generate PDF
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const dark = rgb(0.1, 0.1, 0.1);
  const medium = rgb(0.35, 0.35, 0.35);
  const light = rgb(0.6, 0.6, 0.6);
  const accent = rgb(0.76, 0.55, 0.2);
  const lineColor = rgb(0.85, 0.83, 0.8);

  const margin = 50;
  const pageWidth = 595 - margin * 2;
  let y = 792; // Start from top (842 - 50)

  // ── Header: Hotel name ──
  page.drawText(tenant?.name ?? "MaRésa", {
    x: margin,
    y,
    size: 22,
    font: helveticaBold,
    color: dark,
  });
  y -= 20;

  // Address / contact
  const contactParts: string[] = [];
  if (config.address) contactParts.push(config.address);
  if (config.phone) contactParts.push(config.phone);
  if (config.email) contactParts.push(config.email);
  if (contactParts.length > 0) {
    page.drawText(contactParts.join("  ·  "), {
      x: margin,
      y,
      size: 9,
      font: helvetica,
      color: light,
    });
    y -= 14;
  }

  // Separator
  y -= 10;
  page.drawLine({
    start: { x: margin, y },
    end: { x: margin + pageWidth, y },
    thickness: 1,
    color: lineColor,
  });
  y -= 30;

  // ── Title ──
  page.drawText("Confirmation de réservation", {
    x: margin,
    y,
    size: 16,
    font: helveticaBold,
    color: dark,
  });
  y -= 22;

  // Status badge
  const statusText = STATUS_LABELS[booking.status] ?? booking.status;
  page.drawText(`Statut : ${statusText}`, {
    x: margin,
    y,
    size: 10,
    font: helvetica,
    color: booking.status === "confirmed" ? rgb(0.1, 0.55, 0.2) : medium,
  });
  y -= 10;

  // Ref
  page.drawText(`Réf. : ${booking.id.slice(0, 8).toUpperCase()}`, {
    x: margin + pageWidth - 120,
    y: y + 10,
    size: 9,
    font: helvetica,
    color: light,
  });
  y -= 20;

  // ── Section helper ──
  function drawSection(title: string) {
    y -= 8;
    page.drawLine({
      start: { x: margin, y: y + 4 },
      end: { x: margin + pageWidth, y: y + 4 },
      thickness: 0.5,
      color: lineColor,
    });
    y -= 16;
    page.drawText(title.toUpperCase(), {
      x: margin,
      y,
      size: 8,
      font: helveticaBold,
      color: accent,
    });
    y -= 18;
  }

  function drawRow(label: string, value: string) {
    page.drawText(label, {
      x: margin,
      y,
      size: 10,
      font: helvetica,
      color: medium,
    });
    page.drawText(value, {
      x: margin + 160,
      y,
      size: 10,
      font: helveticaBold,
      color: dark,
    });
    y -= 18;
  }

  // ── Séjour ──
  drawSection("Séjour");

  const checkIn = new Date(booking.checkIn);
  const checkOut = new Date(booking.checkOut);
  const nights = Math.ceil(
    (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
  );
  const formatDate = (d: Date) =>
    d.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  drawRow("Chambre", room?.name ?? "—");
  drawRow("Arrivée", formatDate(checkIn));
  drawRow("Départ", formatDate(checkOut));
  drawRow("Durée", `${nights} nuit${nights > 1 ? "s" : ""}`);
  drawRow(
    "Voyageurs",
    `${booking.guestCount} personne${booking.guestCount > 1 ? "s" : ""}`,
  );

  // ── Client ──
  drawSection("Client");
  drawRow("Nom", booking.guestName);
  drawRow("Email", booking.guestEmail);
  if (booking.guestPhone) drawRow("Téléphone", booking.guestPhone);

  // ── Paiement ──
  drawSection("Paiement");
  const pricePerNight =
    nights > 0
      ? (parseFloat(booking.totalPrice) / nights).toFixed(2)
      : booking.totalPrice;
  drawRow("Prix / nuit", `${pricePerNight} €`);
  drawRow("Nombre de nuits", String(nights));

  y -= 4;
  page.drawLine({
    start: { x: margin + 160, y: y + 2 },
    end: { x: margin + pageWidth, y: y + 2 },
    thickness: 0.5,
    color: lineColor,
  });
  y -= 14;

  page.drawText("Total", {
    x: margin,
    y,
    size: 12,
    font: helveticaBold,
    color: dark,
  });
  page.drawText(`${parseFloat(booking.totalPrice).toFixed(2)} €`, {
    x: margin + 160,
    y,
    size: 12,
    font: helveticaBold,
    color: dark,
  });
  y -= 18;

  drawRow(
    "Source",
    booking.source === "manual" ? "Saisie manuelle" : "Site web",
  );

  // ── Notes ──
  if (booking.notes) {
    drawSection("Notes");
    page.drawText(booking.notes, {
      x: margin,
      y,
      size: 10,
      font: helvetica,
      color: medium,
      maxWidth: pageWidth,
    });
    y -= 18;
  }

  // ── Footer ──
  page.drawText(
    `Généré le ${new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`,
    {
      x: margin,
      y: 50,
      size: 8,
      font: helvetica,
      color: light,
    },
  );

  // Serialize
  const pdfBytes = await pdfDoc.save();

  const filename = `reservation-${booking.id.slice(0, 8)}-${booking.guestName.replace(/\s+/g, "-").toLowerCase()}.pdf`;

  return new Response(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}
