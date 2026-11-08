import { Beer, Category, UserAccount, Tasting, BeerSession, BeerGlass, UserSettings } from '../types';
import {
  auth,
  db,
  collection,
  collectionGroup,
  getDocs,
  deleteDoc,
  doc,
  isClientFirestoreEnabled,
} from '../firebase';
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
  getCanonicalUserIdForEmail,
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

interface UserMemoryCache {
  categories?: Category[];
  beers?: Beer[];
  tastings?: Tasting[];
  glasses?: BeerGlass[];
  sessions?: BeerSession[];
}

// In-memory store zodat grote collecties met hoge-resolutie foto's nooit verloren gaan als de browser 5MB localStorage limiet bereikt wordt
const memoryCollections = new Map<string, UserMemoryCache>();

function getUserMemory(userId: string): UserMemoryCache {
  let entry = memoryCollections.get(userId);
  if (!entry) {
    entry = {};
    memoryCollections.set(userId, entry);
  }
  return entry;
}

function deduplicateById<T extends { id: string; photoUrl?: string }>(items: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of items) {
    if (item && isValidEntityId(item.id)) {
      const existing = map.get(item.id);
      if (existing) {
        // Behoud altijd de foto als één van beide versies een geüploade foto bevat
        const merged = {
          ...existing,
          ...item,
          photoUrl: item.photoUrl || existing.photoUrl,
        };
        map.set(item.id, merged);
      } else {
        map.set(item.id, item);
      }
    }
  }
  return Array.from(map.values());
}

function safeSetLocalStorageWithPhotoFallback<T extends { id: string; photoUrl?: string }>(
  key: string,
  items: T[]
): void {
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch {
    // Als 26+ bieren met foto's de 5 MB browser localStorage limiet overschrijden:
    // bewaar metadata in localStorage en houd de volledige foto's in memoryCollections + de lokale server-database!
    try {
      const lightweight = items.map((item) => {
        if (item.photoUrl && item.photoUrl.startsWith('data:')) {
          const copy = { ...item };
          delete copy.photoUrl;
          return copy;
        }
        return item;
      });
      localStorage.setItem(key, JSON.stringify(lightweight));
    } catch {
      // Negeer als localStorage volledig vol zit; de lokale server-database slaat alles op
    }
  }
}

// --- User Management ---

export function getActiveUser(): UserAccount | null {
  const storedId = localStorage.getItem(ACTIVE_USER_ID_KEY);
  if (!storedId || !isValidEntityId(storedId)) return null;
  const users = getAllUsers();
  let direct = users.find(u => u.id === storedId);

  // Fallback: controleer of er een geldige gebruiker met storedId in de ruwe lijst staat
  if (!direct) {
    try {
      const raw = localStorage.getItem(USERS_STORAGE_KEY);
      if (raw) {
        const parsed = safeJsonParse<unknown[]>(raw);
        if (Array.isArray(parsed)) {
          const foundRaw = parsed.find(
            (u): u is Record<string, unknown> => Boolean(u && typeof u === 'object' && (u as any).id === storedId)
          );
          if (foundRaw) {
            direct = {
              id: String(foundRaw.id),
              name: sanitizeString(foundRaw.name, 100, 'Bierliefhebber'),
              googleName: foundRaw.googleName ? sanitizeString(foundRaw.googleName, 100) : undefined,
              email: sanitizeString(foundRaw.email, 180, 'gebruiker@bierlog.nl'),
              role: foundRaw.role === 'admin' ? 'admin' : foundRaw.role === 'user' ? 'user' : undefined,
              avatarUrl: sanitizeImageUrl(foundRaw.avatarUrl),
              createdAt: sanitizeString(foundRaw.createdAt, 60, new Date().toISOString()),
            };
          }
        }
      }
    } catch {
      // ignore
    }
  }

  if (!direct && users.length > 0) {
    direct = users[0];
  }

  if (direct) {
    if (!isPlaceholderUserEmail(direct.email)) {
      const canonical = getCanonicalUserIdForEmail(direct.email);
      if (canonical && direct.id !== canonical) {
        const updated: UserAccount = { ...direct, id: canonical };
        setActiveUser(updated);
        return updated;
      }
    }
    return direct;
  }

  return null;
}

function isPlaceholderUserEmail(email: string | undefined | null): boolean {
  if (!email) return true;
  const lower = email.trim().toLowerCase();
  return !lower || !lower.includes('@') || lower === 'gebruiker@bierlog.nl';
}

/**
 * Voegt eventuele dubbele lokale accounts van dezelfde gebruiker (bijv. na wisselen tussen
 * server-login en Firebase login met hetzelfde e-mailadres) samen zodat bieren, proefnotities,
 * glazen en categorieën nooit verspreid raken over 2 ID's en een account nooit dubbel verschijnt.
 */
export function consolidateLocalAccountsForUser(targetUser: UserAccount): void {
  if (!targetUser || !isValidEntityId(targetUser.id)) return;
  const targetId = targetUser.id;
  const targetEmail = !isPlaceholderUserEmail(targetUser.email)
    ? targetUser.email.trim().toLowerCase()
    : '';

  try {
    const rawList = localStorage.getItem(USERS_STORAGE_KEY);
    const parsedUsers = rawList ? safeJsonParse<unknown[]>(rawList) : [];
    const existingUsers: UserAccount[] = Array.isArray(parsedUsers)
      ? parsedUsers
          .filter((u): u is Record<string, unknown> =>
            Boolean(u && typeof u === 'object' && isValidEntityId((u as any).id))
          )
          .map((u) => ({
            id: String(u.id),
            name: sanitizeString(u.name, 100, 'Bierliefhebber'),
            googleName: u.googleName ? sanitizeString(u.googleName, 100) : undefined,
            email: sanitizeString(u.email, 180, 'gebruiker@bierlog.nl'),
            role: u.role === 'admin' ? 'admin' : u.role === 'user' ? 'user' : undefined,
            avatarUrl: sanitizeImageUrl(u.avatarUrl),
            createdAt: sanitizeString(u.createdAt, 60, new Date().toISOString()),
          }))
      : [];

    // Voeg lokale accounts samen die hetzelfde e-mailadres hebben óf een lokaal gastaccount zijn
    const uidsToMerge = new Set<string>();
    const otherRealUserIds = new Set<string>();

    for (const u of existingUsers) {
      if (u.id === targetId) continue;
      const uEmail = !isPlaceholderUserEmail(u.email) ? u.email.trim().toLowerCase() : '';
      if (targetEmail && uEmail && uEmail === targetEmail) {
        uidsToMerge.add(u.id);
      } else if (targetEmail && !uEmail) {
        uidsToMerge.add(u.id);
      } else if (uEmail) {
        otherRealUserIds.add(u.id);
      }
    }

    // Controleer ook op losse bierlog_beers_<uid> sleutels in localStorage die op een eerder ID stonden
    if (targetEmail && otherRealUserIds.size === 0) {
      const prefixes = [
        'bierlog_beers_',
        'bierlog_categories_',
        'bierlog_tastings_',
        'bierlog_glasses_',
        'bierlog_sessions_',
      ];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        for (const prefix of prefixes) {
          if (key.startsWith(prefix)) {
            const candidateUid = key.slice(prefix.length);
            if (
              candidateUid &&
              candidateUid !== targetId &&
              isValidEntityId(candidateUid) &&
              !otherRealUserIds.has(candidateUid)
            ) {
              uidsToMerge.add(candidateUid);
            }
          }
        }
      }
    }

    if (uidsToMerge.size > 0) {
      let mergedCats = getCategories(targetId);
      let mergedBeers = getBeers(targetId);
      let mergedTastings = getTastings(targetId);
      let mergedGlasses = getGlasses(targetId);
      let mergedSessions = getBeerSessions(targetId);

      for (const oldUid of uidsToMerge) {
        const oldCats = getCategories(oldUid);
        const oldBeers = getBeers(oldUid).map((b) => ({ ...b, userId: targetId }));
        const oldTastings = getTastings(oldUid);
        const oldGlasses = getGlasses(oldUid).map((g) => ({ ...g, userId: targetId }));
        const oldSessions = getBeerSessions(oldUid).map((s) => ({ ...s, userId: targetId }));

        if (oldCats.length > 0) mergedCats = deduplicateById([...oldCats, ...mergedCats]);
        if (oldBeers.length > 0) mergedBeers = deduplicateById([...oldBeers, ...mergedBeers]);
        if (oldTastings.length > 0) mergedTastings = deduplicateById([...oldTastings, ...mergedTastings]);
        if (oldGlasses.length > 0) mergedGlasses = deduplicateById([...oldGlasses, ...mergedGlasses]);
        if (oldSessions.length > 0) mergedSessions = deduplicateById([...oldSessions, ...mergedSessions]);

        memoryCollections.delete(oldUid);
        localStorage.removeItem(`bierlog_categories_${oldUid}`);
        localStorage.removeItem(`bierlog_beers_${oldUid}`);
        localStorage.removeItem(`bierlog_tastings_${oldUid}`);
        localStorage.removeItem(`bierlog_glasses_${oldUid}`);
        localStorage.removeItem(`bierlog_sessions_${oldUid}`);
        localStorage.removeItem(`bierlog_settings_${oldUid}`);
      }

      const mem = getUserMemory(targetId);
      mem.categories = mergedCats;
      mem.beers = mergedBeers;
      mem.tastings = mergedTastings;
      mem.glasses = mergedGlasses;
      mem.sessions = mergedSessions;

      safeSetLocalStorageWithPhotoFallback(`bierlog_categories_${targetId}`, mergedCats);
      safeSetLocalStorageWithPhotoFallback(`bierlog_beers_${targetId}`, mergedBeers);
      safeSetLocalStorageWithPhotoFallback(`bierlog_tastings_${targetId}`, mergedTastings);
      safeSetLocalStorageWithPhotoFallback(`bierlog_glasses_${targetId}`, mergedGlasses);
      safeSetLocalStorageWithPhotoFallback(`bierlog_sessions_${targetId}`, mergedSessions);
    }

    // Dedupliceer de gebruikerslijst op ID én op e-mailadres
    const cleanedUsers: UserAccount[] = [];
    const seenEmails = new Set<string>();
    const seenIds = new Set<string>();

    const allCandidates = [targetUser, ...existingUsers.filter((u) => !uidsToMerge.has(u.id))];
    for (const u of allCandidates) {
      if (!u || !isValidEntityId(u.id) || seenIds.has(u.id)) continue;
      const uEmail = !isPlaceholderUserEmail(u.email) ? u.email.trim().toLowerCase() : '';
      if (uEmail && seenEmails.has(uEmail)) continue;
      seenIds.add(u.id);
      if (uEmail) seenEmails.add(uEmail);
      cleanedUsers.push(u);
    }

    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(cleanedUsers));
    } catch {
      // ignore quota
    }
  } catch (e) {
    console.warn('Consolidatie lokale accounts melding:', e);
  }
}

export function setActiveUser(user: UserAccount | null): void {
  if (!user || !isValidEntityId(user.id)) {
    localStorage.removeItem(ACTIVE_USER_ID_KEY);
    return;
  }
  const cleanEmail = sanitizeString(user.email, 180, 'gebruiker@bierlog.nl');
  const canonicalId =
    (!isPlaceholderUserEmail(cleanEmail) && getCanonicalUserIdForEmail(cleanEmail)) ||
    user.id;
  const sanitizedUser: UserAccount = {
    id: canonicalId,
    name: sanitizeString(user.name, 100, 'Bierliefhebber'),
    googleName: user.googleName ? sanitizeString(user.googleName, 100) : undefined,
    email: cleanEmail,
    role: user.role === 'admin' ? 'admin' : user.role === 'user' ? 'user' : undefined,
    avatarUrl: sanitizeImageUrl(user.avatarUrl),
    createdAt: sanitizeString(user.createdAt, 60, new Date().toISOString()),
  };
  consolidateLocalAccountsForUser(sanitizedUser);
  try {
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
    const mapped = parsed
      .filter((u): u is Record<string, unknown> => Boolean(u && typeof u === 'object' && isValidEntityId((u as any).id)))
      .map((u): UserAccount => ({
        id: String(u.id),
        name: sanitizeString(u.name, 100, 'Bierliefhebber'),
        googleName: u.googleName ? sanitizeString(u.googleName, 100) : undefined,
        email: sanitizeString(u.email, 180, 'gebruiker@bierlog.nl'),
        role: u.role === 'admin' ? 'admin' : u.role === 'user' ? 'user' : undefined,
        avatarUrl: sanitizeImageUrl(u.avatarUrl),
        createdAt: sanitizeString(u.createdAt, 60, new Date().toISOString()),
      }));

    const storedActiveId = localStorage.getItem(ACTIVE_USER_ID_KEY);

    // Sorteer zodat het actieve account en echte geverifieerde accounts voorrang krijgen bij deduplicatie op e-mail
    mapped.sort((a, b) => {
      if (a.id === storedActiveId) return -1;
      if (b.id === storedActiveId) return 1;
      const aIsGuest = a.id.startsWith('usr_');
      const bIsGuest = b.id.startsWith('usr_');
      if (aIsGuest !== bIsGuest) return aIsGuest ? 1 : -1;
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });

    // Dedupliceer op e-mailadres zodat één persoon nooit twee accounts heeft
    const out: UserAccount[] = [];
    const seenEmails = new Set<string>();
    const seenIds = new Set<string>();
    for (const u of mapped) {
      if (seenIds.has(u.id)) continue;
      const emailLower = !isPlaceholderUserEmail(u.email) ? u.email.trim().toLowerCase() : '';
      if (emailLower && seenEmails.has(emailLower)) continue;
      seenIds.add(u.id);
      if (emailLower) seenEmails.add(emailLower);
      out.push(u);
    }

    // Houd USERS_STORAGE_KEY altijd synchroon met de gededupliceerde lijst
    if (out.length !== mapped.length) {
      try {
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(out));
      } catch {
        // ignore quota
      }
    }

    return out;
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
  const mem = getUserMemory(userId);
  let fromStorage: Category[] = [];
  try {
    const raw = localStorage.getItem(`bierlog_categories_${userId}`);
    if (raw) {
      const parsed = safeJsonParse<unknown[]>(raw);
      if (Array.isArray(parsed)) {
        fromStorage = parsed
          .map((c: unknown) => sanitizeImportedCategory(c))
          .filter((c: Category | null): c is Category => c !== null);
      }
    }
  } catch {
    // ignore
  }
  const combined = deduplicateById([...fromStorage, ...(mem.categories || [])]);
  mem.categories = combined;
  return combined;
}

export function saveCategories(userId: string, categories: Category[]): void {
  const deduped = deduplicateById(categories);
  getUserMemory(userId).categories = deduped;
  safeSetLocalStorageWithPhotoFallback(`bierlog_categories_${userId}`, deduped);
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
  void deleteServerRecordNow('categories', id);
}

// --- Beers & Tastings ---

export function getBeers(userId: string): Beer[] {
  const mem = getUserMemory(userId);
  let fromStorage: Beer[] = [];
  try {
    const raw = localStorage.getItem(`bierlog_beers_${userId}`);
    if (raw) {
      const parsed = safeJsonParse<unknown[]>(raw);
      if (Array.isArray(parsed)) {
        fromStorage = parsed
          .map((b: unknown) => sanitizeImportedBeer(b, userId))
          .filter((b: Beer | null): b is Beer => b !== null);
      }
    }
  } catch {
    // ignore
  }
  const combined = deduplicateById([...fromStorage, ...(mem.beers || [])]);
  mem.beers = combined;
  return combined;
}

export function getTastings(userId: string): Tasting[] {
  const mem = getUserMemory(userId);
  let fromStorage: Tasting[] = [];
  try {
    const raw = localStorage.getItem(`bierlog_tastings_${userId}`);
    if (raw) {
      const parsed = safeJsonParse<unknown[]>(raw);
      if (Array.isArray(parsed)) {
        fromStorage = parsed
          .map((t: unknown) => sanitizeImportedTasting(t))
          .filter((t: Tasting | null): t is Tasting => t !== null);
      }
    }
  } catch {
    // ignore
  }
  const combined = deduplicateById([...fromStorage, ...(mem.tastings || [])]);
  mem.tastings = combined;
  return combined;
}

export function saveBeers(userId: string, beers: Beer[]): void {
  const deduped = deduplicateById(beers);
  getUserMemory(userId).beers = deduped;
  safeSetLocalStorageWithPhotoFallback(`bierlog_beers_${userId}`, deduped);
  queueServerDatabaseSync(userId);
}

export function saveTastings(userId: string, tastings: Tasting[]): void {
  const deduped = deduplicateById(tastings);
  getUserMemory(userId).tastings = deduped;
  safeSetLocalStorageWithPhotoFallback(`bierlog_tastings_${userId}`, deduped);
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
  const tastings = getTastings(userId).filter(t => t.beerId !== beerId);
  saveTastings(userId, tastings);
  void deleteServerRecordNow('beers', beerId);
}

export function deleteTasting(userId: string, tastingId: string): void {
  const tastings = getTastings(userId).filter(t => t.id !== tastingId);
  saveTastings(userId, tastings);
  void deleteServerRecordNow('tastings', tastingId);
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
    let sourceContainer: Record<string, unknown> = data;
    if (Array.isArray(data.users) && data.users.length > 0) {
      const activeUser = getActiveUser();
      const targetEmail = activeUser?.email ? activeUser.email.trim().toLowerCase() : '';
      const matchedEntry = (data.users as unknown[]).find((entry) => {
        if (!entry || typeof entry !== 'object') return false;
        const e = entry as Record<string, unknown>;
        const uObj = e.user && typeof e.user === 'object' ? (e.user as Record<string, unknown>) : e;
        const entryId = String(uObj.id || uObj.uid || '');
        const entryEmail = String(uObj.email || '').trim().toLowerCase();
        return entryId === userId || (Boolean(targetEmail) && entryEmail === targetEmail);
      }) as Record<string, unknown> | undefined;

      if (!matchedEntry) {
        return {
          success: false,
          message:
            'Dit bestand is een multi-user Admin-export en bevat geen gegevens voor het huidige account. Gebruik het Beheerderspaneel om een volledige systeemback-up voor alle gebruikers te importeren.',
        };
      }
      sourceContainer = matchedEntry;
    }

    const rawCategories = Array.isArray(sourceContainer.categories)
      ? sourceContainer.categories.slice(0, MAX_ITEMS)
      : [];
    const rawBeers = Array.isArray(sourceContainer.beers)
      ? sourceContainer.beers.slice(0, MAX_ITEMS)
      : [];
    const rawTastings = Array.isArray(sourceContainer.tastings)
      ? sourceContainer.tastings.slice(0, MAX_ITEMS)
      : [];
    const rawGlasses = Array.isArray(sourceContainer.glasses)
      ? sourceContainer.glasses.slice(0, MAX_ITEMS)
      : [];
    const rawUploadedImages = Array.isArray(sourceContainer.uploadedImages)
      ? sourceContainer.uploadedImages.slice(0, MAX_ITEMS * 3)
      : Array.isArray(data.uploadedImages)
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
  const mem = getUserMemory(userId);
  let fromStorage: BeerSession[] = [];
  try {
    const raw = localStorage.getItem(getSessionsKey(userId));
    if (raw) {
      const parsed = safeJsonParse<unknown[]>(raw);
      if (Array.isArray(parsed)) {
        fromStorage = parsed
          .map((s: unknown) => sanitizeBeerSession(s, userId))
          .filter((s: BeerSession | null): s is BeerSession => s !== null);
      }
    }
  } catch {
    // ignore
  }
  const combined = deduplicateById([...fromStorage, ...(mem.sessions || [])]);
  mem.sessions = combined;
  return combined;
}

export function saveBeerSessions(userId: string, sessions: BeerSession[]): void {
  const deduped = deduplicateById(sessions);
  getUserMemory(userId).sessions = deduped;
  safeSetLocalStorageWithPhotoFallback(getSessionsKey(userId), deduped);
  queueServerDatabaseSync(userId);
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
  void deleteServerRecordNow('sessions', sessionId);
}

// --- Beer Glasses Management ---

export function getGlasses(userId: string): BeerGlass[] {
  const mem = getUserMemory(userId);
  let fromStorage: BeerGlass[] = [];
  try {
    const raw = localStorage.getItem(getGlassesKey(userId));
    if (raw) {
      const parsed = safeJsonParse<unknown[]>(raw);
      if (Array.isArray(parsed)) {
        fromStorage = parsed
          .map((g: unknown) => sanitizeImportedGlass(g, userId))
          .filter((g: BeerGlass | null): g is BeerGlass => g !== null);
      }
    }
  } catch {
    // ignore
  }
  const combined = deduplicateById([...fromStorage, ...(mem.glasses || [])]);
  mem.glasses = combined;
  return combined;
}

export function saveGlasses(userId: string, glasses: BeerGlass[]): void {
  const deduped = deduplicateById(glasses);
  getUserMemory(userId).glasses = deduped;
  safeSetLocalStorageWithPhotoFallback(getGlassesKey(userId), deduped);
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
  void deleteServerRecordNow('glasses', glassId);
}

// --- User Settings Management ---

export const DEFAULT_USER_SETTINGS: UserSettings = {
  lightMode: false,
  language: 'auto',
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

// --- Automatische Synchronisatie met Centrale Server Database ---

const syncTimers = new Map<string, ReturnType<typeof setTimeout>>();

async function waitForAuthReady(timeoutMs = 1500): Promise<void> {
  try {
    if (!auth.currentUser && typeof (auth as any).authStateReady === 'function') {
      await Promise.race([
        (auth as any).authStateReady(),
        new Promise((resolve) => setTimeout(resolve, timeoutMs)),
      ]);
    }
  } catch {
    // ignore
  }
}

export async function buildServerAuthHeaders(includeJsonContentType = true): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  if (includeJsonContentType) {
    headers['Content-Type'] = 'application/json';
  }
  try {
    await waitForAuthReady();
    if (auth.currentUser) {
      const idToken = await auth.currentUser.getIdToken();
      if (idToken) {
        headers.Authorization = `Bearer ${idToken}`;
      }
    }
  } catch {
    // Fallback naar sessie-cookie
  }
  return headers;
}

export async function deleteServerRecordNow(
  collectionType: 'categories' | 'beers' | 'tastings' | 'glasses' | 'sessions',
  recordId: string
): Promise<boolean> {
  if (!isValidEntityId(recordId)) return false;
  try {
    const headers = await buildServerAuthHeaders(false);
    const res = await fetch(
      `/api/me/records/${encodeURIComponent(collectionType)}/${encodeURIComponent(recordId)}`,
      {
        method: 'DELETE',
        credentials: 'include',
        headers,
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

export async function clearServerCollectionsNow(): Promise<boolean> {
  try {
    const headers = await buildServerAuthHeaders(false);
    const res = await fetch('/api/me/records', {
      method: 'DELETE',
      credentials: 'include',
      headers,
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function pushUserRecordsToServerNow(userId: string): Promise<boolean> {
  if (!isValidEntityId(userId)) return false;
  try {
    const headers = await buildServerAuthHeaders(true);
    const payload = JSON.stringify({
      categories: getCategories(userId),
      beers: getBeers(userId),
      tastings: getTastings(userId),
      glasses: getGlasses(userId),
      sessions: getBeerSessions(userId),
    });

    let res = await fetch('/api/me/records/sync', {
      method: 'POST',
      credentials: 'include',
      headers,
      body: payload,
    });

    if (res.status === 401 && auth.currentUser) {
      const freshToken = await auth.currentUser.getIdToken(true);
      await fetch('/api/auth/google', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: freshToken }),
      });
      res = await fetch('/api/me/records/sync', {
        method: 'POST',
        credentials: 'include',
        headers: {
          ...headers,
          Authorization: `Bearer ${freshToken}`,
        },
        body: payload,
      });
    }

    return res.ok;
  } catch {
    return false;
  }
}

export function queueServerDatabaseSync(userId: string): void {
  if (!isValidEntityId(userId)) return;
  const active = getActiveUser();
  if (!active || active.id !== userId) return;

  const existingTimer = syncTimers.get(userId);
  if (existingTimer) clearTimeout(existingTimer);

  const timer = setTimeout(async () => {
    syncTimers.delete(userId);
    await pushUserRecordsToServerNow(userId);
  }, 300);

  syncTimers.set(userId, timer);
}

/**
 * Volledige tweerichting-synchronisatie tussen de browser en de lokale server-database:
 * 1) Voegt eventuele lokale dubbele UIDs en gast-collecties voor dezelfde gebruiker samen
 * 2) Haalt server-records (inclusief foto's) op via /api/me en voegt ze samen met lokale records
 * 3) Pusht de complete samengevoegde collectie (inclusief alle foto's) direct naar /api/me/records/sync
 */
export async function syncUserWithServerDatabase(user: UserAccount): Promise<boolean> {
  if (!user || !isValidEntityId(user.id)) return false;
  consolidateLocalAccountsForUser(user);
  let userId = user.id;

  try {
    const getHeaders = await buildServerAuthHeaders(false);
    let res = await fetch('/api/me', {
      method: 'GET',
      credentials: 'include',
      headers: getHeaders,
    });

    if (res.status === 401 && auth.currentUser) {
      const freshToken = await auth.currentUser.getIdToken(true);
      await fetch('/api/auth/google', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: freshToken }),
      });
      res = await fetch('/api/me', {
        method: 'GET',
        credentials: 'include',
        headers: {
          ...getHeaders,
          Authorization: `Bearer ${freshToken}`,
        },
      });
    }

    let localCats = getCategories(userId);
    let localBeers = getBeers(userId);
    let localTastings = getTastings(userId);
    let localGlasses = getGlasses(userId);

    if (res.ok) {
      const data = (await res.json()) as {
        user?: {
          id?: string;
          email?: string;
          name?: string;
          googleName?: string;
          role?: 'admin' | 'user';
          avatarUrl?: string;
        };
        records?: {
          categories?: unknown[];
          beers?: unknown[];
          tastings?: unknown[];
          glasses?: unknown[];
        };
      };

      if (data.user?.id && isValidEntityId(data.user.id) && data.user.id !== userId) {
        const canonicalUser: UserAccount = {
          ...user,
          id: data.user.id,
          email: data.user.email || user.email,
          name: data.user.name || user.name,
          role: data.user.role || user.role,
        };
        setActiveUser(canonicalUser);
        userId = canonicalUser.id;
        localCats = deduplicateById([...getCategories(userId), ...localCats]);
        localBeers = deduplicateById([
          ...getBeers(userId),
          ...localBeers.map((b) => ({ ...b, userId })),
        ]);
        localTastings = deduplicateById([...getTastings(userId), ...localTastings]);
        localGlasses = deduplicateById([
          ...getGlasses(userId),
          ...localGlasses.map((g) => ({ ...g, userId })),
        ]);
      }

      if (data.records) {
        const serverCats = Array.isArray(data.records.categories)
          ? data.records.categories
              .map((c) => sanitizeImportedCategory(c))
              .filter((c): c is Category => c !== null)
          : [];
        const serverBeers = Array.isArray(data.records.beers)
          ? data.records.beers
              .map((b) => sanitizeImportedBeer(b, userId))
              .filter((b): b is Beer => b !== null)
          : [];
        const serverTastings = Array.isArray(data.records.tastings)
          ? data.records.tastings
              .map((t) => sanitizeImportedTasting(t))
              .filter((t): t is Tasting => t !== null)
          : [];
        const serverGlasses = Array.isArray(data.records.glasses)
          ? data.records.glasses
              .map((g) => sanitizeImportedGlass(g, userId))
              .filter((g): g is BeerGlass => g !== null)
          : [];

        // Merge server + lokaal (en behoud altijd foto's indien aanwezig)
        localCats = deduplicateById([...serverCats, ...localCats]);
        localBeers = deduplicateById([...serverBeers, ...localBeers]);
        localTastings = deduplicateById([...serverTastings, ...localTastings]);
        localGlasses = deduplicateById([...serverGlasses, ...localGlasses]);

        const mem = getUserMemory(userId);
        mem.categories = localCats;
        mem.beers = localBeers;
        mem.tastings = localTastings;
        mem.glasses = localGlasses;

        safeSetLocalStorageWithPhotoFallback(`bierlog_categories_${userId}`, localCats);
        safeSetLocalStorageWithPhotoFallback(`bierlog_beers_${userId}`, localBeers);
        safeSetLocalStorageWithPhotoFallback(`bierlog_tastings_${userId}`, localTastings);
        safeSetLocalStorageWithPhotoFallback(getGlassesKey(userId), localGlasses);
      }
    }

    // Push de volledige samengevoegde collectie (inclusief alle foto's) direct naar de lokale server-database
    await pushUserRecordsToServerNow(userId);
    return true;
  } catch {
    return false;
  }
}

export async function hydrateUserFromServerDatabase(userId: string): Promise<boolean> {
  const active = getActiveUser();
  if (active && active.id === userId) {
    return syncUserWithServerDatabase(active);
  }
  return false;
}

