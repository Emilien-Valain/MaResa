# Rule resolution is one precedence primitive; pricing collapses to a scalar, booking-rules merge per field

Two rule families govern a [[booking]]: [[pricing-rule|pricing rules]] (what a [[night]] costs) and booking rules (minStay, maxStay, allowed check-in/check-out days). They had **diverged** in how overlaps resolve — and both were wrong in different ways:

- **Pricing** still charged "highest amount wins" (`if (candidate > best)`), contradicting the precedence model ADR-0006 already ratified: promos below base were computed then discarded (never charged), `priority` was dead, and the "à partir de X €" figure advertised a promo the booking flow then refused to honor (display ≠ charge).
- **Booking rules** resolved whole-record: any room rule wiped *all* global rules, and even within a scope a single "winning" record was chosen — so a room rule setting only `minStay` silently dropped the global `allowedCheckInDays`/`maxStay`, and ordering put seasonal ahead of `priority` (the reverse of ADR-0006).

We unify both onto one primitive (`lib/rule-precedence.ts`): `orderByPrecedence(rules, date)` filters to the rules applicable on a date and sorts them **most-preferred first** by the ADR-0006 order — `priority` desc → specificity (room > global, day-restricted > all-days, narrower window > all-year) → recency (`createdAt` desc).

## One ordering, two aggregations

The structural insight: a **price is a scalar** (one winner makes sense); **booking rules are a set of independent conjunctive constraints** (resolving "one winning rule" is the wrong shape — you want each constraint resolved on its own). So the two consumers fold the same ordered list differently:

- **Pricing** takes `orderByPrecedence(...)[0]` and applies that rule's value directly (`fixedPrice`, or `base × (1 + modifier/100)`), clamped at 0, **no base floor** — a promo is charged as-is. `getMinPricePerNight` is derived from the same resolver over a 365-day forward horizon, so display == charge by construction.
- **Booking rules** fold the ordered list **field by field**: each of `minStay`/`maxStay`/`allowedCheckInDays`/`allowedCheckOutDays` takes the value of the highest-precedence rule that defines it (non-null). A room rule that sets only `minStay` no longer wipes the global check-in-day constraint — that field is inherited from the global rule.

## Consequences and behaviour changes

- Booking-rule resolution becomes **priority-first** (was seasonal-first). A high-`priority` all-year rule now beats a low-priority seasonal one, consistent with pricing. This is intended by the unification.
- Booking rules now **merge across rules**, not just room-vs-global: two global rules each defining a different field now both contribute. There is no longer any "whole-record override".
- Pricing behaviour changes to match ADR-0006 (this operationalizes it): promos and below-base room prices are charged; `priority` breaks ties; the listing's "à partir de" equals the lowest charged price over the horizon.

## Rejected alternatives

- *Make booking rules pick one winning rule like pricing* — wrong shape for conjunctive constraints; would still let a partial room rule drop unrelated global constraints.
- *Keep two separate resolvers* — leaves the precedence logic (priority/specificity/recency) duplicated and free to drift again, which is exactly how we got here.

Resolves the booking-rules merge question (open thread #3) and the pricing-resolution bug (`.scratch/pricing-resolution/`).
