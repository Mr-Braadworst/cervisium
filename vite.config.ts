import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, Plugin } from 'vite';

let hasSyncedThisProcess = false;

function computeSourceTreeHash(rootDir: string): string {
  const hash = crypto.createHash('sha256');
  const targetDirs = ['src', 'server'];
  const rootFiles = ['server.ts', 'index.html'];

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
  if (hasSyncedThisProcess) return;
  hasSyncedThisProcess = true;

  const versionFilePath = path.join(rootDir, 'src', 'version.json');
  const packageJsonPath = path.join(rootDir, 'package.json');
  const swFilePath = path.join(rootDir, 'public', 'sw.js');
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
      const dockerScore =
        dockerVersion.major * 1_000_000 + dockerVersion.minor * 1_000 + dockerVersion.patch;
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
    } else {
      data.version = `${data.major}.${data.minor}.${data.patch}`;
    }

    const serialized = JSON.stringify(data, null, 2) + '\n';
    fs.writeFileSync(versionFilePath, serialized, 'utf8');

    // Houd package.json versienummer synchroon met src/version.json
    if (fs.existsSync(packageJsonPath)) {
      try {
        const pkgRaw = fs.readFileSync(packageJsonPath, 'utf8');
        const pkg = JSON.parse(pkgRaw);
        if (pkg && pkg.version !== data.version) {
          pkg.version = data.version;
          fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
        }
      } catch {
        // ignore
      }
    }

    // Houd Service Worker CACHE_NAME synchroon met het versienummer zodat browsers bij elke update verversen
    if (fs.existsSync(swFilePath)) {
      try {
        const swRaw = fs.readFileSync(swFilePath, 'utf8');
        const targetCacheLine = `const CACHE_NAME = 'cervisium-pwa-v${data.version}';`;
        const updatedSw = swRaw.replace(
          /^const CACHE_NAME = ['"]cervisium-pwa-[^'"]+['"];/m,
          targetCacheLine
        );
        if (updatedSw !== swRaw) {
          fs.writeFileSync(swFilePath, updatedSw, 'utf8');
        }
      } catch {
        // ignore
      }
    }

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
