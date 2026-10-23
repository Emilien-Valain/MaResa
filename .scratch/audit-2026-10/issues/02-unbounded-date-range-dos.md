# Unbounded date ranges on public endpoints let one request pin the CPU

Status: resolved — 366-night cap shared by the 3 public routes (400) and both booking schemas
Group: Must fix

## Problem

Public routes accept any `from`/`to`:
- `app/api/pricing/route.ts:25` → `calculatePrice` loops once per night and returns one JSON object per night.
- `app/api/availability/route.ts:43` → `blockedDates`/`getBlockedDates`; an open-ended weekly manual block expands to every day of the window.
- `app/api/rooms/available/route.ts:26` → same expansion × every room.
- `createBookingPublic` (`lib/actions/bookings-public.ts`) → `bookingPublicSchema` has no max stay.

Failure case: `GET /api/pricing?roomId=<id>&tenantId=<id>&from=1970-01-01&to=9999-12-31` → ~2.9 M iterations and a response of several hundred MB. A few such requests per minute stay under the 60/min rate limit and can stall or OOM the single Node process for every tenant.

`quoteManualBooking` (`lib/actions/bookings.ts`) already caps at 366 days — reuse that bound.

## Fix

- One shared constant/check (e.g. `MAX_STAY_NIGHTS = 366` + a small `isStayTooLong(checkIn, checkOut)` in `lib/validation.ts`, or a `.refine` on the schemas).
- Return 400 from the 3 API routes when exceeded.
- Add the same `.refine` to `bookingPublicSchema` (and `bookingManualSchema`, replacing the ad-hoc check in `quoteManualBooking`).

## Acceptance

- `/api/pricing`, `/api/availability`, `/api/rooms/available` with a range > 366 nights → 400, fast.
- Range of exactly 366 nights still works; 367 rejected (boundary test).
- Public booking with checkOut 2 years after checkIn is refused with a readable message (depends on issue 04 for display; at minimum it must not create a booking).
- Tests in `e2e/public/security.spec.ts`; Obsidian spec updated.

## Comments

- 2026-10-23 — Fixed. `lib/validation.ts`: `MAX_STAY_NIGHTS = 366`, `STAY_TOO_LONG_MESSAGE`, `isStayTooLong()`; `.refine` on `bookingPublicSchema` + `bookingManualSchema`. `/api/pricing`, `/api/availability`, `/api/rooms/available` return 400. `quoteManualBooking` uses `isStayTooLong` instead of its inline 366 check.
- Tests: `e2e/public/security.spec.ts` (366 OK / 367 → 400 / 1970→9999 fast 400 / 2-year public booking: button disabled, forced submit leaves no booking) and `e2e/unit/stay-length.spec.ts` (schemas).
- Finding: the forced-submit E2E passes even WITHOUT the refine, because `createBookingPublic` deletes the pending booking when Stripe fails (test key). Schema rejection is proven by the unit test instead (verified: fails without the refine, passes with it). The guest-facing message still shows as the generic error page until issue 04.
- Full suite: 265 passed, 3 skipped, 1 failed: `e2e/auth/login.spec.ts:87` (XSS password, `/login` never renders `[name="email"]` within 30 s). It passes alone (14/14 in the file); it failed only on order in the full run, and was already flaky during issue 01. Not touched by this change — worth checking alongside issue 12 (login rate limit).
