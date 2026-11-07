import { Beer, Category, UserAccount, Tasting, BeerSession, BeerGlass, UserSettings } from '../types';
import {
  generateSecureId,
  isValidEntityId,
  safeJsonParse,
  sanitizeImportedCategory,
  sanitizeImportedBeer,
  sanitizeImportedTasting,
  sanitizeImportedGlass,
  sanitizeImageUrl,
  sanitizePhotoPosition,
  sanitizeHexColor,
  sanitizeString,
  clampNumber,
  sanitizeUserSettings,
  sanitizeBeerSession,
} from '../utils/security';

const USERS_STORAGE_KEY = 'bierlog_users_list';
const ACTIVE_USER_ID_KEY = 'bierlog_active_user_id';
const getSessionsKey = (userId: string) => `bierlog_sessions_${userId}`;
const getGlassesKey = (userId: string) => `bierlog_glasses_${userId}`;
const COLOR_PALETTE = [
  '#f59e0b', '#d97706', '#b45309', '#eab308', '#10b981', '#06b6d4', 
  '#6366f1', '#ec4899', '#8b5cf6', '#f97316', '#78350f', '#64748b'
];

export { COLOR_PALETTE };

function deduplicateById<T extends { id: string }>(items: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of items) {
    if (item && isValidEntityId(item.id)) {
      map.set(item.id, item);
    }
  }
  return Array.from(map.values());
}

// --- User Management ---

export function getActiveUser(): UserAccount | null {
  const storedId = localStorage.getItem(ACTIVE_USER_ID_KEY);
  if (!storedId || !isValidEntityId(storedId)) return null;
  const users = getAllUsers();
  return users.find(u => u.id === storedId) || null;
}

export function setActiveUser(user: UserAccount | null): void {
  if (!user || !isValidEntityId(user.id)) {
    localStorage.removeItem(ACTIVE_USER_ID_KEY);
    return;
  }
  const sanitizedUser: UserAccount = {
    id: user.id,
    name: sanitizeString(user.name, 100, 'Bierliefhebber'),
    googleName: user.googleName ? sanitizeString(user.googleName, 100) : undefined,
    email: sanitizeString(user.email, 180, 'gebruiker@bierlog.nl'),
    role: user.role === 'admin' ? 'admin' : user.role === 'user' ? 'user' : undefined,
    avatarUrl: sanitizeImageUrl(user.avatarUrl),
    createdAt: sanitizeString(user.createdAt, 60, new Date().toISOString()),
  };
  const existing = getAllUsers();
  const idx = existing.findIndex(u => u.id === sanitizedUser.id);
  if (idx >= 0) {
    existing[idx] = { ...existing[idx], ...sanitizedUser };
  } else {
    existing.push(sanitizedUser);
  }
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(existing));
    localStorage.setItem(ACTIVE_USER_ID_KEY, sanitizedUser.id);
  } catch (e) {
    console.warn('localStorage setActiveUser quota notice:', e);
  }
}

export function logoutUser(): void {
  localStorage.removeItem(ACTIVE_USER_ID_KEY);
}

export function loginUser(user: UserAccount): UserAccount {
  setActiveUser(user);
  return user;
}

export function getAllUsers(): UserAccount[] {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = safeJsonParse<unknown[]>(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((u): u is Record<string, unknown> => Boolean(u && typeof u === 'object' && isValidEntityId((u as any).id)))
      .map((u) => ({
        id: String(u.id),
        name: sanitizeString(u.name, 100, 'Bierliefhebber'),
        googleName: u.googleName ? sanitizeString(u.googleName, 100) : undefined,
        email: sanitizeString(u.email, 180, 'gebruiker@bierlog.nl'),
        role: u.role === 'admin' ? 'admin' : u.role === 'user' ? 'user' : undefined,
        avatarUrl: sanitizeImageUrl(u.avatarUrl),
        createdAt: sanitizeString(u.createdAt, 60, new Date().toISOString()),
      }));
  } catch {
    return [];
  }
}

export function createNewUser(name: string, email: string): UserAccount {
  const newUser: UserAccount = {
    id: generateSecureId('usr'),
    name: sanitizeString(name, 80, 'Bierliefhebber'),
    email: sanitizeString(email, 150, 'gebruiker@bierlog.nl'),
    createdAt: new Date().toISOString(),
  };
  const users = getAllUsers();
  users.push(newUser);
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch {
    // ignore quota
  }
  setActiveUser(newUser);
  return newUser;
}

// --- Categories ---

export function getCategories(userId: string): Category[] {
  try {
    const raw = localStorage.getItem(`bierlog_categories_${userId}`);
    if (!raw) return [];
    const parsed = safeJsonParse<unknown[]>(raw);
    if (!Array.isArray(parsed)) return [];
    return deduplicateById(
      parsed
        .map((c: unknown) => sanitizeImportedCategory(c))
        .filter((c: Category | null): c is Category => c !== null)
    );
  } catch {
    return [];
  }
}

export function saveCategories(userId: string, categories: Category[]): void {
  try {
    localStorage.setItem(`bierlog_categories_${userId}`, JSON.stringify(categories));
  } catch (e) {
    console.warn('localStorage saveCategories quota notice:', e);
  }
  queueServerDatabaseSync(userId);
}

export function addCategory(userId: string, name: string, color?: string, description?: string): Category {
  const categories = getCategories(userId);
  const newCat: Category = {
    id: generateSecureId('cat'),
    name: sanitizeString(name, 80, 'Speciaalbier'),
    color: sanitizeHexColor(color || COLOR_PALETTE[categories.length % COLOR_PALETTE.length]),
    description: sanitizeString(description, 300),
    createdAt: new Date().toISOString(),
  };
  categories.push(newCat);
  saveCategories(userId, categories);
  return newCat;
}

export function updateCategory(userId: string, id: string, name: string, color: string, description?: string): Category | null {
  const categories = getCategories(userId);
  const index = categories.findIndex(c => c.id === id);
  if (index === -1) return null;
  categories[index] = {
    ...categories[index],
    name: sanitizeString(name, 80, 'Speciaalbier'),
    color: sanitizeHexColor(color),
    description: sanitizeString(description, 300),
  };
  saveCategories(userId, categories);
  return categories[index];
}

export function deleteCategory(userId: string, id: string): void {
  const categories = getCategories(userId).filter(c => c.id !== id);
  saveCategories(userId, categories);
}

// --- Beers & Tastings ---

export function getBeers(userId: string): Beer[] {
  try {
    const raw = localStorage.getItem(`bierlog_beers_${userId}`);
    if (!raw) return [];
    const parsed = safeJsonParse<unknown[]>(raw);
    if (!Array.isArray(parsed)) return [];
    return deduplicateById(
      parsed
        .map((b: unknown) => sanitizeImportedBeer(b, userId))
        .filter((b: Beer | null): b is Beer => b !== null)
    );
  } catch {
    return [];
  }
}

export function getTastings(userId: string): Tasting[] {
  try {
    const raw = localStorage.getItem(`bierlog_tastings_${userId}`);
    if (!raw) return [];
    const parsed = safeJsonParse<unknown[]>(raw);
    if (!Array.isArray(parsed)) return [];
    return deduplicateById(
      parsed
        .map((t: unknown) => sanitizeImportedTasting(t))
        .filter((t: Tasting | null): t is Tasting => t !== null)
    );
  } catch {
    return [];
  }
}

export function saveBeers(userId: string, beers: Beer[]): void {
  try {
    localStorage.setItem(`bierlog_beers_${userId}`, JSON.stringify(beers));
  } catch (e) {
    console.warn('localStorage saveBeers quota notice:', e);
  }
  queueServerDatabaseSync(userId);
}

export function saveTastings(userId: string, tastings: Tasting[]): void {
  try {
    localStorage.setItem(`bierlog_tastings_${userId}`, JSON.stringify(tastings));
  } catch (e) {
    console.warn('localStorage saveTastings quota notice:', e);
  }
  queueServerDatabaseSync(userId);
}

export function addBeer(userId: string, beerData: Omit<Beer, 'id' | 'userId' | 'dateAdded'> & { dateAdded?: string }): Beer {
  const beers = getBeers(userId);
  const newBeer: Beer = {
    id: generateSecureId('beer'),
    userId,
    name: sanitizeString(beerData.name, 120, 'Speciaalbier'),
    brewery: sanitizeString(beerData.brewery, 120),
    categoryId: sanitizeString(beerData.categoryId, 128),
    abv: Number(clampNumber(beerData.abv, 0, 100, 5.0).toFixed(1)),
    favorite: Boolean(beerData.favorite),
    photoUrl: sanitizeImageUrl(beerData.photoUrl),
    photoPosition: sanitizePhotoPosition(beerData.photoPosition),
    photoZoom: beerData.photoZoom !== undefined ? clampNumber(beerData.photoZoom, 0.5, 5.0, 1.0) : undefined,
    dateAdded: sanitizeString(beerData.dateAdded, 60, new Date().toISOString()),
  };
  beers.push(newBeer);
  saveBeers(userId, beers);
  return newBeer;
}

export function addTasting(userId: string, tastingData: Omit<Tasting, 'id'>): Tasting {
  const tastings = getTastings(userId);
  const st = tastingData.servingType;
  const newTasting: Tasting = {
    id: generateSecureId('tast'),
    beerId: sanitizeString(tastingData.beerId, 128),
    rating: Number(clampNumber(tastingData.rating, 1, 10, 7.0).toFixed(1)),
    notes: sanitizeString(tastingData.notes, 2000),
    location: sanitizeString(tastingData.location, 150),
    servingType: st === 'tap' || st === 'fles' || st === 'blik' ? st : undefined,
    photoUrl: sanitizeImageUrl(tastingData.photoUrl),
    photoPosition: sanitizePhotoPosition(tastingData.photoPosition),
    photoZoom: tastingData.photoZoom !== undefined ? clampNumber(tastingData.photoZoom, 0.5, 5.0, 1.0) : undefined,
    date: sanitizeString(tastingData.date, 60, new Date().toISOString()),
  };
  tastings.push(newTasting);
  saveTastings(userId, tastings);
  return newTasting;
}

export function getBeerTastings(userId: string, beerId: string): Tasting[] {
  return getTastings(userId).filter(t => t.beerId === beerId);
}

export function updateBeer(userId: string, beerId: string, updates: Partial<Beer>): Beer | null {
  const beers = getBeers(userId);
  const index = beers.findIndex(b => b.id === beerId);
  if (index === -1) return null;
  const merged: Beer = { ...beers[index], ...updates, updatedAt: new Date().toISOString() };
  if ('name' in updates && updates.name !== undefined) {
    merged.name = sanitizeString(updates.name, 120, beers[index].name);
  }
  if ('brewery' in updates) {
    merged.brewery = sanitizeString(updates.brewery, 120, '');
  }
  if ('categoryId' in updates && updates.categoryId !== undefined) {
    merged.categoryId = sanitizeString(updates.categoryId, 128, beers[index].categoryId);
  }
  if ('abv' in updates && updates.abv !== undefined) {
    merged.abv = Number(clampNumber(updates.abv, 0, 100, beers[index].abv).toFixed(1));
  }
  if ('favorite' in updates && updates.favorite !== undefined) {
    merged.favorite = Boolean(updates.favorite);
  }
  if ('photoUrl' in updates) {
    merged.photoUrl = sanitizeImageUrl(updates.photoUrl);
  }
  if ('photoPosition' in updates) {
    merged.photoPosition = sanitizePhotoPosition(updates.photoPosition);
  }
  if ('photoZoom' in updates && updates.photoZoom !== undefined) {
    merged.photoZoom = clampNumber(updates.photoZoom, 0.5, 5.0, 1.0);
  }
  beers[index] = merged;
  saveBeers(userId, beers);
  return beers[index];
}

export function updateTasting(userId: string, tastingId: string, updates: Partial<Tasting>): Tasting | null {
  const tastings = getTastings(userId);
  const index = tastings.findIndex(t => t.id === tastingId);
  if (index === -1) return null;
  const merged: Tasting = { ...tastings[index], ...updates };
  if ('rating' in updates && updates.rating !== undefined) {
    merged.rating = Number(clampNumber(updates.rating, 1, 10, tastings[index].rating).toFixed(1));
  }
  if ('photoUrl' in updates) {
    merged.photoUrl = sanitizeImageUrl(updates.photoUrl);
  }
  if ('photoPosition' in updates) {
    merged.photoPosition = sanitizePhotoPosition(updates.photoPosition);
  }
  if ('photoZoom' in updates && updates.photoZoom !== undefined) {
    merged.photoZoom = clampNumber(updates.photoZoom, 0.5, 5.0, 1.0);
  }
  if ('location' in updates) {
    merged.location = sanitizeString(updates.location, 150, '');
  }
  if ('notes' in updates) {
    merged.notes = sanitizeString(updates.notes, 2000, '');
  }
  if ('date' in updates && updates.date !== undefined) {
    merged.date = sanitizeString(updates.date, 60, tastings[index].date);
  }
  tastings[index] = merged;
  saveTastings(userId, tastings);
  return tastings[index];
}

export function deleteBeer(userId: string, beerId: string): void {
  const beers = getBeers(userId).filter(b => b.id !== beerId);
  saveBeers(userId, beers);
  // Delete associated tastings
  const tastings = getTastings(userId).filter(t => t.beerId !== beerId);
  saveTastings(userId, tastings);
}

export function deleteTasting(userId: string, tastingId: string): void {
  const tastings = getTastings(userId).filter(t => t.id !== tastingId);
  saveTastings(userId, tastings);
}

// --- Sample Data & Utilities ---

export function loadSampleCraftData(userId: string): { categories: Category[]; beers: Beer[]; tastings: Tasting[] } {
  const sampleCats: Category[] = [
    { id: 'cat_ipa', name: 'IPA', color: '#f59e0b', description: 'Hoppig', createdAt: new Date().toISOString() },
    { id: 'cat_tripel', name: 'Tripel', color: '#eab308', description: 'Krachtig', createdAt: new Date().toISOString() },
  ];
  const sampleBeers: Beer[] = [
    { id: 'beer_1', userId, name: 'Duvel Tripel Hop', brewery: 'Duvel', categoryId: 'cat_ipa', abv: 9.5, dateAdded: new Date().toISOString() },
  ];
  const sampleTastings: Tasting[] = [
    { id: 'tast_1', beerId: 'beer_1', rating: 9, notes: 'Lekker vers van de tap', location: 'Proeflokaal Arendsnest', servingType: 'tap', date: new Date().toISOString() },
  ];
  saveCategories(userId, sampleCats);
  saveBeers(userId, sampleBeers);
  saveTastings(userId, sampleTastings);
  return { categories: sampleCats, beers: sampleBeers, tastings: sampleTastings };
}

export interface UploadedImageBackupEntry {
  id: string;
  targetType: 'beer' | 'tasting' | 'glass';
  targetId: string;
  name: string;
  photoUrl: string;
  photoPosition?: string;
  photoZoom?: number;
  dateAdded?: string;
}

export interface ExportDataPayload {
  categories?: Category[];
  beers?: Beer[];
  tastings?: Tasting[];
  glasses?: BeerGlass[];
}

export interface ImportedBackupPayload {
  categories: Category[];
  beers: Beer[];
  tastings: Tasting[];
  glasses: BeerGlass[];
}

export function exportUserData(userId: string, liveData?: ExportDataPayload): string {
  const categories = liveData?.categories ?? getCategories(userId);
  const rawBeers = liveData?.beers ?? getBeers(userId);
  const tastings = liveData?.tastings ?? getTastings(userId);
  const glasses = liveData?.glasses ?? getGlasses(userId);

  // Zorg dat elk bier waarvan een foto op een proefnotitie staat óók die foto direct op het bier-object meekrijgt
  const beers = rawBeers.map((beer) => {
    const tastingWithPhoto = tastings.find((t) => t.beerId === beer.id && Boolean(t.photoUrl));
    const resolvedPhotoUrl = beer.photoUrl || tastingWithPhoto?.photoUrl;
    return {
      ...beer,
      ...(resolvedPhotoUrl ? { photoUrl: resolvedPhotoUrl } : {}),
      photoPosition: beer.photoPosition || tastingWithPhoto?.photoPosition || '50% 50%',
      photoZoom: beer.photoZoom ?? tastingWithPhoto?.photoZoom ?? 1.0,
    };
  });

  // Bouw een expliciet manifest van alle door de gebruiker geüploade afbeeldingen (bieren, proefsessies & glazen)
  const uploadedImages: UploadedImageBackupEntry[] = [];

  for (const beer of beers) {
    if (beer.photoUrl) {
      uploadedImages.push({
        id: `img_beer_${beer.id}`,
        targetType: 'beer',
        targetId: beer.id,
        name: beer.name,
        photoUrl: beer.photoUrl,
        photoPosition: beer.photoPosition || '50% 50%',
        photoZoom: beer.photoZoom || 1.0,
        dateAdded: beer.dateAdded,
      });
    }
  }

  for (const tasting of tastings) {
    if (tasting.photoUrl) {
      const parentBeer = beers.find((b) => b.id === tasting.beerId);
      uploadedImages.push({
        id: `img_tasting_${tasting.id}`,
        targetType: 'tasting',
        targetId: tasting.id,
        name: parentBeer ? `${parentBeer.name} (proefsessie)` : 'Proefsessie',
        photoUrl: tasting.photoUrl,
        photoPosition: tasting.photoPosition || '50% 50%',
        photoZoom: tasting.photoZoom || 1.0,
        dateAdded: tasting.date,
      });
    }
  }

  for (const glass of glasses) {
    if (glass.photoUrl) {
      uploadedImages.push({
        id: `img_glass_${glass.id}`,
        targetType: 'glass',
        targetId: glass.id,
        name: glass.name,
        photoUrl: glass.photoUrl,
        photoPosition: glass.photoPosition || '50% 50%',
        photoZoom: glass.photoZoom || 1.0,
        dateAdded: glass.dateAdded,
      });
    }
  }

  return JSON.stringify(
    {
      backupMeta: {
        version: '2.0',
        exportedAt: new Date().toISOString(),
        includesUploadedImages: true,
        uploadedImagesCount: uploadedImages.length,
      },
      categories,
      beers,
      tastings,
      glasses,
      uploadedImages,
    },
    null,
    2
  );
}

export function importUserData(
  userId: string,
  jsonString: string
): {
  success: boolean;
  count?: { categories: number; beers: number; tastings: number; glasses: number; photos: number };
  importedData?: ImportedBackupPayload;
  message?: string;
} {
  try {
    if (typeof jsonString !== 'string' || jsonString.length > 100 * 1024 * 1024) {
      return {
        success: false,
        message: 'Back-up bestand is te groot (maximaal 100 MB toegestaan).',
      };
    }

    const data = safeJsonParse<Record<string, unknown>>(jsonString, 100 * 1024 * 1024);
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return {
        success: false,
        message: 'Ongeldig JSON-formaat in back-up bestand.',
      };
    }

    const MAX_ITEMS = 2500;
    const rawCategories = Array.isArray(data.categories) ? data.categories.slice(0, MAX_ITEMS) : [];
    const rawBeers = Array.isArray(data.beers) ? data.beers.slice(0, MAX_ITEMS) : [];
    const rawTastings = Array.isArray(data.tastings) ? data.tastings.slice(0, MAX_ITEMS) : [];
    const rawGlasses = Array.isArray(data.glasses) ? data.glasses.slice(0, MAX_ITEMS) : [];
    const rawUploadedImages = Array.isArray(data.uploadedImages)
      ? data.uploadedImages.slice(0, MAX_ITEMS * 3)
      : [];

    const categories = deduplicateById(
      rawCategories
        .map((c: unknown) => sanitizeImportedCategory(c))
        .filter((c: Category | null): c is Category => c !== null)
    );

    const beers = deduplicateById(
      rawBeers
        .map((b: unknown) => sanitizeImportedBeer(b, userId))
        .filter((b: Beer | null): b is Beer => b !== null)
    );

    const tastings = deduplicateById(
      rawTastings
        .map((t: unknown) => sanitizeImportedTasting(t))
        .filter((t: Tasting | null): t is Tasting => t !== null)
    );

    const glasses = deduplicateById(
      rawGlasses
        .map((g: unknown) => sanitizeImportedGlass(g, userId))
        .filter((g: BeerGlass | null): g is BeerGlass => g !== null)
    );

    // Herstel ook eventuele afbeeldingen uit het expliciete `uploadedImages` back-up blok
    for (const rawImg of rawUploadedImages) {
      if (!rawImg || typeof rawImg !== 'object') continue;
      const imgObj = rawImg as Record<string, unknown>;
      const safeUrl = sanitizeImageUrl(imgObj.photoUrl);
      if (!safeUrl) continue;
      const targetType = imgObj.targetType;
      const targetId = typeof imgObj.targetId === 'string' && isValidEntityId(imgObj.targetId) ? imgObj.targetId : '';
      const safePos = sanitizePhotoPosition(imgObj.photoPosition);
      const safeZoom =
        typeof imgObj.photoZoom === 'number' && Number.isFinite(imgObj.photoZoom)
          ? clampNumber(imgObj.photoZoom, 0.5, 5.0, 1.0)
          : undefined;

      if (targetType === 'beer' && targetId) {
        const beer = beers.find((b) => b.id === targetId);
        if (beer && !beer.photoUrl) {
          beer.photoUrl = safeUrl;
          if (safePos) beer.photoPosition = safePos;
          if (safeZoom !== undefined) beer.photoZoom = safeZoom;
        }
      } else if (targetType === 'tasting' && targetId) {
        const tasting = tastings.find((t) => t.id === targetId);
        if (tasting && !tasting.photoUrl) {
          tasting.photoUrl = safeUrl;
          if (safePos) tasting.photoPosition = safePos;
          if (safeZoom !== undefined) tasting.photoZoom = safeZoom;
        }
      } else if (targetType === 'glass' && targetId) {
        const glass = glasses.find((g) => g.id === targetId);
        if (glass && !glass.photoUrl) {
          glass.photoUrl = safeUrl;
          if (safePos) glass.photoPosition = safePos;
          if (safeZoom !== undefined) glass.photoZoom = safeZoom;
        }
      }
    }

    // Als een proefnotitie een foto heeft en het gekoppelde bier nog niet, koppel deze ook aan het bier
    for (const beer of beers) {
      if (!beer.photoUrl) {
        const tastingWithPhoto = tastings.find((t) => t.beerId === beer.id && Boolean(t.photoUrl));
        if (tastingWithPhoto?.photoUrl) {
          beer.photoUrl = tastingWithPhoto.photoUrl;
        }
      }
    }

    const beerPhotoCount = beers.filter((b) => Boolean(b.photoUrl)).length;
    const glassPhotoCount = glasses.filter((g) => Boolean(g.photoUrl)).length;
    const extraTastingPhotoCount = tastings.filter(
      (t) =>
        Boolean(t.photoUrl) &&
        !beers.some((b) => b.id === t.beerId && b.photoUrl === t.photoUrl)
    ).length;
    const totalPhotosRestored = beerPhotoCount + glassPhotoCount + extraTastingPhotoCount;

    saveCategories(userId, categories);
    saveBeers(userId, beers);
    saveTastings(userId, tastings);
    saveGlasses(userId, glasses);

    return {
      success: true,
      count: {
        categories: categories.length,
        beers: beers.length,
        tastings: tastings.length,
        glasses: glasses.length,
        photos: totalPhotosRestored,
      },
      importedData: {
        categories,
        beers,
        tastings,
        glasses,
      },
    };
  } catch (err: unknown) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Fout bij importeren',
    };
  }
}

export function getBeerSessions(userId: string): BeerSession[] {
  try {
    const raw = localStorage.getItem(getSessionsKey(userId));
    if (!raw) return [];
    const parsed = safeJsonParse<unknown[]>(raw);
    if (!Array.isArray(parsed)) return [];
    return deduplicateById(
      parsed
        .map((s: unknown) => sanitizeBeerSession(s, userId))
        .filter((s: BeerSession | null): s is BeerSession => s !== null)
    );
  } catch {
    return [];
  }
}

export function saveBeerSessions(userId: string, sessions: BeerSession[]): void {
  try {
    localStorage.setItem(getSessionsKey(userId), JSON.stringify(sessions));
  } catch (e) {
    console.warn('localStorage saveBeerSessions quota notice:', e);
  }
}

export function addBeerSession(userId: string, sessionData: Omit<BeerSession, 'id' | 'userId'>): BeerSession {
  const sessions = getBeerSessions(userId);
  const sanitized = sanitizeBeerSession({ ...sessionData, id: generateSecureId('sess') }, userId)!;
  sessions.push(sanitized);
  saveBeerSessions(userId, sessions);
  return sanitized;
}

export function deleteBeerSession(userId: string, sessionId: string): void {
  const sessions = getBeerSessions(userId).filter(s => s.id !== sessionId);
  saveBeerSessions(userId, sessions);
}

// --- Beer Glasses Management ---

export function getGlasses(userId: string): BeerGlass[] {
  try {
    const raw = localStorage.getItem(getGlassesKey(userId));
    if (!raw) return [];
    const parsed = safeJsonParse<unknown[]>(raw);
    if (!Array.isArray(parsed)) return [];
    return deduplicateById(
      parsed
        .map((g: unknown) => sanitizeImportedGlass(g, userId))
        .filter((g: BeerGlass | null): g is BeerGlass => g !== null)
    );
  } catch {
    return [];
  }
}

export function saveGlasses(userId: string, glasses: BeerGlass[]): void {
  try {
    localStorage.setItem(getGlassesKey(userId), JSON.stringify(glasses));
  } catch (e) {
    console.warn('localStorage saveGlasses quota notice:', e);
  }
  queueServerDatabaseSync(userId);
}

export function addGlass(
  userId: string,
  glassData: Omit<BeerGlass, 'id' | 'userId' | 'dateAdded'> & { dateAdded?: string }
): BeerGlass {
  const glasses = getGlasses(userId);
  const newGlass: BeerGlass = {
    id: generateSecureId('glass'),
    userId,
    name: sanitizeString(glassData.name, 120, 'Bierglas'),
    brand: sanitizeString(glassData.brand, 120),
    glassType: sanitizeString(glassData.glassType, 80),
    quantity: Math.round(clampNumber(glassData.quantity, 1, 9999, 1)),
    volumeCl: glassData.volumeCl !== undefined ? clampNumber(glassData.volumeCl, 0, 500, 33) : undefined,
    photoUrl: sanitizeImageUrl(glassData.photoUrl),
    photoPosition: sanitizePhotoPosition(glassData.photoPosition),
    photoZoom: glassData.photoZoom !== undefined ? clampNumber(glassData.photoZoom, 0.5, 5.0, 1.0) : undefined,
    notes: sanitizeString(glassData.notes, 1000),
    favorite: Boolean(glassData.favorite),
    dateAdded: sanitizeString(glassData.dateAdded, 60, new Date().toISOString()),
  };
  glasses.push(newGlass);
  saveGlasses(userId, glasses);
  return newGlass;
}

export function updateGlass(
  userId: string,
  glassId: string,
  updates: Partial<BeerGlass>
): BeerGlass | null {
  const glasses = getGlasses(userId);
  const index = glasses.findIndex(g => g.id === glassId);
  if (index === -1) return null;
  const merged: BeerGlass = {
    ...glasses[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  if ('name' in updates && updates.name !== undefined) {
    merged.name = sanitizeString(updates.name, 120, glasses[index].name);
  }
  if ('brand' in updates) {
    merged.brand = sanitizeString(updates.brand, 120, '');
  }
  if ('glassType' in updates) {
    merged.glassType = sanitizeString(updates.glassType, 80, '');
  }
  if ('quantity' in updates && updates.quantity !== undefined) {
    merged.quantity = Math.round(clampNumber(updates.quantity, 1, 9999, 1));
  }
  if ('volumeCl' in updates && updates.volumeCl !== undefined) {
    merged.volumeCl = clampNumber(updates.volumeCl, 0, 500, 33);
  }
  if ('notes' in updates) {
    merged.notes = sanitizeString(updates.notes, 1000, '');
  }
  if ('favorite' in updates && updates.favorite !== undefined) {
    merged.favorite = Boolean(updates.favorite);
  }
  if ('photoUrl' in updates) {
    merged.photoUrl = sanitizeImageUrl(updates.photoUrl);
  }
  if ('photoPosition' in updates) {
    merged.photoPosition = sanitizePhotoPosition(updates.photoPosition);
  }
  if ('photoZoom' in updates && updates.photoZoom !== undefined) {
    merged.photoZoom = clampNumber(updates.photoZoom, 0.5, 5.0, 1.0);
  }
  glasses[index] = merged;
  saveGlasses(userId, glasses);
  return glasses[index];
}

export function deleteGlass(userId: string, glassId: string): void {
  const glasses = getGlasses(userId).filter(g => g.id !== glassId);
  saveGlasses(userId, glasses);
}

// --- User Settings Management ---

export const DEFAULT_USER_SETTINGS: UserSettings = {
  lightMode: false,
  showExtrasDealBadge: false, // Standaard uitgeschakeld op verzoek van gebruiker
  showNavCollectionCounts: true,
  showExtrasTab: true,
  showDealScanner: true,
  defaultStartTab: 'dashboard',
  defaultBeerPrice: 3.8,
  defaultGlassSizeCl: 30,
};

export function getUserSettings(userId: string): UserSettings {
  try {
    const raw = localStorage.getItem(`bierlog_settings_${userId}`);
    if (!raw) return { ...DEFAULT_USER_SETTINGS };
    const parsed = safeJsonParse<unknown>(raw);
    return sanitizeUserSettings(parsed, DEFAULT_USER_SETTINGS);
  } catch {
    return { ...DEFAULT_USER_SETTINGS };
  }
}

export function saveUserSettings(userId: string, settings: UserSettings): UserSettings {
  const sanitized = sanitizeUserSettings(settings, DEFAULT_USER_SETTINGS);
  try {
    localStorage.setItem(`bierlog_settings_${userId}`, JSON.stringify(sanitized));
  } catch (e) {
    console.warn('localStorage saveUserSettings quota notice:', e);
  }
  return sanitized;
}

// --- Automatische Synchronisatie met Eigen Docker PostgreSQL Server Database ---

const syncTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function queueServerDatabaseSync(userId: string): void {
  if (!isValidEntityId(userId)) return;
  const active = getActiveUser();
  if (!active || active.id !== userId) return;

  const existingTimer = syncTimers.get(userId);
  if (existingTimer) clearTimeout(existingTimer);

  const timer = setTimeout(async () => {
    syncTimers.delete(userId);
    try {
      await fetch('/api/me/records/sync', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          categories: getCategories(userId),
          beers: getBeers(userId),
          tastings: getTastings(userId),
          glasses: getGlasses(userId),
        }),
      });
    } catch {
      // Negeer netwerkfouten tijdens achtergrond-sync
    }
  }, 600);

  syncTimers.set(userId, timer);
}

export async function hydrateUserFromServerDatabase(userId: string): Promise<boolean> {
  if (!isValidEntityId(userId)) return false;
  try {
    const res = await fetch('/api/me', {
      method: 'GET',
      credentials: 'include',
    });
    if (!res.ok) return false;
    const data = (await res.json()) as {
      records?: {
        categories?: Category[];
        beers?: Beer[];
        tastings?: Tasting[];
        glasses?: BeerGlass[];
      };
    };
    if (!data.records) return false;

    let updated = false;
    if (Array.isArray(data.records.categories) && data.records.categories.length > 0 && getCategories(userId).length === 0) {
      localStorage.setItem(`bierlog_categories_${userId}`, JSON.stringify(data.records.categories));
      updated = true;
    }
    if (Array.isArray(data.records.beers) && data.records.beers.length > 0 && getBeers(userId).length === 0) {
      localStorage.setItem(`bierlog_beers_${userId}`, JSON.stringify(data.records.beers));
      updated = true;
    }
    if (Array.isArray(data.records.tastings) && data.records.tastings.length > 0 && getTastings(userId).length === 0) {
      localStorage.setItem(`bierlog_tastings_${userId}`, JSON.stringify(data.records.tastings));
      updated = true;
    }
    if (Array.isArray(data.records.glasses) && data.records.glasses.length > 0 && getGlasses(userId).length === 0) {
      localStorage.setItem(getGlassesKey(userId), JSON.stringify(data.records.glasses));
      updated = true;
    }
    return updated;
  } catch {
    return false;
  }
}
