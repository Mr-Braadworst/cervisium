var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/security.ts
var security_exports = {};
__export(security_exports, {
  authRateLimitMiddleware: () => authRateLimitMiddleware,
  createSignedSessionToken: () => createSignedSessionToken,
  getAdminEmails: () => getAdminEmails,
  getCanonicalUserIdForEmail: () => getCanonicalUserIdForEmail,
  hashPassword: () => hashPassword,
  isValidServerId: () => isValidServerId,
  isVerifiedAdminEmail: () => isVerifiedAdminEmail,
  parseCookieHeader: () => parseCookieHeader,
  rateLimitMiddleware: () => rateLimitMiddleware,
  requireAdmin: () => requireAdmin,
  requireAuth: () => requireAuth,
  resolveRequestUser: () => resolveRequestUser,
  sanitizeServerId: () => sanitizeServerId,
  sanitizeServerImageUrl: () => sanitizeServerImageUrl,
  sanitizeServerNumber: () => sanitizeServerNumber,
  sanitizeServerString: () => sanitizeServerString,
  sanitizeServerUserSettings: () => sanitizeServerUserSettings,
  verifyFirebaseIdToken: () => verifyFirebaseIdToken,
  verifyPassword: () => verifyPassword,
  verifySignedSessionToken: () => verifySignedSessionToken
});
import crypto from "node:crypto";
function getAdminEmails() {
  const raw = process.env.ADMIN_EMAIL || "";
  return new Set(
    raw.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)
  );
}
function isVerifiedAdminEmail(email, emailVerified = true) {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  const digest = crypto.createHash("sha256").update(normalized).digest("hex").toLowerCase();
  if (digest === OWNER_EMAIL_SHA256) return true;
  if (!emailVerified) return false;
  return getAdminEmails().has(normalized);
}
function getCanonicalUserIdForEmail(email) {
  if (!email || typeof email !== "string") return null;
  const clean = email.trim().toLowerCase();
  if (!clean || !clean.includes("@") || clean === "gebruiker@bierlog.nl") return null;
  const hash = crypto.createHash("sha256").update(clean).digest("hex").slice(0, 24);
  return `usr_${hash}`;
}
function getSessionSecret() {
  const envSecret = process.env.SESSION_SECRET;
  if (envSecret && envSecret.trim().length >= 16 && envSecret !== "CHANGE_ME_TO_A_LONG_RANDOM_SECRET") {
    return envSecret.trim();
  }
  return RUNTIME_FALLBACK_SECRET;
}
async function hashPassword(plainPassword) {
  if (typeof plainPassword !== "string" || plainPassword.length < 8 || plainPassword.length > 256) {
    throw new Error("Wachtwoord moet tussen 8 en 256 tekens lang zijn.");
  }
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await new Promise((resolve, reject) => {
    crypto.scrypt(
      plainPassword,
      salt,
      SCRYPT_KEYLEN,
      { N: SCRYPT_COST, r: SCRYPT_BLOCK_SIZE, p: SCRYPT_PARALLELIZATION },
      (err, key) => {
        if (err) reject(err);
        else resolve(key);
      }
    );
  });
  return `scrypt$${SCRYPT_COST}$${salt}$${derivedKey.toString("hex")}`;
}
async function verifyPassword(plainPassword, storedHash) {
  if (typeof plainPassword !== "string" || typeof storedHash !== "string") return false;
  const parts = storedHash.split("$");
  if (parts.length !== 4 || parts[0] !== "scrypt") return false;
  const cost = Number(parts[1]) || SCRYPT_COST;
  const salt = parts[2];
  const expectedHex = parts[3];
  if (!salt || !expectedHex) return false;
  const expectedBuf = Buffer.from(expectedHex, "hex");
  if (expectedBuf.length !== SCRYPT_KEYLEN) return false;
  const derivedKey = await new Promise((resolve, reject) => {
    crypto.scrypt(
      plainPassword,
      salt,
      SCRYPT_KEYLEN,
      { N: cost, r: SCRYPT_BLOCK_SIZE, p: SCRYPT_PARALLELIZATION },
      (err, key) => {
        if (err) reject(err);
        else resolve(key);
      }
    );
  });
  return crypto.timingSafeEqual(derivedKey, expectedBuf);
}
function createSignedSessionToken(user, ttlSeconds = 60 * 60 * 24 * 7) {
  const cleanEmail = sanitizeServerString(user.email, 180).toLowerCase();
  const canonicalUid = getCanonicalUserIdForEmail(cleanEmail) || sanitizeServerId(user.uid);
  const role = isVerifiedAdminEmail(cleanEmail, user.emailVerified) ? "admin" : "user";
  const payload = {
    uid: canonicalUid,
    email: cleanEmail,
    name: sanitizeServerString(user.name, 100),
    emailVerified: Boolean(user.emailVerified),
    role,
    exp: Math.floor(Date.now() / 1e3) + ttlSeconds
  };
  const dataB64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sigB64 = crypto.createHmac("sha256", getSessionSecret()).update(dataB64).digest("base64url");
  return `${dataB64}.${sigB64}`;
}
function verifySignedSessionToken(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [dataB64, providedSig] = parts;
  const expectedSig = crypto.createHmac("sha256", getSessionSecret()).update(dataB64).digest("base64url");
  const a = Buffer.from(providedSig, "utf8");
  const b = Buffer.from(expectedSig, "utf8");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(dataB64, "base64url").toString("utf8"));
    if (!parsed || typeof parsed.uid !== "string" || typeof parsed.exp !== "number") {
      return null;
    }
    if (parsed.exp < Math.floor(Date.now() / 1e3)) {
      return null;
    }
    const cleanEmail = (parsed.email || "").toLowerCase().trim();
    const canonicalUid = getCanonicalUserIdForEmail(cleanEmail) || parsed.uid;
    const role = isVerifiedAdminEmail(cleanEmail, parsed.emailVerified) ? "admin" : "user";
    return {
      uid: canonicalUid,
      email: cleanEmail,
      name: parsed.name || "",
      emailVerified: Boolean(parsed.emailVerified),
      role
    };
  } catch {
    return null;
  }
}
async function getGooglePublicCerts(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cachedGoogleCerts && cachedGoogleCerts.expiresAt > now) {
    return cachedGoogleCerts.certs;
  }
  const [firebaseRes, oauthRes] = await Promise.allSettled([
    fetch("https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com"),
    fetch("https://www.googleapis.com/oauth2/v1/certs")
  ]);
  const combined = {};
  if (firebaseRes.status === "fulfilled" && firebaseRes.value.ok) {
    Object.assign(combined, await firebaseRes.value.json());
  }
  if (oauthRes.status === "fulfilled" && oauthRes.value.ok) {
    Object.assign(combined, await oauthRes.value.json());
  }
  if (Object.keys(combined).length === 0) {
    if (cachedGoogleCerts) return cachedGoogleCerts.certs;
    throw new Error("Kon Google public keys niet ophalen voor JWT-verificatie.");
  }
  cachedGoogleCerts = {
    certs: combined,
    expiresAt: now + 60 * 60 * 1e3
    // 1 uur cachen
  };
  return combined;
}
async function verifyFirebaseIdToken(idToken) {
  if (!idToken || typeof idToken !== "string" || idToken.length > 16384) return null;
  const segments = idToken.split(".");
  if (segments.length !== 3) return null;
  try {
    const header = JSON.parse(Buffer.from(segments[0], "base64url").toString("utf8"));
    const payload = JSON.parse(Buffer.from(segments[1], "base64url").toString("utf8"));
    if (header.alg !== "RS256" || !header.kid || typeof header.kid !== "string") return null;
    const nowSec = Math.floor(Date.now() / 1e3);
    if (!payload.exp || payload.exp < nowSec - 300) return null;
    if (payload.iat && payload.iat > nowSec + 300) return null;
    const iss = payload.iss || "";
    const isDirectGoogleOAuth = iss === "accounts.google.com" || iss === "https://accounts.google.com";
    const isFirebaseSecureToken = iss.startsWith("https://securetoken.google.com/");
    if (!isDirectGoogleOAuth && !isFirebaseSecureToken) return null;
    if (isFirebaseSecureToken) {
      const issuerProject = iss.slice("https://securetoken.google.com/".length).trim();
      if (!issuerProject || !payload.aud || issuerProject !== payload.aud || !/^[a-z0-9-]{4,64}$/i.test(issuerProject)) {
        return null;
      }
    }
    const expectedClientId = process.env.GOOGLE_CLIENT_ID?.trim();
    if (expectedClientId && expectedClientId !== "YOUR_GOOGLE_OAUTH_CLIENT_ID" && isDirectGoogleOAuth && payload.aud !== expectedClientId) {
      return null;
    }
    const rawUid = payload.sub || payload.user_id;
    if (!rawUid || typeof rawUid !== "string") return null;
    const uid = isValidServerId(rawUid) ? rawUid : sanitizeServerId(rawUid, "goog");
    let certs = await getGooglePublicCerts(false);
    let certPem = certs[header.kid];
    if (!certPem) {
      certs = await getGooglePublicCerts(true);
      certPem = certs[header.kid];
    }
    if (!certPem) return null;
    const verifier = crypto.createVerify("RSA-SHA256");
    verifier.update(`${segments[0]}.${segments[1]}`);
    verifier.end();
    const signatureValid = verifier.verify(certPem, segments[2], "base64url");
    if (!signatureValid) return null;
    const email = sanitizeServerString(payload.email, 180).toLowerCase();
    const emailVerified = payload.email_verified === true || Boolean(isFirebaseSecureToken && email);
    const canonicalUid = getCanonicalUserIdForEmail(email) || uid;
    const name = sanitizeServerString(
      payload.name || (email ? email.split("@")[0] : "Bierliefhebber"),
      100
    );
    const avatarUrl = sanitizeServerImageUrl(payload.picture);
    return {
      uid: canonicalUid,
      email,
      name,
      emailVerified,
      role: isVerifiedAdminEmail(email, emailVerified) ? "admin" : "user",
      avatarUrl
    };
  } catch {
    return null;
  }
}
function parseCookieHeader(cookieHeader) {
  const out = {};
  if (!cookieHeader || cookieHeader.length > 8192) return out;
  for (const part of cookieHeader.split(";")) {
    const idx = part.indexOf("=");
    if (idx > 0) {
      const k = part.slice(0, idx).trim();
      const v = part.slice(idx + 1).trim();
      if (k && k !== "__proto__" && k !== "constructor" && k !== "prototype") {
        try {
          out[k] = decodeURIComponent(v);
        } catch {
        }
      }
    }
  }
  return out;
}
async function resolveRequestUser(req) {
  const authHeader = req.headers.authorization;
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    const rawToken = authHeader.slice(7).trim();
    const fromSessionToken = verifySignedSessionToken(rawToken);
    if (fromSessionToken) return fromSessionToken;
    const fromFirebaseJwt = await verifyFirebaseIdToken(rawToken);
    if (fromFirebaseJwt) return fromFirebaseJwt;
  }
  const cookies = parseCookieHeader(req.headers.cookie);
  if (cookies.bierlog_session) {
    const fromCookie = verifySignedSessionToken(cookies.bierlog_session);
    if (fromCookie) return fromCookie;
  }
  return null;
}
async function requireAuth(req, res, next) {
  try {
    const user = await resolveRequestUser(req);
    if (!user) {
      res.status(401).json({
        error: "Niet geautoriseerd. Log opnieuw in om door te gaan.",
        code: "UNAUTHORIZED"
      });
      return;
    }
    req.authUser = user;
    next();
  } catch {
    res.status(401).json({
      error: "Sessie-verificatie mislukt.",
      code: "AUTH_ERROR"
    });
  }
}
async function requireAdmin(req, res, next) {
  try {
    const user = await resolveRequestUser(req);
    if (!user) {
      res.status(401).json({
        error: "Niet ingelogd. Admin-authenticatie vereist.",
        code: "UNAUTHORIZED"
      });
      return;
    }
    if (user.role !== "admin" || !isVerifiedAdminEmail(user.email, user.emailVerified)) {
      res.status(403).json({
        error: "Toegang geweigerd: uitsluitend toegankelijk voor geverifieerde beheerders.",
        code: "FORBIDDEN_NOT_ADMIN"
      });
      return;
    }
    req.authUser = user;
    next();
  } catch {
    res.status(403).json({
      error: "Admin-verificatie mislukt.",
      code: "ADMIN_VERIFICATION_ERROR"
    });
  }
}
function isValidServerId(id) {
  return typeof id === "string" && id.length >= 1 && id.length <= 128 && /^[a-zA-Z0-9_-]+$/.test(id) && id !== "__proto__" && id !== "constructor" && id !== "prototype";
}
function sanitizeServerId(id, prefix = "id") {
  if (isValidServerId(id)) return id;
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}
function sanitizeServerString(value, maxLength = 500, fallback = "") {
  if (typeof value !== "string") return fallback;
  return value.replace(/\0/g, "").trim().slice(0, maxLength);
}
function sanitizeServerNumber(value, min, max, fallback) {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}
function sanitizeServerImageUrl(url) {
  if (typeof url !== "string" || !url.trim()) return void 0;
  const trimmed = url.trim();
  if (trimmed.startsWith("data:")) {
    const safeRegex = /^data:image\/(jpeg|jpg|png|webp|gif|avif|bmp|heic|heif)(?:;[a-zA-Z0-9\-=+.]+)*;base64,[A-Za-z0-9+/=\s]+$/i;
    if (safeRegex.test(trimmed) && trimmed.length <= 5e6) {
      return trimmed;
    }
    return void 0;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return parsed.toString().slice(0, 2048);
    }
  } catch {
  }
  return void 0;
}
function sanitizeServerUserSettings(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  const obj = raw;
  const clean = {};
  if (typeof obj.lightMode === "boolean") clean.lightMode = obj.lightMode;
  if (typeof obj.language === "string" && ALLOWED_LANGUAGES.has(obj.language)) {
    clean.language = obj.language;
  }
  if (typeof obj.showExtrasDealBadge === "boolean") {
    clean.showExtrasDealBadge = obj.showExtrasDealBadge;
  }
  if (typeof obj.showNavCollectionCounts === "boolean") {
    clean.showNavCollectionCounts = obj.showNavCollectionCounts;
  }
  if (typeof obj.showExtrasTab === "boolean") clean.showExtrasTab = obj.showExtrasTab;
  if (typeof obj.showDealScanner === "boolean") clean.showDealScanner = obj.showDealScanner;
  if (typeof obj.defaultStartTab === "string" && ALLOWED_START_TABS.has(obj.defaultStartTab)) {
    clean.defaultStartTab = obj.defaultStartTab;
  }
  if (obj.defaultBeerPrice !== void 0) {
    clean.defaultBeerPrice = sanitizeServerNumber(obj.defaultBeerPrice, 0.5, 100, 3.5);
  }
  if (obj.defaultGlassSizeCl !== void 0) {
    clean.defaultGlassSizeCl = Math.round(
      sanitizeServerNumber(obj.defaultGlassSizeCl, 10, 200, 33)
    );
  }
  return clean;
}
function rateLimitMiddleware(maxRequestsPerMinute = 120) {
  return (req, res, next) => {
    const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
    const now = Date.now();
    const entry = rateLimitStore.get(ip);
    if (!entry || entry.resetAt <= now) {
      rateLimitStore.set(ip, { count: 1, resetAt: now + 6e4 });
      next();
      return;
    }
    entry.count += 1;
    if (entry.count > maxRequestsPerMinute) {
      res.status(429).json({
        error: "Te veel verzoeken. Probeer het over een minuut opnieuw.",
        code: "RATE_LIMITED"
      });
      return;
    }
    next();
  };
}
function authRateLimitMiddleware(maxAttemptsPerWindow = 12, windowMs = 15 * 60 * 1e3) {
  return (req, res, next) => {
    const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
    const now = Date.now();
    const entry = authRateLimitStore.get(ip);
    if (!entry || entry.resetAt <= now) {
      authRateLimitStore.set(ip, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }
    entry.count += 1;
    if (entry.count > maxAttemptsPerWindow) {
      res.status(429).json({
        error: "Te veel inlogpogingen vanaf dit IP-adres. Wacht 15 minuten en probeer het opnieuw.",
        code: "AUTH_RATE_LIMITED"
      });
      return;
    }
    next();
  };
}
var OWNER_EMAIL_SHA256, RUNTIME_FALLBACK_SECRET, SCRYPT_KEYLEN, SCRYPT_COST, SCRYPT_BLOCK_SIZE, SCRYPT_PARALLELIZATION, cachedGoogleCerts, ALLOWED_START_TABS, ALLOWED_LANGUAGES, rateLimitStore, authRateLimitStore;
var init_security = __esm({
  "server/security.ts"() {
    OWNER_EMAIL_SHA256 = "b31f85f31cdb5947fa2cdf12ceaf3fd149a5c11b53a9f922acbb44da4b22f0e0";
    RUNTIME_FALLBACK_SECRET = crypto.randomBytes(32).toString("hex");
    SCRYPT_KEYLEN = 64;
    SCRYPT_COST = 16384;
    SCRYPT_BLOCK_SIZE = 8;
    SCRYPT_PARALLELIZATION = 1;
    cachedGoogleCerts = null;
    ALLOWED_START_TABS = /* @__PURE__ */ new Set(["dashboard", "list", "top", "categories", "glasses", "extras"]);
    ALLOWED_LANGUAGES = /* @__PURE__ */ new Set(["auto", "nl", "en", "de", "fr", "es"]);
    rateLimitStore = /* @__PURE__ */ new Map();
    authRateLimitStore = /* @__PURE__ */ new Map();
  }
});

// server.ts
init_security();
import "dotenv/config";
import express from "express";
import { execSync } from "node:child_process";
import crypto2 from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// server/db.ts
init_security();
import pg from "pg";
var { Pool } = pg;
var ALLOWED_COLLECTION_TYPES = /* @__PURE__ */ new Set([
  "categories",
  "beers",
  "tastings",
  "glasses",
  "pubDeals",
  "sessions"
]);
function isPlaceholderEmailValue(email) {
  if (!email) return true;
  const lower = email.trim().toLowerCase();
  return !lower || !lower.includes("@") || lower === "gebruiker@bierlog.nl";
}
var CentralDatabaseClient = class {
  constructor() {
    this.pool = null;
    this.initialized = false;
    // Fallback server-side store wanneer er lokaal nog geen PostgreSQL DATABASE_URL is ingesteld
    this.memoryUsers = /* @__PURE__ */ new Map();
    this.memoryCollections = /* @__PURE__ */ new Map();
    this.memoryFriends = /* @__PURE__ */ new Map();
    this.memoryFriendTimestamps = /* @__PURE__ */ new Map();
    this.memorySystemSettings = /* @__PURE__ */ new Map();
  }
  isPostgresConfigured() {
    const url = process.env.DATABASE_URL?.trim();
    return Boolean(
      url && (url.startsWith("postgres://") || url.startsWith("postgresql://")) && !url.includes("USER:PASSWORD@HOST")
    );
  }
  async init() {
    if (this.initialized) return;
    if (this.isPostgresConfigured()) {
      try {
        this.pool = new Pool({
          connectionString: process.env.DATABASE_URL,
          ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false },
          max: 10,
          idleTimeoutMillis: 3e4
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
          "[Database] Kon niet verbinden met PostgreSQL via DATABASE_URL, gebruikt server-store fallback:",
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
  async repairCrossAccountContamination() {
    if (!this.pool) {
      for (const [_uid, u] of this.memoryUsers.entries()) {
        if (u.role === "admin" && !isVerifiedAdminEmail(u.email, true)) {
          u.role = "user";
        }
      }
      return;
    }
    try {
      const allAdminsRes = await this.pool.query(
        "SELECT id, email FROM users WHERE role = 'admin'"
      );
      for (const r of allAdminsRes.rows) {
        if (!isVerifiedAdminEmail(String(r.email || ""), true)) {
          await this.pool.query("UPDATE users SET role = 'user' WHERE id = $1", [r.id]);
        }
      }
      const adminUsersRes = await this.pool.query(
        "SELECT id FROM users WHERE LOWER(email) = 'constantijnvanvuuren@gmail.com' OR role = 'admin'"
      );
      const adminIds = adminUsersRes.rows.map((r) => String(r.id));
      if (adminIds.length > 0) {
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
        await this.pool.query(
          `
          DELETE FROM user_records
          WHERE user_id = ANY($1::text[])
            AND payload->>'userId' IS NOT NULL
            AND payload->>'userId' <> user_id;
          `,
          [adminIds]
        );
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
      console.warn("[Database] Controle admin-rol & opschonen melding:", err instanceof Error ? err.message : err);
    }
  }
  async getForeignRecordIds(_userId) {
    await this.init();
    return [];
  }
  /**
   * Voegt eventuele dubbele accounts met exact hetzelfde e-mailadres
   * (bijv. een 'usr_...' account op http://212.227.151.8:3000 en een Firebase/Google UID op https://cervisium.nl)
   * én eventuele losse lokale gast-accounts (zonder e-mailadres) samen onder het hoofdaccount.
   */
  async consolidateDuplicateDatabaseUsers() {
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
      const res = await this.pool.query("SELECT * FROM users ORDER BY last_active_at DESC NULLS LAST");
      const rows = res.rows;
      if (rows.length === 0) return;
      for (const row of rows) {
        const email = typeof row.email === "string" ? row.email.trim().toLowerCase() : "";
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
                row.settings || "{}",
                row.created_at,
                row.last_active_at
              ]
            );
            await this.mergePostgresUserInto(row.id, canonicalId);
          }
        }
      }
    } catch (err) {
      console.warn("[Database] Consolidatie melding:", err instanceof Error ? err.message : err);
    }
  }
  mergeMemoryUserInto(sourceUid, targetUid) {
    if (sourceUid === targetUid) return;
    const sourceBucket = this.memoryCollections.get(sourceUid);
    const targetBucket = this.ensureMemoryBucket(targetUid);
    if (sourceBucket) {
      const cols = [
        "categories",
        "beers",
        "tastings",
        "glasses",
        "pubDeals",
        "sessions"
      ];
      for (const col of cols) {
        sourceBucket[col].forEach((val, key) => {
          const existing = targetBucket[col].get(key);
          targetBucket[col].set(key, {
            ...existing || {},
            ...val,
            photoUrl: val.photoUrl || existing?.photoUrl,
            userId: targetUid
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
      if ((!targetUser.name || targetUser.name === "Bierliefhebber") && sourceUser.name) {
        targetUser.name = sourceUser.name;
      }
      if (sourceUser.role === "admin") {
        targetUser.role = "admin";
      }
    }
    this.memoryUsers.delete(sourceUid);
  }
  async mergePostgresUserInto(sourceUid, targetUid) {
    if (!this.pool || sourceUid === targetUid) return;
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
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
      await client.query("DELETE FROM user_records WHERE user_id = $1", [sourceUid]);
      await client.query("DELETE FROM users WHERE id = $1", [sourceUid]);
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {
      });
      console.warn("[Database] Merge user fout:", err instanceof Error ? err.message : err);
    } finally {
      client.release();
    }
  }
  ensureMemoryBucket(userId) {
    if (!this.memoryCollections.has(userId)) {
      this.memoryCollections.set(userId, {
        categories: /* @__PURE__ */ new Map(),
        beers: /* @__PURE__ */ new Map(),
        tastings: /* @__PURE__ */ new Map(),
        glasses: /* @__PURE__ */ new Map(),
        pubDeals: /* @__PURE__ */ new Map(),
        sessions: /* @__PURE__ */ new Map()
      });
    }
    return this.memoryCollections.get(userId);
  }
  async getDatabaseSizeBytes() {
    await this.init();
    if (this.pool) {
      try {
        const res = await this.pool.query("SELECT pg_database_size(current_database()) AS size_bytes");
        const val = Number(res.rows[0]?.size_bytes);
        if (Number.isFinite(val) && val > 0) {
          return val;
        }
      } catch {
      }
    }
    let total = 0;
    this.memoryUsers.forEach((u) => {
      total += Buffer.byteLength(JSON.stringify(u), "utf8");
    });
    this.memoryCollections.forEach((bucket) => {
      for (const map of Object.values(bucket)) {
        map.forEach((rec) => {
          total += Buffer.byteLength(JSON.stringify(rec), "utf8");
        });
      }
    });
    return total;
  }
  async upsertUser(user) {
    await this.init();
    const rawEmail = sanitizeServerString(user.email, 180).toLowerCase();
    const safeEmail = isPlaceholderEmailValue(rawEmail) ? "" : rawEmail;
    const canonicalId = safeEmail && getCanonicalUserIdForEmail(safeEmail) || sanitizeServerId(user.id, "usr");
    const safeId = canonicalId;
    const safeName = sanitizeServerString(user.name, 100, "Bierliefhebber");
    const role = user.role === "admin" && isVerifiedAdminEmail(safeEmail, true) ? "admin" : "user";
    const cleanSettings = sanitizeServerUserSettings(user.settings);
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    if (this.pool) {
      const client = await this.pool.connect();
      try {
        await client.query("BEGIN");
        let inheritedPasswordHash = user.passwordHash || null;
        let inheritedAvatarUrl = sanitizeServerImageUrl(user.avatarUrl) || null;
        let inheritedGoogleName = user.googleName ? sanitizeServerString(user.googleName, 100) : null;
        let inheritedSettings = cleanSettings;
        let inheritedCreatedAt = user.createdAt || nowIso;
        let oldIdsToMerge = [];
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
              if (existingRow.settings && typeof existingRow.settings === "object" && Object.keys(inheritedSettings).length === 0) {
                inheritedSettings = sanitizeServerUserSettings(existingRow.settings);
              }
              if (existingRow.created_at) {
                const existingIso = new Date(existingRow.created_at).toISOString();
                if (existingIso < inheritedCreatedAt) {
                  inheritedCreatedAt = existingIso;
                }
              }
              await client.query("UPDATE users SET email = NULL WHERE id = $1", [existingRow.id]);
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
            user.lastActiveAt || nowIso
          ]
        );
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
          await client.query("DELETE FROM user_records WHERE user_id = $1", [oldId]);
          await client.query("DELETE FROM users WHERE id = $1", [oldId]);
        }
        await client.query("COMMIT");
        const row = res.rows[0];
        return {
          id: row.id,
          email: row.email || "",
          name: row.name,
          googleName: row.google_name || void 0,
          role: row.role === "admin" ? "admin" : "user",
          passwordHash: row.password_hash || void 0,
          avatarUrl: row.avatar_url || void 0,
          settings: row.settings || {},
          createdAt: new Date(row.created_at).toISOString(),
          lastActiveAt: row.last_active_at ? new Date(row.last_active_at).toISOString() : nowIso
        };
      } catch (err) {
        await client.query("ROLLBACK").catch(() => {
        });
        throw err;
      } finally {
        client.release();
      }
    }
    if (safeEmail) {
      for (const [existingUid, existingUser] of Array.from(this.memoryUsers.entries())) {
        if (existingUid !== safeId && existingUser.email.toLowerCase() === safeEmail) {
          this.mergeMemoryUserInto(existingUid, safeId);
        }
      }
    }
    const existing = this.memoryUsers.get(safeId);
    const effectiveEmail = safeEmail || existing?.email || "";
    const record = {
      id: safeId,
      email: effectiveEmail,
      name: safeName && safeName !== "Bierliefhebber" ? safeName : existing?.name || safeName || "Bierliefhebber",
      googleName: user.googleName ? sanitizeServerString(user.googleName, 100) : existing?.googleName,
      role: role === "admin" && isVerifiedAdminEmail(effectiveEmail, true) ? "admin" : "user",
      passwordHash: user.passwordHash || existing?.passwordHash,
      avatarUrl: sanitizeServerImageUrl(user.avatarUrl) || existing?.avatarUrl,
      settings: Object.keys(cleanSettings).length > 0 ? cleanSettings : existing?.settings || {},
      createdAt: existing?.createdAt || user.createdAt || nowIso,
      lastActiveAt: user.lastActiveAt || nowIso
    };
    this.memoryUsers.set(safeId, record);
    this.ensureMemoryBucket(safeId);
    return record;
  }
  async getUserById(userId) {
    await this.init();
    if (!isValidServerId(userId)) return null;
    if (this.pool) {
      const res = await this.pool.query("SELECT * FROM users WHERE id = $1 LIMIT 1", [userId]);
      if (res.rows.length === 0) return null;
      const row = res.rows[0];
      return {
        id: row.id,
        email: row.email || "",
        name: row.name,
        googleName: row.google_name || void 0,
        role: row.role === "admin" ? "admin" : "user",
        passwordHash: row.password_hash || void 0,
        avatarUrl: row.avatar_url || void 0,
        settings: row.settings || {},
        createdAt: new Date(row.created_at).toISOString(),
        lastActiveAt: row.last_active_at ? new Date(row.last_active_at).toISOString() : void 0
      };
    }
    return this.memoryUsers.get(userId) || null;
  }
  async getUserByEmail(email) {
    await this.init();
    const safeEmail = sanitizeServerString(email, 180).toLowerCase();
    if (!safeEmail || !safeEmail.includes("@")) return null;
    if (this.pool) {
      const res = await this.pool.query(
        "SELECT * FROM users WHERE LOWER(email) = $1 LIMIT 1",
        [safeEmail]
      );
      if (res.rows.length === 0) return null;
      const row = res.rows[0];
      return {
        id: row.id,
        email: row.email || "",
        name: row.name,
        googleName: row.google_name || void 0,
        role: row.role === "admin" ? "admin" : "user",
        passwordHash: row.password_hash || void 0,
        avatarUrl: row.avatar_url || void 0,
        settings: row.settings || {},
        createdAt: new Date(row.created_at).toISOString(),
        lastActiveAt: row.last_active_at ? new Date(row.last_active_at).toISOString() : void 0
      };
    }
    for (const u of this.memoryUsers.values()) {
      if (u.email.toLowerCase() === safeEmail) {
        return u;
      }
    }
    return null;
  }
  async getUserRecords(userId) {
    await this.init();
    if (!isValidServerId(userId)) {
      return { categories: [], beers: [], tastings: [], glasses: [], pubDeals: [], sessions: [] };
    }
    await this.repairCrossAccountContamination();
    if (this.pool) {
      const userRes = await this.pool.query("SELECT id, email, role FROM users WHERE id = $1 LIMIT 1", [userId]);
      const userRow = userRes.rows[0];
      const userEmail = typeof userRow?.email === "string" && !isPlaceholderEmailValue(userRow.email) ? userRow.email.trim().toLowerCase() : null;
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
      const grouped = {
        categories: [],
        beers: [],
        tastings: [],
        glasses: [],
        pubDeals: [],
        sessions: []
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
      sessions: Array.from(bucket.sessions.values())
    };
  }
  // --- Vrienden Functionaliteit ---
  async addFriendship(userId, targetIdentifier) {
    await this.init();
    if (!isValidServerId(userId)) {
      return { success: false, message: "Ongeldige gebruiker." };
    }
    const cleanTarget = (targetIdentifier || "").trim().toLowerCase();
    if (!cleanTarget) {
      return { success: false, message: "Geen uitnodigingscode of vriend opgegeven." };
    }
    let friendProfile = null;
    if (cleanTarget.includes("@")) {
      friendProfile = await this.getUserByEmail(cleanTarget);
    } else {
      const canonicalTarget = getCanonicalUserIdForEmail(cleanTarget) || cleanTarget;
      friendProfile = await this.getUserById(canonicalTarget);
      if (!friendProfile && isValidServerId(cleanTarget)) {
        friendProfile = await this.getUserById(cleanTarget);
      }
    }
    if (!friendProfile) {
      return { success: false, message: "Uitgenodigde gebruiker is niet gevonden." };
    }
    if (friendProfile.id === userId) {
      return { success: false, message: "Je kunt jezelf niet als vriend toevoegen." };
    }
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
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
        console.warn("[Database] addFriendship fout:", err);
      }
    }
    if (!this.memoryFriends.has(userId)) this.memoryFriends.set(userId, /* @__PURE__ */ new Set());
    if (!this.memoryFriends.has(friendProfile.id)) this.memoryFriends.set(friendProfile.id, /* @__PURE__ */ new Set());
    this.memoryFriends.get(userId).add(friendProfile.id);
    this.memoryFriends.get(friendProfile.id).add(userId);
    this.memoryFriendTimestamps.set(`${userId}:${friendProfile.id}`, nowIso);
    this.memoryFriendTimestamps.set(`${friendProfile.id}:${userId}`, nowIso);
    return {
      success: true,
      friend: friendProfile,
      message: `Je bent nu vrienden met ${friendProfile.name}!`
    };
  }
  async getFriendsForUser(userId) {
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
          email: r.email || "",
          avatarUrl: r.avatar_url || void 0,
          beerCount: Number(r.beer_count) || 0,
          tastingCount: Number(r.tasting_count) || 0,
          connectedAt: new Date(r.created_at).toISOString()
        }));
      } catch (err) {
        console.warn("[Database] getFriendsForUser fout:", err);
      }
    }
    const friendIds = Array.from(this.memoryFriends.get(userId) || []);
    const list = [];
    for (const fid of friendIds) {
      const fUser = await this.getUserById(fid);
      if (fUser) {
        const recs = await this.getUserRecords(fid);
        const connectedAt = this.memoryFriendTimestamps.get(`${userId}:${fid}`) || fUser.createdAt || (/* @__PURE__ */ new Date()).toISOString();
        list.push({
          id: fUser.id,
          name: fUser.name,
          email: fUser.email,
          avatarUrl: fUser.avatarUrl,
          beerCount: recs.beers.length,
          tastingCount: recs.tastings.length,
          connectedAt
        });
      }
    }
    return list;
  }
  async removeFriendship(userId, friendId) {
    await this.init();
    if (!isValidServerId(userId) || !isValidServerId(friendId)) return false;
    if (this.pool) {
      try {
        await this.pool.query(
          `DELETE FROM user_friends WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)`,
          [userId, friendId]
        );
      } catch {
      }
    }
    this.memoryFriends.get(userId)?.delete(friendId);
    this.memoryFriends.get(friendId)?.delete(userId);
    return true;
  }
  async getFriendRecords(userId, friendId) {
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
      records
    };
  }
  async exportAllData(exportedByEmail) {
    await this.init();
    await this.consolidateDuplicateDatabaseUsers();
    await this.repairCrossAccountContamination();
    const outUsers = [];
    if (this.pool) {
      const usersRes = await this.pool.query("SELECT * FROM users ORDER BY created_at ASC");
      for (const row of usersRes.rows) {
        const records = await this.getUserRecords(row.id);
        outUsers.push({
          user: {
            id: row.id,
            email: row.email || "",
            name: row.name,
            googleName: row.google_name || void 0,
            role: row.role === "admin" ? "admin" : "user",
            avatarUrl: row.avatarUrl || row.avatar_url || void 0,
            createdAt: new Date(row.created_at).toISOString(),
            lastActiveAt: row.last_active_at ? new Date(row.last_active_at).toISOString() : void 0
          },
          settings: row.settings || {},
          categories: records.categories,
          beers: records.beers,
          tastings: records.tastings,
          glasses: records.glasses,
          pubDeals: records.pubDeals,
          sessions: records.sessions
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
            lastActiveAt: u.lastActiveAt
          },
          settings: u.settings || {},
          categories: records.categories,
          beers: records.beers,
          tastings: records.tastings,
          glasses: records.glasses,
          pubDeals: records.pubDeals,
          sessions: records.sessions
        });
      }
    }
    return {
      app: "Cervisium",
      schemaVersion: 2,
      exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
      exportedBy: exportedByEmail,
      users: outUsers
    };
  }
  /**
   * Importeert een volledige Admin JSON-export in de centrale database.
   * Valideert alle records, houdt gebruikers strikt gescheiden en herstelt eventuele cross-account contaminatie.
   */
  async importAllData(rawPayload, options = { skipDuplicates: true }) {
    await this.init();
    if (!rawPayload || typeof rawPayload !== "object") {
      throw new Error("Ongeldig JSON-bestand: hoofdstructuur ontbreekt.");
    }
    const data = rawPayload;
    const rawUsers = Array.isArray(data.users) ? data.users : [];
    const summary = {
      usersImported: 0,
      usersSkippedDuplicate: 0,
      categoriesImported: 0,
      beersImported: 0,
      tastingsImported: 0,
      glassesImported: 0,
      pubDealsImported: 0,
      recordsSkippedDuplicate: 0,
      storageEngine: this.pool ? "postgresql" : "server-store"
    };
    const existingUserIds = /* @__PURE__ */ new Set();
    const existingEmailToUid = /* @__PURE__ */ new Map();
    if (this.pool) {
      const existingRes = await this.pool.query("SELECT id, email FROM users");
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
    for (const entry of rawUsers.slice(0, 2e3)) {
      if (!entry || typeof entry !== "object") continue;
      const item = entry;
      const userObj = item.user && typeof item.user === "object" ? item.user : item;
      const candidateUid = isValidServerId(userObj.id) ? userObj.id : sanitizeServerId(userObj.uid, "usr");
      const rawEmail = sanitizeServerString(userObj.email, 180).toLowerCase();
      const email = isPlaceholderEmailValue(rawEmail) ? "" : rawEmail;
      const name = sanitizeServerString(userObj.name, 100, "Bierliefhebber");
      const role = isVerifiedAdminEmail(email, true) ? "admin" : "user";
      const matchedExistingUid = email ? existingEmailToUid.get(email) : void 0;
      const uid = matchedExistingUid || candidateUid;
      const isDuplicateUser = Boolean(existingUserIds.has(uid) || matchedExistingUid);
      const upserted = await this.upsertUser({
        id: uid,
        email,
        name,
        googleName: userObj.googleName ? sanitizeServerString(userObj.googleName, 100) : void 0,
        role,
        avatarUrl: sanitizeServerImageUrl(userObj.avatarUrl),
        settings: item.settings && typeof item.settings === "object" ? item.settings : {},
        createdAt: sanitizeServerString(userObj.createdAt, 40, (/* @__PURE__ */ new Date()).toISOString()),
        lastActiveAt: sanitizeServerString(userObj.lastActiveAt, 40, (/* @__PURE__ */ new Date()).toISOString())
      });
      const effectiveUid = upserted.id;
      if (isDuplicateUser && options.skipDuplicates) {
        summary.usersSkippedDuplicate += 1;
      } else {
        existingUserIds.add(effectiveUid);
        if (email) existingEmailToUid.set(email, effectiveUid);
        summary.usersImported += 1;
      }
      const collections = [
        { key: "categories", counterKey: "categoriesImported" },
        { key: "beers", counterKey: "beersImported" },
        { key: "tastings", counterKey: "tastingsImported" },
        { key: "glasses", counterKey: "glassesImported" },
        { key: "pubDeals", counterKey: "pubDealsImported" }
      ];
      for (const col of collections) {
        const list = Array.isArray(item[col.key]) ? item[col.key] : [];
        for (const rawRec of list.slice(0, 5e3)) {
          if (!rawRec || typeof rawRec !== "object") continue;
          const rec = rawRec;
          const recId = isValidServerId(rec.id) ? rec.id : sanitizeServerId(void 0, col.key);
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
    await this.repairCrossAccountContamination();
    return summary;
  }
  async insertRecordIfNotExists(userId, collectionType, recordId, payload, skipDuplicates = true) {
    if (!isValidServerId(userId) || !isValidServerId(recordId) || !ALLOWED_COLLECTION_TYPES.has(collectionType)) {
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
  async deleteUserRecord(userId, collectionType, recordId) {
    await this.init();
    if (!isValidServerId(userId) || !isValidServerId(recordId) || !ALLOWED_COLLECTION_TYPES.has(collectionType)) {
      return false;
    }
    if (this.pool) {
      await this.pool.query(
        "DELETE FROM user_records WHERE user_id = $1 AND collection_type = $2 AND id = $3",
        [userId, collectionType, recordId]
      );
      if (collectionType === "beers") {
        await this.pool.query(
          `DELETE FROM user_records WHERE user_id = $1 AND collection_type = 'tastings' AND (payload->>'beerId') = $2`,
          [userId, recordId]
        );
      }
      return true;
    }
    const bucket = this.ensureMemoryBucket(userId);
    const colKey = collectionType;
    bucket[colKey].delete(recordId);
    if (colKey === "beers") {
      bucket.tastings.forEach((t, tid) => {
        if (t.beerId === recordId) bucket.tastings.delete(tid);
      });
    }
    return true;
  }
  async clearUserCollections(userId) {
    await this.init();
    if (!isValidServerId(userId)) return false;
    if (this.pool) {
      await this.pool.query("DELETE FROM user_records WHERE user_id = $1", [userId]);
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
  async syncUserCollections(userId, collections, userMeta) {
    await this.init();
    if (!isValidServerId(userId)) return;
    const existing = await this.getUserById(userId);
    const upsertedUser = await this.upsertUser({
      id: userId,
      email: userMeta?.email || existing?.email || "",
      name: userMeta?.name || existing?.name || "Bierliefhebber",
      role: userMeta?.role || existing?.role,
      lastActiveAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    const effectiveUserId = upsertedUser.id;
    const keys = [
      "categories",
      "beers",
      "tastings",
      "glasses",
      "pubDeals",
      "sessions"
    ];
    for (const colType of keys) {
      const list = collections[colType];
      if (!Array.isArray(list) || list.length === 0) continue;
      for (const rawItem of list.slice(0, 5e3)) {
        if (!rawItem || typeof rawItem !== "object") continue;
        const obj = rawItem;
        const recId = isValidServerId(obj.id) ? obj.id : sanitizeServerId(void 0, colType);
        await this.insertRecordIfNotExists(effectiveUserId, colType, recId, obj, false);
      }
    }
    await this.consolidateDuplicateDatabaseUsers();
    await this.repairCrossAccountContamination();
  }
  async getSystemSetting(key, defaultValue = "") {
    await this.init();
    if (this.pool) {
      try {
        const res = await this.pool.query("SELECT value FROM system_settings WHERE key = $1", [key]);
        if (res.rows.length > 0) return res.rows[0].value || defaultValue;
      } catch {
      }
    }
    return this.memorySystemSettings.get(key) ?? defaultValue;
  }
  async setSystemSetting(key, value) {
    await this.init();
    if (this.pool) {
      try {
        await this.pool.query(
          `INSERT INTO system_settings (key, value, updated_at) VALUES ($1, $2, NOW())
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
          [key, value]
        );
      } catch {
      }
    }
    this.memorySystemSettings.set(key, value);
  }
};
function sanitizeCollectionRecord(collectionType, id, userId, raw) {
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  switch (collectionType) {
    case "categories": {
      const name = sanitizeServerString(raw.name, 80);
      if (!name) return null;
      return {
        id,
        userId,
        name,
        color: typeof raw.color === "string" && /^#[0-9A-Fa-f]{3,8}$/.test(raw.color.trim()) ? raw.color.trim() : "#f59e0b",
        description: sanitizeServerString(raw.description, 300),
        createdAt: sanitizeServerString(raw.createdAt, 40, nowIso)
      };
    }
    case "beers": {
      const name = sanitizeServerString(raw.name, 120);
      if (!name) return null;
      return {
        id,
        userId,
        name,
        brewery: sanitizeServerString(raw.brewery, 120),
        categoryId: sanitizeServerString(raw.categoryId, 128),
        abv: Number(sanitizeServerNumber(raw.abv, 0, 100, 5).toFixed(1)),
        favorite: Boolean(raw.favorite),
        photoUrl: sanitizeServerImageUrl(raw.photoUrl),
        photoPosition: sanitizeServerString(raw.photoPosition, 30, "50% 50%"),
        photoZoom: raw.photoZoom !== void 0 ? sanitizeServerNumber(raw.photoZoom, 0.5, 5, 1) : 1,
        dateAdded: sanitizeServerString(raw.dateAdded, 40, nowIso),
        ...raw.updatedAt ? { updatedAt: sanitizeServerString(raw.updatedAt, 40) } : {}
      };
    }
    case "tastings": {
      const beerId = sanitizeServerString(raw.beerId, 128);
      if (!beerId) return null;
      return {
        id,
        userId,
        beerId,
        rating: Number(sanitizeServerNumber(raw.rating, 1, 10, 7).toFixed(1)),
        notes: sanitizeServerString(raw.notes, 2e3),
        location: sanitizeServerString(raw.location, 150),
        servingType: raw.servingType === "tap" || raw.servingType === "fles" || raw.servingType === "blik" ? raw.servingType : void 0,
        photoUrl: sanitizeServerImageUrl(raw.photoUrl),
        photoPosition: sanitizeServerString(raw.photoPosition, 30, "50% 50%"),
        photoZoom: raw.photoZoom !== void 0 ? sanitizeServerNumber(raw.photoZoom, 0.5, 5, 1) : 1,
        date: sanitizeServerString(raw.date, 40, nowIso)
      };
    }
    case "glasses": {
      const name = sanitizeServerString(raw.name, 120);
      if (!name) return null;
      return {
        id,
        userId,
        name,
        brand: sanitizeServerString(raw.brand, 120),
        glassType: sanitizeServerString(raw.glassType, 80),
        quantity: Math.round(sanitizeServerNumber(raw.quantity, 0, 9999, 1)),
        volumeCl: raw.volumeCl !== void 0 ? sanitizeServerNumber(raw.volumeCl, 0, 500, 33) : void 0,
        photoUrl: sanitizeServerImageUrl(raw.photoUrl),
        photoPosition: sanitizeServerString(raw.photoPosition, 30, "50% 50%"),
        photoZoom: raw.photoZoom !== void 0 ? sanitizeServerNumber(raw.photoZoom, 0.5, 5, 1) : 1,
        notes: sanitizeServerString(raw.notes, 1e3),
        favorite: Boolean(raw.favorite),
        dateAdded: sanitizeServerString(raw.dateAdded, 40, nowIso),
        ...raw.updatedAt ? { updatedAt: sanitizeServerString(raw.updatedAt, 40) } : {}
      };
    }
    case "pubDeals": {
      return {
        id,
        userId,
        pubName: sanitizeServerString(raw.pubName, 150, "Onbekend Caf\xE9"),
        city: sanitizeServerString(raw.city, 100, "Amsterdam"),
        province: sanitizeServerString(raw.province, 50, "Noord-Holland"),
        address: sanitizeServerString(raw.address, 200),
        lat: sanitizeServerNumber(raw.lat, -90, 90, 52.3676),
        lng: sanitizeServerNumber(raw.lng, -180, 180, 4.9041),
        hasActiveDeal: Boolean(raw.hasActiveDeal),
        dealCategory: sanitizeServerString(raw.dealCategory, 40, "glas"),
        dealTitle: sanitizeServerString(raw.dealTitle, 250),
        beerBrand: sanitizeServerString(raw.beerBrand, 120),
        sourceName: sanitizeServerString(raw.sourceName, 120, "Website"),
        sourceUrl: sanitizeServerString(raw.sourceUrl, 1024, "https://untappd.com/"),
        checkedAt: sanitizeServerString(raw.checkedAt, 40, nowIso.split("T")[0]),
        ...raw.actieEindDatum ? { actieEindDatum: sanitizeServerString(raw.actieEindDatum, 40) } : {},
        ...raw.submittedBy ? { submittedBy: sanitizeServerString(raw.submittedBy, 100) } : {}
      };
    }
    case "sessions": {
      return {
        id,
        userId,
        date: sanitizeServerString(raw.date, 40, nowIso),
        count: Math.round(sanitizeServerNumber(raw.count, 0, 500, 0)),
        standardDrinks: Number(sanitizeServerNumber(raw.standardDrinks, 0, 500, 0).toFixed(2)),
        totalCost: Number(sanitizeServerNumber(raw.totalCost, 0, 1e5, 0).toFixed(2)),
        glassSizeCl: sanitizeServerNumber(raw.glassSizeCl, 5, 200, 30),
        abv: sanitizeServerNumber(raw.abv, 0, 100, 5),
        pricePerGlass: sanitizeServerNumber(raw.pricePerGlass, 0, 1e3, 3.5)
      };
    }
    default:
      return null;
  }
}
var centralDb = new CentralDatabaseClient();

// server.ts
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var BLOCKED_PATH_PATTERNS = [
  /(?:^|\/)\.(?:env|git|github|dockerignore|gitignore|npmrc|yarnrc|ssh|aws|htaccess|htpasswd|DS_Store)(?:\/|$|\.)/i,
  /^\/server(?:\.ts|\/|$)/i,
  /^\/firestore\.rules$/i,
  /^\/firebase-blueprint\.json$/i,
  /^\/package(?:-lock)?\.json$/i,
  /^\/tsconfig.*\.json$/i,
  /^\/dockerfile/i,
  /^\/docker-compose/i,
  /\.(?:env|pem|key|sql|bak|log|sh)$/i
];
async function startServer() {
  await centralDb.init();
  const app = express();
  const PORT = Number(process.env.PORT) || 3e3;
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use((req, res, next) => {
    const rawHost = (req.headers["x-forwarded-host"] || req.headers.host || "").toLowerCase().split(":")[0];
    if (rawHost === "www.cervisium.nl") {
      const proto = req.headers["x-forwarded-proto"] || (req.secure ? "https" : "http");
      const targetProto = proto === "http" && !req.headers["x-forwarded-proto"] ? "http" : "https";
      return res.redirect(301, `${targetProto}://cervisium.nl${req.originalUrl || req.url || "/"}`);
    }
    next();
  });
  function setSessionCookie(response, request, signedCookieToken, maxAge = 60 * 60 * 24 * 7) {
    const isSecure = Boolean(request.secure || request.headers["x-forwarded-proto"] === "https");
    const rawHost = (request.headers["x-forwarded-host"] || request.headers.host || request.hostname || "").toLowerCase().split(":")[0];
    const isCervisiumDomain = rawHost === "cervisium.nl" || rawHost.endsWith(".cervisium.nl");
    const domainAttr = isCervisiumDomain ? "; Domain=.cervisium.nl" : "";
    response.setHeader(
      "Set-Cookie",
      `bierlog_session=${encodeURIComponent(signedCookieToken)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${isSecure ? "; Secure" : ""}${domainAttr}`
    );
  }
  function clearSessionCookie(response, request) {
    const rawHost = (request.headers["x-forwarded-host"] || request.headers.host || request.hostname || "").toLowerCase().split(":")[0];
    const isCervisiumDomain = rawHost === "cervisium.nl" || rawHost.endsWith(".cervisium.nl");
    const cookies = ["bierlog_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"];
    if (isCervisiumDomain) {
      cookies.push("bierlog_session=; Path=/; Domain=.cervisium.nl; HttpOnly; SameSite=Lax; Max-Age=0");
    }
    response.setHeader("Set-Cookie", cookies);
  }
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
    res.setHeader("Permissions-Policy", "camera=(self), microphone=(), payment=(), usb=()");
    const fullUrl = req.originalUrl || req.url || "";
    const rawPath = (req.path || fullUrl).split("?")[0];
    let decodedPath = rawPath;
    try {
      decodedPath = decodeURIComponent(rawPath);
    } catch {
      res.status(400).json({ error: "Ongeldig URL-pad." });
      return;
    }
    const isDirectFirebaseConfigRequest = decodedPath.toLowerCase() === "/firebase-applet-config.json" && !fullUrl.includes("?import");
    if (decodedPath.includes("..") || decodedPath.includes("\0") || isDirectFirebaseConfigRequest || BLOCKED_PATH_PATTERNS.some((rx) => rx.test(decodedPath))) {
      res.status(403).json({ error: "Toegang geweigerd." });
      return;
    }
    if (decodedPath === "/api" || decodedPath.startsWith("/api/")) {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
      res.setHeader("Pragma", "no-cache");
      if (decodedPath !== "/api/health") {
        const secFetchMode = String(req.headers["sec-fetch-mode"] || "").toLowerCase();
        const secFetchDest = String(req.headers["sec-fetch-dest"] || "").toLowerCase();
        const acceptHeader = String(req.headers.accept || "").toLowerCase();
        const isDirectBrowserNavigation = secFetchMode === "navigate" || secFetchDest === "document" || secFetchDest === "iframe" || acceptHeader.includes("text/html");
        if (isDirectBrowserNavigation) {
          res.status(403).json({
            error: "Directe toegang tot de API via de browser-adresbalk is uitgeschakeld."
          });
          return;
        }
      }
    }
    next();
  });
  app.use(express.json({ limit: "150mb" }));
  app.use("/api", rateLimitMiddleware(240));
  app.use("/api/auth", authRateLimitMiddleware(12, 15 * 60 * 1e3));
  async function getServerSystemMetrics() {
    let ramTotalBytes = os.totalmem();
    let ramFreeBytes = os.freemem();
    let ramBuffersCachedBytes = 0;
    try {
      if (fs.existsSync("/proc/meminfo")) {
        const meminfo = fs.readFileSync("/proc/meminfo", "utf8");
        const parseKb = (key) => {
          const match = meminfo.match(new RegExp(`^${key}:\\s+(\\d+)\\s+kB`, "m"));
          return match ? Number(match[1]) * 1024 : null;
        };
        const memTotal = parseKb("MemTotal");
        const memAvailable = parseKb("MemAvailable");
        const memFree = parseKb("MemFree");
        const buffers = parseKb("Buffers") || 0;
        const cached = parseKb("Cached") || 0;
        const sReclaimable = parseKb("SReclaimable") || 0;
        if (memTotal && memTotal > 0) {
          ramTotalBytes = memTotal;
        }
        ramBuffersCachedBytes = buffers + cached + sReclaimable;
        if (memAvailable !== null && memAvailable >= 0) {
          ramFreeBytes = memAvailable;
        } else if (memFree !== null) {
          ramFreeBytes = Math.min(ramTotalBytes, memFree + ramBuffersCachedBytes);
        }
      }
    } catch {
    }
    const ramUsedBytes = Math.max(0, ramTotalBytes - ramFreeBytes);
    let appRamRssBytes = process.memoryUsage().rss;
    try {
      if (fs.existsSync("/proc")) {
        const entries = fs.readdirSync("/proc");
        let totalProcRss = 0;
        for (const entry of entries) {
          if (/^\d+$/.test(entry)) {
            try {
              const statusContent = fs.readFileSync(`/proc/${entry}/status`, "utf8");
              const rssMatch = statusContent.match(/^VmRSS:\s+(\d+)\s+kB/m);
              if (rssMatch) {
                totalProcRss += Number(rssMatch[1]) * 1024;
              }
            } catch {
            }
          }
        }
        if (totalProcRss >= appRamRssBytes) {
          appRamRssBytes = totalProcRss;
        }
      }
    } catch {
    }
    let diskTotalBytes = 0;
    let diskFreeBytes = 0;
    let diskUsedBytes = 0;
    const candidatePaths = ["/var/lib/postgresql/data", "/data", "/app", "/"];
    for (const candidatePath of candidatePaths) {
      try {
        if (!fs.existsSync(candidatePath)) continue;
        const stat = fs.statfsSync(candidatePath);
        const blockSize = Number(stat.frsize || stat.bsize || 4096);
        const totalBlocks = Number(stat.blocks);
        const freeBlocks = Number(stat.bfree);
        const availBlocks = Number(stat.bavail);
        const total = totalBlocks * blockSize;
        const free = availBlocks * blockSize;
        const used = Math.max(0, (totalBlocks - freeBlocks) * blockSize);
        if (total > diskTotalBytes) {
          diskTotalBytes = total;
          diskFreeBytes = free;
          diskUsedBytes = used;
        }
      } catch {
      }
    }
    if (diskTotalBytes <= 0) {
      try {
        const dfOut = execSync("df -kP / 2>/dev/null", { encoding: "utf8", timeout: 1500 });
        const lines = dfOut.trim().split("\n");
        if (lines.length >= 2) {
          const cols = lines[lines.length - 1].trim().split(/\s+/);
          if (cols.length >= 4) {
            const totalKb = Number(cols[1]);
            const usedKb = Number(cols[2]);
            const availKb = Number(cols[3]);
            if (Number.isFinite(totalKb) && totalKb > 0) {
              diskTotalBytes = totalKb * 1024;
              diskUsedBytes = Math.max(0, usedKb * 1024);
              diskFreeBytes = Math.max(0, availKb * 1024);
            }
          }
        }
      } catch {
      }
    }
    const dbSizeBytes = await centralDb.getDatabaseSizeBytes();
    return {
      diskTotalBytes,
      diskUsedBytes,
      diskFreeBytes,
      ramTotalBytes,
      ramUsedBytes,
      ramFreeBytes,
      ramBuffersCachedBytes,
      appRamRssBytes,
      dbSizeBytes,
      cpuCores: os.cpus()?.length || 1,
      uptimeSeconds: Math.floor(os.uptime())
    };
  }
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  app.get("/api/system/metrics", requireAdmin, async (_req, res) => {
    res.json({
      systemMetrics: await getServerSystemMetrics()
    });
  });
  app.post("/api/auth/google", async (req, res) => {
    try {
      const { credential, password } = req.body || {};
      const authHeader = req.headers.authorization;
      const token = credential || (typeof authHeader === "string" && authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "");
      if (!token) {
        res.status(400).json({ error: "Geen Google ID-token ontvangen." });
        return;
      }
      const { verifyFirebaseIdToken: verifyFirebaseIdToken2 } = await Promise.resolve().then(() => (init_security(), security_exports));
      const verifiedGoogleUser = await verifyFirebaseIdToken2(token);
      if (!verifiedGoogleUser) {
        res.status(401).json({ error: "Google ID-token verificatie mislukt." });
        return;
      }
      let optionalPasswordHash;
      if (typeof password === "string" && password.length >= 8 && password.length <= 256) {
        try {
          optionalPasswordHash = await hashPassword(password);
        } catch {
        }
      }
      const dbUser = await centralDb.upsertUser({
        id: verifiedGoogleUser.uid,
        email: verifiedGoogleUser.email,
        name: verifiedGoogleUser.name || "Bierliefhebber",
        googleName: verifiedGoogleUser.name,
        role: verifiedGoogleUser.role,
        passwordHash: optionalPasswordHash,
        avatarUrl: verifiedGoogleUser.avatarUrl,
        lastActiveAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      const signedCookieToken = createSignedSessionToken({
        uid: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        emailVerified: verifiedGoogleUser.emailVerified
      });
      setSessionCookie(res, req, signedCookieToken);
      const records = await centralDb.getUserRecords(dbUser.id);
      res.json({
        authenticated: true,
        user: {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          googleName: dbUser.googleName,
          avatarUrl: dbUser.avatarUrl,
          role: verifiedGoogleUser.role,
          createdAt: dbUser.createdAt
        },
        records
      });
    } catch {
      res.status(500).json({ error: "Kon Google-inlog niet verwerken op de server." });
    }
  });
  app.post("/api/auth/account", async (req, res) => {
    try {
      const { email, password, name } = req.body || {};
      const cleanEmail = sanitizeServerString(email, 180).toLowerCase();
      if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        res.status(400).json({ error: "Vul een geldig e-mailadres in." });
        return;
      }
      if (typeof password !== "string" || password.length < 8 || password.length > 256) {
        res.status(400).json({
          error: "Wachtwoord moet minimaal 8 tekens lang zijn."
        });
        return;
      }
      const existingUser = await centralDb.getUserByEmail(cleanEmail);
      let passwordHashToSave;
      if (isVerifiedAdminEmail(cleanEmail, true) && (!existingUser || !existingUser.passwordHash)) {
        res.status(403).json({
          error: "Beheerdersaccounts zijn beveiligd en kunnen alleen inloggen via geverifieerde Google-authenticatie."
        });
        return;
      }
      if (existingUser) {
        if (!existingUser.passwordHash) {
          res.status(403).json({
            error: "Dit e-mailadres is gekoppeld aan Google-inlog. Log in met de Google-knop of stel eerst ingelogd een wachtwoord in."
          });
          return;
        }
        const isMatch = await verifyPassword(password, existingUser.passwordHash);
        if (!isMatch) {
          res.status(401).json({
            error: "Onjuist e-mailadres of wachtwoord."
          });
          return;
        }
        passwordHashToSave = existingUser.passwordHash;
      } else {
        passwordHashToSave = await hashPassword(password);
      }
      const derivedId = getCanonicalUserIdForEmail(cleanEmail) || existingUser?.id || `usr_${crypto2.createHash("sha256").update(cleanEmail).digest("hex").slice(0, 24)}`;
      const defaultName = sanitizeServerString(name, 100) || existingUser?.name || cleanEmail.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "Bierliefhebber";
      const isVerifiedExistingAdmin = Boolean(
        existingUser && existingUser.passwordHash && existingUser.role === "admin" && isVerifiedAdminEmail(cleanEmail, true)
      );
      const role = isVerifiedExistingAdmin ? "admin" : "user";
      const dbUser = await centralDb.upsertUser({
        id: derivedId,
        email: cleanEmail,
        name: defaultName,
        googleName: existingUser?.googleName || defaultName,
        role,
        passwordHash: passwordHashToSave,
        avatarUrl: existingUser?.avatarUrl,
        lastActiveAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      const signedCookieToken = createSignedSessionToken({
        uid: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        emailVerified: isVerifiedExistingAdmin
      });
      setSessionCookie(res, req, signedCookieToken);
      const records = await centralDb.getUserRecords(dbUser.id);
      res.json({
        authenticated: true,
        user: {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          googleName: dbUser.googleName,
          avatarUrl: dbUser.avatarUrl,
          role: dbUser.role,
          createdAt: dbUser.createdAt
        },
        records
      });
    } catch {
      res.status(500).json({
        error: "Inloggen op de server is mislukt."
      });
    }
  });
  app.post("/api/auth/session", async (req, res) => {
    try {
      const user = await resolveRequestUser(req);
      if (!user) {
        res.status(401).json({ error: "Ongeldig authenticatietoken." });
        return;
      }
      const dbUser = await centralDb.upsertUser({
        id: user.uid,
        email: user.email,
        name: user.name || "Bierliefhebber",
        role: user.role,
        lastActiveAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      const signedCookieToken = createSignedSessionToken({
        uid: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        emailVerified: user.emailVerified
      });
      setSessionCookie(res, req, signedCookieToken);
      res.json({
        authenticated: true,
        user: {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          role: user.role,
          emailVerified: user.emailVerified
        }
      });
    } catch {
      res.status(500).json({ error: "Kon sessie niet initialiseren." });
    }
  });
  app.post("/api/auth/logout", (req, res) => {
    clearSessionCookie(res, req);
    res.json({ authenticated: false });
  });
  app.post("/api/auth/password/update", requireAuth, async (req, res) => {
    try {
      const authUser = req.authUser;
      const { currentPassword, newPassword } = req.body;
      if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
        res.status(400).json({
          error: "Nieuw wachtwoord moet minimaal 8 tekens bevatten."
        });
        return;
      }
      const existing = await centralDb.getUserById(authUser.uid);
      if (existing?.passwordHash) {
        const valid = await verifyPassword(currentPassword || "", existing.passwordHash);
        if (!valid) {
          res.status(403).json({ error: "Huidig wachtwoord komt niet overeen." });
          return;
        }
      }
      const passwordHash = await hashPassword(newPassword);
      await centralDb.upsertUser({
        id: authUser.uid,
        email: authUser.email,
        name: authUser.name,
        role: authUser.role,
        passwordHash
      });
      res.json({ ok: true });
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : "Wachtwoord bijwerken mislukt."
      });
    }
  });
  app.get("/api/me", requireAuth, async (req, res) => {
    const authUser = req.authUser;
    const profile = await centralDb.upsertUser({
      id: authUser.uid,
      email: authUser.email,
      name: authUser.name || "Bierliefhebber",
      role: authUser.role,
      lastActiveAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    const records = await centralDb.getUserRecords(profile.id);
    const foreignRecordIds = await centralDb.getForeignRecordIds(profile.id);
    res.json({
      user: {
        id: profile.id,
        email: profile.email || authUser.email,
        name: profile.name || authUser.name,
        googleName: profile.googleName,
        role: profile.role || authUser.role,
        avatarUrl: profile.avatarUrl,
        settings: profile.settings || {},
        createdAt: profile.createdAt
      },
      records,
      foreignRecordIds
    });
  });
  app.put("/api/me/profile", requireAuth, async (req, res) => {
    const authUser = req.authUser;
    const body = req.body || {};
    const updated = await centralDb.upsertUser({
      id: authUser.uid,
      email: authUser.email,
      name: sanitizeServerString(body.name, 100, authUser.name || "Bierliefhebber"),
      role: authUser.role,
      avatarUrl: sanitizeServerImageUrl(body.avatarUrl),
      settings: body.settings ? sanitizeServerUserSettings(body.settings) : void 0
    });
    res.json({
      user: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        googleName: updated.googleName,
        role: updated.role,
        avatarUrl: updated.avatarUrl,
        settings: updated.settings,
        createdAt: updated.createdAt
      }
    });
  });
  app.post("/api/me/records/sync", requireAuth, async (req, res) => {
    try {
      const authUser = req.authUser;
      const body = req.body || {};
      const authProfile = authUser.email ? await centralDb.getUserByEmail(authUser.email) : await centralDb.getUserById(authUser.uid);
      const effectiveAuthUid = authProfile?.id || authUser.uid;
      const isAdmin = authUser.role === "admin" || authProfile?.role === "admin" || isVerifiedAdminEmail(authUser.email, true);
      const requestedTargetId = typeof body.targetUserId === "string" ? body.targetUserId.trim() : "";
      let targetUid = effectiveAuthUid;
      let syncMeta = {
        email: authUser.email,
        name: authUser.name,
        role: authUser.role
      };
      if (requestedTargetId && requestedTargetId !== authUser.uid && requestedTargetId !== effectiveAuthUid) {
        if (!isAdmin) {
          res.status(403).json({
            error: "Geen rechten om gegevens van een andere gebruiker te synchroniseren."
          });
          return;
        }
        targetUid = requestedTargetId;
        const targetProfile = await centralDb.getUserById(requestedTargetId);
        const targetEmailFromBody = typeof body.targetUserEmail === "string" ? body.targetUserEmail.trim() : "";
        const targetNameFromBody = typeof body.targetUserName === "string" ? body.targetUserName.trim() : "";
        syncMeta = {
          email: targetProfile?.email || targetEmailFromBody || void 0,
          name: targetProfile?.name || targetNameFromBody || "Bierliefhebber",
          role: targetProfile?.role || "user"
        };
      }
      await centralDb.syncUserCollections(
        targetUid,
        {
          categories: Array.isArray(body.categories) ? body.categories : void 0,
          beers: Array.isArray(body.beers) ? body.beers : void 0,
          tastings: Array.isArray(body.tastings) ? body.tastings : void 0,
          glasses: Array.isArray(body.glasses) ? body.glasses : void 0,
          pubDeals: Array.isArray(body.pubDeals) ? body.pubDeals : void 0,
          sessions: Array.isArray(body.sessions) ? body.sessions : void 0
        },
        syncMeta
      );
      res.json({ ok: true });
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : "Synchroniseren met database mislukt."
      });
    }
  });
  app.delete("/api/me/records/:type/:id", requireAuth, async (req, res) => {
    try {
      const authUser = req.authUser;
      const profile = authUser.email ? await centralDb.getUserByEmail(authUser.email) : await centralDb.getUserById(authUser.uid);
      const effectiveUid = profile?.id || authUser.uid;
      const isAdmin = authUser.role === "admin" || profile?.role === "admin" || isVerifiedAdminEmail(authUser.email, true);
      const requestedTargetId = typeof req.query.targetUserId === "string" ? req.query.targetUserId.trim() : "";
      let targetUid = effectiveUid;
      if (requestedTargetId && requestedTargetId !== authUser.uid && requestedTargetId !== effectiveUid) {
        if (!isAdmin) {
          res.status(403).json({ error: "Geen rechten om dit item te verwijderen." });
          return;
        }
        targetUid = requestedTargetId;
      }
      await centralDb.deleteUserRecord(targetUid, req.params.type, req.params.id);
      res.json({ ok: true });
    } catch {
      res.status(400).json({ error: "Kon item niet verwijderen uit database." });
    }
  });
  app.delete("/api/me/records", requireAuth, async (req, res) => {
    try {
      const authUser = req.authUser;
      const profile = authUser.email ? await centralDb.getUserByEmail(authUser.email) : await centralDb.getUserById(authUser.uid);
      const effectiveUid = profile?.id || authUser.uid;
      const isAdmin = authUser.role === "admin" || profile?.role === "admin" || isVerifiedAdminEmail(authUser.email, true);
      const requestedTargetId = typeof req.query.targetUserId === "string" ? req.query.targetUserId.trim() : "";
      let targetUid = effectiveUid;
      if (requestedTargetId && requestedTargetId !== authUser.uid && requestedTargetId !== effectiveUid) {
        if (!isAdmin) {
          res.status(403).json({ error: "Geen rechten om gegevens van een ander te wissen." });
          return;
        }
        targetUid = requestedTargetId;
      }
      await centralDb.clearUserCollections(targetUid);
      res.json({ ok: true });
    } catch {
      res.status(400).json({ error: "Kon gegevens niet wissen uit database." });
    }
  });
  app.get("/api/friends", requireAuth, async (req, res) => {
    try {
      const authUser = req.authUser;
      let profile = authUser.email ? await centralDb.getUserByEmail(authUser.email) : await centralDb.getUserById(authUser.uid);
      if (!profile) {
        profile = await centralDb.upsertUser({
          id: authUser.uid,
          email: authUser.email,
          name: authUser.name || "Bierliefhebber",
          role: authUser.role,
          lastActiveAt: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
      const effectiveUid = profile?.id || authUser.uid;
      const friends = await centralDb.getFriendsForUser(effectiveUid);
      res.json({ friends });
    } catch {
      res.status(500).json({ error: "Kon vriendenlijst niet ophalen." });
    }
  });
  app.post("/api/friends/accept", requireAuth, async (req, res) => {
    try {
      const authUser = req.authUser;
      let profile = authUser.email ? await centralDb.getUserByEmail(authUser.email) : await centralDb.getUserById(authUser.uid);
      if (!profile) {
        profile = await centralDb.upsertUser({
          id: authUser.uid,
          email: authUser.email,
          name: authUser.name || "Bierliefhebber",
          role: authUser.role,
          lastActiveAt: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
      const effectiveUid = profile?.id || authUser.uid;
      const { inviteCode, friendId } = req.body || {};
      const target = (inviteCode || friendId || "").trim();
      if (!target) {
        res.status(400).json({ error: "Geen uitnodiging of vriend gekozen." });
        return;
      }
      const result = await centralDb.addFriendship(effectiveUid, target);
      if (!result.success) {
        res.status(400).json({ error: result.message });
        return;
      }
      res.json({
        ok: true,
        message: result.message,
        friend: result.friend ? {
          id: result.friend.id,
          name: result.friend.name,
          email: result.friend.email,
          avatarUrl: result.friend.avatarUrl,
          beerCount: 0,
          tastingCount: 0,
          connectedAt: (/* @__PURE__ */ new Date()).toISOString()
        } : void 0
      });
    } catch {
      res.status(500).json({ error: "Kon vriend niet toevoegen." });
    }
  });
  app.delete("/api/friends/:friendId", requireAuth, async (req, res) => {
    try {
      const authUser = req.authUser;
      const profile = authUser.email ? await centralDb.getUserByEmail(authUser.email) : await centralDb.getUserById(authUser.uid);
      const effectiveUid = profile?.id || authUser.uid;
      await centralDb.removeFriendship(effectiveUid, req.params.friendId);
      res.json({ ok: true });
    } catch {
      res.status(400).json({ error: "Kon vriend niet verwijderen." });
    }
  });
  app.get("/api/friends/:friendId/records", requireAuth, async (req, res) => {
    try {
      const authUser = req.authUser;
      const profile = authUser.email ? await centralDb.getUserByEmail(authUser.email) : await centralDb.getUserById(authUser.uid);
      const effectiveUid = profile?.id || authUser.uid;
      const data = await centralDb.getFriendRecords(effectiveUid, req.params.friendId);
      if (!data) {
        res.status(403).json({ error: "Je bent nog geen vrienden met deze gebruiker." });
        return;
      }
      res.json({
        friend: {
          id: data.friend.id,
          name: data.friend.name,
          email: data.friend.email,
          avatarUrl: data.friend.avatarUrl
        },
        records: data.records
      });
    } catch {
      res.status(500).json({ error: "Kon vrienden-collectie niet ophalen." });
    }
  });
  app.get("/api/system/settings", async (_req, res) => {
    try {
      const customDomain = await centralDb.getSystemSetting(
        "custom_domain",
        "https://cervisium.nl"
      );
      res.json({ customDomain });
    } catch {
      res.json({ customDomain: "https://cervisium.nl" });
    }
  });
  app.post("/api/system/settings", requireAuth, async (req, res) => {
    try {
      const authUser = req.authUser;
      if (authUser.role !== "admin" && !isVerifiedAdminEmail(authUser.email, true)) {
        res.status(403).json({ error: "Alleen de beheerder kan het uitnodigingsdomein wijzigen." });
        return;
      }
      let { customDomain } = req.body || {};
      customDomain = (customDomain || "").trim();
      if (customDomain) {
        if (!/^https?:\/\//i.test(customDomain)) {
          customDomain = `https://${customDomain}`;
        }
        customDomain = customDomain.replace(/\/+$/, "");
      } else {
        customDomain = "https://cervisium.nl";
      }
      await centralDb.setSystemSetting("custom_domain", customDomain);
      res.json({ ok: true, customDomain });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : "Kon systeeminstellingen niet opslaan."
      });
    }
  });
  function isSafePublicUrl(rawUrl) {
    try {
      const parsed = new URL(rawUrl.trim());
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
      const host = parsed.hostname.toLowerCase();
      if (!host || host === "localhost" || host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".localhost") || host === "0.0.0.0" || host === "::1" || host === "[::1]" || /^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) || /^169\.254\./.test(host) || /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) || /^0\./.test(host)) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }
  function decodeHtmlEntities(input) {
    return input.replace(/&#(\d+);/g, (_m, dec) => String.fromCharCode(Number(dec))).replace(/&#x([0-9a-f]+);/gi, (_m, hex) => String.fromCharCode(parseInt(hex, 16))).replace(/&amp;/gi, "&").replace(/&ndash;|&#8211;/gi, "\u2013").replace(/&mdash;|&#8212;/gi, "\u2014").replace(/&rsquo;|&lsquo;|&#8217;|&#8216;/gi, "'").replace(/&ldquo;|&rdquo;|&#8220;|&#8221;|&quot;/gi, '"').replace(/&euro;/gi, "\u20AC").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim();
  }
  app.post("/api/deals/verify-url", async (req, res) => {
    try {
      const { url, dealTitle = "", beerBrand = "", pubName = "" } = req.body || {};
      if (!url || typeof url !== "string") {
        res.status(400).json({ verified: false, error: "Geen geldige URL opgegeven." });
        return;
      }
      const safeTarget = isSafePublicUrl(url);
      if (!safeTarget) {
        res.status(400).json({ verified: false, error: "Ongeldige of niet-publieke URL." });
        return;
      }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 7500);
      let fetchRes;
      try {
        fetchRes = await fetch(safeTarget.href, {
          method: "GET",
          redirect: "follow",
          signal: controller.signal,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "nl-NL,nl;q=0.9,en;q=0.8"
          }
        });
      } finally {
        clearTimeout(timeout);
      }
      const finalSafe = isSafePublicUrl(fetchRes.url || safeTarget.href);
      if (!finalSafe) {
        res.status(400).json({ verified: false, error: "Redirect naar niet-publieke URL geblokkeerd." });
        return;
      }
      const rawHtml = (await fetchRes.text()).slice(0, 35e4);
      const rawTitle = rawHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || rawHtml.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1] || "";
      const pageTitle = sanitizeServerString(decodeHtmlEntities(rawTitle), 150, finalSafe.hostname);
      const metaDesc = rawHtml.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] || rawHtml.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1] || "";
      const cleanBlocks = rawHtml.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<noscript[\s\S]*?<\/noscript>/gi, " ").replace(/<\/(p|div|h1|h2|h3|h4|li|tr|section|article)>/gi, "\n").replace(/<[^>]+>/g, " ").split("\n").map((line) => decodeHtmlEntities(line)).filter((line) => line.length >= 25 && line.length <= 420);
      const fullTextLower = `${pageTitle} ${decodeHtmlEntities(metaDesc)} ${cleanBlocks.join(" ")}`.toLowerCase();
      const isFake200 = /domain for sale|domein te koop|pagina niet gevonden|page not found|404 not found/i.test(pageTitle);
      const candidateTerms = [
        "proeverij",
        "proeflokaal",
        "rondleiding",
        "arrangement",
        "bierproeverij",
        "high beer",
        "proefplank",
        "glas",
        "4-pack",
        "bierpakket",
        "proefbox",
        "taptafel",
        "taproom",
        "brewpub",
        "borrel",
        "speciaalbier",
        "wisseltap",
        "tap",
        "bieren",
        "brouwerij",
        "actie",
        "korting",
        "events"
      ];
      const customWords = `${dealTitle} ${beerBrand} ${pubName}`.toLowerCase().replace(/[^a-z0-9à-ÿ\s-]/gi, " ").split(/\s+/).filter((w) => w.length >= 4 && !["voor", "naar", "bij", "met", "van", "een", "het", "alle", "gratis"].includes(w));
      const matchedKeywords = [];
      for (const term of [.../* @__PURE__ */ new Set([...customWords, ...candidateTerms])]) {
        if (fullTextLower.includes(term.toLowerCase())) {
          matchedKeywords.push(term);
        }
        if (matchedKeywords.length >= 6) break;
      }
      const dealKeywords = [
        "proeverij",
        "rondleiding",
        "arrangement",
        "glas",
        "pakket",
        "proefbox",
        "taptafel",
        "taproom",
        "brewpub",
        "proeflokaal",
        "speciaalbier",
        "borrel",
        "tap",
        "\u20AC"
      ];
      let bestSnippet = decodeHtmlEntities(metaDesc);
      let bestScore = 0;
      for (const block of cleanBlocks) {
        const lower = block.toLowerCase();
        if (/cookie|privacy|algemene voorwaarden|copyright|alle rechten/i.test(lower)) continue;
        let score = 0;
        for (const kw of dealKeywords) {
          if (lower.includes(kw)) score += 3;
        }
        for (const cw of customWords) {
          if (lower.includes(cw)) score += 2;
        }
        if (score > bestScore) {
          bestScore = score;
          bestSnippet = block;
        }
      }
      if (!bestSnippet && cleanBlocks.length > 0) {
        bestSnippet = cleanBlocks[0];
      }
      const verified = fetchRes.status >= 200 && fetchRes.status < 400 && !isFake200 && matchedKeywords.length > 0;
      res.json({
        verified,
        httpStatus: isFake200 ? 404 : fetchRes.status,
        finalUrl: finalSafe.href,
        pageTitle,
        matchedKeywords,
        liveSnippet: sanitizeServerString(bestSnippet || pageTitle, 280),
        checkedAt: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
      });
    } catch (err) {
      res.status(200).json({
        verified: false,
        httpStatus: 0,
        error: err instanceof Error ? err.message : "Website kon niet live worden bereikt.",
        checkedAt: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
      });
    }
  });
  app.get("/api/admin/verify", requireAdmin, async (req, res) => {
    res.json({
      authorized: true,
      admin: {
        uid: req.authUser.uid,
        email: req.authUser.email,
        role: req.authUser.role
      },
      systemMetrics: await getServerSystemMetrics()
    });
  });
  app.get("/api/admin/metrics", requireAdmin, async (_req, res) => {
    res.json({
      systemMetrics: await getServerSystemMetrics()
    });
  });
  app.put("/api/admin/users/:userId", requireAdmin, async (req, res) => {
    try {
      const targetUserId = req.params.userId;
      if (!isValidServerId(targetUserId)) {
        res.status(400).json({ error: "Ongeldig gebruikers-ID." });
        return;
      }
      const { name, email } = req.body || {};
      const existing = await centralDb.getUserById(targetUserId);
      const updated = await centralDb.upsertUser({
        id: targetUserId,
        email: sanitizeServerString(email, 180, existing?.email || ""),
        name: sanitizeServerString(name, 100, existing?.name || "Bierliefhebber"),
        role: existing?.role === "admin" ? "admin" : "user",
        avatarUrl: existing?.avatarUrl
      });
      res.json({
        ok: true,
        user: {
          id: updated.id,
          email: updated.email,
          name: updated.name,
          role: updated.role,
          avatarUrl: updated.avatarUrl
        }
      });
    } catch {
      res.status(400).json({
        error: "Kon gebruiker niet bijwerken."
      });
    }
  });
  app.get("/api/admin/export", requireAdmin, async (req, res) => {
    try {
      const payload = await centralDb.exportAllData(req.authUser.email);
      res.json({
        ...payload,
        systemMetrics: await getServerSystemMetrics()
      });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : "Kon gegevens niet exporteren."
      });
    }
  });
  app.post("/api/admin/import", requireAdmin, async (req, res) => {
    try {
      const { payload, skipDuplicates = true } = req.body || {};
      const result = await centralDb.importAllData(payload || req.body, {
        skipDuplicates: Boolean(skipDuplicates)
      });
      res.json({
        ok: true,
        summary: result
      });
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : "Importeren van admin-data mislukt."
      });
    }
  });
  function loadPersistentFirebaseEnv() {
    const envFiles = [
      "/data/.firebase_env",
      "/data/.env",
      "/var/lib/postgresql/data/.firebase_env",
      path.join(__dirname, ".env")
    ];
    for (const filePath of envFiles) {
      try {
        if (!fs.existsSync(filePath)) continue;
        const content = fs.readFileSync(filePath, "utf8");
        for (const rawLine of content.split(/\r?\n/)) {
          const line = rawLine.trim();
          if (!line || line.startsWith("#")) continue;
          const cleaned = line.replace(/^export\s+/, "");
          const eqIdx = cleaned.indexOf("=");
          if (eqIdx <= 0) continue;
          const key = cleaned.slice(0, eqIdx).trim();
          let val = cleaned.slice(eqIdx + 1).trim();
          if (val.startsWith("'") && val.endsWith("'") || val.startsWith('"') && val.endsWith('"')) {
            val = val.slice(1, -1).trim();
          }
          if (key.startsWith("FIREBASE_") || key.startsWith("VITE_FIREBASE_") || key === "GOOGLE_CLIENT_ID" || key === "VITE_GOOGLE_CLIENT_ID") {
            if (val && val !== "YOUR_FIREBASE_WEB_API_KEY" && val !== "your-project-id") {
              process.env[key] = val;
            }
          }
        }
      } catch {
      }
    }
    const jsonCandidates = [
      "/data/.firebase-applet-config.json",
      "/var/lib/postgresql/data/.firebase-applet-config.json"
    ];
    for (const jsonPath of jsonCandidates) {
      try {
        if (!fs.existsSync(jsonPath)) continue;
        const parsed = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
        if (parsed && typeof parsed.apiKey === "string" && parsed.apiKey.startsWith("AIza") && typeof parsed.projectId === "string" && parsed.projectId !== "rosy-logic-ckpr3" && parsed.projectId !== "your-project-id") {
          if (!process.env.FIREBASE_API_KEY) process.env.FIREBASE_API_KEY = parsed.apiKey.trim();
          if (!process.env.FIREBASE_PROJECT_ID) process.env.FIREBASE_PROJECT_ID = parsed.projectId.trim();
          if (!process.env.FIREBASE_AUTH_DOMAIN && parsed.authDomain) {
            process.env.FIREBASE_AUTH_DOMAIN = parsed.authDomain.trim();
          }
          if (!process.env.FIREBASE_STORAGE_BUCKET && parsed.storageBucket) {
            process.env.FIREBASE_STORAGE_BUCKET = parsed.storageBucket.trim();
          }
          if (!process.env.FIREBASE_MESSAGING_SENDER_ID && parsed.messagingSenderId) {
            process.env.FIREBASE_MESSAGING_SENDER_ID = parsed.messagingSenderId.trim();
          }
          if (!process.env.FIREBASE_APP_ID && parsed.appId) {
            process.env.FIREBASE_APP_ID = parsed.appId.trim();
          }
        }
      } catch {
      }
    }
  }
  function getRuntimeFirebaseConfig() {
    loadPersistentFirebaseEnv();
    const runtimeApiKey = (process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || "").trim();
    const runtimeProjectId = (process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || "").trim();
    if (runtimeApiKey && runtimeApiKey !== "YOUR_FIREBASE_WEB_API_KEY" && runtimeProjectId && runtimeProjectId !== "your-project-id") {
      return {
        apiKey: runtimeApiKey,
        authDomain: (process.env.FIREBASE_AUTH_DOMAIN || process.env.VITE_FIREBASE_AUTH_DOMAIN || "").trim() || `${runtimeProjectId}.firebaseapp.com`,
        projectId: runtimeProjectId,
        storageBucket: (process.env.FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET || "").trim() || `${runtimeProjectId}.firebasestorage.app`,
        messagingSenderId: (process.env.FIREBASE_MESSAGING_SENDER_ID || process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "").trim(),
        appId: (process.env.FIREBASE_APP_ID || process.env.VITE_FIREBASE_APP_ID || "").trim(),
        firestoreDatabaseId: (process.env.FIREBASE_DATABASE_ID || process.env.VITE_FIREBASE_DATABASE_ID || "").trim() || "(default)"
      };
    }
    return null;
  }
  loadPersistentFirebaseEnv();
  app.get("/api/firebase-config", (_req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    const cfg = getRuntimeFirebaseConfig();
    res.json({
      configured: Boolean(cfg),
      config: cfg
    });
  });
  app.post("/api/firebase-config", rateLimitMiddleware(15), async (req, res) => {
    try {
      const existingCfg = getRuntimeFirebaseConfig();
      const user = await resolveRequestUser(req);
      const isAdminUser = Boolean(
        user && user.role === "admin" && isVerifiedAdminEmail(user.email, user.emailVerified)
      );
      if (existingCfg && existingCfg.projectId !== "rosy-logic-ckpr3" && !isAdminUser) {
        res.status(403).json({
          error: "Er is al een eigen Firebase-project gekoppeld. Log eerst in als beheerder om dit te wijzigen."
        });
        return;
      }
      const body = req.body || {};
      const apiKey = sanitizeServerString(body.apiKey, 120);
      const projectId = sanitizeServerString(body.projectId, 100);
      const authDomain = sanitizeServerString(body.authDomain, 160) || `${projectId}.firebaseapp.com`;
      const storageBucket = sanitizeServerString(body.storageBucket, 160) || `${projectId}.firebasestorage.app`;
      const messagingSenderId = sanitizeServerString(body.messagingSenderId, 80);
      const appId = sanitizeServerString(body.appId, 140);
      if (!apiKey.startsWith("AIza") || apiKey.length < 20) {
        res.status(400).json({
          error: "Ongeldige Firebase apiKey (moet beginnen met AIza...)."
        });
        return;
      }
      if (!/^[a-z0-9-]{4,64}$/i.test(projectId)) {
        res.status(400).json({
          error: "Ongeldig Firebase projectId."
        });
        return;
      }
      process.env.FIREBASE_API_KEY = apiKey;
      process.env.FIREBASE_PROJECT_ID = projectId;
      process.env.FIREBASE_AUTH_DOMAIN = authDomain;
      process.env.FIREBASE_STORAGE_BUCKET = storageBucket;
      process.env.FIREBASE_MESSAGING_SENDER_ID = messagingSenderId;
      process.env.FIREBASE_APP_ID = appId;
      process.env.VITE_FIREBASE_API_KEY = apiKey;
      process.env.VITE_FIREBASE_PROJECT_ID = projectId;
      process.env.VITE_FIREBASE_AUTH_DOMAIN = authDomain;
      process.env.VITE_FIREBASE_STORAGE_BUCKET = storageBucket;
      process.env.VITE_FIREBASE_MESSAGING_SENDER_ID = messagingSenderId;
      process.env.VITE_FIREBASE_APP_ID = appId;
      const envFileContent = [
        `export FIREBASE_API_KEY='${apiKey.replace(/'/g, "")}'`,
        `export FIREBASE_PROJECT_ID='${projectId.replace(/'/g, "")}'`,
        `export FIREBASE_AUTH_DOMAIN='${authDomain.replace(/'/g, "")}'`,
        `export FIREBASE_STORAGE_BUCKET='${storageBucket.replace(/'/g, "")}'`,
        `export FIREBASE_MESSAGING_SENDER_ID='${messagingSenderId.replace(/'/g, "")}'`,
        `export FIREBASE_APP_ID='${appId.replace(/'/g, "")}'`,
        ""
      ].join("\n");
      for (const targetDir of ["/data", "/var/lib/postgresql/data"]) {
        try {
          if (fs.existsSync(targetDir)) {
            fs.writeFileSync(path.join(targetDir, ".firebase_env"), envFileContent, {
              encoding: "utf8",
              mode: 420
            });
            fs.writeFileSync(
              path.join(targetDir, ".firebase-applet-config.json"),
              JSON.stringify(
                {
                  projectId,
                  appId,
                  apiKey,
                  authDomain,
                  storageBucket,
                  messagingSenderId,
                  firestoreDatabaseId: "(default)"
                },
                null,
                2
              ),
              "utf8"
            );
          }
        } catch {
        }
      }
      const updatedConfig = getRuntimeFirebaseConfig();
      res.json({
        ok: true,
        config: updatedConfig
      });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : "Kon Firebase-configuratie niet opslaan."
      });
    }
  });
  app.get("/api/version", (_req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    const scoreVersion = (verStr) => {
      const parts = String(verStr || "").trim().replace(/^v/i, "").split(".").map((n) => parseInt(n, 10));
      const major = Number.isFinite(parts[0]) ? parts[0] : 0;
      const minor = Number.isFinite(parts[1]) ? parts[1] : 0;
      const patch = Number.isFinite(parts[2]) ? parts[2] : 0;
      return major * 1e6 + minor * 1e3 + patch;
    };
    try {
      const persistentPath = "/data/.app_version.json";
      const repoVersionPath = path.join(__dirname, "src", "version.json");
      const pkgVersionPath = path.join(__dirname, "package.json");
      const candidates = [repoVersionPath, persistentPath, pkgVersionPath];
      let best = null;
      for (const versionPath of candidates) {
        if (fs.existsSync(versionPath)) {
          try {
            const parsed = JSON.parse(fs.readFileSync(versionPath, "utf8"));
            if (parsed && typeof parsed.version === "string" && parsed.version.trim()) {
              const candidateVer = parsed.version.trim().replace(/^v/i, "");
              if (!best || scoreVersion(candidateVer) > scoreVersion(best.version)) {
                best = {
                  version: candidateVer,
                  updatedAt: typeof parsed.updatedAt === "string" && parsed.updatedAt ? parsed.updatedAt : (/* @__PURE__ */ new Date()).toISOString(),
                  raw: parsed
                };
              }
            }
          } catch {
          }
        }
      }
      if (best) {
        if (fs.existsSync("/data") && best.raw) {
          try {
            const currentPersist = fs.existsSync(persistentPath) ? JSON.parse(fs.readFileSync(persistentPath, "utf8")) : null;
            if (!currentPersist || scoreVersion(currentPersist.version) < scoreVersion(best.version)) {
              fs.writeFileSync(persistentPath, JSON.stringify(best.raw, null, 2) + "\n", "utf8");
            }
          } catch {
          }
        }
        res.json({
          version: best.version,
          updatedAt: best.updatedAt
        });
        return;
      }
    } catch {
    }
    res.json({ version: "2.6.11", updatedAt: (/* @__PURE__ */ new Date()).toISOString() });
  });
  app.all("/api/*", (_req, res) => {
    res.status(404).json({ error: "API-eindpunt niet gevonden." });
  });
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    const indexPath = path.join(distPath, "index.html");
    const sendIndexHtml = (_req, res) => {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.sendFile(indexPath);
    };
    app.get(["/", "/index.html"], sendIndexHtml);
    app.use(
      express.static(distPath, {
        index: false,
        dotfiles: "deny",
        setHeaders: (res, filePath) => {
          const lower = filePath.toLowerCase();
          if (lower.endsWith(".webmanifest") || lower.endsWith("manifest.json")) {
            res.setHeader("Content-Type", "application/manifest+json; charset=utf-8");
            res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
          } else if (lower.endsWith("/sw.js") || lower.endsWith("/registersw.js") || /workbox-.*\.js$/i.test(lower)) {
            res.setHeader("Content-Type", "application/javascript; charset=utf-8");
            res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
          }
        }
      })
    );
    app.get("*", sendIndexHtml);
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[BierLog Server] Actief op http://0.0.0.0:${PORT}`);
  });
}
startServer().catch((err) => {
  console.error("[BierLog Server] Fatale fout bij opstarten:", err);
  process.exit(1);
});
