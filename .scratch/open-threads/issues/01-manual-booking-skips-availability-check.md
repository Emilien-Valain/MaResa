# Admin manual booking can silently double-book (no availability check)

Status: resolved — ADR-0008 (seam admitBooking). Décision : option (B) validate + escape-hatch. La création manuelle passe désormais par `admitBooking`, qui refuse l'overlap par défaut ; une case « Forcer » (`allowOverlap`) permet à l'admin de passer outre pour réconcilier une résa off-platform. Les booking-rules restent ignorées côté manuel. La garde d'ownership chambre/tenant manquante est aussi corrigée. Tests : `e2e/admin/intake-admission.spec.ts`. Règle de domaine documentée sur `Source` dans CONTEXT.md.

## Open question

`createBookingManual` (`lib/actions/bookings.ts:84-116`) inserts a `confirmed` booking **without** calling `isRoomAvailable`. So an admin can create a manual booking over dates already held by another booking or a block — a silent double-booking.

Is this:
- **(A) an intentional admin override** — admins knowingly place bookings the public engine would reject (e.g. reconciling an off-platform reservation), and should be *allowed* to overlap? Then it's correct, but the UI should at least *warn* on overlap.
- **(B) a bug** — manual bookings should be validated against availability like public ones, perhaps with an explicit "force anyway" escape hatch?

## To grill

Does the admin need to be able to overlap on purpose? If yes → keep, add a non-blocking overlap warning. If no → validate, with optional force flag. Decide, then promote to `ready-for-agent` or write the rule into `CONTEXT.md`/an ADR.

## Comments
