import { useEffect, useState } from 'react';
import versionData from './version.json';

export const APP_VERSION: string = versionData.version || '2.6.11';
export const APP_UPDATED_AT: string = versionData.updatedAt || '';

export function parseSemverScore(versionStr: string): number {
  const cleaned = String(versionStr || '')
    .trim()
    .replace(/^v/i, '');
  const parts = cleaned.split('.').map((n) => parseInt(n, 10));
  const major = Number.isFinite(parts[0]) ? parts[0] : 0;
  const minor = Number.isFinite(parts[1]) ? parts[1] : 0;
  const patch = Number.isFinite(parts[2]) ? parts[2] : 0;
  return major * 1_000_000 + minor * 1_000 + patch;
}

export function formatIsoVersionDate(isoDate?: string): string {
  const raw = isoDate || APP_UPDATED_AT;
  if (!raw) return '';
  try {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('nl-NL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

export function getFormattedVersionDate(): string {
  return formatIsoVersionDate(APP_UPDATED_AT);
}

export function useAppVersion(): { appVersion: string; versionDate: string } {
  const [appVersion, setAppVersion] = useState<string>(APP_VERSION);
  const [versionDate, setVersionDate] = useState<string>(() => getFormattedVersionDate());

  useEffect(() => {
    let cancelled = false;
    fetch('/api/version', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.version) return;
        const serverVer = String(data.version).trim().replace(/^v/i, '');
        if (parseSemverScore(serverVer) >= parseSemverScore(APP_VERSION)) {
          setAppVersion(serverVer);
          if (data.updatedAt) {
            const formatted = formatIsoVersionDate(String(data.updatedAt));
            if (formatted) setVersionDate(formatted);
          }
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return { appVersion, versionDate };
}
