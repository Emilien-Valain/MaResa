# Pricing: promos can't be charged, priority is ignored, and the listing advertises prices it won't charge

Status: resolved — ADR-0009 (via la primitive de précédence partagée `lib/rule-precedence.ts`). `resolveNightPrice` élit la règle gagnante par précédence (priority → spécificité → récence) et l'applique directement, clamp ≥0, sans plancher : promo et prix chambre sous base sont facturés, `priority` casse l'égalité. `getMinPricePerNight` dérive du même résolveur sur 365 j → display == charge. Tests : `e2e/admin/rule-resolution.spec.ts` (promo facturée, priority, spécificité, display==charge).

## Problem

`lib/pricing.ts` has three coupled defects, all stemming from "highest price wins" (now replaced by ADR-0006):

1. **Promos are never charged.** `resolveNightPrice` starts `bestPrice = basePrice` and only accepts a candidate `if (candidatePrice > bestPrice)` (lines ~159, 167, 186). Any rule below base (negative `percentageModifier`, or a `fixedPrice` < base) is computed then discarded. Discounts are impossible in the charged price.
2. **`priority` is dead.** `pricingRules.priority` exists but `resolveNightPrice` never reads it; overlaps resolve purely by amount.
3. **Display ≠ charge.** `getMinPricePerNight` (the "à partir de X €/nuit" on listings) deliberately finds the *minimum* including promos (lines ~119-126), so it advertises a promo price (e.g. 80 €) that `resolveNightPrice` then refuses to charge (charges base 100 €). False advertising.

## Fix (per ADR-0006)

Rewrite `resolveNightPrice` to:
- Collect all matching rules (active, date in `[validFrom, validTo]`, `daysOfWeek` includes the night, scope = room or global).
- If none, return base price.
- Else pick the winner by precedence: highest `priority` → tie: most specific (room > global, day-restricted > all-days, narrower window > all-year) → tie: most recently created.
- Apply the winner directly (`fixedPrice`, or `base × (1 + mod/100)`), clamped at 0. **No base floor.**

Then derive `getMinPricePerNight` from `resolveNightPrice` over a forward horizon (e.g. next 365 days) so display == charge by construction.

## Acceptance

- A −30 % global promo over a date range is actually charged (booking total reflects 70 €, not 100 €).
- A room-scoped fixedPrice below base is charged.
- Worked example resolves correctly: base 100; season (Jul–Aug) 120; Saturday-in-season 130; Aug 15–20 −30 % promo (higher priority) → Tue=120, Sat=130, Aug 15-20=70.
- The "à partir de" figure on a listing equals the lowest price `resolveNightPrice` will actually charge over the horizon.
- `priority` demonstrably breaks ties (test two equally-specific overlapping rules with different priorities).

## Comments
