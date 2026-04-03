import fs from "fs";
import path from "path";
import crypto from "crypto";
import { Pool } from "pg";
import { test, expect } from "@playwright/test";

/**
 * Spécification : Tests de non-régression > Paiement > Webhook Stripe
 * Référence Obsidian : Phase 5.1 — Stripe
 *
 * Ces tests envoient des requêtes HTTP directes au webhook Stripe
 * avec des signatures valides pour vérifier le traitement des événements.
 */

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "whsec_test_XXXX";
const BASE_URL = "http://localhost:3001";

function loadTestContext() {
  const contextPath = path.join(process.cwd(), "e2e", ".auth", "test-context.json");
  return JSON.parse(fs.readFileSync(contextPath, "utf-8")) as {
    tenantId: string;
    apiRoomId: string;
  };
}

/**
 * Génère un header de signature Stripe valide pour un payload donné.
 * Reproduit le comportement de Stripe.webhooks.generateTestHeaderString.
 */
function generateStripeSignature(payload: string, secret: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${payload}`;
  const signature = crypto
    .createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");
  return `t=${timestamp},v1=${signature}`;
}

/**
 * Crée un booking + payment de test en DB et retourne les IDs.
 */
async function createTestBookingWithPayment(
  pool: Pool,
  tenantId: string,
  roomId: string,
  stripeSessionId: string,
) {
  const bookingResult = await pool.query(
    `INSERT INTO bookings (tenant_id, room_id, check_in, check_out, total_price, status, guest_name, guest_email, guest_count, source)
     VALUES ($1, $2, '2026-09-01', '2026-09-05', '400.00', 'pending', 'Test Webhook', 'webhook@test.com', 2, 'direct')
     RETURNING id`,
    [tenantId, roomId],
  );
  const bookingId = bookingResult.rows[0].id;

  await pool.query(
    `INSERT INTO payments (tenant_id, booking_id, stripe_session_id, amount, currency, status)
     VALUES ($1, $2, $3, '400.00', 'eur', 'pending')`,
    [tenantId, bookingId, stripeSessionId],
  );

  return bookingId;
}

test.describe("Paiement — Webhook Stripe", () => {
  let pool: Pool;

  test.beforeAll(() => {
    pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
  });

  test.afterAll(async () => {
    await pool.end();
  });

  // ─── Happy path ────────────────────────────────────────────────────────────

  test("checkout.session.completed passe le booking en confirmed et le payment en paid", async ({
    request,
  }) => {
    const { tenantId, apiRoomId } = loadTestContext();
    const sessionId = `cs_test_completed_${Date.now()}`;

    const bookingId = await createTestBookingWithPayment(
      pool,
      tenantId,
      apiRoomId,
      sessionId,
    );

    try {
      const eventPayload = JSON.stringify({
        id: `evt_test_${Date.now()}`,
        type: "checkout.session.completed",
        data: {
          object: {
            id: sessionId,
            payment_intent: `pi_test_${Date.now()}`,
            metadata: { bookingId, tenantId },
          },
        },
      });

      const signature = generateStripeSignature(eventPayload, WEBHOOK_SECRET);

      const response = await request.post(`${BASE_URL}/api/webhooks/stripe`, {
        data: eventPayload,
        headers: {
          "content-type": "application/json",
          "stripe-signature": signature,
        },
      });

      expect(response.status()).toBe(200);

      // Vérifier que le booking est passé en confirmed
      const bookingResult = await pool.query(
        "SELECT status FROM bookings WHERE id = $1",
        [bookingId],
      );
      expect(bookingResult.rows[0].status).toBe("confirmed");

      // Vérifier que le payment est passé en paid
      const paymentResult = await pool.query(
        "SELECT status, stripe_payment_id FROM payments WHERE stripe_session_id = $1",
        [sessionId],
      );
      expect(paymentResult.rows[0].status).toBe("paid");
      expect(paymentResult.rows[0].stripe_payment_id).toBeTruthy();
    } finally {
      // Nettoyage
      await pool.query("DELETE FROM payments WHERE booking_id = $1", [bookingId]);
      await pool.query("DELETE FROM bookings WHERE id = $1", [bookingId]);
    }
  });

  test("checkout.session.expired passe le booking en cancelled et le payment en expired", async ({
    request,
  }) => {
    const { tenantId, apiRoomId } = loadTestContext();
    const sessionId = `cs_test_expired_${Date.now()}`;

    const bookingId = await createTestBookingWithPayment(
      pool,
      tenantId,
      apiRoomId,
      sessionId,
    );

    try {
      const eventPayload = JSON.stringify({
        id: `evt_test_${Date.now()}`,
        type: "checkout.session.expired",
        data: {
          object: {
            id: sessionId,
            metadata: { bookingId, tenantId },
          },
        },
      });

      const signature = generateStripeSignature(eventPayload, WEBHOOK_SECRET);

      const response = await request.post(`${BASE_URL}/api/webhooks/stripe`, {
        data: eventPayload,
        headers: {
          "content-type": "application/json",
          "stripe-signature": signature,
        },
      });

      expect(response.status()).toBe(200);

      // Vérifier que le booking est passé en cancelled
      const bookingResult = await pool.query(
        "SELECT status FROM bookings WHERE id = $1",
        [bookingId],
      );
      expect(bookingResult.rows[0].status).toBe("cancelled");

      // Vérifier que le payment est passé en expired
      const paymentResult = await pool.query(
        "SELECT status FROM payments WHERE stripe_session_id = $1",
        [sessionId],
      );
      expect(paymentResult.rows[0].status).toBe("expired");
    } finally {
      await pool.query("DELETE FROM payments WHERE booking_id = $1", [bookingId]);
      await pool.query("DELETE FROM bookings WHERE id = $1", [bookingId]);
    }
  });

  // ─── Cas d'erreur ──────────────────────────────────────────────────────────

  test("signature Stripe invalide retourne 400", async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/webhooks/stripe`, {
      data: JSON.stringify({ type: "test" }),
      headers: {
        "content-type": "application/json",
        "stripe-signature": "t=123,v1=invalide",
      },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Signature invalide");
  });

  test("signature Stripe absente retourne 400", async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/webhooks/stripe`, {
      data: JSON.stringify({ type: "test" }),
      headers: {
        "content-type": "application/json",
      },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Signature manquante");
  });

  test("événement avec bookingId inexistant ne plante pas (200)", async ({ request }) => {
    const eventPayload = JSON.stringify({
      id: `evt_test_${Date.now()}`,
      type: "checkout.session.completed",
      data: {
        object: {
          id: `cs_test_unknown_${Date.now()}`,
          payment_intent: "pi_test_unknown",
          metadata: {
            bookingId: "00000000-0000-0000-0000-000000000000",
            tenantId: "00000000-0000-0000-0000-000000000000",
          },
        },
      },
    });

    const signature = generateStripeSignature(eventPayload, WEBHOOK_SECRET);

    const response = await request.post(`${BASE_URL}/api/webhooks/stripe`, {
      data: eventPayload,
      headers: {
        "content-type": "application/json",
        "stripe-signature": signature,
      },
    });

    // Le webhook doit toujours répondre 200 (Stripe réessaie sinon)
    expect(response.status()).toBe(200);
  });
});
