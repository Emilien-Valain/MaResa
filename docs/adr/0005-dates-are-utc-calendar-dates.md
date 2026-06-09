# Dates are timezone-less calendar dates, normalized to UTC; deploy in UTC

A booking night is a calendar date, not an instant. All domain dates — `checkIn`, `checkOut`, block `start`/`end`, rule windows — are stored as **UTC midnight** and always compared **date-only**; every day-of-week and day-iteration computation uses `getUTC*` / `setUTCDate`. The booking core already does this consistently (pricing, booking-rules, manual-blocks, availability).

Consequence: **the deployment must run in UTC** (`TZ=UTC`). Local-timezone date math against UTC-stored values drifts by the offset — this is a load-bearing, otherwise-silent assumption.

Scope is **metropolitan France** (UTC+1/+2), where UTC-midnight renders on the correct calendar day. Overseas territories *west* of UTC (DOM-TOM: Guadeloupe/Martinique UTC−4, etc.) are **out of scope** — a UTC-midnight check-in would display as the previous day there. Supporting them needs a per-tenant timezone and is **deferred**.

Rejected: introducing a per-tenant timezone now — unneeded complexity for a metropolitan-only product.

Known violation to fix: `lib/queries/dashboard.ts` and `lib/calendar.ts` use local `getDay()/getDate()/setDate()` against UTC-stored dates (filed under `.scratch/timezone-dates/`).
