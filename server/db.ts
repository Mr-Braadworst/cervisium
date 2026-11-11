import pg from 'pg';
import {
  isValidServerId,
  sanitizeServerId,
  sanitizeServerString,
  sanitizeServerNumber,
  sanitizeServerImageUrl,
  sanitizeServerUserSettings,
  isVerifiedAdminEmail,
  getCanonicalUserIdForEmail,
} from './security';

const { Pool } = pg;

const ALLOWED_COLLECTION_TYPES = new Set([
  'categories',
  'beers',
  'tastings',
  'glasses',
  'pubDeals',
  'sessions',
]);

export interface DbUserRecord {
  id: string;
  email: string;
  name: string;
  googleName?: string;
  role: 'admin' | 'user';
  passwordHash?: string;
  avatarUrl?: string;
  settings?: Record<string, unknown>;
  createdAt: string;
  lastActiveAt?: string;
}

export interface AdminFullExportPayload {
  app: 'Cervisium' | 'BierLog';
  schemaVersion: 2;
  exportedAt: string;
  exportedBy: string;
  users: Array<{
    user: {
      id: string;
      email: string;
      name: string;
      googleName?: string;
      role: 'admin' | 'user';
      avatarUrl?: string;
      createdAt: string;
      lastActiveAt?: string;
    };
    settings?: Record<string, unknown>;
    categories: Array<Record<string, unknown>>;
    beers: Array<Record<string, unknown>>;
    tastings: Array<Record<string, unknown>>;
    glasses: Array<Record<string, unknown>>;
    pubDeals: Array<Record<string, unknown>>;
    sessions?: Array<Record<string, unknown>>;
  }>;
}

export interface AdminImportResultSummary {
  usersImported: number;
  usersSkippedDuplicate: number;
  categoriesImported: number;
  beersImported: number;
  tastingsImported: number;
  glassesImported: number;
  pubDealsImported: number;
  recordsSkippedDuplicate: number;
  storageEngine: 'postgresql' | 'server-store';
}

function isPlaceholderEmailValue(email: string | undefined | null): boolean {
  if (!email) return true;
  const lower = email.trim().toLowerCase();
  return !lower || !lower.includes('@') || lower === 'gebruiker@bierlog.nl';
}

/**
 * Centrale Database Client
 * Met automatische schema-initialisatie, account-deduplicatie op e-mailadres
 * en veilige server-fallback wanneer DATABASE_URL nog leeg is.
 */
class CentralDatabaseClient {
  private pool: pg.Pool | null = null;
  private initialized = false;

  // Fallback server-side store wanneer er lokaal nog geen PostgreSQL DATABASE_URL is ingesteld
  private memoryUsers = new Map<string, DbUserRecord>();
  private memoryCollections = new Map<
    string,
    {
      categories: Map<string, Record<string, unknown>>;
      beers: Map<string, Record<string, unknown>>;
      tastings: Map<string, Record<string, unknown>>;
      glasses: Map<string, Record<string, unknown>>;
      pubDeals: Map<string, Record<string, unknown>>;
      sessions: Map<string, Record<string, unknown>>;
    }
  >();
  private memoryFriends = new Map<string, Set<string>>();
  private memoryFriendTimestamps = new Map<string, string>();
  private memorySystemSettings = new Map<string, string>();

  public isPostgresConfigured(): boolean {
    const url = process.env.DATABASE_URL?.trim();
    return Boolean(
      url &&
        (url.startsWith('postgres://') || url.startsWith('postgresql://')) &&
        !url.includes('USER:PASSWORD@HOST')
    );
  }

  public async init(): Promise<void> {
    if (this.initialized) return;
    if (this.isPostgresConfigured()) {
      try {
        this.pool = new Pool({
          connectionString: process.env.DATABASE_URL,
          ssl:
            process.env.DATABASE_SSL === 'false'
              ? false
              : { rejectUnauthorized: false },
          max: 10,
          idleTimeoutMillis: 30_000,
        });

        await this.pool.query(`
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

          CREATE TABLE IF NOT EXISTS user_friends (
            user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            friend_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            status VARCHAR(20) NOT NULL DEFAULT 'accepted',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            PRIMARY KEY (user_id, friend_id)
          );

          CREATE TABLE IF NOT EXISTS system_settings (
            key VARCHAR(64) PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );
        `);

        this.initialized = true;
        await this.consolidateDuplicateDatabaseUsers();
        await this.repairCrossAccountContamination();
        return;
      } catch (err) {
        console.warn(
          '[Database] Kon niet verbinden met PostgreSQL via DATABASE_URL, gebruikt server-store fallback:',
          err instanceof Error ? err.message : err
        );
        this.pool = null;
      }
    }
    this.initialized = true;
  }

  /**
   * Zorgt ervoor dat uitsluitend geverifieerde beheerder-accounts de rol 'admin' hebben
   * en dat per ongeluk naar het admin-account gekopieerde records van andere gebruikers
   * automatisch worden hersteld of opgeruimd uit de PostgreSQL database.
   */
  public async repairCrossAccountContamination(): Promise<void> {
    if (!this.pool) {
      for (const [_uid, u] of this.memoryUsers.entries()) {
        if (u.role === 'admin' && !isVerifiedAdminEmail(u.email, true)) {
          u.role = 'user';
        }
      }
      return;
    }

    try {
      const allAdminsRes = await this.pool.query(
        "SELECT id, email FROM users WHERE role = 'admin'"
      );
      for (const r of allAdminsRes.rows) {
        if (!isVerifiedAdminEmail(String(r.email || ''), true)) {
          await this.pool.query("UPDATE users SET role = 'user' WHERE id = $1", [r.id]);
        }
      }

      // Detecteer beheerder-accounts
      const adminUsersRes = await this.pool.query(
        "SELECT id FROM users WHERE LOWER(email) = 'constantijnvanvuuren@gmail.com' OR role = 'admin'"
      );
      const adminIds: string[] = adminUsersRes.rows.map((r) => String(r.id));

      if (adminIds.length > 0) {
        // A. Als payload->>'userId' naar een ander (niet-admin) account wijst, zet het record terug naar die gebruiker
        await this.pool.query(
          `
          UPDATE user_records ur
          SET user_id = ur.payload->>'userId'
          FROM users u
          WHERE ur.user_id = ANY($1::text[])
            AND ur.payload->>'userId' IS NOT NULL
            AND ur.payload->>'userId' <> ur.user_id
            AND u.id = ur.payload->>'userId'
            AND u.id NOT IN (SELECT id FROM users WHERE LOWER(email) = 'constantijnvanvuuren@gmail.com' OR role = 'admin')
          ON CONFLICT (user_id, collection_type, id) DO NOTHING;
          `,
          [adminIds]
        );

        // B. Verwijder van het admin-account alle records waarvan de payload->>'userId' expliciet naar een andere gebruiker wijst
        await this.pool.query(
          `
          DELETE FROM user_records
          WHERE user_id = ANY($1::text[])
            AND payload->>'userId' IS NOT NULL
            AND payload->>'userId' <> user_id;
          `,
          [adminIds]
        );

        // C. Als een ander (niet-admin) account exact hetzelfde item (bier/proefnotitie/glas) in zijn collectie heeft,
        //    verwijder dat item uit de admin user_records (want dat item behoort primair tot de andere gebruiker).
        await this.pool.query(
          `
          DELETE FROM user_records ur
          WHERE ur.user_id = ANY($1::text[])
            AND EXISTS (
              SELECT 1 FROM user_records other
              WHERE other.id = ur.id
                AND other.collection_type = ur.collection_type
                AND other.user_id <> ur.user_id
                AND other.user_id NOT IN (
                  SELECT id FROM users WHERE LOWER(email) = 'constantijnvanvuuren@gmail.com' OR role = 'admin'
                )
            );
          `,
          [adminIds]
        );
      }
    } catch (err) {
      console.warn('[Database] Controle admin-rol & opschonen melding:', err instanceof Error ? err.message : err);
    }
  }

  public async getForeignRecordIds(_userId: string): Promise<string[]> {
    await this.init();
    return [];
  }

  /**
   * Voegt eventuele dubbele accounts met exact hetzelfde e-mailadres
   * (bijv. een 'usr_...' account op http://212.227.151.8:3000 en een Firebase/Google UID op https://cervisium.nl)
   * én eventuele losse lokale gast-accounts (zonder e-mailadres) samen onder het hoofdaccount.
   */
  public async consolidateDuplicateDatabaseUsers(): Promise<void> {
    if (!this.pool) {
      for (const [uid, u] of Array.from(this.memoryUsers.entries())) {
        const cleanEmail = u.email.trim().toLowerCase();
        if (!isPlaceholderEmailValue(cleanEmail)) {
          const canonicalId = getCanonicalUserIdForEmail(cleanEmail) || uid;
          if (uid !== canonicalId) {
            const existingCanonical = this.memoryUsers.get(canonicalId);
            if (!existingCanonical) {
              this.memoryUsers.set(canonicalId, { ...u, id: canonicalId });
            }
            this.mergeMemoryUserInto(uid, canonicalId);
          }
        }
      }
      return;
    }

    try {
      const res = await this.pool.query('SELECT * FROM users ORDER BY last_active_at DESC NULLS LAST');
      const rows = res.rows;
      if (rows.length === 0) return;

      for (const row of rows) {
        const email = typeof row.email === 'string' ? row.email.trim().toLowerCase() : '';
        if (!isPlaceholderEmailValue(email)) {
          const canonicalId = getCanonicalUserIdForEmail(email);
          if (!canonicalId) continue;

          if (row.id !== canonicalId) {
            await this.pool.query(
              `
              INSERT INTO users (id, email, name, google_name, role, password_hash, avatar_url, settings, created_at, last_active_at)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
              ON CONFLICT (id) DO UPDATE SET
                email = EXCLUDED.email,
                role = CASE WHEN EXCLUDED.role = 'admin' THEN 'admin' ELSE users.role END,
                last_active_at = GREATEST(users.last_active_at, EXCLUDED.last_active_at)
              `,
              [
                canonicalId,
                email,
                row.name,
                row.google_name,
                row.role,
                row.password_hash,
                row.avatar_url,
                row.settings || '{}',
                row.created_at,
                row.last_active_at,
              ]
            );
            await this.mergePostgresUserInto(row.id, canonicalId);
          }
        }
      }
    } catch (err) {
      console.warn('[Database] Consolidatie melding:', err instanceof Error ? err.message : err);
    }
  }

  private mergeMemoryUserInto(sourceUid: string, targetUid: string) {
    if (sourceUid === targetUid) return;
    const sourceBucket = this.memoryCollections.get(sourceUid);
    const targetBucket = this.ensureMemoryBucket(targetUid);
    if (sourceBucket) {
      const cols: Array<'categories' | 'beers' | 'tastings' | 'glasses' | 'pubDeals' | 'sessions'> = [
        'categories',
        'beers',
        'tastings',
        'glasses',
        'pubDeals',
        'sessions',
      ];
      for (const col of cols) {
        sourceBucket[col].forEach((val, key) => {
          const existing = targetBucket[col].get(key);
          targetBucket[col].set(key, {
            ...(existing || {}),
            ...val,
            photoUrl: val.photoUrl || existing?.photoUrl,
            userId: targetUid,
          });
        });
      }
      this.memoryCollections.delete(sourceUid);
    }
    const sourceUser = this.memoryUsers.get(sourceUid);
    const targetUser = this.memoryUsers.get(targetUid);
    if (sourceUser && targetUser) {
      if (isPlaceholderEmailValue(targetUser.email) && !isPlaceholderEmailValue(sourceUser.email)) {
        targetUser.email = sourceUser.email;
      }
      if ((!targetUser.name || targetUser.name === 'Bierliefhebber') && sourceUser.name) {
        targetUser.name = sourceUser.name;
      }
      if (sourceUser.role === 'admin') {
        targetUser.role = 'admin';
      }
    }
    this.memoryUsers.delete(sourceUid);
  }

  private async mergePostgresUserInto(sourceUid: string, targetUid: string): Promise<void> {
    if (!this.pool || sourceUid === targetUid) return;
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      // Verplaats alle records van sourceUid naar targetUid en behoud foto's indien aanwezig
      await client.query(
        `
        INSERT INTO user_records (id, user_id, collection_type, payload, updated_at)
        SELECT id, $2, collection_type, jsonb_set(payload, '{userId}', to_jsonb($2::text), true), updated_at
        FROM user_records
        WHERE user_id = $1
        ON CONFLICT (user_id, collection_type, id) DO UPDATE SET
          payload = CASE
            WHEN (user_records.payload->>'photoUrl') IS NOT NULL AND (EXCLUDED.payload->>'photoUrl') IS NULL
            THEN jsonb_set(EXCLUDED.payload, '{photoUrl}', user_records.payload->'photoUrl', true)
            ELSE EXCLUDED.payload
          END,
          updated_at = NOW();
        `,
        [sourceUid, targetUid]
      );
      await client.query('DELETE FROM user_records WHERE user_id = $1', [sourceUid]);
      await client.query('DELETE FROM users WHERE id = $1', [sourceUid]);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      console.warn('[Database] Merge user fout:', err instanceof Error ? err.message : err);
    } finally {
      client.release();
    }
  }

  private ensureMemoryBucket(userId: string) {
    if (!this.memoryCollections.has(userId)) {
      this.memoryCollections.set(userId, {
        categories: new Map(),
        beers: new Map(),
        tastings: new Map(),
        glasses: new Map(),
        pubDeals: new Map(),
        sessions: new Map(),
      });
    }
    return this.memoryCollections.get(userId)!;
  }

  public async getDatabaseSizeBytes(): Promise<number> {
    await this.init();
    if (this.pool) {
      try {
        const res = await this.pool.query('SELECT pg_database_size(current_database()) AS size_bytes');
        const val = Number(res.rows[0]?.size_bytes);
        if (Number.isFinite(val) && val > 0) {
          return val;
        }
      } catch {
        // Fallback hieronder
      }
    }
    let total = 0;
    this.memoryUsers.forEach((u) => {
      total += Buffer.byteLength(JSON.stringify(u), 'utf8');
    });
    this.memoryCollections.forEach((bucket) => {
      for (const map of Object.values(bucket)) {
        map.forEach((rec) => {
          total += Buffer.byteLength(JSON.stringify(rec), 'utf8');
        });
      }
    });
    return total;
  }

  public async upsertUser(user: {
    id: string;
    email: string;
    name: string;
    googleName?: string;
    role?: 'admin' | 'user';
    passwordHash?: string;
    avatarUrl?: string;
    settings?: Record<string, unknown>;
    createdAt?: string;
    lastActiveAt?: string;
  }): Promise<DbUserRecord> {
    await this.init();
    const rawEmail = sanitizeServerString(user.email, 180).toLowerCase();
    const safeEmail = isPlaceholderEmailValue(rawEmail) ? '' : rawEmail;
    const canonicalId = (safeEmail && getCanonicalUserIdForEmail(safeEmail)) || sanitizeServerId(user.id, 'usr');
    const safeId = canonicalId;
    const safeName = sanitizeServerString(user.name, 100, 'Bierliefhebber');
    const role: 'admin' | 'user' =
      user.role === 'admin' && isVerifiedAdminEmail(safeEmail, true) ? 'admin' : 'user';
    const cleanSettings = sanitizeServerUserSettings(user.settings);
    const nowIso = new Date().toISOString();

    if (this.pool) {
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');

        // Controleer of dit e-mailadres al onder een ander (oud) ID in de database staat
        let inheritedPasswordHash: string | null = user.passwordHash || null;
        let inheritedAvatarUrl: string | null = sanitizeServerImageUrl(user.avatarUrl) || null;
        let inheritedGoogleName: string | null = user.googleName
          ? sanitizeServerString(user.googleName, 100)
          : null;
        let inheritedSettings: Record<string, unknown> = cleanSettings;
        let inheritedCreatedAt: string = user.createdAt || nowIso;
        let oldIdsToMerge: string[] = [];

        // Geheugenhouders & database-records mogen UITSLUITEND worden samengevoegd
        // als het bestaande account EXACT hetzelfde niet-lege e-mailadres deelt.
        if (safeEmail) {
          const emailCheck = await client.query(
            `
            SELECT id, email, password_hash, avatar_url, google_name, settings, created_at
            FROM users
            WHERE LOWER(email) = $1
            `,
            [safeEmail]
          );
          for (const existingRow of emailCheck.rows) {
            if (existingRow.id !== safeId) {
              oldIdsToMerge.push(String(existingRow.id));
              if (!inheritedPasswordHash && existingRow.password_hash) {
                inheritedPasswordHash = existingRow.password_hash;
              }
              if (!inheritedAvatarUrl && existingRow.avatar_url) {
                inheritedAvatarUrl = existingRow.avatar_url;
              }
              if (!inheritedGoogleName && existingRow.google_name) {
                inheritedGoogleName = existingRow.google_name;
              }
              if (
                existingRow.settings &&
                typeof existingRow.settings === 'object' &&
                Object.keys(inheritedSettings).length === 0
              ) {
                inheritedSettings = sanitizeServerUserSettings(existingRow.settings);
              }
              if (existingRow.created_at) {
                const existingIso = new Date(existingRow.created_at).toISOString();
                if (existingIso < inheritedCreatedAt) {
                  inheritedCreatedAt = existingIso;
                }
              }
              // Maak e-mailadres op het oude record eerst NULL zodat UNIQUE(email) niet conflicteert
              await client.query('UPDATE users SET email = NULL WHERE id = $1', [existingRow.id]);
            }
          }
        }

        const res = await client.query(
          `
          INSERT INTO users (id, email, name, google_name, role, password_hash, avatar_url, settings, created_at, last_active_at)
          VALUES ($1, NULLIF($2, ''), $3, $4, $5, $6, $7, $8::jsonb, $9::timestamptz, $10::timestamptz)
          ON CONFLICT (id) DO UPDATE SET
            email = COALESCE(NULLIF(EXCLUDED.email, ''), users.email),
            name = CASE
              WHEN EXCLUDED.name IS NOT NULL AND EXCLUDED.name <> '' AND EXCLUDED.name <> 'Bierliefhebber'
              THEN EXCLUDED.name
              ELSE COALESCE(NULLIF(users.name, ''), EXCLUDED.name)
            END,
            google_name = COALESCE(EXCLUDED.google_name, users.google_name),
            role = EXCLUDED.role,
            password_hash = COALESCE(EXCLUDED.password_hash, users.password_hash),
            avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
            settings = CASE
              WHEN EXCLUDED.settings IS NOT NULL AND EXCLUDED.settings <> '{}'::jsonb
              THEN EXCLUDED.settings
              ELSE COALESCE(users.settings, '{}'::jsonb)
            END,
            last_active_at = EXCLUDED.last_active_at
          RETURNING *;
          `,
          [
            safeId,
            safeEmail,
            safeName,
            inheritedGoogleName,
            role,
            inheritedPasswordHash,
            inheritedAvatarUrl,
            JSON.stringify(inheritedSettings),
            inheritedCreatedAt,
            user.lastActiveAt || nowIso,
          ]
        );

        // Verplaats alle bieren, proefnotities, glazen en categorieën van eventuele oude ID's met ditzelfde e-mailadres naar dit account
        for (const oldId of oldIdsToMerge) {
          if (!oldId || oldId === safeId) continue;
          await client.query(
            `
            INSERT INTO user_records (id, user_id, collection_type, payload, updated_at)
            SELECT id, $2, collection_type, jsonb_set(payload, '{userId}', to_jsonb($2::text), true), updated_at
            FROM user_records
            WHERE user_id = $1
            ON CONFLICT (user_id, collection_type, id) DO UPDATE SET
              payload = CASE
                WHEN (user_records.payload->>'photoUrl') IS NOT NULL AND (EXCLUDED.payload->>'photoUrl') IS NULL
                THEN jsonb_set(EXCLUDED.payload, '{photoUrl}', user_records.payload->'photoUrl', true)
                ELSE EXCLUDED.payload
              END,
              updated_at = NOW();
            `,
            [oldId, safeId]
          );
          await client.query('DELETE FROM user_records WHERE user_id = $1', [oldId]);
          await client.query('DELETE FROM users WHERE id = $1', [oldId]);
        }

        await client.query('COMMIT');

        const row = res.rows[0];
        return {
          id: row.id,
          email: row.email || '',
          name: row.name,
          googleName: row.google_name || undefined,
          role: row.role === 'admin' ? 'admin' : 'user',
          passwordHash: row.password_hash || undefined,
          avatarUrl: row.avatar_url || undefined,
          settings: row.settings || {},
          createdAt: new Date(row.created_at).toISOString(),
          lastActiveAt: row.last_active_at ? new Date(row.last_active_at).toISOString() : nowIso,
        };
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        throw err;
      } finally {
        client.release();
      }
    }

    // Memory fallback: controleer ook of er al een ander account met exact hetzelfde e-mailadres bestaat
    if (safeEmail) {
      for (const [existingUid, existingUser] of Array.from(this.memoryUsers.entries())) {
        if (existingUid !== safeId && existingUser.email.toLowerCase() === safeEmail) {
          this.mergeMemoryUserInto(existingUid, safeId);
        }
      }
    }

    const existing = this.memoryUsers.get(safeId);
    const effectiveEmail = safeEmail || existing?.email || '';
    const record: DbUserRecord = {
      id: safeId,
      email: effectiveEmail,
      name:
        safeName && safeName !== 'Bierliefhebber'
          ? safeName
          : existing?.name || safeName || 'Bierliefhebber',
      googleName: user.googleName
        ? sanitizeServerString(user.googleName, 100)
        : existing?.googleName,
      role: role === 'admin' && isVerifiedAdminEmail(effectiveEmail, true) ? 'admin' : 'user',
      passwordHash: user.passwordHash || existing?.passwordHash,
      avatarUrl: sanitizeServerImageUrl(user.avatarUrl) || existing?.avatarUrl,
      settings:
        Object.keys(cleanSettings).length > 0
          ? cleanSettings
          : existing?.settings || {},
      createdAt: existing?.createdAt || user.createdAt || nowIso,
      lastActiveAt: user.lastActiveAt || nowIso,
    };
    this.memoryUsers.set(safeId, record);
    this.ensureMemoryBucket(safeId);
    return record;
  }

  public async getUserById(userId: string): Promise<DbUserRecord | null> {
    await this.init();
    if (!isValidServerId(userId)) return null;

    if (this.pool) {
      const res = await this.pool.query('SELECT * FROM users WHERE id = $1 LIMIT 1', [userId]);
      if (res.rows.length === 0) return null;
      const row = res.rows[0];
      return {
        id: row.id,
        email: row.email || '',
        name: row.name,
        googleName: row.google_name || undefined,
        role: row.role === 'admin' ? 'admin' : 'user',
        passwordHash: row.password_hash || undefined,
        avatarUrl: row.avatar_url || undefined,
        settings: row.settings || {},
        createdAt: new Date(row.created_at).toISOString(),
        lastActiveAt: row.last_active_at ? new Date(row.last_active_at).toISOString() : undefined,
      };
    }

    return this.memoryUsers.get(userId) || null;
  }

  public async getUserByEmail(email: string): Promise<DbUserRecord | null> {
    await this.init();
    const safeEmail = sanitizeServerString(email, 180).toLowerCase();
    if (!safeEmail || !safeEmail.includes('@')) return null;

    if (this.pool) {
      const res = await this.pool.query(
        'SELECT * FROM users WHERE LOWER(email) = $1 LIMIT 1',
        [safeEmail]
      );
      if (res.rows.length === 0) return null;
      const row = res.rows[0];
      return {
        id: row.id,
        email: row.email || '',
        name: row.name,
        googleName: row.google_name || undefined,
        role: row.role === 'admin' ? 'admin' : 'user',
        passwordHash: row.password_hash || undefined,
        avatarUrl: row.avatar_url || undefined,
        settings: row.settings || {},
        createdAt: new Date(row.created_at).toISOString(),
        lastActiveAt: row.last_active_at ? new Date(row.last_active_at).toISOString() : undefined,
      };
    }

    for (const u of this.memoryUsers.values()) {
      if (u.email.toLowerCase() === safeEmail) {
        return u;
      }
    }
    return null;
  }

  public async getUserRecords(userId: string) {
    await this.init();
    if (!isValidServerId(userId)) {
      return { categories: [], beers: [], tastings: [], glasses: [], pubDeals: [], sessions: [] };
    }
    await this.repairCrossAccountContamination();

    if (this.pool) {
      const userRes = await this.pool.query('SELECT id, email, role FROM users WHERE id = $1 LIMIT 1', [userId]);
      const userRow = userRes.rows[0];
      const userEmail = typeof userRow?.email === 'string' && !isPlaceholderEmailValue(userRow.email)
        ? userRow.email.trim().toLowerCase()
        : null;
      const canonicalId = userEmail ? getCanonicalUserIdForEmail(userEmail) : userId;
      const res = await this.pool.query(
        `
        SELECT DISTINCT ON (collection_type, payload->>'id') collection_type, payload
        FROM user_records
        WHERE user_id = $1
           OR ($2::text IS NOT NULL AND user_id = $2)
           OR ($3::text IS NOT NULL AND user_id IN (SELECT id FROM users WHERE LOWER(email) = LOWER($3)))
        ORDER BY collection_type, payload->>'id', updated_at DESC
        `,
        [userId, canonicalId, userEmail]
      );
      const grouped: Record<string, Array<Record<string, unknown>>> = {
        categories: [],
        beers: [],
        tastings: [],
        glasses: [],
        pubDeals: [],
        sessions: [],
      };
      for (const row of res.rows) {
        if (grouped[row.collection_type]) {
          grouped[row.collection_type].push(row.payload);
        }
      }
      return grouped;
    }

    const bucket = this.ensureMemoryBucket(userId);
    return {
      categories: Array.from(bucket.categories.values()),
      beers: Array.from(bucket.beers.values()),
      tastings: Array.from(bucket.tastings.values()),
      glasses: Array.from(bucket.glasses.values()),
      pubDeals: Array.from(bucket.pubDeals.values()),
      sessions: Array.from(bucket.sessions.values()),
    };
  }

  // --- Vrienden Functionaliteit ---

  public async addFriendship(
    userId: string,
    targetIdentifier: string
  ): Promise<{ success: boolean; friend?: DbUserRecord; message: string }> {
    await this.init();
    if (!isValidServerId(userId)) {
      return { success: false, message: 'Ongeldige gebruiker.' };
    }

    const cleanTarget = (targetIdentifier || '').trim().toLowerCase();
    if (!cleanTarget) {
      return { success: false, message: 'Geen uitnodigingscode of vriend opgegeven.' };
    }

    let friendProfile: DbUserRecord | null = null;
    if (cleanTarget.includes('@')) {
      friendProfile = await this.getUserByEmail(cleanTarget);
    } else {
      const canonicalTarget = getCanonicalUserIdForEmail(cleanTarget) || cleanTarget;
      friendProfile = await this.getUserById(canonicalTarget);
      if (!friendProfile && isValidServerId(cleanTarget)) {
        friendProfile = await this.getUserById(cleanTarget);
      }
    }

    if (!friendProfile) {
      return { success: false, message: 'Uitgenodigde gebruiker is niet gevonden.' };
    }

    if (friendProfile.id === userId) {
      return { success: false, message: 'Je kunt jezelf niet als vriend toevoegen.' };
    }

    const nowIso = new Date().toISOString();

    if (this.pool) {
      try {
        await this.pool.query(
          `
          INSERT INTO user_friends (user_id, friend_id, status, created_at)
          VALUES ($1, $2, 'accepted', NOW()), ($2, $1, 'accepted', NOW())
          ON CONFLICT (user_id, friend_id) DO UPDATE SET status = 'accepted', created_at = NOW();
          `,
          [userId, friendProfile.id]
        );
      } catch (err) {
        console.warn('[Database] addFriendship fout:', err);
      }
    }

    if (!this.memoryFriends.has(userId)) this.memoryFriends.set(userId, new Set());
    if (!this.memoryFriends.has(friendProfile.id)) this.memoryFriends.set(friendProfile.id, new Set());
    this.memoryFriends.get(userId)!.add(friendProfile.id);
    this.memoryFriends.get(friendProfile.id)!.add(userId);
    this.memoryFriendTimestamps.set(`${userId}:${friendProfile.id}`, nowIso);
    this.memoryFriendTimestamps.set(`${friendProfile.id}:${userId}`, nowIso);

    return {
      success: true,
      friend: friendProfile,
      message: `Je bent nu vrienden met ${friendProfile.name}!`,
    };
  }

  public async getFriendsForUser(userId: string): Promise<
    Array<{
      id: string;
      name: string;
      email: string;
      avatarUrl?: string;
      beerCount: number;
      tastingCount: number;
      connectedAt: string;
    }>
  > {
    await this.init();
    if (!isValidServerId(userId)) return [];

    if (this.pool) {
      try {
        const res = await this.pool.query(
          `
          SELECT u.id, u.email, u.name, u.avatar_url, f.created_at,
            (SELECT COUNT(*) FROM user_records ur WHERE ur.user_id = u.id AND ur.collection_type = 'beers') AS beer_count,
            (SELECT COUNT(*) FROM user_records ur WHERE ur.user_id = u.id AND ur.collection_type = 'tastings') AS tasting_count
          FROM user_friends f
          JOIN users u ON u.id = f.friend_id
          WHERE f.user_id = $1 AND f.status = 'accepted'
          ORDER BY f.created_at DESC;
          `,
          [userId]
        );

        return res.rows.map((r) => ({
          id: r.id,
          name: r.name,
          email: r.email || '',
          avatarUrl: r.avatar_url || undefined,
          beerCount: Number(r.beer_count) || 0,
          tastingCount: Number(r.tasting_count) || 0,
          connectedAt: new Date(r.created_at).toISOString(),
        }));
      } catch (err) {
        console.warn('[Database] getFriendsForUser fout:', err);
      }
    }

    const friendIds = Array.from(this.memoryFriends.get(userId) || []);
    const list = [];
    for (const fid of friendIds) {
      const fUser = await this.getUserById(fid);
      if (fUser) {
        const recs = await this.getUserRecords(fid);
        const connectedAt =
          this.memoryFriendTimestamps.get(`${userId}:${fid}`) || fUser.createdAt || new Date().toISOString();
        list.push({
          id: fUser.id,
          name: fUser.name,
          email: fUser.email,
          avatarUrl: fUser.avatarUrl,
          beerCount: recs.beers.length,
          tastingCount: recs.tastings.length,
          connectedAt,
        });
      }
    }
    return list;
  }

  public async removeFriendship(userId: string, friendId: string): Promise<boolean> {
    await this.init();
    if (!isValidServerId(userId) || !isValidServerId(friendId)) return false;

    if (this.pool) {
      try {
        await this.pool.query(
          `DELETE FROM user_friends WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)`,
          [userId, friendId]
        );
      } catch {
        // ignore
      }
    }

    this.memoryFriends.get(userId)?.delete(friendId);
    this.memoryFriends.get(friendId)?.delete(userId);
    return true;
  }

  public async getFriendRecords(
    userId: string,
    friendId: string
  ): Promise<{ friend: DbUserRecord; records: any } | null> {
    await this.init();
    if (!isValidServerId(userId) || !isValidServerId(friendId)) return null;

    const friendUser = await this.getUserById(friendId);
    if (!friendUser) return null;

    let isFriend = false;
    if (this.pool) {
      const check = await this.pool.query(
        `SELECT 1 FROM user_friends WHERE user_id = $1 AND friend_id = $2 AND status = 'accepted' LIMIT 1`,
        [userId, friendId]
      );
      isFriend = check.rows.length > 0;
    } else {
      isFriend = Boolean(this.memoryFriends.get(userId)?.has(friendId));
    }

    const isOwner = isVerifiedAdminEmail(friendUser.email, true);
    if (!isFriend && !isOwner && userId !== friendId) {
      return null;
    }

    const records = await this.getUserRecords(friendId);
    return {
      friend: friendUser,
      records,
    };
  }

  public async exportAllData(exportedByEmail: string): Promise<AdminFullExportPayload> {
    await this.init();
    await this.consolidateDuplicateDatabaseUsers();
    await this.repairCrossAccountContamination();
    const outUsers: AdminFullExportPayload['users'] = [];

    if (this.pool) {
      const usersRes = await this.pool.query('SELECT * FROM users ORDER BY created_at ASC');
      for (const row of usersRes.rows) {
        const records = await this.getUserRecords(row.id);
        outUsers.push({
          user: {
            id: row.id,
            email: row.email || '',
            name: row.name,
            googleName: row.google_name || undefined,
            role: row.role === 'admin' ? 'admin' : 'user',
            avatarUrl: row.avatarUrl || row.avatar_url || undefined,
            createdAt: new Date(row.created_at).toISOString(),
            lastActiveAt: row.last_active_at
              ? new Date(row.last_active_at).toISOString()
              : undefined,
          },
          settings: row.settings || {},
          categories: records.categories,
          beers: records.beers,
          tastings: records.tastings,
          glasses: records.glasses,
          pubDeals: records.pubDeals,
          sessions: records.sessions,
        });
      }
    } else {
      for (const [uid, u] of this.memoryUsers.entries()) {
        const records = await this.getUserRecords(uid);
        outUsers.push({
          user: {
            id: u.id,
            email: u.email,
            name: u.name,
            googleName: u.googleName,
            role: u.role,
            avatarUrl: u.avatarUrl,
            createdAt: u.createdAt,
            lastActiveAt: u.lastActiveAt,
          },
          settings: u.settings || {},
          categories: records.categories,
          beers: records.beers,
          tastings: records.tastings,
          glasses: records.glasses,
          pubDeals: records.pubDeals,
          sessions: records.sessions,
        });
      }
    }

    return {
      app: 'Cervisium',
      schemaVersion: 2,
      exportedAt: new Date().toISOString(),
      exportedBy: exportedByEmail,
      users: outUsers,
    };
  }

  /**
   * Importeert een volledige Admin JSON-export in de centrale database.
   * Valideert alle records, houdt gebruikers strikt gescheiden en herstelt eventuele cross-account contaminatie.
   */
  public async importAllData(
    rawPayload: unknown,
    options: { skipDuplicates: boolean } = { skipDuplicates: true }
  ): Promise<AdminImportResultSummary> {
    await this.init();
    if (!rawPayload || typeof rawPayload !== 'object') {
      throw new Error('Ongeldig JSON-bestand: hoofdstructuur ontbreekt.');
    }

    const data = rawPayload as Record<string, unknown>;
    const rawUsers = Array.isArray(data.users) ? data.users : [];

    const summary: AdminImportResultSummary = {
      usersImported: 0,
      usersSkippedDuplicate: 0,
      categoriesImported: 0,
      beersImported: 0,
      tastingsImported: 0,
      glassesImported: 0,
      pubDealsImported: 0,
      recordsSkippedDuplicate: 0,
      storageEngine: this.pool ? 'postgresql' : 'server-store',
    };

    const existingUserIds = new Set<string>();
    const existingEmailToUid = new Map<string, string>();

    if (this.pool) {
      const existingRes = await this.pool.query('SELECT id, email FROM users');
      for (const r of existingRes.rows) {
        const idStr = String(r.id);
        existingUserIds.add(idStr);
        if (r.email) existingEmailToUid.set(String(r.email).toLowerCase(), idStr);
      }
    } else {
      for (const u of this.memoryUsers.values()) {
        existingUserIds.add(u.id);
        if (u.email) existingEmailToUid.set(u.email.toLowerCase(), u.id);
      }
    }

    for (const entry of rawUsers.slice(0, 2000)) {
      if (!entry || typeof entry !== 'object') continue;
      const item = entry as Record<string, unknown>;
      const userObj =
        item.user && typeof item.user === 'object'
          ? (item.user as Record<string, unknown>)
          : item;

      const candidateUid = isValidServerId(userObj.id)
        ? userObj.id
        : sanitizeServerId(userObj.uid, 'usr');
      const rawEmail = sanitizeServerString(userObj.email, 180).toLowerCase();
      const email = isPlaceholderEmailValue(rawEmail) ? '' : rawEmail;
      const name = sanitizeServerString(userObj.name, 100, 'Bierliefhebber');
      // Geef uitsluitend de geverifieerde eigenaar de admin-rol bij import
      const role: 'admin' | 'user' = isVerifiedAdminEmail(email, true) ? 'admin' : 'user';

      const matchedExistingUid = email ? existingEmailToUid.get(email) : undefined;
      const uid = matchedExistingUid || candidateUid;
      const isDuplicateUser = Boolean(existingUserIds.has(uid) || matchedExistingUid);

      const upserted = await this.upsertUser({
        id: uid,
        email,
        name,
        googleName: userObj.googleName ? sanitizeServerString(userObj.googleName, 100) : undefined,
        role,
        avatarUrl: sanitizeServerImageUrl(userObj.avatarUrl),
        settings:
          item.settings && typeof item.settings === 'object'
            ? (item.settings as Record<string, unknown>)
            : {},
        createdAt: sanitizeServerString(userObj.createdAt, 40, new Date().toISOString()),
        lastActiveAt: sanitizeServerString(userObj.lastActiveAt, 40, new Date().toISOString()),
      });

      const effectiveUid = upserted.id;
      if (isDuplicateUser && options.skipDuplicates) {
        summary.usersSkippedDuplicate += 1;
      } else {
        existingUserIds.add(effectiveUid);
        if (email) existingEmailToUid.set(email, effectiveUid);
        summary.usersImported += 1;
      }

      const collections: Array<{
        key: 'categories' | 'beers' | 'tastings' | 'glasses' | 'pubDeals';
        counterKey:
          | 'categoriesImported'
          | 'beersImported'
          | 'tastingsImported'
          | 'glassesImported'
          | 'pubDealsImported';
      }> = [
        { key: 'categories', counterKey: 'categoriesImported' },
        { key: 'beers', counterKey: 'beersImported' },
        { key: 'tastings', counterKey: 'tastingsImported' },
        { key: 'glasses', counterKey: 'glassesImported' },
        { key: 'pubDeals', counterKey: 'pubDealsImported' },
      ];

      for (const col of collections) {
        const list = Array.isArray(item[col.key]) ? (item[col.key] as unknown[]) : [];
        for (const rawRec of list.slice(0, 5000)) {
          if (!rawRec || typeof rawRec !== 'object') continue;
          const rec = rawRec as Record<string, unknown>;
          const recId = isValidServerId(rec.id) ? rec.id : sanitizeServerId(undefined, col.key);

          const inserted = await this.insertRecordIfNotExists(
            effectiveUid,
            col.key,
            recId,
            rec,
            options.skipDuplicates
          );
          if (inserted) {
            summary[col.counterKey] += 1;
          } else {
            summary.recordsSkippedDuplicate += 1;
          }
        }
      }
    }

    // Zorg na import direct dat bieren van andere gebruikers nooit onder het admin-account staan
    await this.repairCrossAccountContamination();

    return summary;
  }

  public async insertRecordIfNotExists(
    userId: string,
    collectionType: 'categories' | 'beers' | 'tastings' | 'glasses' | 'pubDeals' | 'sessions',
    recordId: string,
    payload: Record<string, unknown>,
    skipDuplicates = true
  ): Promise<boolean> {
    if (
      !isValidServerId(userId) ||
      !isValidServerId(recordId) ||
      !ALLOWED_COLLECTION_TYPES.has(collectionType)
    ) {
      return false;
    }
    const cleanPayload = sanitizeCollectionRecord(collectionType, recordId, userId, payload);
    if (!cleanPayload) return false;

    if (this.pool) {
      if (skipDuplicates) {
        const res = await this.pool.query(
          `
          INSERT INTO user_records (id, user_id, collection_type, payload, updated_at)
          VALUES ($1, $2, $3, $4::jsonb, NOW())
          ON CONFLICT (user_id, collection_type, id) DO NOTHING
          RETURNING id;
          `,
          [recordId, userId, collectionType, JSON.stringify(cleanPayload)]
        );
        return (res.rowCount ?? 0) > 0;
      } else {
        await this.pool.query(
          `
          INSERT INTO user_records (id, user_id, collection_type, payload, updated_at)
          VALUES ($1, $2, $3, $4::jsonb, NOW())
          ON CONFLICT (user_id, collection_type, id) DO UPDATE SET
            payload = CASE
              WHEN (user_records.payload->>'photoUrl') IS NOT NULL AND (EXCLUDED.payload->>'photoUrl') IS NULL
              THEN jsonb_set(EXCLUDED.payload, '{photoUrl}', user_records.payload->'photoUrl', true)
              ELSE EXCLUDED.payload
            END,
            updated_at = NOW();
          `,
          [recordId, userId, collectionType, JSON.stringify(cleanPayload)]
        );
        return true;
      }
    }

    const bucket = this.ensureMemoryBucket(userId);
    const map = bucket[collectionType];
    if (skipDuplicates && map.has(recordId)) {
      return false;
    }
    const existing = map.get(recordId);
    if (existing && existing.photoUrl && !cleanPayload.photoUrl) {
      cleanPayload.photoUrl = existing.photoUrl;
    }
    map.set(recordId, cleanPayload);
    return true;
  }

  public async deleteUserRecord(
    userId: string,
    collectionType: string,
    recordId: string
  ): Promise<boolean> {
    await this.init();
    if (
      !isValidServerId(userId) ||
      !isValidServerId(recordId) ||
      !ALLOWED_COLLECTION_TYPES.has(collectionType)
    ) {
      return false;
    }

    if (this.pool) {
      await this.pool.query(
        'DELETE FROM user_records WHERE user_id = $1 AND collection_type = $2 AND id = $3',
        [userId, collectionType, recordId]
      );
      if (collectionType === 'beers') {
        await this.pool.query(
          `DELETE FROM user_records WHERE user_id = $1 AND collection_type = 'tastings' AND (payload->>'beerId') = $2`,
          [userId, recordId]
        );
      }
      return true;
    }

    const bucket = this.ensureMemoryBucket(userId);
    const colKey = collectionType as
      | 'categories'
      | 'beers'
      | 'tastings'
      | 'glasses'
      | 'pubDeals'
      | 'sessions';
    bucket[colKey].delete(recordId);
    if (colKey === 'beers') {
      bucket.tastings.forEach((t, tid) => {
        if (t.beerId === recordId) bucket.tastings.delete(tid);
      });
    }
    return true;
  }

  public async clearUserCollections(userId: string): Promise<boolean> {
    await this.init();
    if (!isValidServerId(userId)) return false;

    if (this.pool) {
      await this.pool.query('DELETE FROM user_records WHERE user_id = $1', [userId]);
      return true;
    }

    const bucket = this.ensureMemoryBucket(userId);
    bucket.categories.clear();
    bucket.beers.clear();
    bucket.tastings.clear();
    bucket.glasses.clear();
    bucket.sessions.clear();
    return true;
  }

  /**
   * Synchroniseert de collecties van een ingelogde gebruiker rechtstreeks naar de server-database via UPSERT.
   * Wist NOOIT bestaande records wanneer een gebruiker vanaf een nieuw domein of nieuw apparaat met lege localStorage inlogt.
   */
  public async syncUserCollections(
    userId: string,
    collections: {
      categories?: unknown[];
      beers?: unknown[];
      tastings?: unknown[];
      glasses?: unknown[];
      pubDeals?: unknown[];
      sessions?: unknown[];
    },
    userMeta?: {
      email?: string;
      name?: string;
      role?: 'admin' | 'user';
    }
  ): Promise<void> {
    await this.init();
    if (!isValidServerId(userId)) return;

    const existing = await this.getUserById(userId);
    const upsertedUser = await this.upsertUser({
      id: userId,
      email: userMeta?.email || existing?.email || '',
      name: userMeta?.name || existing?.name || 'Bierliefhebber',
      role: userMeta?.role || existing?.role,
      lastActiveAt: new Date().toISOString(),
    });
    const effectiveUserId = upsertedUser.id;

    const keys: Array<'categories' | 'beers' | 'tastings' | 'glasses' | 'pubDeals' | 'sessions'> = [
      'categories',
      'beers',
      'tastings',
      'glasses',
      'pubDeals',
      'sessions',
    ];

    for (const colType of keys) {
      const list = collections[colType];
      if (!Array.isArray(list) || list.length === 0) continue;

      for (const rawItem of list.slice(0, 5000)) {
        if (!rawItem || typeof rawItem !== 'object') continue;
        const obj = rawItem as Record<string, unknown>;
        const recId = isValidServerId(obj.id) ? obj.id : sanitizeServerId(undefined, colType);
        await this.insertRecordIfNotExists(effectiveUserId, colType, recId, obj, false);
      }
    }

    await this.consolidateDuplicateDatabaseUsers();
    await this.repairCrossAccountContamination();
  }

  public async getSystemSetting(key: string, defaultValue = ''): Promise<string> {
    await this.init();
    if (this.pool) {
      try {
        const res = await this.pool.query('SELECT value FROM system_settings WHERE key = $1', [key]);
        if (res.rows.length > 0) return res.rows[0].value || defaultValue;
      } catch {
        // Fallback
      }
    }
    return this.memorySystemSettings.get(key) ?? defaultValue;
  }

  public async setSystemSetting(key: string, value: string): Promise<void> {
    await this.init();
    if (this.pool) {
      try {
        await this.pool.query(
          `INSERT INTO system_settings (key, value, updated_at) VALUES ($1, $2, NOW())
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
          [key, value]
        );
      } catch {
        // Fallback
      }
    }
    this.memorySystemSettings.set(key, value);
  }
}

function sanitizeCollectionRecord(
  collectionType: string,
  id: string,
  userId: string,
  raw: Record<string, unknown>
): Record<string, unknown> | null {
  const nowIso = new Date().toISOString();
  switch (collectionType) {
    case 'categories': {
      const name = sanitizeServerString(raw.name, 80);
      if (!name) return null;
      return {
        id,
        userId,
        name,
        color:
          typeof raw.color === 'string' && /^#[0-9A-Fa-f]{3,8}$/.test(raw.color.trim())
            ? raw.color.trim()
            : '#f59e0b',
        description: sanitizeServerString(raw.description, 300),
        createdAt: sanitizeServerString(raw.createdAt, 40, nowIso),
      };
    }
    case 'beers': {
      const name = sanitizeServerString(raw.name, 120);
      if (!name) return null;
      return {
        id,
        userId,
        name,
        brewery: sanitizeServerString(raw.brewery, 120),
        categoryId: sanitizeServerString(raw.categoryId, 128),
        abv: Number(sanitizeServerNumber(raw.abv, 0, 100, 5.0).toFixed(1)),
        favorite: Boolean(raw.favorite),
        photoUrl: sanitizeServerImageUrl(raw.photoUrl),
        photoPosition: sanitizeServerString(raw.photoPosition, 30, '50% 50%'),
        photoZoom:
          raw.photoZoom !== undefined ? sanitizeServerNumber(raw.photoZoom, 0.5, 5.0, 1.0) : 1.0,
        dateAdded: sanitizeServerString(raw.dateAdded, 40, nowIso),
        ...(raw.updatedAt ? { updatedAt: sanitizeServerString(raw.updatedAt, 40) } : {}),
      };
    }
    case 'tastings': {
      const beerId = sanitizeServerString(raw.beerId, 128);
      if (!beerId) return null;
      return {
        id,
        userId,
        beerId,
        rating: Number(sanitizeServerNumber(raw.rating, 1, 10, 7.0).toFixed(1)),
        notes: sanitizeServerString(raw.notes, 2000),
        location: sanitizeServerString(raw.location, 150),
        servingType:
          raw.servingType === 'tap' || raw.servingType === 'fles' || raw.servingType === 'blik'
            ? raw.servingType
            : undefined,
        photoUrl: sanitizeServerImageUrl(raw.photoUrl),
        photoPosition: sanitizeServerString(raw.photoPosition, 30, '50% 50%'),
        photoZoom:
          raw.photoZoom !== undefined ? sanitizeServerNumber(raw.photoZoom, 0.5, 5.0, 1.0) : 1.0,
        date: sanitizeServerString(raw.date, 40, nowIso),
      };
    }
    case 'glasses': {
      const name = sanitizeServerString(raw.name, 120);
      if (!name) return null;
      return {
        id,
        userId,
        name,
        brand: sanitizeServerString(raw.brand, 120),
        glassType: sanitizeServerString(raw.glassType, 80),
        quantity: Math.round(sanitizeServerNumber(raw.quantity, 0, 9999, 1)),
        volumeCl:
          raw.volumeCl !== undefined ? sanitizeServerNumber(raw.volumeCl, 0, 500, 33) : undefined,
        photoUrl: sanitizeServerImageUrl(raw.photoUrl),
        photoPosition: sanitizeServerString(raw.photoPosition, 30, '50% 50%'),
        photoZoom:
          raw.photoZoom !== undefined ? sanitizeServerNumber(raw.photoZoom, 0.5, 5.0, 1.0) : 1.0,
        notes: sanitizeServerString(raw.notes, 1000),
        favorite: Boolean(raw.favorite),
        dateAdded: sanitizeServerString(raw.dateAdded, 40, nowIso),
        ...(raw.updatedAt ? { updatedAt: sanitizeServerString(raw.updatedAt, 40) } : {}),
      };
    }
    case 'pubDeals': {
      return {
        id,
        userId,
        pubName: sanitizeServerString(raw.pubName, 150, 'Onbekend Café'),
        city: sanitizeServerString(raw.city, 100, 'Amsterdam'),
        province: sanitizeServerString(raw.province, 50, 'Noord-Holland'),
        address: sanitizeServerString(raw.address, 200),
        lat: sanitizeServerNumber(raw.lat, -90, 90, 52.3676),
        lng: sanitizeServerNumber(raw.lng, -180, 180, 4.9041),
        hasActiveDeal: Boolean(raw.hasActiveDeal),
        dealCategory: sanitizeServerString(raw.dealCategory, 40, 'glas'),
        dealTitle: sanitizeServerString(raw.dealTitle, 250),
        beerBrand: sanitizeServerString(raw.beerBrand, 120),
        sourceName: sanitizeServerString(raw.sourceName, 120, 'Website'),
        sourceUrl: sanitizeServerString(raw.sourceUrl, 1024, 'https://untappd.com/'),
        checkedAt: sanitizeServerString(raw.checkedAt, 40, nowIso.split('T')[0]),
        ...(raw.actieEindDatum
          ? { actieEindDatum: sanitizeServerString(raw.actieEindDatum, 40) }
          : {}),
        ...(raw.submittedBy
          ? { submittedBy: sanitizeServerString(raw.submittedBy, 100) }
          : {}),
      };
    }
    case 'sessions': {
      return {
        id,
        userId,
        date: sanitizeServerString(raw.date, 40, nowIso),
        count: Math.round(sanitizeServerNumber(raw.count, 0, 500, 0)),
        standardDrinks: Number(sanitizeServerNumber(raw.standardDrinks, 0, 500, 0).toFixed(2)),
        totalCost: Number(sanitizeServerNumber(raw.totalCost, 0, 100000, 0).toFixed(2)),
        glassSizeCl: sanitizeServerNumber(raw.glassSizeCl, 5, 200, 30),
        abv: sanitizeServerNumber(raw.abv, 0, 100, 5),
        pricePerGlass: sanitizeServerNumber(raw.pricePerGlass, 0, 1000, 3.5),
      };
    }
    default:
      return null;
  }
}

export const centralDb = new CentralDatabaseClient();
