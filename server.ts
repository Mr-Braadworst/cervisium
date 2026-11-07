import 'dotenv/config';
import express from 'express';
import { execSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  requireAuth,
  requireAdmin,
  rateLimitMiddleware,
  authRateLimitMiddleware,
  resolveRequestUser,
  createSignedSessionToken,
  hashPassword,
  verifyPassword,
  sanitizeServerString,
  sanitizeServerImageUrl,
  sanitizeServerUserSettings,
  isValidServerId,
  isVerifiedAdminEmail,
} from './server/security';
import { centralDb } from './server/db';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Blokkeer directe HTTP-toegang tot serverbestanden, configuraties, .env, .git en broncode
// (laat Vite's interne /node_modules/.vite/ bundels en ES-module ?import requests wel door)
const BLOCKED_PATH_PATTERNS = [
  /(?:^|\/)\.(?:env|git|github|dockerignore|gitignore|npmrc|yarnrc|ssh|aws|htaccess|htpasswd|DS_Store)(?:\/|$|\.)/i,
  /^\/server(?:\.ts|\/|$)/i,
  /^\/firestore\.rules$/i,
  /^\/firebase-blueprint\.json$/i,
  /^\/package(?:-lock)?\.json$/i,
  /^\/tsconfig.*\.json$/i,
  /^\/dockerfile/i,
  /^\/docker-compose/i,
  /\.(?:env|pem|key|sql|bak|log|sh)$/i,
];

async function startServer() {
  await centralDb.init();

  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Beveiligingsheaders & pad-blokkade op elke request
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), payment=(), usb=()');

    const fullUrl = req.originalUrl || req.url || '';
    const rawPath = (req.path || fullUrl).split('?')[0];
    let decodedPath = rawPath;
    try {
      decodedPath = decodeURIComponent(rawPath);
    } catch {
      res.status(400).json({ error: 'Ongeldig URL-pad.' });
      return;
    }

    const isDirectFirebaseConfigRequest =
      decodedPath.toLowerCase() === '/firebase-applet-config.json' &&
      !fullUrl.includes('?import');

    if (
      decodedPath.includes('..') ||
      decodedPath.includes('\0') ||
      isDirectFirebaseConfigRequest ||
      BLOCKED_PATH_PATTERNS.some((rx) => rx.test(decodedPath))
    ) {
      res.status(403).json({ error: 'Toegang geweigerd.' });
      return;
    }

    if (decodedPath.startsWith('/api/')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');
    }

    next();
  });

  // JSON body-limiet van 150MB voor grote collecties en admin back-ups inclusief gecomprimeerde foto's
  app.use(express.json({ limit: '150mb' }));
  app.use('/api', rateLimitMiddleware(240));
  app.use('/api/auth', authRateLimitMiddleware(12, 15 * 60 * 1000));

  async function getServerSystemMetrics() {
    // 1. RAM meting op Linux via /proc/meminfo (MemAvailable houdt rekening met Linux disk cache/buffers, zoals free -h / htop)
    let ramTotalBytes = os.totalmem();
    let ramFreeBytes = os.freemem();
    let ramBuffersCachedBytes = 0;

    try {
      if (fs.existsSync('/proc/meminfo')) {
        const meminfo = fs.readFileSync('/proc/meminfo', 'utf8');
        const parseKb = (key: string): number | null => {
          const match = meminfo.match(new RegExp(`^${key}:\\s+(\\d+)\\s+kB`, 'm'));
          return match ? Number(match[1]) * 1024 : null;
        };
        const memTotal = parseKb('MemTotal');
        const memAvailable = parseKb('MemAvailable');
        const memFree = parseKb('MemFree');
        const buffers = parseKb('Buffers') || 0;
        const cached = parseKb('Cached') || 0;
        const sReclaimable = parseKb('SReclaimable') || 0;

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
      // Gebruik os.totalmem() / os.freemem() als fallback
    }

    const ramUsedBytes = Math.max(0, ramTotalBytes - ramFreeBytes);

    // Bereken RAM van alle processen in de container (Node.js + lokale database-processen)
    let appRamRssBytes = process.memoryUsage().rss;
    try {
      if (fs.existsSync('/proc')) {
        const entries = fs.readdirSync('/proc');
        let totalProcRss = 0;
        for (const entry of entries) {
          if (/^\d+$/.test(entry)) {
            try {
              const statusContent = fs.readFileSync(`/proc/${entry}/status`, 'utf8');
              const rssMatch = statusContent.match(/^VmRSS:\s+(\d+)\s+kB/m);
              if (rssMatch) {
                totalProcRss += Number(rssMatch[1]) * 1024;
              }
            } catch {
              // Proces kan inmiddels beëindigd zijn
            }
          }
        }
        if (totalProcRss >= appRamRssBytes) {
          appRamRssBytes = totalProcRss;
        }
      }
    } catch {
      // Fallback naar process.memoryUsage().rss
    }

    // 2. Schijfopslag (Disk) meting via fs.statfsSync over alle relevante mount-punten + df fallback
    let diskTotalBytes = 0;
    let diskFreeBytes = 0;
    let diskUsedBytes = 0;

    const candidatePaths = ['/var/lib/postgresql/data', '/data', '/app', '/'];
    for (const candidatePath of candidatePaths) {
      try {
        if (!fs.existsSync(candidatePath)) continue;
        const stat = fs.statfsSync(candidatePath);
        const blockSize = Number((stat as any).frsize || stat.bsize || 4096);
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
        // Probeer volgend pad
      }
    }

    if (diskTotalBytes <= 0) {
      try {
        const dfOut = execSync('df -kP / 2>/dev/null', { encoding: 'utf8', timeout: 1500 });
        const lines = dfOut.trim().split('\n');
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
        // Ignore df fallback errors
      }
    }

    // 3. Werkelijke database-opslag op schijf
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
      uptimeSeconds: Math.floor(os.uptime()),
    };
  }

  // ==========================================================================
  // 1. HEALTH & SERVER SYSTEEM-METINGEN ENDPOINTS (Systeemdata alleen voor Admin)
  // ==========================================================================
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/system/metrics', requireAdmin, async (_req, res) => {
    res.json({
      systemMetrics: await getServerSystemMetrics(),
    });
  });

  // ==========================================================================
  // 2. AUTHENTICATIE & SESSIE ENDPOINTS (Google OAuth Zonder Google DB + Cookies)
  // ==========================================================================

  /**
   * Directe Google Login endpoint (ondersteunt zowel standalone Google Identity Services
   * ZONDER Firebase/Firestore database als Firebase Google ID tokens) en slaat
   * het account direct op in de eigen Docker PostgreSQL database.
   */
  app.post('/api/auth/google', async (req, res) => {
    try {
      const { credential } = (req.body || {}) as { credential?: string };
      const authHeader = req.headers.authorization;
      const token =
        credential ||
        (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
          ? authHeader.slice(7).trim()
          : '');

      if (!token) {
        res.status(400).json({ error: 'Geen Google ID-token ontvangen.' });
        return;
      }

      const { verifyFirebaseIdToken } = await import('./server/security');
      const verifiedGoogleUser = await verifyFirebaseIdToken(token);
      if (!verifiedGoogleUser) {
        res.status(401).json({ error: 'Google ID-token verificatie mislukt.' });
        return;
      }

      const dbUser = await centralDb.upsertUser({
        id: verifiedGoogleUser.uid,
        email: verifiedGoogleUser.email,
        name: verifiedGoogleUser.name || 'Bierliefhebber',
        googleName: verifiedGoogleUser.name,
        role: verifiedGoogleUser.role,
        avatarUrl: verifiedGoogleUser.avatarUrl,
        lastActiveAt: new Date().toISOString(),
      });

      const signedCookieToken = createSignedSessionToken({
        uid: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        emailVerified: verifiedGoogleUser.emailVerified,
      });

      const isSecure = Boolean(req.secure || req.headers['x-forwarded-proto'] === 'https');
      res.setHeader(
        'Set-Cookie',
        `bierlog_session=${encodeURIComponent(signedCookieToken)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}${isSecure ? '; Secure' : ''}`
      );

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
          createdAt: dbUser.createdAt,
        },
        records,
      });
    } catch {
      res.status(500).json({ error: 'Kon Google-inlog niet verwerken op de server.' });
    }
  });

  /**
   * Directe Inlog / Registratie op de eigen Docker PostgreSQL-database (POST /api/auth/account).
   * Werkt op elk lokaal IP-adres (zoals http://<ubuntu-ip>:3000) én elk domein zonder dat een
   * externe Firebase/Google pop-up het domein hoeft te whitelisten.
   */
  app.post('/api/auth/account', async (req, res) => {
    try {
      const { email, password, name } = (req.body || {}) as {
        email?: string;
        password?: string;
        name?: string;
      };

      const cleanEmail = sanitizeServerString(email, 180).toLowerCase();
      if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        res.status(400).json({ error: 'Vul een geldig e-mailadres in.' });
        return;
      }

      if (typeof password !== 'string' || password.length < 8 || password.length > 256) {
        res.status(400).json({
          error: 'Wachtwoord moet minimaal 8 tekens lang zijn.',
        });
        return;
      }

      const existingUser = await centralDb.getUserByEmail(cleanEmail);
      let passwordHashToSave: string;

      // Blokkeer account-overname: als een beheerdersaccount of Google-account nog geen wachtwoord-hash heeft,
      // mag NIEMAND via dit onbevestigde formulier een wachtwoord op dat e-mailadres instellen.
      if (isVerifiedAdminEmail(cleanEmail, true) && (!existingUser || !existingUser.passwordHash)) {
        res.status(403).json({
          error:
            'Beheerdersaccounts zijn beveiligd en kunnen alleen inloggen via geverifieerde Google-authenticatie.',
        });
        return;
      }

      if (existingUser) {
        if (!existingUser.passwordHash) {
          res.status(403).json({
            error:
              'Dit e-mailadres is gekoppeld aan Google-inlog. Log in met de Google-knop of stel eerst ingelogd een wachtwoord in.',
          });
          return;
        }
        const isMatch = await verifyPassword(password, existingUser.passwordHash);
        if (!isMatch) {
          res.status(401).json({
            error: 'Onjuist e-mailadres of wachtwoord.',
          });
          return;
        }
        passwordHashToSave = existingUser.passwordHash;
      } else {
        passwordHashToSave = await hashPassword(password);
      }

      const derivedId =
        existingUser?.id ||
        `usr_${crypto.createHash('sha256').update(cleanEmail).digest('hex').slice(0, 24)}`;

      const defaultName =
        sanitizeServerString(name, 100) ||
        existingUser?.name ||
        cleanEmail
          .split('@')[0]
          .replace(/[._-]+/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase()) ||
        'Bierliefhebber';

      // Ken NOOIT automatisch admin-rechten toe bij onbevestigde e-mail/wachtwoord registratie
      const isVerifiedExistingAdmin = Boolean(
        existingUser &&
          existingUser.passwordHash &&
          existingUser.role === 'admin' &&
          isVerifiedAdminEmail(cleanEmail, true)
      );
      const role: 'admin' | 'user' = isVerifiedExistingAdmin ? 'admin' : 'user';

      const dbUser = await centralDb.upsertUser({
        id: derivedId,
        email: cleanEmail,
        name: defaultName,
        googleName: existingUser?.googleName || defaultName,
        role,
        passwordHash: passwordHashToSave,
        avatarUrl: existingUser?.avatarUrl,
        lastActiveAt: new Date().toISOString(),
      });

      const signedCookieToken = createSignedSessionToken({
        uid: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        emailVerified: isVerifiedExistingAdmin,
      });

      const isSecure = Boolean(req.secure || req.headers['x-forwarded-proto'] === 'https');
      res.setHeader(
        'Set-Cookie',
        `bierlog_session=${encodeURIComponent(signedCookieToken)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}${isSecure ? '; Secure' : ''}`
      );

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
          createdAt: dbUser.createdAt,
        },
        records,
      });
    } catch {
      res.status(500).json({
        error: 'Inloggen op de server is mislukt.',
      });
    }
  });

  app.post('/api/auth/session', async (req, res) => {
    try {
      const user = await resolveRequestUser(req);
      if (!user) {
        res.status(401).json({ error: 'Ongeldig authenticatietoken.' });
        return;
      }

      const dbUser = await centralDb.upsertUser({
        id: user.uid,
        email: user.email,
        name: user.name || 'Bierliefhebber',
        role: user.role,
        lastActiveAt: new Date().toISOString(),
      });

      const signedCookieToken = createSignedSessionToken({
        uid: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        emailVerified: user.emailVerified,
      });

      const isSecure = Boolean(req.secure || req.headers['x-forwarded-proto'] === 'https');
      res.setHeader(
        'Set-Cookie',
        `bierlog_session=${encodeURIComponent(signedCookieToken)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}${isSecure ? '; Secure' : ''}`
      );

      res.json({
        authenticated: true,
        user: {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          role: user.role,
          emailVerified: user.emailVerified,
        },
      });
    } catch {
      res.status(500).json({ error: 'Kon sessie niet initialiseren.' });
    }
  });

  app.post('/api/auth/logout', (_req, res) => {
    res.setHeader(
      'Set-Cookie',
      'bierlog_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'
    );
    res.json({ authenticated: false });
  });

  // Optioneel wachtwoord-hash endpoint / wachtwoord-instelling voor eigen domein accounts
  app.post('/api/auth/password/update', requireAuth, async (req, res) => {
    try {
      const authUser = req.authUser!;
      const { currentPassword, newPassword } = req.body as {
        currentPassword?: string;
        newPassword?: string;
      };

      if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
        res.status(400).json({
          error: 'Nieuw wachtwoord moet minimaal 8 tekens bevatten.',
        });
        return;
      }

      const existing = await centralDb.getUserById(authUser.uid);
      if (existing?.passwordHash) {
        const valid = await verifyPassword(currentPassword || '', existing.passwordHash);
        if (!valid) {
          res.status(403).json({ error: 'Huidig wachtwoord komt niet overeen.' });
          return;
        }
      }

      const passwordHash = await hashPassword(newPassword);
      await centralDb.upsertUser({
        id: authUser.uid,
        email: authUser.email,
        name: authUser.name,
        role: authUser.role,
        passwordHash,
      });

      res.json({ ok: true });
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Wachtwoord bijwerken mislukt.',
      });
    }
  });

  // ==========================================================================
  // 3. GEBRUIKERS-ENDPOINTS (Anti-IDOR: identiteit ALTIJD uit req.authUser.uid)
  // ==========================================================================
  app.get('/api/me', requireAuth, async (req, res) => {
    const authUser = req.authUser!;
    // Zorg dat eventuele eerdere accounts met hetzelfde e-mailadres direct worden samengevoegd
    const profile = await centralDb.upsertUser({
      id: authUser.uid,
      email: authUser.email,
      name: authUser.name || 'Bierliefhebber',
      role: authUser.role,
      lastActiveAt: new Date().toISOString(),
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
        createdAt: profile.createdAt,
      },
      records,
      foreignRecordIds,
    });
  });

  app.put('/api/me/profile', requireAuth, async (req, res) => {
    const authUser = req.authUser!;
    const body = (req.body || {}) as Record<string, unknown>;
    // Negeer elke eventuele body.userId of body.role om IDOR & privilege escalation te voorkomen
    const updated = await centralDb.upsertUser({
      id: authUser.uid,
      email: authUser.email,
      name: sanitizeServerString(body.name, 100, authUser.name || 'Bierliefhebber'),
      role: authUser.role,
      avatarUrl: sanitizeServerImageUrl(body.avatarUrl),
      settings: body.settings ? sanitizeServerUserSettings(body.settings) : undefined,
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
        createdAt: updated.createdAt,
      },
    });
  });

  app.post('/api/me/records/sync', requireAuth, async (req, res) => {
    try {
      const authUser = req.authUser!;
      const body = (req.body || {}) as Record<string, unknown>;
      await centralDb.syncUserCollections(
        authUser.uid,
        {
          categories: Array.isArray(body.categories) ? body.categories : undefined,
          beers: Array.isArray(body.beers) ? body.beers : undefined,
          tastings: Array.isArray(body.tastings) ? body.tastings : undefined,
          glasses: Array.isArray(body.glasses) ? body.glasses : undefined,
          pubDeals: Array.isArray(body.pubDeals) ? body.pubDeals : undefined,
          sessions: Array.isArray(body.sessions) ? body.sessions : undefined,
        },
        {
          email: authUser.email,
          name: authUser.name,
          role: authUser.role,
        }
      );
      res.json({ ok: true });
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Synchroniseren met database mislukt.',
      });
    }
  });

  // ==========================================================================
  // 3B. LIVE WEBSITE & ACTIE VERIFICATIE (SSRF-beveiligde server-side checker)
  // ==========================================================================
  function isSafePublicUrl(rawUrl: string): URL | null {
    try {
      const parsed = new URL(rawUrl.trim());
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
      const host = parsed.hostname.toLowerCase();
      if (
        !host ||
        host === 'localhost' ||
        host.endsWith('.local') ||
        host.endsWith('.internal') ||
        host.endsWith('.localhost') ||
        host === '0.0.0.0' ||
        host === '::1' ||
        host === '[::1]' ||
        /^127\./.test(host) ||
        /^10\./.test(host) ||
        /^192\.168\./.test(host) ||
        /^169\.254\./.test(host) ||
        /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
        /^0\./.test(host)
      ) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  function decodeHtmlEntities(input: string): string {
    return input
      .replace(/&#(\d+);/g, (_m, dec) => String.fromCharCode(Number(dec)))
      .replace(/&#x([0-9a-f]+);/gi, (_m, hex) => String.fromCharCode(parseInt(hex, 16)))
      .replace(/&amp;/gi, '&')
      .replace(/&ndash;|&#8211;/gi, '–')
      .replace(/&mdash;|&#8212;/gi, '—')
      .replace(/&rsquo;|&lsquo;|&#8217;|&#8216;/gi, "'")
      .replace(/&ldquo;|&rdquo;|&#8220;|&#8221;|&quot;/gi, '"')
      .replace(/&euro;/gi, '€')
      .replace(/&nbsp;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  app.post('/api/deals/verify-url', async (req, res) => {
    try {
      const { url, dealTitle = '', beerBrand = '', pubName = '' } = (req.body || {}) as {
        url?: string;
        dealTitle?: string;
        beerBrand?: string;
        pubName?: string;
      };

      if (!url || typeof url !== 'string') {
        res.status(400).json({ verified: false, error: 'Geen geldige URL opgegeven.' });
        return;
      }

      const safeTarget = isSafePublicUrl(url);
      if (!safeTarget) {
        res.status(400).json({ verified: false, error: 'Ongeldige of niet-publieke URL.' });
        return;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 7500);

      let fetchRes: globalThis.Response;
      try {
        fetchRes = await fetch(safeTarget.href, {
          method: 'GET',
          redirect: 'follow',
          signal: controller.signal,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'nl-NL,nl;q=0.9,en;q=0.8',
          },
        });
      } finally {
        clearTimeout(timeout);
      }

      const finalSafe = isSafePublicUrl(fetchRes.url || safeTarget.href);
      if (!finalSafe) {
        res.status(400).json({ verified: false, error: 'Redirect naar niet-publieke URL geblokkeerd.' });
        return;
      }

      const rawHtml = (await fetchRes.text()).slice(0, 350_000);
      const rawTitle =
        rawHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ||
        rawHtml.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
        '';
      const pageTitle = sanitizeServerString(decodeHtmlEntities(rawTitle), 150, finalSafe.hostname);

      const metaDesc =
        rawHtml.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
        rawHtml.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
        '';

      // Verwijder scripts, styles, nav en tags voor schone paginatekst
      const cleanBlocks = rawHtml
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
        .replace(/<\/(p|div|h1|h2|h3|h4|li|tr|section|article)>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .split('\n')
        .map((line) => decodeHtmlEntities(line))
        .filter((line) => line.length >= 25 && line.length <= 420);

      const fullTextLower = `${pageTitle} ${decodeHtmlEntities(metaDesc)} ${cleanBlocks.join(' ')}`.toLowerCase();

      // Controleer op domein-te-koop of 404 pagina's die toch HTTP 200 sturen
      const isFake200 =
        /domain for sale|domein te koop|pagina niet gevonden|page not found|404 not found/i.test(pageTitle);

      const candidateTerms = [
        'proeverij',
        'proeflokaal',
        'rondleiding',
        'arrangement',
        'bierproeverij',
        'high beer',
        'proefplank',
        'glas',
        '4-pack',
        'bierpakket',
        'proefbox',
        'taptafel',
        'taproom',
        'brewpub',
        'borrel',
        'speciaalbier',
        'wisseltap',
        'tap',
        'bieren',
        'brouwerij',
        'actie',
        'korting',
        'events',
      ];

      // Voeg specifieke woorden uit de dealTitle / beerBrand / pubName toe
      const customWords = `${dealTitle} ${beerBrand} ${pubName}`
        .toLowerCase()
        .replace(/[^a-z0-9à-ÿ\s-]/gi, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 4 && !['voor', 'naar', 'bij', 'met', 'van', 'een', 'het', 'alle', 'gratis'].includes(w));

      const matchedKeywords: string[] = [];
      for (const term of [...new Set([...customWords, ...candidateTerms])]) {
        if (fullTextLower.includes(term.toLowerCase())) {
          matchedKeywords.push(term);
        }
        if (matchedKeywords.length >= 6) break;
      }

      // Zoek de beste zin op de pagina die het meeste bewijs bevat
      const dealKeywords = [
        'proeverij',
        'rondleiding',
        'arrangement',
        'glas',
        'pakket',
        'proefbox',
        'taptafel',
        'taproom',
        'brewpub',
        'proeflokaal',
        'speciaalbier',
        'borrel',
        'tap',
        '€',
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
        checkedAt: new Date().toISOString().split('T')[0],
      });
    } catch (err) {
      res.status(200).json({
        verified: false,
        httpStatus: 0,
        error: err instanceof Error ? err.message : 'Website kon niet live worden bereikt.',
        checkedAt: new Date().toISOString().split('T')[0],
      });
    }
  });

  // ==========================================================================
  // 4. SERVER-SIDE VERGRENDELDE ADMIN ENDPOINTS (requireAdmin middleware)
  // ==========================================================================
  app.get('/api/admin/verify', requireAdmin, async (req, res) => {
    res.json({
      authorized: true,
      admin: {
        uid: req.authUser!.uid,
        email: req.authUser!.email,
        role: req.authUser!.role,
      },
      systemMetrics: await getServerSystemMetrics(),
    });
  });

  app.get('/api/admin/metrics', requireAdmin, async (_req, res) => {
    res.json({
      systemMetrics: await getServerSystemMetrics(),
    });
  });

  app.put('/api/admin/users/:userId', requireAdmin, async (req, res) => {
    try {
      const targetUserId = req.params.userId;
      if (!isValidServerId(targetUserId)) {
        res.status(400).json({ error: 'Ongeldig gebruikers-ID.' });
        return;
      }
      const { name, email } = (req.body || {}) as { name?: string; email?: string };
      const existing = await centralDb.getUserById(targetUserId);
      const updated = await centralDb.upsertUser({
        id: targetUserId,
        email: sanitizeServerString(email, 180, existing?.email || ''),
        name: sanitizeServerString(name, 100, existing?.name || 'Bierliefhebber'),
        role: existing?.role === 'admin' ? 'admin' : 'user',
        avatarUrl: existing?.avatarUrl,
      });
      res.json({
        ok: true,
        user: {
          id: updated.id,
          email: updated.email,
          name: updated.name,
          role: updated.role,
          avatarUrl: updated.avatarUrl,
        },
      });
    } catch {
      res.status(400).json({
        error: 'Kon gebruiker niet bijwerken.',
      });
    }
  });

  app.get('/api/admin/export', requireAdmin, async (req, res) => {
    try {
      const payload = await centralDb.exportAllData(req.authUser!.email);
      res.json({
        ...payload,
        systemMetrics: await getServerSystemMetrics(),
      });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Kon gegevens niet exporteren.',
      });
    }
  });

  app.post('/api/admin/import', requireAdmin, async (req, res) => {
    try {
      const { payload, skipDuplicates = true } = (req.body || {}) as {
        payload?: unknown;
        skipDuplicates?: boolean;
      };
      const result = await centralDb.importAllData(payload || req.body, {
        skipDuplicates: Boolean(skipDuplicates),
      });
      res.json({
        ok: true,
        summary: result,
      });
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Importeren van admin-data mislukt.',
      });
    }
  });

  // ==========================================================================
  // 5. FRONTEND SERVERING (Vite middleware in dev, statische dist/ in prod)
  // ==========================================================================
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath, { index: false, dotfiles: 'deny' }));
    app.get('*', (_req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      const runtimeApiKey = (
        process.env.FIREBASE_API_KEY ||
        process.env.VITE_FIREBASE_API_KEY ||
        ''
      ).trim();
      const runtimeProjectId = (
        process.env.FIREBASE_PROJECT_ID ||
        process.env.VITE_FIREBASE_PROJECT_ID ||
        ''
      ).trim();

      if (
        runtimeApiKey &&
        runtimeApiKey !== 'YOUR_FIREBASE_WEB_API_KEY' &&
        runtimeProjectId &&
        runtimeProjectId !== 'your-project-id'
      ) {
        try {
          const rawHtml = fs.readFileSync(indexPath, 'utf8');
          const runtimeConfig = {
            apiKey: runtimeApiKey,
            authDomain:
              (process.env.FIREBASE_AUTH_DOMAIN || process.env.VITE_FIREBASE_AUTH_DOMAIN || '').trim() ||
              `${runtimeProjectId}.firebaseapp.com`,
            projectId: runtimeProjectId,
            storageBucket:
              (process.env.FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET || '').trim() ||
              `${runtimeProjectId}.firebasestorage.app`,
            messagingSenderId: (
              process.env.FIREBASE_MESSAGING_SENDER_ID ||
              process.env.VITE_FIREBASE_MESSAGING_SENDER_ID ||
              ''
            ).trim(),
            appId: (process.env.FIREBASE_APP_ID || process.env.VITE_FIREBASE_APP_ID || '').trim(),
            firestoreDatabaseId:
              (process.env.FIREBASE_DATABASE_ID || process.env.VITE_FIREBASE_DATABASE_ID || '').trim() ||
              '(default)',
          };
          const safeJson = JSON.stringify(runtimeConfig)
            .replace(/</g, '\\u003c')
            .replace(/>/g, '\\u003e')
            .replace(/&/g, '\\u0026')
            .replace(/\u2028/g, '\\u2028')
            .replace(/\u2029/g, '\\u2029');
          const scriptTag = `<script>window.__BIERLOG_FIREBASE_CONFIG__=${safeJson};</script>`;
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.send(rawHtml.replace('<head>', `<head>${scriptTag}`));
          return;
        } catch {
          // Fallback naar standaard index.html
        }
      }

      res.sendFile(indexPath);
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[BierLog Server] Actief op http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[BierLog Server] Fatale fout bij opstarten:', err);
  process.exit(1);
});
