# Dashboard & calendar use local-timezone date math against UTC-stored dates

Status: ready-for-agent

## Problem

Domain dates are stored as UTC midnight and the booking core compares them date-only with `getUTC*` (ADR-0005). But two readers use **local-timezone** date math against those same UTC-stored values:

- `lib/queries/dashboard.ts` — lines ~15-22 (week/month boundaries via `getDay()`/`setDate()`), ~99 and ~154 (`tomorrow` via `getDate()/setDate()`)
- `lib/calendar.ts` — line ~19 (`getDate()` loop bound)

When the server runs in UTC (current Docker default) local == UTC and nothing breaks. If it is ever deployed in a non-UTC timezone (e.g. `Europe/Paris`), KPI boundary math drifts by the offset and a booking near midnight can fall in the wrong bucket — e.g. "tomorrow's arrivals/departures" misses one.

## Fix

Replace local-timezone date accessors/mutators with their UTC equivalents in `dashboard.ts` and `calendar.ts`:
`getDay()→getUTCDay()`, `getDate()→getUTCDate()`, `setDate()→setUTCDate()`, and any `new Date(y,m,d)` constructions with `Date.UTC(...)`.

## Acceptance

- Dashboard KPIs (occupancy, this-week / this-month revenue, tomorrow's arrivals & departures) compute identically regardless of the `TZ` env var.
- E2E or unit test pins one near-midnight booking and asserts it lands in the correct bucket under both `TZ=UTC` and `TZ=Europe/Paris`.
- No remaining non-UTC date accessors in `lib/queries/dashboard.ts` or `lib/calendar.ts`.

## Comments
