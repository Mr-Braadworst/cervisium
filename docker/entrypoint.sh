#!/usr/bin/env sh
# ==============================================================================
# Cervisium / BierLog All-in-One Container Entrypoint (met Auto-Update op Herstart)
# Draait VOLLEDIG binnenin de Docker-container:
# 1. Controleert bij elke herstart automatisch op nieuwe updates op GitHub
#    en bouwt direct de nieuwste versie (frontend + backend + versienummer)
# 2. Genereert/laadt automatisch een blijvende SESSION_SECRET in /data/.session_secret
# 3. Initialiseert en start de ingebouwde PostgreSQL-database in /data/pgdata
# 4. Start de Cervisium Node.js/Express server op poort 3000
# ==============================================================================

set -e

DATA_DIR="/data"
if [ ! -s "${DATA_DIR}/pgdata/PG_VERSION" ] && [ -s "/var/lib/postgresql/data/PG_VERSION" ]; then
  PG_DATA="/var/lib/postgresql/data"
  PERSIST_DIR="/var/lib/postgresql/data"
elif [ ! -s "${DATA_DIR}/pgdata/PG_VERSION" ] && [ -s "/var/lib/postgresql/data/pgdata/PG_VERSION" ]; then
  PG_DATA="/var/lib/postgresql/data/pgdata"
  PERSIST_DIR="/var/lib/postgresql/data"
else
  PG_DATA="${DATA_DIR}/pgdata"
  PERSIST_DIR="${DATA_DIR}"
fi
PG_RUN="/run/postgresql"
SECRET_FILE="${PERSIST_DIR}/.session_secret"
FIREBASE_ENV_FILE="${DATA_DIR}/.firebase_env"
FIREBASE_CONFIG_BACKUP="${DATA_DIR}/.firebase-applet-config.json"
ENV_BACKUP_FILE="${DATA_DIR}/.env.backup"
LAST_COMMIT_FILE="${DATA_DIR}/.last_built_commit"
LAST_PKG_HASH_FILE="${DATA_DIR}/.last_pkg_hash"

mkdir -p "${DATA_DIR}" "${PERSIST_DIR}" "${PG_RUN}"
chmod 755 "${DATA_DIR}" "${PERSIST_DIR}" 2>/dev/null || true
chown -R postgres:postgres "${PG_RUN}"

# 1a. Bewaar of laad lokale Firebase-sleutels op de eigen server in /data/.firebase_env (komt NOOIT op GitHub)
if [ -n "${FIREBASE_API_KEY}" ] && [ -n "${FIREBASE_PROJECT_ID}" ]; then
  cat > "${FIREBASE_ENV_FILE}" <<EOF
export FIREBASE_API_KEY='${FIREBASE_API_KEY}'
export FIREBASE_PROJECT_ID='${FIREBASE_PROJECT_ID}'
export FIREBASE_AUTH_DOMAIN='${FIREBASE_AUTH_DOMAIN}'
export FIREBASE_STORAGE_BUCKET='${FIREBASE_STORAGE_BUCKET}'
export FIREBASE_MESSAGING_SENDER_ID='${FIREBASE_MESSAGING_SENDER_ID}'
export FIREBASE_APP_ID='${FIREBASE_APP_ID}'
EOF
  chmod 644 "${FIREBASE_ENV_FILE}"
elif [ -f "${FIREBASE_ENV_FILE}" ]; then
  . "${FIREBASE_ENV_FILE}"
elif [ -f "/var/lib/postgresql/data/.firebase_env" ]; then
  cp "/var/lib/postgresql/data/.firebase_env" "${FIREBASE_ENV_FILE}" 2>/dev/null || true
  . "${FIREBASE_ENV_FILE}"
fi

# Exporteer ook als VITE_FIREBASE_* zodat elke build in de container direct het juiste project gebruikt
if [ -n "${FIREBASE_API_KEY}" ] && [ -n "${FIREBASE_PROJECT_ID}" ]; then
  export VITE_FIREBASE_API_KEY="${FIREBASE_API_KEY}"
  export VITE_FIREBASE_PROJECT_ID="${FIREBASE_PROJECT_ID}"
  export VITE_FIREBASE_AUTH_DOMAIN="${FIREBASE_AUTH_DOMAIN:-${FIREBASE_PROJECT_ID}.firebaseapp.com}"
  export VITE_FIREBASE_STORAGE_BUCKET="${FIREBASE_STORAGE_BUCKET:-${FIREBASE_PROJECT_ID}.firebasestorage.app}"
  export VITE_FIREBASE_MESSAGING_SENDER_ID="${FIREBASE_MESSAGING_SENDER_ID}"
  export VITE_FIREBASE_APP_ID="${FIREBASE_APP_ID}"
fi

# Maak back-up van lokale firebase-applet-config.json en .env (indien ingevuld) zodat git reset deze nooit wist
if [ -f "/app/firebase-applet-config.json" ]; then
  if ! grep -q "YOUR_FIREBASE_WEB_API_KEY" "/app/firebase-applet-config.json" 2>/dev/null && ! grep -q "rosy-logic-ckpr3" "/app/firebase-applet-config.json" 2>/dev/null; then
    cp "/app/firebase-applet-config.json" "${FIREBASE_CONFIG_BACKUP}" 2>/dev/null || true
  fi
fi
if [ -f "/app/.env" ]; then
  cp "/app/.env" "${ENV_BACKUP_FILE}" 2>/dev/null || true
fi

# ==============================================================================
# 1b. AUTOMATISCHE GITHUB UPDATE BIJ CONTAINER START / HERSTART
# ==============================================================================
REPO_URL="${GITHUB_REPO_URL:-https://github.com/Mr-Braadworst/cervisium.git}"
BRANCH="${GITHUB_BRANCH:-main}"

if [ "${AUTO_UPDATE_ON_RESTART:-true}" = "true" ]; then
  echo "🔍 [Cervisium Auto-Update] Controleren op nieuwste versie via ${REPO_URL} (${BRANCH})..."

  # Zorg dat git geïnstalleerd is (ook als een oudere image wordt herstart)
  if ! command -v git >/dev/null 2>&1; then
    apk add --no-cache git >/dev/null 2>&1 || true
  fi

  if command -v git >/dev/null 2>&1; then
    git config --global --add safe.directory /app 2>/dev/null || true

    if [ ! -d "/app/.git" ]; then
      git -C /app init -b "${BRANCH}" >/dev/null 2>&1 || git -C /app init >/dev/null 2>&1
      git -C /app remote add origin "${REPO_URL}" 2>/dev/null || git -C /app remote set-url origin "${REPO_URL}" 2>/dev/null || true
    else
      git -C /app remote set-url origin "${REPO_URL}" 2>/dev/null || true
    fi

    ENTRYPOINT_HASH_BEFORE=""
    if [ -f "/app/docker/entrypoint.sh" ]; then
      ENTRYPOINT_HASH_BEFORE="$(sha256sum /app/docker/entrypoint.sh 2>/dev/null | awk '{print $1}')"
    fi

    if git -C /app fetch --depth=1 origin "${BRANCH}" >/dev/null 2>&1; then
      REMOTE_SHA="$(git -C /app rev-parse "origin/${BRANCH}" 2>/dev/null || true)"
      LAST_BUILT_SHA=""
      if [ -f "${LAST_COMMIT_FILE}" ]; then
        LAST_BUILT_SHA="$(cat "${LAST_COMMIT_FILE}" 2>/dev/null || true)"
      fi

      if [ -n "${REMOTE_SHA}" ] && { [ "${REMOTE_SHA}" != "${LAST_BUILT_SHA}" ] || [ ! -f "/app/dist/index.html" ] || [ ! -f "/app/server.mjs" ]; }; then
        echo "⬇️ [Cervisium Auto-Update] Nieuwe update gevonden (${REMOTE_SHA})! Downloaden en installeren..."
        git -C /app reset --hard "origin/${BRANCH}" >/dev/null 2>&1

        # Herstel lokale configuratiebestanden na git reset
        if [ -f "${FIREBASE_CONFIG_BACKUP}" ]; then
          cp "${FIREBASE_CONFIG_BACKUP}" "/app/firebase-applet-config.json" 2>/dev/null || true
        fi
        if [ -f "${ENV_BACKUP_FILE}" ]; then
          cp "${ENV_BACKUP_FILE}" "/app/.env" 2>/dev/null || true
        fi

        # Controleer of package.json is gewijzigd of dat devDependencies (vite/esbuild) ontbreken
        CURRENT_PKG_HASH="$(sha256sum /app/package.json 2>/dev/null | awk '{print $1}')"
        SAVED_PKG_HASH=""
        if [ -f "${LAST_PKG_HASH_FILE}" ]; then
          SAVED_PKG_HASH="$(cat "${LAST_PKG_HASH_FILE}" 2>/dev/null || true)"
        fi

        if [ "${CURRENT_PKG_HASH}" != "${SAVED_PKG_HASH}" ] || [ ! -f "/app/node_modules/.bin/vite" ]; then
          echo "📦 [Cervisium Auto-Update] Dependencies bijwerken..."
          (cd /app && npm install --include=dev --legacy-peer-deps)
          echo "${CURRENT_PKG_HASH}" > "${LAST_PKG_HASH_FILE}"
        fi

        echo "🏗️ [Cervisium Auto-Update] Nieuwste frontend en server bouwen..."
        (
          cd /app
          export NODE_ENV=production
          npm run build
          npx esbuild server.ts --bundle --platform=node --format=esm --packages=external --outfile=server.mjs
        )

        echo "${REMOTE_SHA}" > "${LAST_COMMIT_FILE}"
        chmod +x /app/docker/entrypoint.sh 2>/dev/null || true
        chown -R node:node /app 2>/dev/null || true
        echo "✅ [Cervisium Auto-Update] Update naar commit $(echo "${REMOTE_SHA}" | cut -c1-7) voltooid!"

        # Als entrypoint.sh zelf is bijgewerkt tijdens deze update, herstart het script eenmalig
        ENTRYPOINT_HASH_AFTER="$(sha256sum /app/docker/entrypoint.sh 2>/dev/null | awk '{print $1}')"
        if [ -n "${ENTRYPOINT_HASH_AFTER}" ] && [ "${ENTRYPOINT_HASH_BEFORE}" != "${ENTRYPOINT_HASH_AFTER}" ] && [ "${CERVISIUM_ENTRYPOINT_RELOADED}" != "1" ]; then
          export CERVISIUM_ENTRYPOINT_RELOADED=1
          exec /app/docker/entrypoint.sh "$@"
        fi
      else
        echo "✅ [Cervisium Auto-Update] Container draait al op de nieuwste versie ($(echo "${REMOTE_SHA}" | cut -c1-7))."
      fi
    else
      echo "⚠️ [Cervisium Auto-Update] GitHub momenteel niet bereikbaar, bestaande lokale build wordt gestart."
    fi
  fi
fi

# Herstel lokale configuratiebestanden voor het geval dat
if [ -f "${FIREBASE_CONFIG_BACKUP}" ] && grep -q "YOUR_FIREBASE_WEB_API_KEY" "/app/firebase-applet-config.json" 2>/dev/null; then
  cp "${FIREBASE_CONFIG_BACKUP}" "/app/firebase-applet-config.json" 2>/dev/null || true
fi
if [ -f "${ENV_BACKUP_FILE}" ] && [ ! -f "/app/.env" ]; then
  cp "${ENV_BACKUP_FILE}" "/app/.env" 2>/dev/null || true
fi

# Synchroniseer het versienummer uit /app/src/version.json met /data/.app_version.json bij opstarten
if [ -f "/app/src/version.json" ]; then
  cp "/app/src/version.json" "${DATA_DIR}/.app_version.json" 2>/dev/null || true
  chmod 644 "${DATA_DIR}/.app_version.json" 2>/dev/null || true
fi

# 1c. Genereer automatisch een unieke SESSION_SECRET binnenin de container
if [ -z "${SESSION_SECRET}" ] || [ "${SESSION_SECRET}" = "vervang_dit_door_een_lange_geheime_sleutel_van_32_tekens" ]; then
  if [ ! -f "${SECRET_FILE}" ]; then
    openssl rand -hex 32 > "${SECRET_FILE}"
    chmod 644 "${SECRET_FILE}"
  fi
  export SESSION_SECRET="$(cat "${SECRET_FILE}")"
fi

# 2. Als er geen externe DATABASE_URL is opgegeven, gebruik de ingebouwde PostgreSQL in deze container
if [ -z "${DATABASE_URL}" ]; then
  # Als er al een database rechtstreeks in /var/lib/postgresql/data staat, gebruik die direct
  if [ -s "/var/lib/postgresql/data/PG_VERSION" ]; then
    PG_DATA="/var/lib/postgresql/data"
  fi
  mkdir -p "${PG_DATA}"
  chown -R postgres:postgres "${PG_DATA}"
  chmod 700 "${PG_DATA}"

  # Eerste keer opstarten: maak PostgreSQL cluster aan in ${PG_DATA}
  if [ ! -s "${PG_DATA}/PG_VERSION" ]; then
    echo "🗄️ [Cervisium Container] Eigen PostgreSQL-database aanmaken in ${PG_DATA}..."
    su-exec postgres initdb -D "${PG_DATA}" -U bierlog -E UTF8 --auth=trust >/dev/null
  fi

  echo "🚀 [Cervisium Container] Ingebouwde PostgreSQL-server starten..."
  if ! su-exec postgres pg_ctl -D "${PG_DATA}" status >/dev/null 2>&1; then
    su-exec postgres pg_ctl -D "${PG_DATA}" -o "-c listen_addresses='127.0.0.1' -p 5432 -c unix_socket_directories='${PG_RUN}'" -w start >/dev/null
  fi

  # Maak database 'bierlog_db' aan indien deze nog niet bestaat
  if ! su-exec postgres psql -h 127.0.0.1 -U bierlog -lqt | cut -d \| -f 1 | grep -qw bierlog_db; then
    echo "📦 [Cervisium Container] Database 'bierlog_db' en tabellen initialiseren..."
    su-exec postgres createdb -h 127.0.0.1 -U bierlog bierlog_db
  fi

  # Voer altijd idempotent het SQL-schema uit (CREATE TABLE IF NOT EXISTS)
  if [ -f "/app/docker/init-db.sql" ]; then
    su-exec postgres psql -h 127.0.0.1 -U bierlog -d bierlog_db -f /app/docker/init-db.sql >/dev/null
  fi

  export DATABASE_URL="postgresql://bierlog@127.0.0.1:5432/bierlog_db"
  export DATABASE_SSL="false"
  echo "✅ [Cervisium Container] Interne PostgreSQL-database is klaar!"
fi

echo "🍺 [Cervisium Container] Webapplicatie wordt gestart op poort ${PORT:-3000}..."
exec su-exec node node /app/server.mjs
