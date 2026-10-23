# Public booking: refused bookings show the generic Next error page

Status: resolved — createBookingPublic returns refusals to the form (useActionState); values kept
Group: Must fix

## Problem

`components/public/BookingForm.tsx` posts to `createBookingPublic` via `<form action={createBookingPublic}>` (lines ~535 and ~579). The action **throws** on:
- invalid input (`parseFormData` at `lib/actions/bookings-public.ts:26`)
- `RoomUnavailableError` and booking-rule violations from `admitBooking` (line 35)
- Stripe session creation failure

In production, thrown server-action errors are masked (the code itself says so in `lib/validation.ts`, "Résultat des server actions de formulaire"), and there is no `app/error.tsx`. 

Failure case: two guests pick the same nights; the second one submits after the first → generic "Application error" page, no explanation, form lost.

## Fix

Follow the pattern already used by `createBookingManual` (`lib/actions/bookings.ts`):
- Signature `(prev, formData) => Promise<State>`; use `safeParseFormData`.
- Catch `RoomUnavailableError` → `{ error: "Ces dates viennent d'être réservées…" }`; catch rule-violation errors → their message; catch Stripe failure → generic friendly message (booking row is already deleted in that path).
- `redirect(session.url)` stays outside the try/catch (redirect throws by design).
- In `BookingForm`, use `useActionState` and render the error (both Classic and Boutique layouts), keeping entered values.

## Acceptance

- Playwright (`e2e/public/booking-flow.spec.ts`): create a pending booking on dates X via helper, then submit the public form for the same dates → page shows a readable error, stays on `/reserver/[roomId]`, no new booking row.
- Invalid email posted directly (bypass browser validation) → readable error, not a crash.
- Happy path still redirects to Stripe. Obsidian spec updated.

## Comments

- 2026-10-23 — Fixed. `createBookingPublic(prev, formData)` returns `PublicBookingState` (`safeParseFormData`; `RoomUnavailableError` → « Ces dates viennent d'être réservées… »; new `BookingRulesError` (in `lib/booking-intake.ts`) → its message; « Chambre introuvable » → friendly text; Stripe failure → booking deleted + friendly message + `console.error`). `redirect(session.url)` stays outside try/catch. Unexpected errors still throw.
- `BookingForm`: `useActionState`, error box (`data-testid="booking-error"`) in both Classic and Boutique, `key={JSON.stringify(values)}` + `defaultValue` to keep name/email/phone, submit disabled while submitting, availability re-checked after a refusal (`state` in the effect deps).
- Tests in `e2e/public/booking-flow.spec.ts`: dates taken meanwhile, invalid email (noValidate), Stripe unavailable (skipped with a real key). Happy path to Stripe remains skipped without a real key (unchanged).
- Found: existing public tests fill dates before hydration and React resets them to today/tomorrow — they pass only because those defaults are free. New tests use `fillRefusalDates` (retry until value sticks). Older tests not changed.
- Full suite: 270 passed, 3 skipped, 1 failed (`e2e/auth/login.spec.ts:87`, pre-existing, see issue 02).
