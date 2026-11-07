#!/usr/bin/env sh
# ==============================================================================
# BierLog All-in-One Container Entrypoint
# Draait VOLLEDIG binnenin de Docker-container:
# 1. Genereert automatisch een blijvende SESSION_SECRET in /data/.session_secret
# 2. Initialiseert en start de ingebouwde PostgreSQL-database in /data/pgdata
# 3. Maakt automatisch de database 'bierlog_db' en alle tabellen (init-db.sql) aan
# 4. Start de BierLog Node.js/Express server op poort 3000
# ==============================================================================

set -e

DATA_DIR="/data"
if [ -d "/var/lib/postgresql/data" ]; then
  PG_DATA="/var/lib/postgresql/data/pgdata"
  PERSIST_DIR="/var/lib/postgresql/data"
else
  PG_DATA="${DATA_DIR}/pgdata"
  PERSIST_DIR="${DATA_DIR}"
fi
PG_RUN="/run/postgresql"
SECRET_FILE="${PERSIST_DIR}/.session_secret"
FIREBASE_ENV_FILE="${PERSIST_DIR}/.firebase_env"

mkdir -p "${DATA_DIR}" "${PERSIST_DIR}" "${PG_RUN}"
chmod 755 "${DATA_DIR}" "${PERSIST_DIR}" 2>/dev/null || true
chown -R postgres:postgres "${PG_RUN}"

# 1a. Bewaar of laad lokale Firebase-sleutels op de eigen server (komt NOOIT op GitHub)
if [ -n "${FIREBASE_API_KEY}" ] && [ -n "${FIREBASE_PROJECT_ID}" ]; then
  cat > "${FIREBASE_ENV_FILE}" <<EOF
export FIREBASE_API_KEY='${FIREBASE_API_KEY}'
export FIREBASE_PROJECT_ID='${FIREBASE_PROJECT_ID}'
export FIREBASE_AUTH_DOMAIN='${FIREBASE_AUTH_DOMAIN}'
export FIREBASE_STORAGE_BUCKET='${FIREBASE_STORAGE_BUCKET}'
export FIREBASE_MESSAGING_SENDER_ID='${FIREBASE_MESSAGING_SENDER_ID}'
export FIREBASE_APP_ID='${FIREBASE_APP_ID}'
EOF
  chmod 600 "${FIREBASE_ENV_FILE}"
elif [ -f "${FIREBASE_ENV_FILE}" ]; then
  . "${FIREBASE_ENV_FILE}"
elif [ -f "${DATA_DIR}/.firebase_env" ]; then
  . "${DATA_DIR}/.firebase_env"
fi

# 1b. Genereer automatisch een unieke SESSION_SECRET binnenin de container
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
  su-exec postgres pg_ctl -D "${PG_DATA}" -o "-c listen_addresses='127.0.0.1' -p 5432 -c unix_socket_directories='${PG_RUN}'" -w start >/dev/null

  # Maak database 'bierlog_db' aan indien deze nog niet bestaat
  if ! su-exec postgres psql -h 127.0.0.1 -U bierlog -lqt | cut -d \| -f 1 | grep -qw bierlog_db; then
    echo "📦 [BierLog Container] Database 'bierlog_db' en tabellen initialiseren..."
    su-exec postgres createdb -h 127.0.0.1 -U bierlog bierlog_db
  fi

  # Voer altijd idempotent het SQL-schema uit (CREATE TABLE IF NOT EXISTS)
  if [ -f "/app/docker/init-db.sql" ]; then
    su-exec postgres psql -h 127.0.0.1 -U bierlog -d bierlog_db -f /app/docker/init-db.sql >/dev/null
  fi

  export DATABASE_URL="postgresql://bierlog@127.0.0.1:5432/bierlog_db"
  export DATABASE_SSL="false"
  echo "✅ [BierLog Container] Interne PostgreSQL-database is klaar!"
fi

echo "🍺 [BierLog Container] Webapplicatie wordt gestart op poort ${PORT:-3000}..."
exec su-exec node node /app/server.mjs
