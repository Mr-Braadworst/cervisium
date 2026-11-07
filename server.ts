import 'dotenv/config';
import express from 'express';
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

      const isSecure = process.env.NODE_ENV === 'production';
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

      const isSecure = process.env.NODE_ENV === 'production';
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
    const profile = await centralDb.getUserById(authUser.uid);
    const records = await centralDb.getUserRecords(authUser.uid);
    res.json({
      user: {
        id: authUser.uid,
        email: authUser.email,
        name: profile?.name || authUser.name,
        role: authUser.role,
        avatarUrl: profile?.avatarUrl,
        settings: profile?.settings || {},
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
      await centralDb.syncUserCollections(authUser.uid, {
        categories: Array.isArray(body.categories) ? body.categories : undefined,
        beers: Array.isArray(body.beers) ? body.beers : undefined,
        tastings: Array.isArray(body.tastings) ? body.tastings : undefined,
        glasses: Array.isArray(body.glasses) ? body.glasses : undefined,
        pubDeals: Array.isArray(body.pubDeals) ? body.pubDeals : undefined,
        sessions: Array.isArray(body.sessions) ? body.sessions : undefined,
      });
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
  app.get('/api/admin/verify', requireAdmin, (req, res) => {
    res.json({
      authorized: true,
      admin: {
        uid: req.authUser!.uid,
        email: req.authUser!.email,
        role: req.authUser!.role,
      },
      databaseEngine: centralDb.isPostgresConfigured() ? 'postgresql' : 'firestore+server-store',
    });
  });

  app.get('/api/admin/export', requireAdmin, async (req, res) => {
    try {
      const payload = await centralDb.exportAllData(req.authUser!.email);
      res.json(payload);
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Kon database niet exporteren.',
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
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
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
