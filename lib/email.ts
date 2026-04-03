import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT ?? "587", 10),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const fromAddress = process.env.SMTP_FROM ?? "noreply@maresa.fr";

function formatDate(d: Date): string {
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

type BookingEmailData = {
  guestName: string;
  guestEmail: string;
  roomName: string;
  checkIn: Date;
  checkOut: Date;
  nights: number;
  totalPrice: string;
  hotelName: string;
};

/**
 * Email de confirmation envoyé au client après paiement réussi.
 */
export async function sendBookingConfirmation(data: BookingEmailData) {
  const { guestName, guestEmail, roomName, checkIn, checkOut, nights, totalPrice, hotelName } =
    data;

  await transporter.sendMail({
    from: `${hotelName} <${fromAddress}>`,
    to: guestEmail,
    subject: `Confirmation de réservation — ${hotelName}`,
    html: `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
        <h1 style="font-size: 24px; margin-bottom: 8px;">Réservation confirmée</h1>
        <p>Bonjour ${guestName},</p>
        <p>Votre réservation à <strong>${hotelName}</strong> est confirmée. Voici le récapitulatif :</p>
        <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e5e5; color: #666;">Chambre</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e5e5; text-align: right; font-weight: 600;">${roomName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e5e5; color: #666;">Arrivée</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e5e5; text-align: right;">${formatDate(checkIn)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e5e5; color: #666;">Départ</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e5e5; text-align: right;">${formatDate(checkOut)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e5e5; color: #666;">Durée</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e5e5; text-align: right;">${nights} nuit${nights > 1 ? "s" : ""}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666; font-weight: 600;">Total payé</td>
            <td style="padding: 8px 0; text-align: right; font-size: 18px; font-weight: 600;">${totalPrice} €</td>
          </tr>
        </table>
        <p>Nous avons hâte de vous accueillir !</p>
        <p style="color: #999; font-size: 13px; margin-top: 32px;">— ${hotelName}</p>
      </div>
    `,
  });
}

type AdminNotificationData = {
  guestName: string;
  guestEmail: string;
  guestPhone: string | null;
  roomName: string;
  checkIn: Date;
  checkOut: Date;
  nights: number;
  totalPrice: string;
  hotelName: string;
  adminEmail: string;
};

/**
 * Email de notification envoyé à l'admin quand une réservation est payée.
 */
export async function sendAdminNotification(data: AdminNotificationData) {
  const {
    guestName,
    guestEmail,
    guestPhone,
    roomName,
    checkIn,
    checkOut,
    nights,
    totalPrice,
    hotelName,
    adminEmail,
  } = data;

  await transporter.sendMail({
    from: `MaRésa <${fromAddress}>`,
    to: adminEmail,
    subject: `Nouvelle réservation — ${guestName} (${roomName})`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
        <h1 style="font-size: 20px; margin-bottom: 16px;">Nouvelle réservation payée</h1>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; color: #666;">Client</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 600;">${guestName}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #666;">Email</td>
            <td style="padding: 6px 0; text-align: right;">${guestEmail}</td>
          </tr>
          ${guestPhone ? `<tr><td style="padding: 6px 0; color: #666;">Téléphone</td><td style="padding: 6px 0; text-align: right;">${guestPhone}</td></tr>` : ""}
          <tr>
            <td style="padding: 6px 0; color: #666;">Chambre</td>
            <td style="padding: 6px 0; text-align: right;">${roomName}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #666;">Dates</td>
            <td style="padding: 6px 0; text-align: right;">${formatDate(checkIn)} → ${formatDate(checkOut)} (${nights} nuit${nights > 1 ? "s" : ""})</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #666; font-weight: 600;">Montant</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 600;">${totalPrice} €</td>
          </tr>
        </table>
        <p style="color: #999; font-size: 13px; margin-top: 24px;">— ${hotelName} via MaRésa</p>
      </div>
    `,
  });
}
