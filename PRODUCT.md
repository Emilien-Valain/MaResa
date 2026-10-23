# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Hosts** (primary admin users): owners of gîtes, meublés, chambres d'hôtes, appart-hôtels and small hotels (<20 rooms), first market Puy du Fou / Vendée Bocage. They log into the admin to follow bookings, the calendar, and rules day to day. Not tech specialists; many run the business alone.
- **Operator** (DirectLoc staff): creates tenants, sets domains, templates and integrations; also uses the admin. One admin account can manage several tenants.
- **Guests**: book a stay on a host's own branded site. Never log in. French-speaking first.
- **Prospective hosts**: evaluate DirectLoc on the directloc.app marketing site. Three profiles from the marketing notes: hosts ~80 % dependent on Booking/Airbnb (sold on commission savings), Open System users (sold on independence: own domain, own design, dedicated support), and subscription-wary rural/senior hosts (sold on ownership via the one-shot licence).
- **Market facts** (Vendée Bocage, 2024 figures): ~927 meublés, 464 chambres d'hôtes, 38 hotels; 93 % of lodgings are meublés or chambres d'hôtes. Only ~25–30 % have a working direct-booking engine on their own site. Typical baskets: meublé 666 € / 3 nights, chambre d'hôtes ~120 €/night, hotel 133 € / 1 night; gîtes often rent by the week.

## Product Purpose

DirectLoc is a white-label direct-booking platform: each host gets their own booking site on their own domain, plus a back-office, from one multi-tenant deployment. Success = hosts take direct bookings without paying 15–18 % OTA commission, and never double-book.

## Positioning

Take back control of bookings and your own site, without OTA commission, with local human support (accompagnement humain local) — something generalist SaaS (Amenitiz, elloha, Lodgify) and the institutional Open System do not offer. Not positioned *against* OTAs: they remain a complementary visibility channel; the enemy is dependence on a single channel (OTA or institutional).

- One-line pitch: « Votre site à vous, votre nom de domaine, zéro commission — remboursé dès la première réservation directe. »
- Real competitors: Open System / Open Pro (subsidised by Vendée Expansion), elloha (24–59 €/mois), Smoobu (~29 €), Amenitiz (41–55 €), Lodgify. Differentiate on local human support and the local network effect, not raw feature count.
- Network effect (only claim it after ~15–20 local clients within 30 min): cross-referral to another DirectLoc host when a gîte is full, a shared partner directory, and shared local SEO (« où dormir près du Puy du Fou »). Before that critical mass, sell commission savings and independence only.

## Operating Context

- Hosts juggle Airbnb/Booking calendars alongside their direct site; DirectLoc syncs via iCal (import + export of blocked dates by polling).
- Bookings carry a lifecycle status (pending → confirmed → completed / cancelled) independent from payment status. Manual bookings can be entered by an admin, including forced over an existing hold.
- Stays are sold per night (calendar dates, metropolitan France).
- Domain vocabulary is defined in `CONTEXT.md`; architecture decisions in `docs/adr/`.

## Capabilities and Constraints

- Three surfaces in scope: **public guest sites** (per-tenant templates, currently Classic and Boutique, extensible), **admin back-office** (dashboard, calendrier, réservations, règles, paramètres), and the **directloc.app marketing site**.
- Public templates are themed per tenant through CSS variables (primary/secondary colors, logo, hero title); each tenant must be able to look distinct from the others.
- Features: availability search, real-time availability engine, booking form, Stripe payment, confirmation/post-stay emails, iCal import/export, room photos and gallery, booking rules, precedence-based pricing rules (including promos), manual blocks, PDF export.
- Stack: Next.js 16, React 19, Tailwind v4, Drizzle/PostgreSQL, Better Auth. UI language is French.
- Explicitly out of scope: self-service onboarding for hosts (the operator onboards), automated client invoicing, multi-language, advanced tax/VAT, mobile app, real channel manager (iCal only, no native Airbnb/Booking API).
- Emails are sent as `{hotelName}` from a platform address with Reply-To set to the host, so guest replies reach the host directly. Emails carry the host's logo and colors.
- Each tenant site serves its own sitemap and robots.txt; SEO and Schema.org `LodgingBusiness` structure matter because direct-booking traffic comes from searches for the host's name and local queries.
- Release status (2026-06-16): all 9 development phases done; the one blocking gate is a real Stripe Checkout → webhook round-trip test.
- Roadmap ideas, not committed: card guarantee for pay-on-site guests (chèques-vacances / ANCV) with no-show penalty, Google/Booking/Airbnb reviews display, invoicing with taxe de séjour, cleaning schedule, KPI reporting, per-tenant sending domain.
- Never call the iCal sync a "channel manager"; the correct wording is « synchronisation iCal avec vos calendriers Airbnb/Booking ».

## Brand Commitments

- Product name is **DirectLoc** everywhere. "MaRésa" is a legacy name still present in admin/auth screens and should be replaced.
- Domain: directloc.app.
- Guest-facing sites carry the host's brand, not DirectLoc's.

## Evidence on Hand

- Market study and marketing direction in the Obsidian vault (`Projet Booking Manager/Marketing/`).
- No real customer testimonials, case studies, or usage figures yet: do not fabricate any.
- Draft pricing in the marketing notes, not final (to be re-tested with 10–15 prospects): subscription Solo 39 €, Petit 69 €, Grand 119 €/mois + 8 €/chambre beyond; one-shot licence 1 250 / 1 490 / 1 990 € plus mandatory maintenance 19 / 25 / 35 €/mois; 2 months free on annual commitment. Tiers segment by number of lodgings/rooms. Confirm before publishing.
- Commission math usable in copy, with its source: OTA commissions 15–18 % (Booking), 17.2 % average (Toploc 2026 study). Example: 20 000 € OTA revenue × 17 % ≈ 3 400 €/an vs 470–830 €/an subscription.
- AI-search claims must stay honest: never promise guaranteed traffic; local and transactional queries are less exposed to AI Overviews than generic content.

## Product Principles

1. The host is not a tech person: every admin screen must be understandable without training.
2. Never let a guest book something that cannot be honored; availability correctness beats convenience.
3. Each host's site belongs to the host: their brand leads, DirectLoc stays invisible to guests.
4. Honest claims only: describe what the product actually does (iCal sync, not channel manager; no invented proof).
5. Complement OTAs, never attack them: DirectLoc captures the direct traffic hosts lose to OTAs by default.
