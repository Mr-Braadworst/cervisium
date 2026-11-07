import {
  Category,
  Beer,
  Tasting,
  BeerGlass,
  PubGlassDeal,
  DutchProvince,
  DealCategory,
  UserSettings,
  BeerSession,
} from '../types';

/**
 * Veilige JSON.parse wrapper die Prototype Pollution (__proto__, constructor, prototype)
 * direct op parser-niveau verwijdert en een maximale stringlengte afdwingt.
 */
export function safeJsonParse<T = unknown>(raw: string, maxBytes = 100 * 1024 * 1024): T | null {
  if (typeof raw !== 'string' || !raw.trim() || raw.length > maxBytes) {
    return null;
  }
  try {
    return JSON.parse(raw, (key, value) => {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        return undefined;
      }
      return value;
    }) as T;
  } catch {
    return null;
  }
}

/**
 * Cryptografisch veilige ID generator (CSPRNG via Web Crypto API)
 * Voorkomt voorspelbare ID's en ID-collisies t.o.v. Math.random()
 */
export function generateSecureId(prefix: string): string {
  const safePrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, '');
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${safePrefix}_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;
  }
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${safePrefix}_${Date.now()}_${hex}`;
  }
  return `${safePrefix}_${Date.now()}`;
}

/**
 * Valideert of een ID veilig is voor gebruik als Firestore document ID of sleutel
 */
export function isValidEntityId(id: unknown): id is string {
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

/**
 * Beveiligt tekstvelden tegen overmatige lengte en nul-bytes
 */
export function sanitizeString(value: unknown, maxLength = 500, fallback = ''): string {
  if (typeof value !== 'string') return fallback;
  return value.replace(/\0/g, '').trim().slice(0, maxLength);
}

/**
 * Beveiligt externe URL's tegen XSS via javascript:, data:, vbscript: of file: URI's.
 * Staat uitsluitend geldige http:// en https:// URL's toe.
 */
export function sanitizeExternalUrl(url: unknown, fallback = 'https://untappd.com/'): string {
  if (typeof url !== 'string' || !url.trim()) return fallback;
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString().slice(0, 2048);
    }
  } catch {
    // Ongeldige URL
  }
  return fallback;
}

/**
 * Beveiligt afbeeldings-URL's (photoUrl / avatarUrl).
 * Staat uitsluitend https://, http:// of veilige base64-gecodeerde rasterafbeeldingen toe (geen SVG met embedded scripts of javascript: URI's).
 */
export function sanitizeImageUrl(url: unknown): string | undefined {
  if (typeof url !== 'string' || !url.trim()) return undefined;
  const trimmed = url.trim();

  // Check op veilige data:image URI (alle gangbare rasterafbeeldingen - géén image/svg+xml ivm XSS)
  if (trimmed.startsWith('data:')) {
    const safeDataImageRegex =
      /^data:image\/(jpeg|jpg|png|webp|gif|avif|bmp|heic|heif)(?:;[a-zA-Z0-9\-=+.]+)*;base64,[A-Za-z0-9+/=\s]+$/i;
    if (safeDataImageRegex.test(trimmed) && trimmed.length <= 5_000_000) {
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

/**
 * Beveiligt kleurcodes (alleen geldige hex kleuren)
 */
export function sanitizeHexColor(color: unknown, fallback = '#f59e0b'): string {
  if (typeof color === 'string' && /^#[0-9A-Fa-f]{3,8}$/.test(color.trim())) {
    return color.trim();
  }
  return fallback;
}

/**
 * Beveiligt foto-positie CSS waarde (bijv. "50% 30%") tegen CSS-injectie
 */
export function sanitizePhotoPosition(pos: unknown): string | undefined {
  if (typeof pos !== 'string') return undefined;
  const trimmed = pos.trim();
  if (/^\d{1,3}(?:\.\d+)?%\s+\d{1,3}(?:\.\d+)?%$/.test(trimmed)) {
    const parts = trimmed.split(/\s+/);
    const x = Math.min(100, Math.max(0, parseFloat(parts[0]) || 50));
    const y = Math.min(100, Math.max(0, parseFloat(parts[1]) || 50));
    return `${x}% ${y}%`;
  }
  return '50% 50%';
}

/**
 * Clampt een numerieke waarde veilig binnen [min, max]
 */
export function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}

const VALID_PROVINCES: DutchProvince[] = [
  'Groningen',
  'Friesland',
  'Drenthe',
  'Overijssel',
  'Flevoland',
  'Gelderland',
  'Utrecht',
  'Noord-Holland',
  'Zuid-Holland',
  'Zeeland',
  'Noord-Brabant',
  'Limburg',
];

const VALID_DEAL_CATEGORIES: DealCategory[] = [
  'glas',
  'proeverij',
  'korting',
  'borrelplank',
  'tap_takeover',
];

const VALID_START_TABS: UserSettings['defaultStartTab'][] = [
  'dashboard',
  'list',
  'top',
  'categories',
  'glasses',
  'extras',
];

/**
 * Strikte schema-validatie en sanitisatie voor JSON back-up imports.
 * Voorkomt Prototype Pollution (__proto__), XSS via photoUrl, en geheugen-DoS.
 */
export function sanitizeImportedCategory(raw: unknown): Category | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const name = sanitizeString(obj.name, 80);
  if (!name) return null;

  return {
    id: isValidEntityId(obj.id) ? obj.id : generateSecureId('cat'),
    name,
    color: sanitizeHexColor(obj.color),
    description: sanitizeString(obj.description, 300),
    createdAt: sanitizeString(obj.createdAt, 40, new Date().toISOString()),
  };
}

export function sanitizeImportedBeer(raw: unknown, ownerUserId: string): Beer | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const name = sanitizeString(obj.name, 120);
  const categoryId = sanitizeString(obj.categoryId, 128);
  if (!name || !categoryId) return null;

  return {
    id: isValidEntityId(obj.id) ? obj.id : generateSecureId('beer'),
    userId: ownerUserId, // Forceer altijd eigenaarschap van de huidige gebruiker
    name,
    brewery: sanitizeString(obj.brewery, 120),
    categoryId,
    abv: Number(clampNumber(obj.abv, 0, 100, 5.0).toFixed(1)),
    favorite: Boolean(obj.favorite),
    photoUrl: sanitizeImageUrl(obj.photoUrl),
    photoPosition: sanitizePhotoPosition(obj.photoPosition),
    photoZoom: obj.photoZoom !== undefined ? clampNumber(obj.photoZoom, 0.5, 5.0, 1.0) : undefined,
    dateAdded: sanitizeString(obj.dateAdded, 40, new Date().toISOString()),
    updatedAt: obj.updatedAt ? sanitizeString(obj.updatedAt, 40) : undefined,
  };
}

export function sanitizeImportedTasting(raw: unknown): Tasting | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const beerId = sanitizeString(obj.beerId, 128);
  if (!beerId) return null;

  const rawServing = obj.servingType;
  const servingType: 'tap' | 'fles' | 'blik' | undefined =
    rawServing === 'tap' || rawServing === 'fles' || rawServing === 'blik' ? rawServing : undefined;

  return {
    id: isValidEntityId(obj.id) ? obj.id : generateSecureId('tast'),
    beerId,
    rating: Number(clampNumber(obj.rating, 1, 10, 7.0).toFixed(1)),
    notes: sanitizeString(obj.notes, 2000),
    location: sanitizeString(obj.location, 150),
    servingType,
    date: sanitizeString(obj.date, 40, new Date().toISOString()),
    photoUrl: sanitizeImageUrl(obj.photoUrl),
    photoPosition: sanitizePhotoPosition(obj.photoPosition),
    photoZoom: obj.photoZoom !== undefined ? clampNumber(obj.photoZoom, 0.5, 5.0, 1.0) : undefined,
  };
}

export function sanitizeImportedGlass(raw: unknown, ownerUserId: string): BeerGlass | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const name = sanitizeString(obj.name, 120);
  if (!name) return null;

  return {
    id: isValidEntityId(obj.id) ? obj.id : generateSecureId('glass'),
    userId: ownerUserId, // Forceer altijd eigenaarschap van de huidige gebruiker
    name,
    brand: sanitizeString(obj.brand, 120),
    glassType: sanitizeString(obj.glassType, 80),
    quantity: Math.round(clampNumber(obj.quantity, 1, 9999, 1)),
    volumeCl: obj.volumeCl !== undefined ? clampNumber(obj.volumeCl, 0, 500, 33) : undefined,
    photoUrl: sanitizeImageUrl(obj.photoUrl),
    photoPosition: sanitizePhotoPosition(obj.photoPosition),
    photoZoom: obj.photoZoom !== undefined ? clampNumber(obj.photoZoom, 0.5, 5.0, 1.0) : undefined,
    notes: sanitizeString(obj.notes, 1000),
    favorite: Boolean(obj.favorite),
    dateAdded: sanitizeString(obj.dateAdded, 40, new Date().toISOString()),
    updatedAt: obj.updatedAt ? sanitizeString(obj.updatedAt, 40) : undefined,
  };
}

export function sanitizePubDeal(raw: unknown): PubGlassDeal {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const province = VALID_PROVINCES.includes(obj.province as DutchProvince)
    ? (obj.province as DutchProvince)
    : 'Noord-Holland';
  const dealCategory =
    obj.dealCategory && VALID_DEAL_CATEGORIES.includes(obj.dealCategory as DealCategory)
      ? (obj.dealCategory as DealCategory)
      : 'glas';

  return {
    id: isValidEntityId(obj.id) ? obj.id : generateSecureId('deal'),
    pubName: sanitizeString(obj.pubName, 150, 'Onbekend Café'),
    city: sanitizeString(obj.city, 100, 'Amsterdam'),
    province,
    address: sanitizeString(obj.address, 200),
    lat: clampNumber(obj.lat, -90, 90, 52.3676),
    lng: clampNumber(obj.lng, -180, 180, 4.9041),
    hasActiveDeal: Boolean(obj.hasActiveDeal),
    dealCategory,
    dealTitle: sanitizeString(obj.dealTitle, 250),
    beerBrand: sanitizeString(obj.beerBrand, 120),
    sourceName: sanitizeString(obj.sourceName, 120, 'Website'),
    sourceUrl: sanitizeExternalUrl(obj.sourceUrl),
    checkedAt: sanitizeString(obj.checkedAt, 40, new Date().toISOString().split('T')[0]),
    actieEindDatum: sanitizeString(obj.actieEindDatum, 40),
    submittedBy: sanitizeString(obj.submittedBy, 100),
  };
}

const VALID_LANGUAGE_PREFS = ['auto', 'nl', 'en', 'de', 'fr', 'es'] as const;

export function sanitizeUserSettings(raw: unknown, defaults: UserSettings): UserSettings {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...defaults };
  }
  const obj = raw as Record<string, unknown>;
  const startTab = VALID_START_TABS.includes(obj.defaultStartTab as UserSettings['defaultStartTab'])
    ? (obj.defaultStartTab as UserSettings['defaultStartTab'])
    : defaults.defaultStartTab;
  const language = VALID_LANGUAGE_PREFS.includes(
    obj.language as NonNullable<UserSettings['language']>
  )
    ? (obj.language as NonNullable<UserSettings['language']>)
    : defaults.language || 'auto';

  return {
    lightMode: typeof obj.lightMode === 'boolean' ? obj.lightMode : defaults.lightMode,
    language,
    showExtrasDealBadge:
      typeof obj.showExtrasDealBadge === 'boolean'
        ? obj.showExtrasDealBadge
        : defaults.showExtrasDealBadge,
    showNavCollectionCounts:
      typeof obj.showNavCollectionCounts === 'boolean'
        ? obj.showNavCollectionCounts
        : defaults.showNavCollectionCounts,
    showExtrasTab:
      typeof obj.showExtrasTab === 'boolean' ? obj.showExtrasTab : defaults.showExtrasTab,
    showDealScanner:
      typeof obj.showDealScanner === 'boolean' ? obj.showDealScanner : defaults.showDealScanner,
    defaultStartTab: startTab,
    defaultBeerPrice: clampNumber(obj.defaultBeerPrice, 0.5, 100, defaults.defaultBeerPrice),
    defaultGlassSizeCl: Math.round(
      clampNumber(obj.defaultGlassSizeCl, 10, 200, defaults.defaultGlassSizeCl)
    ),
  };
}

export function safeIsoDate(dateInput: unknown, fallbackIso?: string): string {
  const defaultIso = fallbackIso || new Date().toISOString();
  if (typeof dateInput !== 'string' || !dateInput.trim()) {
    return defaultIso;
  }
  const trimmed = dateInput.trim().slice(0, 40);
  const candidate = /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? `${trimmed}T12:00:00` : trimmed;
  const parsed = new Date(candidate);
  const time = parsed.getTime();
  if (!Number.isFinite(time) || parsed.getFullYear() < 1900 || parsed.getFullYear() > 2100) {
    return defaultIso;
  }
  return parsed.toISOString();
}

const ALLOWED_RASTER_IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/bmp',
  'image/heic',
  'image/heif',
]);

/**
 * Veilige client-side afbeeldingsvalidator & compressor.
 * Blokkeert SVG-bestanden (XSS-risico), niet-afbeeldingen, bestanden > 15 MB
 * en pixel-bombs (> 12000x12000 px). Converteert altijd naar een schone JPEG data-URI.
 */
export function validateAndCompressImageFile(
  file: File,
  maxDimension = 700,
  quality = 0.72
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file || typeof file !== 'object') {
      reject(new Error('Geen geldig afbeeldingsbestand geselecteerd.'));
      return;
    }

    // 1. Blokkeer te grote bestanden (> 15 MB) tegen geheugen-DoS
    const MAX_FILE_BYTES = 15 * 1024 * 1024;
    if (typeof file.size === 'number' && (file.size <= 0 || file.size > MAX_FILE_BYTES)) {
      reject(new Error('Afbeelding is te groot (maximaal 15 MB toegestaan).'));
      return;
    }

    // 2. Strikte MIME-type & extensie whitelist (blokkeer SVG en scripts)
    const mime = (file.type || '').toLowerCase().trim();
    const fileName = (file.name || '').toLowerCase().trim();
    if (
      mime === 'image/svg+xml' ||
      fileName.endsWith('.svg') ||
      fileName.endsWith('.svgz') ||
      fileName.endsWith('.html') ||
      fileName.endsWith('.xml')
    ) {
      reject(new Error('SVG-bestanden zijn om veiligheidsredenen niet toegestaan. Gebruik JPG, PNG of WebP.'));
      return;
    }

    if (mime && !ALLOWED_RASTER_IMAGE_MIMES.has(mime)) {
      reject(new Error('Ongeldig afbeeldingsformaat. Kies een JPG, PNG of WebP afbeelding.'));
      return;
    }

    const safeMaxDim = clampNumber(maxDimension, 100, 1600, 700);
    const safeQuality = clampNumber(quality, 0.3, 0.92, 0.72);

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Kan het afbeeldingsbestand niet lezen.'));
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result !== 'string' || !result.startsWith('data:image/')) {
        reject(new Error('Ongeldige afbeeldingsdata.'));
        return;
      }

      const img = new Image();
      img.onerror = () => reject(new Error('Bestand is geen geldige afbeelding.'));
      img.onload = () => {
        // 3. Bescherm tegen decompression bombs / extreme dimensies
        if (
          !Number.isFinite(img.width) ||
          !Number.isFinite(img.height) ||
          img.width < 1 ||
          img.height < 1 ||
          img.width > 12000 ||
          img.height > 12000
        ) {
          reject(new Error('Afbeeldingsafmetingen vallen buiten het veilige bereik.'));
          return;
        }

        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > safeMaxDim) {
            height = Math.max(1, Math.round((height * safeMaxDim) / width));
            width = safeMaxDim;
          }
        } else {
          if (height > safeMaxDim) {
            width = Math.max(1, Math.round((width * safeMaxDim) / height));
            height = safeMaxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Kan afbeelding niet verwerken.'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', safeQuality);
        const sanitized = sanitizeImageUrl(compressedDataUrl);
        if (!sanitized) {
          reject(new Error('Gecomprimeerde afbeelding kon niet worden gevalideerd.'));
          return;
        }
        resolve(sanitized);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  });
}

export function sanitizeBeerSession(raw: unknown, ownerUserId: string): BeerSession | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const title = sanitizeString(obj.title, 150, 'Bieravond');
  const notesRaw = sanitizeString(obj.notes, 500);
  return {
    id: isValidEntityId(obj.id) ? obj.id : generateSecureId('sess'),
    userId: ownerUserId,
    title,
    count: Math.round(clampNumber(obj.count, 0, 500, 0)),
    date: safeIsoDate(obj.date || obj.startedAt),
    notes: notesRaw || undefined,
  };
}


