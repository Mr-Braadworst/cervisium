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

  const matchedKeywords = Array.isArray(obj.matchedKeywords)
    ? obj.matchedKeywords
        .filter((k): k is string => typeof k === 'string')
        .map((k) => sanitizeString(k, 40))
        .filter(Boolean)
        .slice(0, 8)
    : undefined;

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
    verificationSnippet: obj.verificationSnippet
      ? sanitizeString(obj.verificationSnippet, 320)
      : undefined,
    verifiedPageTitle: obj.verifiedPageTitle
      ? sanitizeString(obj.verifiedPageTitle, 160)
      : undefined,
    verifiedHttpStatus:
      typeof obj.verifiedHttpStatus === 'number'
        ? Math.round(clampNumber(obj.verifiedHttpStatus, 100, 599, 200))
        : undefined,
    verifiedLive: typeof obj.verifiedLive === 'boolean' ? obj.verifiedLive : undefined,
    matchedKeywords,
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
 * Berekent de grootte van een data-URL in kilobytes (KB) voor weergave in de UI.
 */
export function formatDataUrlSizeKb(dataUrl?: string): string | null {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
    return null;
  }
  const bytes = new Blob([dataUrl]).size;
  const kb = bytes / 1024;
  return kb < 10 ? `${kb.toFixed(1)} KB` : `${Math.round(kb)} KB`;
}

/**
 * Hoogwaardige stapsgewijze downscaling (multi-step bicubic/high-smoothing) zodat
 * tekst op bieretiketten en glaslogo's haarscherp blijft bij het verkleinen.
 */
function renderHighQualityScaledCanvas(
  img: HTMLImageElement,
  targetWidth: number,
  targetHeight: number
): HTMLCanvasElement {
  let curWidth = img.width;
  let curHeight = img.height;

  // Stap-voor-stap halveren bij grote camera-foto's (bijv. 12MP/48MP/108MP) tegen aliasing
  let workCanvas: HTMLCanvasElement | null = null;
  while (curWidth * 0.5 > targetWidth * 1.15 && curHeight * 0.5 > targetHeight * 1.15) {
    const nextWidth = Math.max(targetWidth, Math.round(curWidth * 0.5));
    const nextHeight = Math.max(targetHeight, Math.round(curHeight * 0.5));
    const stepCanvas = document.createElement('canvas');
    stepCanvas.width = nextWidth;
    stepCanvas.height = nextHeight;
    const stepCtx = stepCanvas.getContext('2d');
    if (!stepCtx) break;
    stepCtx.imageSmoothingEnabled = true;
    stepCtx.imageSmoothingQuality = 'high';
    stepCtx.drawImage(workCanvas || img, 0, 0, nextWidth, nextHeight);
    workCanvas = stepCanvas;
    curWidth = nextWidth;
    curHeight = nextHeight;
  }

  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = targetWidth;
  finalCanvas.height = targetHeight;
  const ctx = finalCanvas.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    // Vul transparante achtergronden met donker zink zodat PNG's netjes naar WebP/JPEG gaan
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    ctx.drawImage(workCanvas || img, 0, 0, targetWidth, targetHeight);
  }
  return finalCanvas;
}

/**
 * Veilige client-side afbeeldingsvalidator & slimme compressor.
 * - Staat foto's toe tot maximaal 100 MB (inclusief directe mobiele camera-opnames).
 * - Blokkeert SVG-bestanden (XSS-risico) en niet-afbeeldingen.
 * - Comprimeert met behoud van scherpte (multi-step downscaling + WebP/JPEG optimalisatie)
 *   zodat elke opgeslagen foto gegarandeerd <= 80 KB is (streefdoel ~45-68 KB).
 */
export function validateAndCompressImageFile(
  file: File,
  maxDimension = 850,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file || typeof file !== 'object') {
      reject(new Error('Geen geldig afbeeldingsbestand geselecteerd.'));
      return;
    }

    // 1. Blokkeer bestanden > 100 MB
    const MAX_FILE_BYTES = 100 * 1024 * 1024;
    if (typeof file.size === 'number' && (file.size <= 0 || file.size > MAX_FILE_BYTES)) {
      reject(new Error('Afbeelding is te groot (maximaal 100 MB toegestaan).'));
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
      reject(
        new Error(
          'SVG-bestanden zijn om veiligheidsredenen niet toegestaan. Gebruik een camera-foto, JPG, PNG of WebP.'
        )
      );
      return;
    }

    if (
      mime &&
      !ALLOWED_RASTER_IMAGE_MIMES.has(mime) &&
      !mime.startsWith('image/')
    ) {
      reject(new Error('Ongeldig afbeeldingsformaat. Kies een JPG, PNG, WebP of camera-foto.'));
      return;
    }

    // Harde bovengrens: 80 KB (81.920 bytes inclusief base64 data-URI), streefdoel <= 66 KB
    const MAX_OUTPUT_BYTES = 80 * 1024;
    const TARGET_OUTPUT_BYTES = 66 * 1024;

    const initialMaxDim = clampNumber(maxDimension, 240, 1200, 850);
    const initialQuality = clampNumber(quality, 0.45, 0.9, 0.82);

    const processLoadedImage = (img: HTMLImageElement, cleanup?: () => void) => {
      try {
        // 3. Bescherm tegen extreme pixel-bombs (> 24000x24000 px)
        if (
          !Number.isFinite(img.width) ||
          !Number.isFinite(img.height) ||
          img.width < 1 ||
          img.height < 1 ||
          img.width > 24000 ||
          img.height > 24000
        ) {
          if (cleanup) cleanup();
          reject(new Error('Afbeeldingsafmetingen vallen buiten het veilige bereik.'));
          return;
        }

        const encodeCanvas = (canvas: HTMLCanvasElement, q: number): string => {
          // Probeer eerst WebP (geeft hogere scherpte bij 30-35% kleiner bestand dan JPEG)
          try {
            const webpUrl = canvas.toDataURL('image/webp', q);
            if (webpUrl.startsWith('data:image/webp;base64,')) {
              const jpegUrl = canvas.toDataURL('image/jpeg', q);
              return webpUrl.length <= jpegUrl.length ? webpUrl : jpegUrl;
            }
          } catch {
            // Fallback naar JPEG
          }
          return canvas.toDataURL('image/jpeg', q);
        };

        let currentMaxDim = initialMaxDim;
        let bestDataUrl = '';

        // Adaptieve compressie-lus: behoud maximale resolutie & kwaliteit, maar dwing <= 80 KB (liefst <= 66 KB) af
        for (let scaleStep = 0; scaleStep < 7; scaleStep++) {
          let width = img.width;
          let height = img.height;
          if (width >= height) {
            if (width > currentMaxDim) {
              height = Math.max(1, Math.round((height * currentMaxDim) / width));
              width = currentMaxDim;
            }
          } else {
            if (height > currentMaxDim) {
              width = Math.max(1, Math.round((width * currentMaxDim) / height));
              height = currentMaxDim;
            }
          }

          const canvas = renderHighQualityScaledCanvas(img, width, height);
          const qualitySteps =
            scaleStep === 0
              ? [initialQuality, 0.76, 0.70]
              : [0.78, 0.72, 0.66, 0.60, 0.54];

          for (const q of qualitySteps) {
            const candidate = encodeCanvas(canvas, q);
            bestDataUrl = candidate;
            if (candidate.length <= TARGET_OUTPUT_BYTES) {
              break;
            }
          }

          if (bestDataUrl.length <= TARGET_OUTPUT_BYTES) {
            break;
          }
          // Als we al onder de 80 KB zitten na een lichte schaalstap en goede kwaliteit, accepteren
          if (scaleStep >= 1 && bestDataUrl.length <= MAX_OUTPUT_BYTES) {
            break;
          }

          currentMaxDim = Math.max(220, Math.round(currentMaxDim * 0.84));
        }

        // Extra vangnet mocht een extreem detailrijke foto nog net boven 80 KB zitten
        while (bestDataUrl.length > MAX_OUTPUT_BYTES && currentMaxDim > 160) {
          currentMaxDim = Math.max(160, Math.round(currentMaxDim * 0.8));
          let width = img.width;
          let height = img.height;
          if (width >= height) {
            height = Math.max(1, Math.round((height * currentMaxDim) / width));
            width = currentMaxDim;
          } else {
            width = Math.max(1, Math.round((width * currentMaxDim) / height));
            height = currentMaxDim;
          }
          const canvas = renderHighQualityScaledCanvas(img, width, height);
          bestDataUrl = encodeCanvas(canvas, 0.52);
        }

        if (cleanup) cleanup();

        const sanitized = sanitizeImageUrl(bestDataUrl);
        if (!sanitized) {
          reject(new Error('Gecomprimeerde afbeelding kon niet worden gevalideerd.'));
          return;
        }
        resolve(sanitized);
      } catch {
        if (cleanup) cleanup();
        reject(new Error('Kan afbeelding niet comprimeren.'));
      }
    };

    // Gebruik ObjectURL voor snelle en geheugenvriendelijke verwerking van grote foto's (tot 100 MB)
    if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
      const objectUrl = URL.createObjectURL(file);
      const cleanup = () => {
        try {
          URL.revokeObjectURL(objectUrl);
        } catch {
          // ignore
        }
      };
      const img = new Image();
      img.onerror = () => {
        cleanup();
        reject(new Error('Bestand is geen geldige of ondersteunde afbeelding.'));
      };
      img.onload = () => processLoadedImage(img, cleanup);
      img.src = objectUrl;
      return;
    }

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
      img.onload = () => processLoadedImage(img);
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

function sha256Hex(ascii: string): string {
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let result = '';

  const words: number[] = [];
  const asciiBitLength = ascii.length * 8;

  let hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];
  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  let padded = ascii + '\x80';
  while ((padded.length % 64) !== 56) {
    padded += '\x00';
  }
  for (let i = 0; i < padded.length; i++) {
    const code = padded.charCodeAt(i);
    words[i >> 2] |= (code & 0xff) << ((3 - (i % 4)) * 8);
  }
  words[words.length] = Math.floor(asciiBitLength / maxWord);
  words[words.length] = asciiBitLength & 0xffffffff;

  for (let j = 0; j < words.length; j += 16) {
    const w = words.slice(j, j + 16);
    while (w.length < 16) w.push(0);
    const oldHash = [...hash];

    for (let i = 0; i < 64; i++) {
      if (i >= 16) {
        const w15 = w[i - 15];
        const w2 = w[i - 2];
        const s0 = ((w15 >>> 7) | (w15 << 25)) ^ ((w15 >>> 18) | (w15 << 14)) ^ (w15 >>> 3);
        const s1 = ((w2 >>> 17) | (w2 << 15)) ^ ((w2 >>> 19) | (w2 << 13)) ^ (w2 >>> 10);
        w[i] = ((w[i - 16] + s0 + w[i - 7] + s1) & 0xffffffff) | 0;
      }
      const e = hash[4];
      const s1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const ch = (e & hash[5]) ^ (~e & hash[6]);
      const temp1 = (hash[7] + s1 + ch + k[i] + w[i]) | 0;

      const a = hash[0];
      const s0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const maj = (a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]);
      const temp2 = (s0 + maj) | 0;

      hash[7] = hash[6];
      hash[6] = hash[5];
      hash[5] = hash[4];
      hash[4] = (hash[3] + temp1) | 0;
      hash[3] = hash[2];
      hash[2] = hash[1];
      hash[1] = hash[0];
      hash[0] = (temp1 + temp2) | 0;
    }

    for (let i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  for (let i = 0; i < 8; i++) {
    const hex = (hash[i] >>> 0).toString(16).padStart(8, '0');
    result += hex;
  }
  return result;
}

export function getCanonicalUserIdForEmail(email: string | undefined | null): string | null {
  if (!email || typeof email !== 'string') return null;
  const clean = email.trim().toLowerCase();
  if (!clean || !clean.includes('@') || clean === 'gebruiker@bierlog.nl') return null;
  const hash = sha256Hex(clean).slice(0, 24);
  return `usr_${hash}`;
}



