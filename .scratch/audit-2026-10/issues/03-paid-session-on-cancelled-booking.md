# Guest can pay for a booking that was cancelled meanwhile — silently

Status: resolved — payment marked paid, admins alerted once to refund; booking stays cancelled
Group: Must fix

## Problem

`app/api/webhooks/stripe/route.ts:41-50`: on `checkout.session.completed`, the booking is confirmed only from `pending`; otherwise the handler `break`s silently.

Failure case: guest opens Stripe Checkout (session lives 30 min). Admin cancels the pending booking from `/admin/reservations/[id]`. Guest pays. Webhook finds `cancelled` → no update, `payments` row stays `pending`, no email, no log. Money is captured, guest has no booking, host doesn't know.

The existing test "checkout.session.completed ne ressuscite pas un booking annulé" correctly forbids reconfirming — keep that rule.

## Fix (decision: alert, no auto-refund)

In the `confirmed.length === 0` branch for `checkout.session.completed`:
1. Look up the booking. If it exists and is `cancelled`:
   - Mark the payment `paid` with `stripePaymentId` (money really was received).
   - `console.error` a clear line with booking id + payment intent.
   - Email every tenant admin (reuse the admin-lookup loop already in the handler) saying: "Paiement reçu sur une réservation annulée — remboursez via Stripe" with guest name/email, dates, amount.
2. Duplicate deliveries must not send the email twice: only act if the payment row was still `pending` (conditional update `where status = 'pending'` + `.returning()`).

Optional (not required): show a "payé après annulation" badge on the admin booking page using `getLatestPayment`.

## Acceptance

- Extend `e2e/payment/stripe-webhook.spec.ts`: cancelled booking + completed event → booking stays `cancelled`, payment becomes `paid`, admin email sent once; second delivery of the same event → no second email.
- Existing webhook tests still pass. Obsidian spec updated.

## Comments

- 2026-10-23 — Fixed in `app/api/webhooks/stripe/route.ts`: `handlePaidAfterCancellation()` runs when the confirm update hits 0 rows. Booking (scoped to tenant) must be `cancelled`; then conditional `payments` update `where status = 'pending'` + `.returning()` gates the `console.error` and the alert. New `sendPaidAfterCancellationAlert` in `lib/email.ts` (reuses layout + summary table).
- Refactor inside the handler: the admin loop (1 query per admin) became `tenantAdminEmails()` (one join), and booking/room/tenant loading became `loadEmailContext()`, shared by the normal confirmation path and the new alert. The `expired` branch is untouched.
- Test: `e2e/payment/stripe-webhook.spec.ts` "paiement reçu sur un booking annulé…". Emails counted by a new minimal fake SMTP (`e2e/helpers/smtp-sink.ts`, port 1025). Verified: fails on the old `break`, passes with the fix.
- Optional "payé après annulation" admin badge: not done.
- Full suite: 266 passed, 3 skipped, 1 failed (`e2e/auth/login.spec.ts:87`, same pre-existing ordering failure noted in issue 02).
- 2026-10-23 — Optional badge added: `/admin/reservations/[id]` shows « Payé après annulation » + red refund banner (amount, payment intent) when booking is `cancelled` and latest payment `paid`. `getLatestPayment` now also selects `stripePaymentId`. Test in `e2e/admin/reservations.spec.ts` (+ negative case: confirmed+paid shows « Payé en ligne », no banner).
