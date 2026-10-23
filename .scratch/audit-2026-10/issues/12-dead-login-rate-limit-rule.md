# Proxy "login" rate-limit rule never covers sign-in

Status: resolved — proxy "login" rule removed; sign-in stays limited by Better Auth (prod); login.spec.ts:87 no longer 429s
Group: Should fix

## Problem

`proxy.ts:12` defines `login: { limit: 10, windowSec: 60 }` applied to `/login` and `/api/auth/*`. But the `config.matcher` excludes `api/auth`, so the proxy never runs for the actual sign-in POST (`/api/auth/sign-in/email`). Only page views of `/login` are counted — which limits nothing useful.

Better Auth already rate-limits sign-in itself in production (default special rule: 3 requests / 10 s on `/sign-in*`, see `node_modules/better-auth/dist/api/rate-limiter/index.mjs`).

## Fix

Delete the `login` rule and its branch in `proxy`. Keep `api` and `webhook` rules.

Do NOT widen the matcher to include `/api/auth` — Better Auth handles it.

## Acceptance

- `e2e/auth/login.spec.ts` passes.
- Obsidian docs mentioning a 10/min login limit (check `Architecture.md`, `Déploiement.md`, test spec) updated to say Better Auth's built-in limiter applies.

## Comments

### 2026-10-23
- `proxy.ts`: removed `RATE_RULES.login` and its branch; a one-line comment says why (matcher excludes `/api/auth`, Better Auth limits `/sign-in*` itself: 3 req / 10 s per IP, `enabled` defaults to `isProduction` in `better-auth/dist/context/create-context.mjs`). `api` and `webhook` rules unchanged, matcher unchanged.
- Root cause of the full-suite flake `e2e/auth/login.spec.ts:87` (XSS password test): it was the 11th `/login` view in 60 s from the same IP, so the proxy answered a plain-text 429 and `[name="email"]` never rendered. Passes in the full suite now (0 retries).
- Test: `e2e/public/security.spec.ts` "afficher /login souvent ne déclenche jamais de 429" (IP 10.10.9.8, 15 views → all 200 + form present). Fails on old code at view 11 (verified, then restored).
- Better Auth's own limiter is not E2E-tested: the test server runs `next dev`, where it is off.
- Docs: Obsidian `README.md` (security bullet) and `Tests de non-régression.md` (Rate limiting). `Architecture.md`/`Déploiement.md` had no mention of the 10/min login limit.
- Full suite: 299 passed, 3 skipped, 0 failed.
