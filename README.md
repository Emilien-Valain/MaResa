# MaResa

Plateforme de reservation directe white-label pour petits hotels et loueurs.
Un seul deploiement, plusieurs hotels, chacun avec son domaine et son style.

```
hotelducoin.fr  ──┐
villarose.fr    ──┼──▶  MaResa  ──▶  PostgreSQL
giteduvallon.fr ──┘
```

## Stack

Next.js 16 / React 19 / TypeScript / Tailwind v4 / Drizzle ORM / PostgreSQL / Better Auth / Playwright

## Fonctionnalites

### Done

- [x] **Multi-tenant** — resolution par domaine, isolation complete des donnees, cache middleware
- [x] **Admin multi-tenant** — un compte admin peut gerer plusieurs hotels, tenant switcher dans la nav
- [x] **Templates** — systeme de templates interchangeables par tenant (classic, boutique), extensible
- [x] **Theming** — couleurs, logo, titre hero personnalisables par tenant via CSS variables
- [x] **Pages publiques** — homepage, liste chambres, detail chambre, formulaire reservation, confirmation
- [x] **Moteur de recherche** — widget homepage : date arrivee -> date depart (auto-open) -> chambres disponibles
- [x] **Moteur de disponibilite** — reservations + blocages iCal, API temps reel, recherche multi-chambres
- [x] **Admin chambres** — CRUD complet, activation/desactivation, suppression
- [x] **Admin reservations** — liste, detail, cycle de statuts, creation manuelle, export PDF, impression
- [x] **Calendrier** — vue mensuelle avec navigation
- [x] **Auth** — Better Auth email/password, protection middleware, session par domaine
- [x] **Securite** — isolation tenant, XSS echappe, 404 sur UUID d'un autre tenant
- [x] **Tests E2E** — 65 tests Playwright (happy path + limites + erreurs + securite)
- [x] **Infra** — Coolify, Traefik, SSL automatique, script CLI `create-admin`

### To do

- [ ] **Paiement Stripe** — Checkout Session, webhooks, confirmation/annulation automatique
- [ ] **Emails** — confirmation client + notification admin (Resend)
- [ ] **Export iCal** — flux RFC 5545 pour Airbnb/Booking
- [ ] **Import iCal** — polling cron des calendriers externes, upsert blocages
- [ ] **Config admin** — page parametres tenant (theme, URLs iCal)
- [ ] **Photos** — upload et galerie pour les chambres

## Quickstart

```bash
# Installation
npm install

# Base de donnees
createdb maresa
npx drizzle-kit migrate

# Premier tenant + admin
npm run create-admin -- \
  --name "Mon Hotel" \
  --slug "mon-hotel" \
  --domain "monhotel.fr" \
  --email "admin@monhotel.fr" \
  --password "motdepasse" \
  --template classic

# Dev
npm run dev
```

### Dev multi-tenant

Ajouter dans `/etc/hosts` :
```
127.0.0.1  mon-hotel.localhost
127.0.0.1  autre-hotel.localhost
```

Acceder a chaque tenant via `http://mon-hotel.localhost:3000`

### Tests

```bash
npm test          # tous les tests (CI)
npm run test:ui   # interface visuelle Playwright
```

## Structure

```
app/
  page.tsx                    Homepage + moteur de recherche
  chambres/                   Liste et detail chambres
  reserver/                   Formulaire de reservation
  admin/                      Dashboard, chambres, reservations, calendrier
  api/                        Availability, rooms/available, auth, stripe
components/
  public/
    PublicLayout.tsx           Dispatcher de templates
    HomeSearch.tsx             Widget recherche disponibilite
    BookingForm.tsx            Formulaire reservation
    templates/
      classic/Layout.tsx
      boutique/Layout.tsx
  admin/
    AdminNav.tsx              Navigation + tenant switcher
db/
  schema.ts                   Schema Drizzle (tenants, users, user_tenants, rooms, bookings...)
  migrations/
lib/
  availability.ts             Moteur de disponibilite
  tenant-context.ts           Resolution tenant + TenantConfig
  session.ts                  Session admin + verification membership
  auth.ts                     Better Auth config
scripts/
  create-admin.ts             CLI creation tenant + admin
e2e/                          Tests Playwright
```
