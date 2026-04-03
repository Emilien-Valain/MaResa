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

# Standalone output (serveur + dépendances minimales)
COPY --from=builder /app/.next/standalone ./
# Assets statiques (non inclus dans standalone par défaut)
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Dossier uploads (à monter comme volume persistent)
RUN mkdir -p /app/uploads

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
