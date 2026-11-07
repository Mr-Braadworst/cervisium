import 'dotenv/config';
import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  requireAuth,
  requireAdmin,
  rateLimitMiddleware,
  resolveRequestUser,
  createSignedSessionToken,
  hashPassword,
  verifyPassword,
  sanitizeServerString,
  sanitizeServerImageUrl,
  isVerifiedAdminEmail,
} from './server/security';
import { centralDb } from './server/db';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  await centralDb.init();

  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Beveiligingsheaders op elke response
  app.disable('x-powered-by');
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    next();
  });

  // JSON body-limiet van 50MB voor admin back-ups inclusief gecomprimeerde foto's
  app.use(express.json({ limit: '50mb' }));
  app.use('/api', rateLimitMiddleware(180));

  // ==========================================================================
  // 1. HEALTH & DATABASE STATUS ENDPOINT (Geen gevoelige sleutels)
  // ==========================================================================
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      postgresConnected: centralDb.isPostgresConfigured(),
      timestamp: new Date().toISOString(),
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

      if (existingUser && existingUser.passwordHash) {
        const isMatch = await verifyPassword(password, existingUser.passwordHash);
        if (!isMatch) {
          res.status(401).json({
            error: 'Onjuist wachtwoord voor dit e-mailadres.',
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

      const role: 'admin' | 'user' = isVerifiedAdminEmail(cleanEmail, true) ? 'admin' : 'user';

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
        emailVerified: true,
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
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Inloggen op de server is mislukt.',
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
      settings:
        body.settings && typeof body.settings === 'object'
          ? (body.settings as Record<string, unknown>)
          : undefined,
    });
    res.json({ user: updated });
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
  // 4. SERVER-SIDE VERGRENDELDE ADMIN ENDPOINTS (requireAdmin middleware)
  // ==========================================================================
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

    // Bereken RAM van alle processen in de container (Node.js + eventuele lokale database-processen)
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

    // 2. Schijfopslag (Disk) meting via fs.statfsSync op /data (of /)
    let diskTotalBytes = 0;
    let diskFreeBytes = 0;
    let diskUsedBytes = 0;
    try {
      const targetPath = fs.existsSync('/data') ? '/data' : '/';
      const stat = fs.statfsSync(targetPath);
      const blockSize = Number((stat as any).frsize || stat.bsize || 4096);
      const totalBlocks = Number(stat.blocks);
      const freeBlocks = Number(stat.bfree);
      const availBlocks = Number(stat.bavail);

      diskTotalBytes = totalBlocks * blockSize;
      diskFreeBytes = availBlocks * blockSize;
      // Werkelijk gebruikte schijfruimte zoals gerapporteerd door Linux `df`
      diskUsedBytes = Math.max(0, (totalBlocks - freeBlocks) * blockSize);
    } catch {
      // Fallback indien statfsSync niet beschikbaar is
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
      const { name, email } = (req.body || {}) as { name?: string; email?: string };
      const existing = await centralDb.getUserById(targetUserId);
      const updated = await centralDb.upsertUser({
        id: targetUserId,
        email: sanitizeServerString(email, 180, existing?.email || ''),
        name: sanitizeServerString(name, 100, existing?.name || 'Bierliefhebber'),
        role: existing?.role,
        avatarUrl: existing?.avatarUrl,
      });
      res.json({ ok: true, user: updated });
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Kon gebruiker niet bijwerken.',
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
    app.use(express.static(distPath, { index: false }));
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
          const scriptTag = `<script>window.__BIERLOG_FIREBASE_CONFIG__=${JSON.stringify(runtimeConfig)};</script>`;
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
