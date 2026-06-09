# The public iCal export mirrors full availability (DirectLoc is the sync hub)

DirectLoc imports each external channel's holds (Airbnb, Booking.com) into `ical_blocks` and lets admins close dates via `manual_blocks`. For the platform to actually prevent overbooking, its public iCal export must re-broadcast **everything that makes a room unavailable**, not just its own direct bookings.

The export feed (`GET /api/ical/[roomId]`) therefore mirrors the same computation as the availability engine: **direct bookings (`pending` + `confirmed`) + imported `ical_blocks` + `manual_blocks`**. This makes DirectLoc a hub-and-spoke sync point: a booking learned from Airbnb is relayed out to Booking.com, and an admin's manual closure reaches every channel.

This is safe because every sync path only ever propagates "busy"; layering "busy" on "busy" is idempotent and cannot cause a double-booking. Re-exporting a block back to its origin channel (different UID) is harmless redundancy. The only failure direction is a *stale* block (a freed date staying blocked) — which is lost revenue, never an overbooking — and is mitigated by the import sync's delete-on-disappear cleanup.

Rejected alternatives:
- *Export confirmed bookings only* (what the old doc described): a `pending` direct booking blocks our own site but not the OTAs, and imported/manual unavailability never propagates — the original overbooking bug.
- *Per-recipient feeds* that exclude a channel's own blocks from its feed: unnecessary (the echo is harmless) and forces per-channel export URLs. We keep one feed per room.

Granularity is per **room**, not per property — `properties` is not a domain concept (ADR-0002).
