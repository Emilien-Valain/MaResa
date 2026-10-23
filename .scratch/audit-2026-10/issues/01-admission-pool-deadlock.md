# Concurrent bookings exhaust the pg pool and freeze the whole site

Status: resolved — admission path runs entirely on `tx`; pool times out after 10 s instead of hanging
Group: Must fix

## Problem

`admitBooking` (`lib/booking-intake.ts:56-95`) opens `db.transaction` (holds 1 pool connection), takes `pg_advisory_xact_lock`, then calls `isRoomAvailable` → `blockedDates` (3 parallel queries), `validateBookingRules`, and `calculatePrice`. All of those use the **global `db` pool**, not `tx`, so each admission needs extra connections while already holding one.

`lib/db.ts` creates `new Pool()` with defaults: `max = 10`, `connectionTimeoutMillis = 0` (wait forever).

Failure case: 10 booking submits arrive together (bot, double-clicks, two tabs). All 10 pool connections are held by transactions; the lock holder waits forever for an 11th connection; the other 9 wait forever on the advisory lock. Every request that touches the DB — every page of every tenant — hangs until restart.

## Fix

1. Add an optional connection parameter (default `db`) to:
   - `blockedDates` in `lib/holds.ts` (and `isRoomAvailable` in `lib/availability.ts`)
   - `validateBookingRules` / `getEffectiveRules` in `lib/booking-rules.ts`
   - `calculatePrice` (and `loadPricingContext`) in `lib/pricing.ts`
   Type it as the existing `Tx | typeof db` (see `Tx` export in `lib/booking-intake.ts`).
2. In `admitBooking`, pass `tx` to all three.
3. In `lib/db.ts`, set `connectionTimeoutMillis` (e.g. 10_000) so pool exhaustion becomes an error instead of a permanent hang.

Note: `blockedDates` runs its 3 queries with `Promise.all`. On a single `tx` client, pg queues them serially — that's fine, keep the code as is.

## Acceptance

- Every query inside `admitBooking` runs on `tx` (grep: no `db.` reachable from the admission path).
- New Playwright test (`e2e/public/` or `e2e/admin/intake-admission.spec.ts`): fire ≥12 concurrent admissions on the same room/nights (e.g. `Promise.all` of manual-intake form posts, or a direct server-action call loop) and assert: all requests finish within a timeout, exactly one booking is created, `/api/health` still returns 200 afterwards.
- Existing test "deux saisies simultanées sur les mêmes nuits" still passes.
- Obsidian `Tests de non-régression.md` updated.

## Comments

- 2026-10-23 — Fixed. `blockedDates`, `isRoomAvailable`, `validateBookingRules`, `getEffectiveRules`, `calculatePrice`, `loadPricingContext` take `conn: Tx | typeof db = db`; `admitBooking` passes `tx`. `lib/db.ts`: `connectionTimeoutMillis: 10_000`.
- Test deviation: a Playwright test with 12 browser tabs did NOT reproduce the freeze (submits arrive too staggered) — it passed on the buggy code. Replaced with a Node probe (`e2e/unit/admission-pool.spec.ts` + `admission-pool-probe.ts`) firing 12 `admitBooking` calls via `Promise.allSettled`. Verified: buggy code → `finished:false, poolOk:false`; fixed → 1 created, 11 conflicts, pool OK. "/api/health" check replaced by a `select 1` on the same pool (same signal, no HTTP server in the unit project).
- Full suite: 259 passed, 3 skipped, 1 flaky (login XSS, `/login` load timeout, passed on retry — unrelated).
- Side effect: pg logs `DeprecationWarning: Calling client.query() when the client is already executing a query` — from `Promise.all` in `blockedDates`/`loadPricingContext` on a single `tx` client. Works on pg@8; will break on pg@9. Kept as the issue instructed.
