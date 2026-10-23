# Audit 2026-10 — Must fix + Should fix

Source: `/ponytail-audit` run on 2026-10-23 (whole repo, load assumed: one Docker instance, tens of tenants, a handful of concurrent guests, public internet).

Each issue is self-contained and `ready-for-agent`. Work them in number order: 01–04 are **Must fix**, 05–13 are **Should fix**.

## Rules for every agent (from CLAUDE.md)
- Read `AGENTS.md`: Next.js 16 differs from training data — check `node_modules/next/dist/docs/` before touching routing/actions.
- Add or update Playwright tests in `/e2e/` (happy path + one case that tries to break it). Tests must clean up their data.
- Update the Obsidian spec `Tests de non-régression.md` (real vault path: see memory `obsidian-vault-path`) for any behaviour change.
- Stop any running `next dev` on :3000 before `npm test` (Playwright starts its own server).
- Smallest fix that works. No new layers or dependencies.
- When done: set `Status: resolved — <one line>` at the top, and append notes under `## Comments`.

## Index
| # | Group | Issue |
|---|-------|-------|
| 01 | Must | `issues/01-admission-pool-deadlock.md` — 10 concurrent bookings freeze the whole site |
| 02 | Must | `issues/02-unbounded-date-range-dos.md` — one URL pins CPU / fills memory |
| 03 | Must | `issues/03-paid-session-on-cancelled-booking.md` — guest charged, booking cancelled, nobody told |
| 04 | Must | `issues/04-public-booking-errors-crash-page.md` — refused booking shows generic error page |
| 05 | Should | `issues/05-server-trusts-guest-count-and-past-dates.md` |
| 06 | Should | `issues/06-malformed-uuid-500.md` |
| 07 | Should | `issues/07-confirmation-bookingid-branch.md` |
| 08 | Should | `issues/08-ical-ssrf-gaps.md` |
| 09 | Should | `issues/09-duplicate-room-slugs.md` |
| 10 | Should | `issues/10-tenant-config-lost-updates.md` |
| 11 | Should | `issues/11-use-server-on-internal-helpers.md` |
| 12 | Should | `issues/12-dead-login-rate-limit-rule.md` |
| 13 | Should | `issues/13-unused-ui-kit-and-deps.md` |

Dependencies: 02 and 05 both touch `bookingPublicSchema` / `admitBooking` — do them sequentially. 04 changes how errors from 02/05 reach the guest; doing 04 before 05 makes 05's errors visible. 11 and 01 both touch `lib/pricing.ts`, `lib/booking-rules.ts`, `lib/availability.ts` — do 01 first.
