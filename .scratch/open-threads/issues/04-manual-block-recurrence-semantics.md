# Manual block: startDate/endDate vs recurrenceUntil semantics are ambiguous

Status: resolved — ADR-0007 + Schema DB.md. Pour `recurring = true` : `startDate` = ancre, `recurrenceUntil` = fin EXCLUSIVE (NULL = ouvert, borné par la fenêtre), `endDate` inutilisé. Ratifie le code existant, aucune migration. Test de la borne exclusive dans `e2e/public/holds.spec.ts`.

## Open question

`manualBlocks` (see `Schema DB.md`) has, for a recurring weekly block: `startDate`, `endDate`, `recurring`, `recurrenceType` ("weekly"), `recurrenceDays` ([0..6]), and `recurrenceUntil`. For a **recurring** block it's unclear what `startDate`/`endDate` mean versus `recurrenceUntil`:

- Is `[startDate, endDate]` the overall window the recurrence runs within, with `recurrenceUntil` redundant?
- Or is `startDate` the recurrence anchor and `recurrenceUntil` the end (so `endDate` is meaningless for recurring blocks)?

The expansion logic (`lib/manual-blocks.ts`, "expand day-by-day dans la plage, check `getUTCDay()` vs recurrenceDays") iterates *a* range — confirm which one, and whether `recurrenceUntil = NULL` ("indéfini") is actually honored or silently bounded by `endDate`.

## To grill

Pin the exact meaning of each field for `recurring = true`, document it in `Schema DB.md`, and drop or repurpose whichever field is redundant. Then confirm the expansion code matches.

## Comments
