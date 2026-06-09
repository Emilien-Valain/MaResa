# Open threads — backlog for the next /grill-with-docs

Domain/design questions surfaced during the 2026-06 grilling session. **All four are now resolved** (2026-06-09) — kept here as a paper trail; see each issue file for the decision.

Resolved decisions live in `/CONTEXT.md` and `/docs/adr/0001`–`0009`. The pricing bug (`.scratch/pricing-resolution/`) is also resolved (ADR-0009). Still open: `.scratch/timezone-dates/`.

## Threads (all resolved)
1. `issues/01-manual-booking-skips-availability-check.md` — manual booking could silently double-book. → **ADR-0008** : seam `admitBooking`, refus par défaut + flag « Forcer ».
2. `issues/02-getavailablerooms-manual-block-filter-noop.md` — per-room manual-block filter no-op. → **ADR-0007** : absorbé dans le seam `blockedDates` (module Hold).
3. `issues/03-booking-rules-override-globals-entirely.md` — room rule wiped global rules. → **ADR-0009** : merge par champ via la primitive de précédence partagée.
4. `issues/04-manual-block-recurrence-semantics.md` — `startDate`/`endDate` vs `recurrenceUntil` ambiguous. → **ADR-0007** + `Schema DB.md` : `recurrenceUntil` = fin exclusive, `endDate` inutilisé pour le récurrent.
