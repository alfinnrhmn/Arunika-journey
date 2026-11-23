# syntax=docker/dockerfile:1
# Image dasar dikunci ke digest (anti-bajak tag). Perbarui lewat Renovate/Dependabot atau manual.

# Tahap 1: dependensi lengkap (untuk build). .npmrc mematikan skrip instalasi npm.
FROM node:22-alpine@sha256:1314fb30ec37592d5845e5a160d522c0e680972aa534549940b8d73bde88481a AS deps
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci

# Tahap 2: build aplikasi
FROM deps AS build
COPY . .
RUN npm run build

# Tahap 3: dependensi produksi saja
FROM node:22-alpine@sha256:1314fb30ec37592d5845e5a160d522c0e680972aa534549940b8d73bde88481a AS prod-deps
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci --omit=dev

# Tahap 4: image jalan (tanpa kompilator, tanpa dev deps, bukan root)
FROM node:22-alpine@sha256:1314fb30ec37592d5845e5a160d522c0e680972aa534549940b8d73bde88481a AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=4321

COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./
COPY --chown=node:node scripts ./scripts
COPY --chown=node:node drizzle ./drizzle
COPY --chown=node:node entrypoint.sh ./entrypoint.sh
RUN chmod +x /app/entrypoint.sh

USER node
EXPOSE 4321
HEALTHCHECK --interval=10s --timeout=3s --start-period=15s --retries=5 \
  CMD wget -q -O /dev/null http://127.0.0.1:4321/healthz || exit 1

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["node", "dist/server/entry.mjs"]
