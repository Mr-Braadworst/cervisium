import versionData from './version.json';

export const APP_VERSION: string = versionData.version || '2.6.0';
export const APP_UPDATED_AT: string = versionData.updatedAt || '';

export function getFormattedVersionDate(): string {
  if (!APP_UPDATED_AT) return '';
  try {
    const d = new Date(APP_UPDATED_AT);
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
