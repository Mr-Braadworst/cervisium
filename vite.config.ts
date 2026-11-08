import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

function computeSourceTreeHash(rootDir: string): string {
  const hash = crypto.createHash('sha256');
  const targetDirs = ['src', 'server'];
  const rootFiles = ['server.ts', 'index.html', 'package.json'];

  const walk = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (
        entry.isFile() &&
        entry.name !== 'version.json' &&
        /\.(ts|tsx|css|html|json)$/.test(entry.name)
      ) {
        try {
          hash.update(path.relative(rootDir, fullPath));
          hash.update(fs.readFileSync(fullPath));
        } catch {
          // ignore read error
        }
      }
    }
  };

  for (const d of targetDirs) {
    walk(path.join(rootDir, d));
  }
  for (const f of rootFiles) {
    const full = path.join(rootDir, f);
    if (fs.existsSync(full)) {
      try {
        hash.update(f);
        hash.update(fs.readFileSync(full));
      } catch {
        // ignore
      }
    }
  }

  return hash.digest('hex').slice(0, 16);
}

function syncAutoVersionOnBuild(rootDir: string): void {
  const versionFilePath = path.join(rootDir, 'src', 'version.json');
  const persistentVersionPath = '/data/.app_version.json';
  try {
    const currentHash = computeSourceTreeHash(rootDir);
    let data = {
      major: 2,
      minor: 6,
      patch: 0,
      version: '2.6.0',
      updatedAt: new Date().toISOString(),
      lastHash: '',
    };

    const parseVersionFile = (filePath: string) => {
      if (!fs.existsSync(filePath)) return null;
      try {
        const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        if (parsed && typeof parsed === 'object') {
          return {
            major: typeof parsed.major === 'number' ? parsed.major : 2,
            minor: typeof parsed.minor === 'number' ? parsed.minor : 6,
            patch: typeof parsed.patch === 'number' ? parsed.patch : 0,
            version: typeof parsed.version === 'string' ? parsed.version : '2.6.0',
            updatedAt:
              typeof parsed.updatedAt === 'string'
                ? parsed.updatedAt
                : new Date().toISOString(),
            lastHash: typeof parsed.lastHash === 'string' ? parsed.lastHash : '',
          };
        }
      } catch {
        // ignore
      }
      return null;
    };

    const repoVersion = parseVersionFile(versionFilePath);
    const dockerVersion = parseVersionFile(persistentVersionPath);

    if (repoVersion) {
      data = repoVersion;
    }
    if (dockerVersion) {
      const dockerScore = dockerVersion.major * 1_000_000 + dockerVersion.minor * 1_000 + dockerVersion.patch;
      const repoScore = data.major * 1_000_000 + data.minor * 1_000 + data.patch;
      if (dockerScore > repoScore || (dockerScore === repoScore && dockerVersion.lastHash)) {
        data = dockerVersion;
      }
    }

    if (data.lastHash !== currentHash) {
      if (data.lastHash !== '') {
        data.patch += 1;
      }
      data.version = `${data.major}.${data.minor}.${data.patch}`;
      data.updatedAt = new Date().toISOString();
      data.lastHash = currentHash;
    }

    const serialized = JSON.stringify(data, null, 2) + '\n';
    fs.writeFileSync(versionFilePath, serialized, 'utf8');
    if (fs.existsSync('/data')) {
      try {
        fs.writeFileSync(persistentVersionPath, serialized, 'utf8');
      } catch {
        // ignore if /data not writable
      }
    }
  } catch {
    // Niet-blokkerend
  }
}

function autoVersionPlugin(): Plugin {
  return {
    name: 'cervisium-auto-version',
    buildStart() {
      syncAutoVersionOnBuild(__dirname);
    },
  };
}

export default defineConfig(() => {
  syncAutoVersionOnBuild(__dirname);

  return {
    plugins: [
      autoVersionPlugin(),
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        devOptions: {
          enabled: true,
          type: 'module',
        },
        includeAssets: [
          'favicon.png',
          'icon.png',
          'icon.svg',
          'apple-touch-icon.png',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'pwa-maskable-192x192.png',
          'pwa-maskable-512x512.png',
        ],
        workbox: {
          maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          navigateFallback: null,
          globPatterns: ['**/*.{js,css,ico,png,svg,woff,woff2,webmanifest}'],
          runtimeCaching: [
            {
              urlPattern: ({ request }) => request.mode === 'navigate',
              handler: 'NetworkFirst',
              options: {
                cacheName: 'cervisium-pages-cache',
                networkTimeoutSeconds: 3,
                cacheableResponse: {
                  statuses: [200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        manifest: {
          id: '/',
          name: 'Cervisium - Persoonlijke Bier Tracker',
          short_name: 'Cervisium',
          description:
            'Jouw persoonlijke bier collectie en beoordelingsapp met categoriebeheer, proefnotities en statistieken.',
          lang: 'nl',
          dir: 'ltr',
          theme_color: '#f59e0b',
          background_color: '#09090b',
          display: 'standalone',
          display_override: ['standalone', 'minimal-ui'],
          orientation: 'portrait-primary',
          start_url: '/',
          scope: '/',
          prefer_related_applications: false,
          categories: ['food', 'lifestyle', 'utilities'],
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'maskable',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      allowedHosts: true as const,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
