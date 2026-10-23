# Server accepts guest count above capacity and check-in in the past

Status: resolved — admitBooking enforces capacity (public + manual); public schema refuses past check-in (Paris today)
Group: Should fix

## Problem

Capacity and "no past dates" are only enforced in the browser (`components/public/BookingForm.tsx:336-357`). Server path: `bookingPublicSchema` (`lib/validation.ts:85`) → `admitBooking` (`lib/booking-intake.ts`) checks neither.

Failure cases (tampered POST): `guestCount=12` on a capacity-2 room is accepted and charged; `checkIn=<yesterday>` is accepted if no hold covers it.

## Fix

- `admitBooking`: add `guestCount` to `AdmitInput`; after loading the room, throw a clear FR error if `guestCount > room.capacity`. Applies to manual intake too (manual form already sends guestCount) — confirm with existing manual tests.
- Public path only: reject `checkIn < today (UTC)` — a `.refine` on `bookingPublicSchema` using the UTC-midnight helper from `lib/date-windows.ts` (`todayStart`).
- Errors must reach the guest as messages — relies on issue 04.

## Acceptance

- Direct POST with guestCount > capacity → refused, no booking row. guestCount == capacity → accepted (boundary).
- Public booking with checkIn yesterday → refused; checkIn today → accepted.
- Tests in `e2e/public/booking-flow.spec.ts` / `security.spec.ts`; Obsidian spec updated.

## Comments

- 2026-10-23 — Fixed. `AdmitInput.guestCount` (required); `admitBooking` throws `CapacityError` after loading the room. Both actions map it to a `guestCount` field error (manual: no more generic page). `bookingPublicSchema` refines `checkIn >= parisToday()`.
- Deviation: the issue said `todayStart` (UTC midnight); I used `parisToday()` from the same module (string YYYY-MM-DD), which is what « aujourd'hui » means everywhere else in the app (dashboard, calendar). `BookingForm` `min`/defaults switched from browser-UTC today to `parisToday()` so a guest at 00:30 Paris isn't offered a date the server refuses.
- Tests: `e2e/public/booking-flow.spec.ts` (capacity 3 refused / 2 admitted; yesterday refused), `e2e/admin/intake-admission.spec.ts` (manual capacity), `e2e/unit/stay-length.spec.ts` (today/yesterday schema). `e2e/unit/admission-pool-probe.ts` passes `guestCount: 1`.
- Full suite: 274 passed, 3 skipped, 1 failed (`e2e/auth/login.spec.ts:87`, pre-existing).
