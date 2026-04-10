FROM node:20-alpine AS base

# ── Build ────────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Production ───────────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# sharp a besoin de vips sur Alpine
RUN apk add --no-cache vips

# Standalone output (serveur + dépendances minimales)
COPY --from=builder /app/.next/standalone ./
# Assets statiques (non inclus dans standalone par défaut)
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Migrations : script + fichiers SQL
COPY --from=builder /app/scripts/migrate.mjs ./scripts/migrate.mjs
COPY --from=builder /app/db/migrations ./db/migrations

# Dossier uploads (à monter comme volume persistent)
RUN mkdir -p /app/uploads

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Lancer les migrations puis démarrer le serveur
CMD ["sh", "-c", "node scripts/migrate.mjs && node server.js"]
