# Remove dead `?bookingId=` lookup on the public confirmation page

Status: resolved — `?bookingId=` branch removed; confirmation reachable only via Stripe `session_id`
Group: Should fix

## Problem

`app/reserver/confirmation/page.tsx:48-52` supports `?bookingId=<id>` in addition to `?session_id=`. Nothing in the app produces that URL (grep `confirmation?bookingId` → no hits; Stripe success_url uses `session_id`).

Effects: anyone holding a booking id sees that guest's booking (name, dates, price) without auth; `?bookingId=abc` → Postgres uuid error → 500.

## Fix

Delete the `bookingId` branch and the `bookingId` searchParam type. Keep `session_id` only.

## Acceptance

- `/reserver/confirmation?bookingId=<real id>` → 404.
- `/reserver/confirmation?bookingId=abc` → 404 (not 500).
- Stripe `session_id` flow unchanged (existing tests pass).
- Grep the e2e suite for tests using `bookingId=` on this page and update them. Obsidian spec updated.

## Comments

### 2026-10-23 — resolved
- `app/reserver/confirmation/page.tsx`: removed the `else if (bookingId)` lookup and `bookingId` from the `searchParams` type. Only `session_id` is read; anything else falls through to `notFound()`. No deviation from the suggested fix.
- No existing e2e test used `bookingId=` on this page (grep), and nothing in the app builds that URL.
- New `e2e/public/confirmation.spec.ts` (5 tests, own IP `10.10.0.7`, seeds booking+payment by SQL for the tenant and the rival tenant, deletes them in `afterAll`): valid `session_id` → 200 + guest name; `?bookingId=<real id>` → 404 without guest name; `?bookingId=abc` → 404; unknown / empty / missing `session_id` → 404; rival tenant's `session_id` → 404.
- Proven on old code: the two `bookingId` tests fail (200 and 500 instead of 404); restored, verified with `cmp`.
- Obsidian `Tests de non-régression.md` > Phase 5 > Flow de paiement: new "Page de confirmation" block.
- `npx tsc --noEmit -p .` OK. Full suite: 288 passed, 3 skipped, 1 failed (known `e2e/auth/login.spec.ts:87`, XSS password, full-suite order only).
