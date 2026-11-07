# ==============================================================================
# BierLog — All-in-One Production Dockerfile
# Draait ALLES (Frontend + Express API + Eigen PostgreSQL Database) in 1 container!
# ==============================================================================

# --- STAGE 1: Build Frontend & Backend in Docker ---
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json ./
RUN npm install --legacy-peer-deps

COPY . .

ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_USE_FIRESTORE=false
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_STORAGE_BUCKET
ARG VITE_FIREBASE_MESSAGING_SENDER_ID
ARG VITE_FIREBASE_APP_ID
ARG VITE_FIREBASE_DATABASE_ID

# Bouw de geoptimaliseerde productie-frontend naar /app/dist
RUN npm run build

# Bundel de TypeScript Express-server (server.ts + /server/*) naar een snelle ESM-bundel
RUN npx esbuild server.ts --bundle --platform=node --format=esm --packages=external --outfile=server.mjs


# --- STAGE 2: All-in-One Runtime (Node.js + Ingebouwde PostgreSQL Database) ---
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV VITE_USE_FIRESTORE=false

# Installeer ingebouwde PostgreSQL database, su-exec en openssl in dezelfde container
RUN apk add --no-cache postgresql postgresql-contrib su-exec openssl

# Installeer alleen productie-dependencies voor Node.js
COPY package.json ./
RUN npm install --omit=dev --legacy-peer-deps && npm cache clean --force

# Kopieer gebouwde frontend, gebundelde server en database-initialisatie vanuit de builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.mjs ./server.mjs
COPY --from=builder /app/firebase-applet-config.json ./firebase-applet-config.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/docker ./docker

RUN chmod +x /app/docker/entrypoint.sh && \
    mkdir -p /data /run/postgresql && \
    chown -R node:node /app && \
    chown -R postgres:postgres /data /run/postgresql

# Persistente opslag voor de interne PostgreSQL-database en automatisch gegenereerde sleutels
VOLUME ["/data"]

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/api/health || exit 1

ENTRYPOINT ["/app/docker/entrypoint.sh"]
