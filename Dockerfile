# ==============================================================================
# Cervisium / BierLog — All-in-One Production & Auto-Update Dockerfile
# Draait ALLES (Frontend + Express API + Eigen PostgreSQL Database) in 1 container
# én haalt bij elke Docker-herstart automatisch de nieuwste update van GitHub op!
# ==============================================================================

FROM node:22-alpine

WORKDIR /app

# Installeer git (voor auto-update bij container herstart), PostgreSQL database, su-exec en openssl
RUN apk add --no-cache git postgresql postgresql-contrib su-exec openssl

# Installeer ALLE dependencies (inclusief devDependencies zoals vite-plugin-pwa, vite & esbuild)
# BELANGRIJK: NODE_ENV mag hier nog NIET op production staan, anders slaat npm devDependencies over!
COPY package.json ./
RUN npm install --include=dev --legacy-peer-deps && npm cache clean --force

# Kopieer de volledige broncode
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

# Bouw de initiële productie-frontend (/app/dist) en bundel de Express-server (/app/server.mjs)
RUN npm run build && \
    npx esbuild server.ts --bundle --platform=node --format=esm --packages=external --outfile=server.mjs

# Zet nu pas de runtime omgeving op production
ENV NODE_ENV=production
ENV PORT=3000
ENV VITE_USE_FIRESTORE=false
ENV GITHUB_REPO_URL=https://github.com/Mr-Braadworst/cervisium.git
ENV GITHUB_BRANCH=main
ENV AUTO_UPDATE_ON_RESTART=true

RUN chmod +x /app/docker/entrypoint.sh && \
    mkdir -p /data /run/postgresql && \
    chown -R node:node /app && \
    chown -R postgres:postgres /data /run/postgresql

# Persistente opslag voor de interne PostgreSQL-database, sessie-sleutels en update-status
VOLUME ["/data"]

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/api/health || exit 1

ENTRYPOINT ["/app/docker/entrypoint.sh"]
