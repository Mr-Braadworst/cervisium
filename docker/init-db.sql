-- ==============================================================================
-- BierLog — Automatische PostgreSQL Database Initialisatie voor Docker
-- Dit script wordt direct uitgevoerd zodra de Docker database-container start.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(128) PRIMARY KEY,
  email VARCHAR(180) UNIQUE,
  name VARCHAR(120) NOT NULL,
  google_name VARCHAR(120),
  role VARCHAR(20) NOT NULL DEFAULT 'user',
  password_hash TEXT,
  avatar_url TEXT,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_records (
  id VARCHAR(128) NOT NULL,
  user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  collection_type VARCHAR(32) NOT NULL,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, collection_type, id)
);

CREATE INDEX IF NOT EXISTS idx_user_records_user_type
  ON user_records(user_id, collection_type);

CREATE INDEX IF NOT EXISTS idx_users_email
  ON users(email);
