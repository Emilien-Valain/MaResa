# Dashboard & calendar use local-timezone date math against UTC-stored dates

Status: resolved — toute l'arithmétique de bornes passe en UTC. Les helpers de fenêtres KPI sont extraits dans `lib/date-windows.ts` (pur, `now` injectable, `getUTC*`/`setUTC*` uniquement) et consommés par `lib/queries/dashboard.ts`. `lib/calendar.ts` construit la grille du mois via `Date.UTC` / `getUTCDate`, et le consommateur `app/admin/calendrier/page.tsx` (positions de séjours, expansion des blocages récurrents, libellés de jours, « aujourd'hui ») bascule sur les accesseurs UTC pour rester aligné. Test : `e2e/unit/date-windows.spec.ts` rejoue la même sonde sous `TZ=UTC` et `TZ=Europe/Paris` et assert des bornes identiques + le bon bucketing d'une résa du 31 jan 23:30 UTC. Plus aucun accesseur local dans `dashboard.ts` / `calendar.ts`.

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
