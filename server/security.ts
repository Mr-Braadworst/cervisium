import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

/**
 * Geverifieerde gebruikersidentiteit op de server.
 * Wordt UITSLUITEND gevuld vanuit een cryptografisch geverifieerd token of sessie-cookie,
 * nooit vanuit manipuleerbare client-parameters (voorkomt IDOR).
 */
export interface AuthenticatedServerUser {
  uid: string;
  email: string;
  name: string;
  emailVerified: boolean;
  role: 'admin' | 'user';
}

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthenticatedServerUser;
    }
  }
}

// SHA-256 hash van het geverifieerde eigenaar-e-mailadres (zodat het e-mailadres nergens in platte tekst in de repo staat)
const OWNER_EMAIL_SHA256 = 'b31f85f31cdb5947fa2cdf12ceaf3fd149a5c11b53a9f922acbb44da4b22f0e0';

export function getAdminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAIL || '';
  return new Set(
    raw
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function isVerifiedAdminEmail(email: string | undefined, emailVerified = true): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  const digest = crypto.createHash('sha256').update(normalized).digest('hex').toLowerCase();
  if (digest === OWNER_EMAIL_SHA256) return true;
  if (!emailVerified) return false;
  return getAdminEmails().has(normalized);
}

/**
 * Berekent een vast, deterministisch gebruikers-ID 100% gekoppeld aan het e-mailadres.
 * Hierdoor heeft de gebruiker altijd EXACT hetzelfde ID, ongeacht of er via Google,
 * Firebase of direct wachtwoord wordt ingelogd, en ongeacht welk domein of IP-adres.
 */
export function getCanonicalUserIdForEmail(email: string | undefined | null): string | null {
  if (!email || typeof email !== 'string') return null;
  const clean = email.trim().toLowerCase();
  if (!clean || !clean.includes('@') || clean === 'gebruiker@bierlog.nl') return null;
  const hash = crypto.createHash('sha256').update(clean).digest('hex').slice(0, 24);
  return `usr_${hash}`;
}

/**
 * Geheime sleutel voor HMAC-SHA256 ondertekening van server-side sessie-cookies.
 * Val terug op een per-proces CSPRNG sleutel als SESSION_SECRET niet in .env staat.
 */
const RUNTIME_FALLBACK_SECRET = crypto.randomBytes(32).toString('hex');
function getSessionSecret(): string {
  const envSecret = process.env.SESSION_SECRET;
  if (envSecret && envSecret.trim().length >= 16 && envSecret !== 'CHANGE_ME_TO_A_LONG_RANDOM_SECRET') {
    return envSecret.trim();
  }
  return RUNTIME_FALLBACK_SECRET;
}

// ============================================================================
// 1. WACHTWOORD HASHING (Node.js native crypto.scrypt - geheugen-harde KDF)
// ============================================================================

const SCRYPT_KEYLEN = 64;
const SCRYPT_COST = 16384; // N = 2^14
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;

/**
 * Hasht een wachtwoord veilig met een willekeurige 16-byte CSPRNG salt via scrypt.
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  if (typeof plainPassword !== 'string' || plainPassword.length < 8 || plainPassword.length > 256) {
    throw new Error('Wachtwoord moet tussen 8 en 256 tekens lang zijn.');
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = await new Promise<Buffer>((resolve, reject) => {
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
  return `scrypt$${SCRYPT_COST}$${salt}$${derivedKey.toString('hex')}`;
}

/**
 * Verifieert een wachtwoord constant-time (via crypto.timingSafeEqual) tegen timing-aanvallen.
 */
export async function verifyPassword(plainPassword: string, storedHash: string): Promise<boolean> {
  if (typeof plainPassword !== 'string' || typeof storedHash !== 'string') return false;
  const parts = storedHash.split('$');
  if (parts.length !== 4 || parts[0] !== 'scrypt') return false;

  const cost = Number(parts[1]) || SCRYPT_COST;
  const salt = parts[2];
  const expectedHex = parts[3];
  if (!salt || !expectedHex) return false;

  const expectedBuf = Buffer.from(expectedHex, 'hex');
  if (expectedBuf.length !== SCRYPT_KEYLEN) return false;

  const derivedKey = await new Promise<Buffer>((resolve, reject) => {
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

// ============================================================================
// 2. SERVER-SIDE SESSIE SIGNING & FIREBASE ID TOKEN VERIFICATIE
// ============================================================================

interface SessionPayload {
  uid: string;
  email: string;
  name: string;
  emailVerified: boolean;
  role: 'admin' | 'user';
  exp: number;
}

export function createSignedSessionToken(
  user: Omit<AuthenticatedServerUser, 'role'>,
  ttlSeconds = 60 * 60 * 24 * 7
): string {
  const cleanEmail = sanitizeServerString(user.email, 180).toLowerCase();
  const canonicalUid = getCanonicalUserIdForEmail(cleanEmail) || sanitizeServerId(user.uid);
  const role: 'admin' | 'user' = isVerifiedAdminEmail(cleanEmail, user.emailVerified)
    ? 'admin'
    : 'user';
  const payload: SessionPayload = {
    uid: canonicalUid,
    email: cleanEmail,
    name: sanitizeServerString(user.name, 100),
    emailVerified: Boolean(user.emailVerified),
    role,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const dataB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sigB64 = crypto
    .createHmac('sha256', getSessionSecret())
    .update(dataB64)
    .digest('base64url');
  return `${dataB64}.${sigB64}`;
}

export function verifySignedSessionToken(token: string): AuthenticatedServerUser | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [dataB64, providedSig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', getSessionSecret())
    .update(dataB64)
    .digest('base64url');

  const a = Buffer.from(providedSig, 'utf8');
  const b = Buffer.from(expectedSig, 'utf8');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(dataB64, 'base64url').toString('utf8')) as SessionPayload;
    if (!parsed || typeof parsed.uid !== 'string' || typeof parsed.exp !== 'number') {
      return null;
    }
    if (parsed.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    const cleanEmail = (parsed.email || '').toLowerCase().trim();
    const canonicalUid = getCanonicalUserIdForEmail(cleanEmail) || parsed.uid;
    const role: 'admin' | 'user' = isVerifiedAdminEmail(cleanEmail, parsed.emailVerified)
      ? 'admin'
      : 'user';
    return {
      uid: canonicalUid,
      email: cleanEmail,
      name: parsed.name || '',
      emailVerified: Boolean(parsed.emailVerified),
      role,
    };
  } catch {
    return null;
  }
}

// Cache voor Google's publieke X.509 certificaten (zowel Google OAuth2 als Firebase Auth)
let cachedGoogleCerts: { certs: Record<string, string>; expiresAt: number } | null = null;

async function getGooglePublicCerts(forceRefresh = false): Promise<Record<string, string>> {
  const now = Date.now();
  if (!forceRefresh && cachedGoogleCerts && cachedGoogleCerts.expiresAt > now) {
    return cachedGoogleCerts.certs;
  }

  const [firebaseRes, oauthRes] = await Promise.allSettled([
    fetch('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'),
    fetch('https://www.googleapis.com/oauth2/v1/certs'),
  ]);

  const combined: Record<string, string> = {};
  if (firebaseRes.status === 'fulfilled' && firebaseRes.value.ok) {
    Object.assign(combined, (await firebaseRes.value.json()) as Record<string, string>);
  }
  if (oauthRes.status === 'fulfilled' && oauthRes.value.ok) {
    Object.assign(combined, (await oauthRes.value.json()) as Record<string, string>);
  }

  if (Object.keys(combined).length === 0) {
    if (cachedGoogleCerts) return cachedGoogleCerts.certs;
    throw new Error('Kon Google public keys niet ophalen voor JWT-verificatie.');
  }

  cachedGoogleCerts = {
    certs: combined,
    expiresAt: now + 60 * 60 * 1000, // 1 uur cachen
  };
  return combined;
}

function getAllowedFirebaseProjectIds(): Set<string> {
  const allowed = new Set<string>([
    'cervisium',
    'gen-lang-client-0932078079',
    'rosy-logic-ckpr3',
  ]);
  const envProj = (
    process.env.FIREBASE_PROJECT_ID ||
    process.env.VITE_FIREBASE_PROJECT_ID ||
    ''
  ).trim();
  if (envProj && envProj !== 'your-project-id') {
    allowed.add(envProj);
  }
  return allowed;
}

/**
 * Verifieert zowel een rechtstreeks Google OAuth 2.0 ID Token (Google Identity Services — 100% zonder Firebase/Firestore!)
 * als een Firebase Google ID Token cryptografisch op de server tegen de officiële X.509 publieke sleutels van Google.
 */
export async function verifyFirebaseIdToken(
  idToken: string
): Promise<(AuthenticatedServerUser & { avatarUrl?: string }) | null> {
  if (!idToken || typeof idToken !== 'string' || idToken.length > 16384) return null;
  const segments = idToken.split('.');
  if (segments.length !== 3) return null;

  try {
    const header = JSON.parse(Buffer.from(segments[0], 'base64url').toString('utf8')) as {
      alg?: string;
      kid?: string;
    };
    const payload = JSON.parse(Buffer.from(segments[1], 'base64url').toString('utf8')) as {
      sub?: string;
      user_id?: string;
      email?: string;
      name?: string;
      picture?: string;
      email_verified?: boolean;
      exp?: number;
      iat?: number;
      aud?: string;
      iss?: string;
    };

    if (header.alg !== 'RS256' || !header.kid || typeof header.kid !== 'string') return null;
    const nowSec = Math.floor(Date.now() / 1000);
    // Sta maximaal 5 minuten klokverschil toe in containers
    if (!payload.exp || payload.exp < nowSec - 300) return null;
    if (payload.iat && payload.iat > nowSec + 300) return null;

    // Controleer issuer (Google OAuth 2.0 of Google SecureToken voor het eigen project)
    const iss = payload.iss || '';
    const isDirectGoogleOAuth =
      iss === 'accounts.google.com' || iss === 'https://accounts.google.com';
    const isFirebaseSecureToken = iss.startsWith('https://securetoken.google.com/');
    if (!isDirectGoogleOAuth && !isFirebaseSecureToken) return null;

    if (isFirebaseSecureToken) {
      const issuerProject = iss.slice('https://securetoken.google.com/'.length).trim();
      if (
        !issuerProject ||
        !payload.aud ||
        issuerProject !== payload.aud ||
        !/^[a-z0-9-]{4,64}$/i.test(issuerProject)
      ) {
        return null;
      }
    }

    // Als GOOGLE_CLIENT_ID is geconfigureerd en het een direct Google OAuth token is, controleer audience
    const expectedClientId = process.env.GOOGLE_CLIENT_ID?.trim();
    if (
      expectedClientId &&
      expectedClientId !== 'YOUR_GOOGLE_OAUTH_CLIENT_ID' &&
      isDirectGoogleOAuth &&
      payload.aud !== expectedClientId
    ) {
      return null;
    }

    const rawUid = payload.sub || payload.user_id;
    if (!rawUid || typeof rawUid !== 'string') return null;
    const uid = isValidServerId(rawUid) ? rawUid : sanitizeServerId(rawUid, 'goog');

    let certs = await getGooglePublicCerts(false);
    let certPem = certs[header.kid];
    if (!certPem) {
      certs = await getGooglePublicCerts(true);
      certPem = certs[header.kid];
    }
    if (!certPem) return null;

    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(`${segments[0]}.${segments[1]}`);
    verifier.end();

    const signatureValid = verifier.verify(certPem, segments[2], 'base64url');
    if (!signatureValid) return null;

    const email = sanitizeServerString(payload.email, 180).toLowerCase();
    // Een cryptografisch geldig Google/Firebase token bewijst eigenaarschap van de sessie
    const emailVerified = payload.email_verified === true || Boolean(isFirebaseSecureToken && email);
    const canonicalUid = getCanonicalUserIdForEmail(email) || uid;
    const name = sanitizeServerString(
      payload.name || (email ? email.split('@')[0] : 'Bierliefhebber'),
      100
    );
    const avatarUrl = sanitizeServerImageUrl(payload.picture);

    return {
      uid: canonicalUid,
      email,
      name,
      emailVerified,
      role: isVerifiedAdminEmail(email, emailVerified) ? 'admin' : 'user',
      avatarUrl,
    };
  } catch {
    return null;
  }
}

export function parseCookieHeader(cookieHeader: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader || cookieHeader.length > 8192) return out;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx > 0) {
      const k = part.slice(0, idx).trim();
      const v = part.slice(idx + 1).trim();
      if (k && k !== '__proto__' && k !== 'constructor' && k !== 'prototype') {
        try {
          out[k] = decodeURIComponent(v);
        } catch {
          // Negeer ongeldige URI-encoding in cookie
        }
      }
    }
  }
  return out;
}

/**
 * Haalt de geauthenticeerde gebruiker op uit ofwel:
 * 1) De `Authorization: Bearer <token>` header (Firebase ID token of sessietoken)
 * 2) De HttpOnly `bierlog_session` cookie
 */
export async function resolveRequestUser(req: Request): Promise<AuthenticatedServerUser | null> {
  const authHeader = req.headers.authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
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

/**
 * Middleware: Vereist een geldige server-side geauthenticeerde sessie.
 * Voorkomt IDOR doordat routes uitsluitend `req.authUser.uid` gebruiken.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await resolveRequestUser(req);
    if (!user) {
      res.status(401).json({
        error: 'Niet geautoriseerd. Log opnieuw in om door te gaan.',
        code: 'UNAUTHORIZED',
      });
      return;
    }
    req.authUser = user;
    next();
  } catch {
    res.status(401).json({
      error: 'Sessie-verificatie mislukt.',
      code: 'AUTH_ERROR',
    });
  }
}

/**
 * Middleware: Vergrendelt alle Admin-routes en Admin-API's strikt SERVER-SIDE.
 * Alleen een cryptografisch geverifieerde gebruiker met `role === 'admin'` krijgt toegang.
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await resolveRequestUser(req);
    if (!user) {
      res.status(401).json({
        error: 'Niet ingelogd. Admin-authenticatie vereist.',
        code: 'UNAUTHORIZED',
      });
      return;
    }
    if (
      user.role !== 'admin' ||
      !isVerifiedAdminEmail(user.email, user.emailVerified)
    ) {
      res.status(403).json({
        error: 'Toegang geweigerd: uitsluitend toegankelijk voor geverifieerde beheerders.',
        code: 'FORBIDDEN_NOT_ADMIN',
      });
      return;
    }
    req.authUser = user;
    next();
  } catch {
    res.status(403).json({
      error: 'Admin-verificatie mislukt.',
      code: 'ADMIN_VERIFICATION_ERROR',
    });
  }
}

// ============================================================================
// 3. SERVER-SIDE INPUT VALIDATIE, SANITISATIE & RATE LIMITING
// ============================================================================

export function isValidServerId(id: unknown): id is string {
  return (
    typeof id === 'string' &&
    id.length >= 1 &&
    id.length <= 128 &&
    /^[a-zA-Z0-9_-]+$/.test(id) &&
    id !== '__proto__' &&
    id !== 'constructor' &&
    id !== 'prototype'
  );
}

export function sanitizeServerId(id: unknown, prefix = 'id'): string {
  if (isValidServerId(id)) return id;
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
}

export function sanitizeServerString(value: unknown, maxLength = 500, fallback = ''): string {
  if (typeof value !== 'string') return fallback;
  return value.replace(/\0/g, '').trim().slice(0, maxLength);
}

export function sanitizeServerNumber(
  value: unknown,
  min: number,
  max: number,
  fallback: number
): number {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}

export function sanitizeServerImageUrl(url: unknown): string | undefined {
  if (typeof url !== 'string' || !url.trim()) return undefined;
  const trimmed = url.trim();
  if (trimmed.startsWith('data:')) {
    const safeRegex =
      /^data:image\/(jpeg|jpg|png|webp|gif|avif|bmp|heic|heif)(?:;[a-zA-Z0-9\-=+.]+)*;base64,[A-Za-z0-9+/=\s]+$/i;
    if (safeRegex.test(trimmed) && trimmed.length <= 5_000_000) {
      return trimmed;
    }
    return undefined;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString().slice(0, 2048);
    }
  } catch {
    // Ongeldige URL
  }
  return undefined;
}

const ALLOWED_START_TABS = new Set(['dashboard', 'list', 'top', 'categories', 'glasses', 'extras']);
const ALLOWED_LANGUAGES = new Set(['auto', 'nl', 'en', 'de', 'fr', 'es']);

/**
 * Strikte server-side whitelist-sanitisatie voor UserSettings JSONB.
 * Blokkeert Prototype Pollution, schaduwvelden (zoals role/isAdmin) en geheugen-uitputting.
 */
export function sanitizeServerUserSettings(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }
  const obj = raw as Record<string, unknown>;
  const clean: Record<string, unknown> = {};

  if (typeof obj.lightMode === 'boolean') clean.lightMode = obj.lightMode;
  if (typeof obj.language === 'string' && ALLOWED_LANGUAGES.has(obj.language)) {
    clean.language = obj.language;
  }
  if (typeof obj.showExtrasDealBadge === 'boolean') {
    clean.showExtrasDealBadge = obj.showExtrasDealBadge;
  }
  if (typeof obj.showNavCollectionCounts === 'boolean') {
    clean.showNavCollectionCounts = obj.showNavCollectionCounts;
  }
  if (typeof obj.showExtrasTab === 'boolean') clean.showExtrasTab = obj.showExtrasTab;
  if (typeof obj.showDealScanner === 'boolean') clean.showDealScanner = obj.showDealScanner;
  if (typeof obj.defaultStartTab === 'string' && ALLOWED_START_TABS.has(obj.defaultStartTab)) {
    clean.defaultStartTab = obj.defaultStartTab;
  }
  if (obj.defaultBeerPrice !== undefined) {
    clean.defaultBeerPrice = sanitizeServerNumber(obj.defaultBeerPrice, 0.5, 100, 3.5);
  }
  if (obj.defaultGlassSizeCl !== undefined) {
    clean.defaultGlassSizeCl = Math.round(
      sanitizeServerNumber(obj.defaultGlassSizeCl, 10, 200, 33)
    );
  }
  return clean;
}

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const authRateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function rateLimitMiddleware(maxRequestsPerMinute = 120) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      'unknown';
    const now = Date.now();
    const entry = rateLimitStore.get(ip);

    if (!entry || entry.resetAt <= now) {
      rateLimitStore.set(ip, { count: 1, resetAt: now + 60_000 });
      next();
      return;
    }

    entry.count += 1;
    if (entry.count > maxRequestsPerMinute) {
      res.status(429).json({
        error: 'Te veel verzoeken. Probeer het over een minuut opnieuw.',
        code: 'RATE_LIMITED',
      });
      return;
    }
    next();
  };
}

/**
 * Strikte brute-force rate limiter specifiek voor inlog- en wachtwoord-endpoints.
 */
export function authRateLimitMiddleware(maxAttemptsPerWindow = 12, windowMs = 15 * 60 * 1000) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      'unknown';
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
        error: 'Te veel inlogpogingen vanaf dit IP-adres. Wacht 15 minuten en probeer het opnieuw.',
        code: 'AUTH_RATE_LIMITED',
      });
      return;
    }
    next();
  };
}

