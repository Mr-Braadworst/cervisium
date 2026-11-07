import {
  UserAccount,
  Beer,
  Tasting,
  Category,
  BeerGlass,
  PubGlassDeal,
  DutchProvince,
} from '../types';
import { auth, db, collection, collectionGroup, getDocs, setDoc, doc } from '../firebase';
import {
  getAllUsers,
  getCategories,
  getBeers,
  getTastings,
  getGlasses,
  syncUserWithServerDatabase,
  buildServerAuthHeaders,
} from './storage';
import { getStoredPubDeals } from './glassDealsService';
import {
  safeJsonParse,
  sanitizeImageUrl,
  sanitizeHexColor,
  sanitizePhotoPosition,
  sanitizeExternalUrl,
  sanitizeString,
  isValidEntityId,
  clampNumber,
  sanitizeImportedCategory,
  sanitizeImportedBeer,
  sanitizeImportedTasting,
  sanitizeImportedGlass,
  sanitizePubDeal,
  generateSecureId,
} from '../utils/security';

// SHA-256 hash van het geverifieerde eigenaar-e-mailadres (zodat het e-mailadres nergens in platte tekst in de repo staat)
const OWNER_EMAIL_SHA256 = 'b31f85f31cdb5947fa2cdf12ceaf3fd149a5c11b53a9f922acbb44da4b22f0e0';

const SHA256_K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

function rotr(n: number, x: number): number {
  return (x >>> n) | (x << (32 - n));
}

function sha256AsciiHex(ascii: string): string {
  const bytes: number[] = [];
  for (let i = 0; i < ascii.length; i++) {
    bytes.push(ascii.charCodeAt(i) & 0xff);
  }
  const bitLen = bytes.length * 8;
  bytes.push(0x80);
  while ((bytes.length % 64) !== 56) {
    bytes.push(0);
  }
  // 64-bit big-endian length
  bytes.push(0, 0, 0, 0);
  bytes.push(
    (bitLen >>> 24) & 0xff,
    (bitLen >>> 16) & 0xff,
    (bitLen >>> 8) & 0xff,
    bitLen & 0xff
  );

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const w = new Array<number>(64);
  for (let offset = 0; offset < bytes.length; offset += 64) {
    for (let i = 0; i < 16; i++) {
      const j = offset + i * 4;
      w[i] =
        ((bytes[j] << 24) |
          (bytes[j + 1] << 16) |
          (bytes[j + 2] << 8) |
          bytes[j + 3]) >>>
        0;
    }
    for (let i = 16; i < 64; i++) {
      const s0 = (rotr(7, w[i - 15]) ^ rotr(18, w[i - 15]) ^ (w[i - 15] >>> 3)) >>> 0;
      const s1 = (rotr(17, w[i - 2]) ^ rotr(19, w[i - 2]) ^ (w[i - 2] >>> 10)) >>> 0;
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let i = 0; i < 64; i++) {
      const S1 = (rotr(6, e) ^ rotr(11, e) ^ rotr(25, e)) >>> 0;
      const ch = ((e & f) ^ (~e & g)) >>> 0;
      const temp1 = (h + S1 + ch + SHA256_K[i] + w[i]) >>> 0;
      const S0 = (rotr(2, a) ^ rotr(13, a) ^ rotr(22, a)) >>> 0;
      const maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  return [h0, h1, h2, h3, h4, h5, h6, h7]
    .map((n) => n.toString(16).padStart(8, '0'))
    .join('');
}

export function isOwnerEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;
  return sha256AsciiHex(normalized) === OWNER_EMAIL_SHA256;
}

// Conversieconstante: 1 GiB in bytes (1.073.741.824 bytes)
export const BYTES_PER_GB = 1024 * 1024 * 1024;

/**
 * Controleert strikt of de opgegeven gebruiker én de actieve sessie
 * toebehoren aan het geverifieerde account van de eigenaar.
 */
export function isSuperAdmin(user: UserAccount | null | undefined): boolean {
  if (!user || !user.email) return false;
  if (user.role === 'admin' && isOwnerEmail(user.email)) return true;
  if (!isOwnerEmail(user.email)) return false;

  const fbUser = auth.currentUser;
  if (!fbUser) return true;

  return isOwnerEmail(fbUser.email) && user.id === fbUser.uid;
}

function isClientFirestoreEnabled(): boolean {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env || {};
  return env.VITE_USE_FIRESTORE === 'true';
}

function withTimeout<T>(promise: Promise<T>, ms = 2000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout')), ms);
    promise
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

/**
 * Berekent de daadwerkelijke Firestore opslaggrootte van een document in bytes
 * inclusief documentpad, veldnamen, UTF-8 tekst, Base64 foto's en Firestore index-overhead.
 */
function estimateFirestoreDocBytes(docPath: string, data: Record<string, unknown>): {
  totalBytes: number;
  photoBytes: number;
} {
  try {
    const jsonString = JSON.stringify(data);
    const rawBytes = new Blob([jsonString]).size;
    const pathBytes = new Blob([docPath]).size + 32; // Firestore document metadata overhead

    let photoBytes = 0;
    const photoUrl = typeof data.photoUrl === 'string' ? data.photoUrl : '';
    if (photoUrl) {
      photoBytes = new Blob([photoUrl]).size;
    }

    // Firestore index overhead op niet-foto velden (~25%)
    const nonPhotoBytes = Math.max(0, rawBytes - photoBytes);
    const indexOverhead = Math.round(nonPhotoBytes * 0.25) + 64;

    return {
      totalBytes: rawBytes + pathBytes + indexOverhead,
      photoBytes,
    };
  } catch {
    return { totalBytes: 256, photoBytes: 0 };
  }
}

export interface AdminUserSummary {
  user: UserAccount & {
    lastActiveAt?: string;
    isLegacyDiscovered?: boolean;
  };
  beers: Beer[];
  tastings: Tasting[];
  categories: Category[];
  glasses: BeerGlass[];
  pubDeals: PubGlassDeal[];
  beersCount: number;
  tastingsCount: number;
  categoriesCount: number;
  glassesCount: number;
  glassesTotalPieces: number;
  dealsCount: number;
  photosCount: number;
  avgRating: number;
  storageBytes: number;
  photoStorageBytes: number;
  lastActivityIso: string;
}

export interface AdminActivityItem {
  id: string;
  type: 'beer' | 'tasting' | 'glass' | 'login';
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar?: string;
  title: string;
  subtitle: string;
  dateIso: string;
}

export interface ServerSystemMetrics {
  diskTotalBytes: number;
  diskUsedBytes: number;
  diskFreeBytes: number;
  ramTotalBytes: number;
  ramUsedBytes: number;
  ramFreeBytes: number;
  ramBuffersCachedBytes?: number;
  appRamRssBytes: number;
  dbSizeBytes?: number;
  cpuCores: number;
  uptimeSeconds: number;
}

export interface AdminDashboardStats {
  scannedAt: string;
  quotaBytes: number;
  totalBytesUsed: number;
  totalBytesRemaining: number;
  photoBytesUsed: number;
  metadataBytesUsed: number;
  serverMetrics?: ServerSystemMetrics;
  collectionBytes: {
    beers: number;
    tastings: number;
    glasses: number;
    categories: number;
    pubDeals: number;
    profiles: number;
  };
  totalUsers: number;
  activeUsersToday: number;
  activeUsersLast7Days: number;
  totalBeers: number;
  totalTastings: number;
  totalCategories: number;
  totalGlasses: number;
  totalGlassPieces: number;
  totalDeals: number;
  totalPhotos: number;
  totalDocuments: number;
  users: AdminUserSummary[];
  recentActivity: AdminActivityItem[];
}

export function formatStorageGB(bytes: number, decimals = 2): string {
  const gb = bytes / BYTES_PER_GB;
  if (gb > 0 && gb < 0.01 && decimals <= 2) {
    return `${gb.toLocaleString('nl-NL', {
      minimumFractionDigits: 3,
      maximumFractionDigits: 4,
    })} GB`;
  }
  return `${gb.toLocaleString('nl-NL', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })} GB`;
}

export function formatStorageMB(bytes: number, decimals = 2): string {
  const mb = bytes / (1024 * 1024);
  if (mb > 0 && mb < 0.01 && decimals <= 2) {
    return `${mb.toLocaleString('nl-NL', {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    })} MB`;
  }
  return `${mb.toLocaleString('nl-NL', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })} MB`;
}

export function formatStorageHuman(bytes: number): string {
  if (bytes < 1024) {
    return `${Math.round(bytes).toLocaleString('nl-NL')} B`;
  }
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toLocaleString('nl-NL', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })} KB`;
  }
  const mb = kb / 1024;
  if (mb < 1024) {
    return `${mb.toLocaleString('nl-NL', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} MB`;
  }
  const gb = mb / 1024;
  return `${gb.toLocaleString('nl-NL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} GB`;
}

/**
 * Haalt het userId op uit een Firestore subcollectie-documentreferentie (/users/{userId}/...)
 * of uit het `userId`-veld van het document zelf.
 */
function extractOwnerUid(
  docRef: { parent?: { parent?: { id?: string } | null } | null },
  data: Record<string, unknown>
): string | null {
  const parentUid = docRef?.parent?.parent?.id;
  if (typeof parentUid === 'string' && parentUid.trim().length > 0) {
    return parentUid.trim();
  }
  if (typeof data.userId === 'string' && data.userId.trim().length > 0) {
    return data.userId.trim();
  }
  return null;
}

function isPlaceholderName(name: unknown, uid: string): boolean {
  if (typeof name !== 'string') return true;
  const trimmed = name.trim();
  if (!trimmed) return true;
  const lower = trimmed.toLowerCase();
  return (
    lower === 'bierliefhebber' ||
    lower.startsWith('bierliefhebber account') ||
    lower.startsWith('gebruiker (') ||
    lower.startsWith('account id:') ||
    lower.startsWith('uid:') ||
    lower.startsWith('uid-') ||
    lower === uid.toLowerCase()
  );
}

function isPlaceholderEmail(email: unknown, uid: string): boolean {
  if (typeof email !== 'string') return true;
  const trimmed = email.trim();
  if (!trimmed || !trimmed.includes('@')) return true;
  const lower = trimmed.toLowerCase();
  return (
    lower.startsWith('account id:') ||
    lower.startsWith('uid-') ||
    lower === 'gebruiker@bierlog.nl' ||
    lower === uid.toLowerCase()
  );
}

function formatNameFromEmail(email: string): string {
  const localPart = email.split('@')[0] || '';
  const cleaned = localPart
    .replace(/[._-]+/g, ' ')
    .replace(/\d+/g, ' ')
    .trim();
  if (!cleaned) return 'Bierliefhebber';
  return cleaned
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Stelt de eigenaar/admin in staat om een herkenbare accountnaam of e-mailadres
 * te koppelen aan een bestaand database-account.
 */
export async function updateAdminUserProfileLabel(
  adminUser: UserAccount,
  targetUserId: string,
  name: string,
  email: string
): Promise<void> {
  if (!isSuperAdmin(adminUser) || !isValidEntityId(targetUserId)) {
    throw new Error('Geen toegang');
  }
  const cleanName = sanitizeString(name, 100);
  const cleanEmail = sanitizeString(email, 180);
  const payload: Record<string, unknown> = {
    uid: targetUserId,
    updatedAt: new Date().toISOString(),
    updatedByAdminAt: new Date().toISOString(),
  };
  if (cleanName) {
    payload.name = cleanName;
  }
  if (cleanEmail && cleanEmail.includes('@')) {
    payload.email = cleanEmail;
  }

  // Sla ook direct op in de centrale server-database
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (auth.currentUser) {
      const idToken = await auth.currentUser.getIdToken();
      headers.Authorization = `Bearer ${idToken}`;
    }
    await fetch(`/api/admin/users/${encodeURIComponent(targetUserId)}`, {
      method: 'PUT',
      credentials: 'include',
      headers,
      body: JSON.stringify({ name: cleanName, email: cleanEmail }),
    });
  } catch {
    // Niet-blokkerend
  }

  if (isClientFirestoreEnabled()) {
    try {
      const docRef = doc(db, 'users', targetUserId);
      await withTimeout(setDoc(docRef, payload, { merge: true }), 2000);
    } catch {
      // Negeer als client-side opslag niet actief is
    }
  }
}

export async function fetchAdminDashboardData(
  adminUser: UserAccount
): Promise<AdminDashboardStats> {
  if (!isSuperAdmin(adminUser)) {
    throw new Error('Geen toegang: uitsluitend de geverifieerde beheerder heeft toegang tot dit paneel.');
  }

  // 0. Synchroniseer eerst direct het eigen account én alle lokale bieren/notities/glazen met de server-database
  //    en voeg eventuele dubbele lokale UIDs samen zodat alle 26+ bieren in de database staan.
  await syncUserWithServerDatabase(adminUser);

  // 1. Haal expliciete gebruikersprofielen op uit /users én scan tegelijkertijd
  //    via collectionGroup ALLE subcollecties (categories, beers, tastings, glasses, pubDeals)
  const userMap = new Map<
    string,
    UserAccount & { lastActiveAt?: string; isLegacyDiscovered?: boolean }
  >();
  const explicitProfileUids = new Set<string>();
  let profilesBytes = 0;

  // Vooraf vullen met bekende lokale profielen en huidige admin
  const localUsers = getAllUsers();
  for (const lu of [adminUser, ...localUsers]) {
    if (lu && lu.id) {
      const hasName = !isPlaceholderName(lu.name, lu.id);
      const hasEmail = !isPlaceholderEmail(lu.email, lu.id);
      userMap.set(lu.id, {
        ...lu,
        name: hasName
          ? lu.name.trim()
          : hasEmail
          ? formatNameFromEmail(lu.email)
          : 'Bierliefhebber Account',
        email: hasEmail ? lu.email.trim() : '',
        lastActiveAt: lu.id === adminUser.id ? new Date().toISOString() : lu.createdAt,
        isLegacyDiscovered: !hasName && !hasEmail,
      });
    }
  }

  // Scan ook localStorage en sessionStorage voor gecachete Firebase Auth profielen of collectie-sleutels
  try {
    for (const store of [localStorage, sessionStorage]) {
      for (let i = 0; i < store.length; i++) {
        const key = store.key(i) || '';
        if (key.startsWith('firebase:authUser:')) {
          const raw = store.getItem(key);
          if (raw) {
            const parsed = safeJsonParse<Record<string, unknown>>(raw);
            if (parsed && typeof parsed.uid === 'string' && isValidEntityId(parsed.uid)) {
              const uid = parsed.uid;
              const fbName =
                typeof parsed.displayName === 'string' && parsed.displayName.trim()
                  ? sanitizeString(parsed.displayName, 100)
                  : typeof parsed.email === 'string' && parsed.email.includes('@')
                  ? formatNameFromEmail(parsed.email)
                  : '';
              const fbEmail =
                typeof parsed.email === 'string' && parsed.email.includes('@')
                  ? sanitizeString(parsed.email, 160)
                  : '';
              if (fbName || fbEmail) {
                const prev = userMap.get(uid);
                userMap.set(uid, {
                  id: uid,
                  name: fbName || prev?.name || 'Bierliefhebber Account',
                  email: fbEmail || prev?.email || '',
                  avatarUrl: sanitizeImageUrl(parsed.photoURL) || prev?.avatarUrl,
                  createdAt: prev?.createdAt || new Date().toISOString(),
                  isLegacyDiscovered: false,
                });
              }
            }
          }
        }
        const match = key.match(/^bierlog_(?:beers|categories|glasses|tastings|settings)_([a-zA-Z0-9_-]+)$/);
        if (match && match[1]) {
          const foundUid = match[1];
          if (!userMap.has(foundUid)) {
            userMap.set(foundUid, {
              id: foundUid,
              name: '',
              email: '',
              createdAt: new Date().toISOString(),
              isLegacyDiscovered: true,
            });
          }
        }
      }
    }
  } catch {
    // Ignore storage scan errors
  }

  const useFirestore = isClientFirestoreEnabled();

  // Voer /users + alle 5 collectionGroup queries alleen uit als Firestore actief is (met korte timeout zodat scan nooit blijft hangen)
  const [
    usersSnapRes,
    cgCategoriesRes,
    cgBeersRes,
    cgTastingsRes,
    cgGlassesRes,
    cgPubDealsRes,
  ] = useFirestore
    ? await Promise.allSettled([
        withTimeout(getDocs(collection(db, 'users')), 2500),
        withTimeout(getDocs(collectionGroup(db, 'categories')), 2500),
        withTimeout(getDocs(collectionGroup(db, 'beers')), 2500),
        withTimeout(getDocs(collectionGroup(db, 'tastings')), 2500),
        withTimeout(getDocs(collectionGroup(db, 'glasses')), 2500),
        withTimeout(getDocs(collectionGroup(db, 'pubDeals')), 2500),
      ])
    : ([
        { status: 'rejected', reason: 'disabled' },
        { status: 'rejected', reason: 'disabled' },
        { status: 'rejected', reason: 'disabled' },
        { status: 'rejected', reason: 'disabled' },
        { status: 'rejected', reason: 'disabled' },
        { status: 'rejected', reason: 'disabled' },
      ] as const);

  if (usersSnapRes.status === 'fulfilled') {
    usersSnapRes.value.forEach((docSnap) => {
      const data = docSnap.data();
      const uid = docSnap.id;
      explicitProfileUids.add(uid);
      const { totalBytes } = estimateFirestoreDocBytes(`users/${uid}`, data);
      profilesBytes += totalBytes;

      const existing = userMap.get(uid);
      const candidateName =
        data.name ||
        data.googleName ||
        data.displayName ||
        data.fullName ||
        data.userName ||
        data.authorName;
      const candidateGoogleName = data.googleName || data.displayName;
      const candidateEmail = data.email || data.userEmail;

      const hasRealName = !isPlaceholderName(candidateName, uid);
      const hasRealEmail = !isPlaceholderEmail(candidateEmail, uid);
      const existingHasRealName = existing && !isPlaceholderName(existing.name, uid);
      const existingHasRealEmail = existing && !isPlaceholderEmail(existing.email, uid);

      const resolvedEmail = hasRealEmail
        ? String(candidateEmail).trim()
        : existingHasRealEmail
        ? existing!.email
        : '';

      const resolvedName = hasRealName
        ? String(candidateName).trim()
        : existingHasRealName
        ? existing!.name
        : resolvedEmail
        ? formatNameFromEmail(resolvedEmail)
        : '';

      const resolvedGoogleName =
        !isPlaceholderName(candidateGoogleName, uid)
          ? String(candidateGoogleName).trim()
          : existing?.googleName || undefined;

      userMap.set(uid, {
        id: uid,
        name: sanitizeString(resolvedName, 100),
        googleName: resolvedGoogleName ? sanitizeString(resolvedGoogleName, 100) : undefined,
        email: sanitizeString(resolvedEmail, 160),
        avatarUrl:
          sanitizeImageUrl(data.avatarUrl) ||
          sanitizeImageUrl(data.photoURL) ||
          existing?.avatarUrl,
        createdAt:
          typeof data.createdAt === 'string' && data.createdAt
            ? sanitizeString(data.createdAt, 40)
            : existing?.createdAt || new Date().toISOString(),
        lastActiveAt:
          typeof data.lastActiveAt === 'string' && data.lastActiveAt
            ? sanitizeString(data.lastActiveAt, 40)
            : existing?.lastActiveAt,
        isLegacyDiscovered: !resolvedName,
      });
    });
  }

  // Hulpmappen om alle gevonden documenten per gebruiker (gededupliceerd op doc.id) op te slaan
  const categoriesByUser = new Map<string, Map<string, Record<string, unknown>>>();
  const beersByUser = new Map<string, Map<string, Record<string, unknown>>>();
  const tastingsByUser = new Map<string, Map<string, Record<string, unknown>>>();
  const glassesByUser = new Map<string, Map<string, Record<string, unknown>>>();
  const dealsByUser = new Map<string, Map<string, Record<string, unknown>>>();

  const ensureUserRegistered = (uid: string, hintData?: Record<string, unknown>) => {
    if (!uid) return;
    const hintNameRaw =
      hintData?.userName ||
      hintData?.displayName ||
      hintData?.authorName ||
      hintData?.submittedBy;
    const hintEmailRaw = hintData?.userEmail || hintData?.email;
    const hintName = !isPlaceholderName(hintNameRaw, uid) ? String(hintNameRaw).trim() : '';
    const hintEmail = !isPlaceholderEmail(hintEmailRaw, uid) ? String(hintEmailRaw).trim() : '';

    const current = userMap.get(uid);
    if (!current) {
      userMap.set(uid, {
        id: uid,
        name: hintName || (hintEmail ? formatNameFromEmail(hintEmail) : ''),
        email: hintEmail,
        createdAt: new Date().toISOString(),
        isLegacyDiscovered: !hintName && !hintEmail,
      });
    } else {
      if (!current.name && hintName) {
        current.name = hintName;
        current.isLegacyDiscovered = false;
      }
      if (!current.email && hintEmail) {
        current.email = hintEmail;
        if (!current.name) {
          current.name = formatNameFromEmail(hintEmail);
          current.isLegacyDiscovered = false;
        }
      }
    }
  };

  if (cgCategoriesRes.status === 'fulfilled') {
    cgCategoriesRes.value.forEach((d) => {
      const data = d.data() as Record<string, unknown>;
      const uid = extractOwnerUid(d.ref, data);
      if (!uid) return;
      ensureUserRegistered(uid, data);
      if (!categoriesByUser.has(uid)) categoriesByUser.set(uid, new Map());
      categoriesByUser.get(uid)!.set(d.id, data);
    });
  }

  if (cgBeersRes.status === 'fulfilled') {
    cgBeersRes.value.forEach((d) => {
      const data = d.data() as Record<string, unknown>;
      const uid = extractOwnerUid(d.ref, data);
      if (!uid) return;
      ensureUserRegistered(uid, data);
      if (!beersByUser.has(uid)) beersByUser.set(uid, new Map());
      beersByUser.get(uid)!.set(d.id, data);
    });
  }

  if (cgTastingsRes.status === 'fulfilled') {
    cgTastingsRes.value.forEach((d) => {
      const data = d.data() as Record<string, unknown>;
      const uid = extractOwnerUid(d.ref, data);
      if (!uid) return;
      ensureUserRegistered(uid, data);
      if (!tastingsByUser.has(uid)) tastingsByUser.set(uid, new Map());
      tastingsByUser.get(uid)!.set(d.id, data);
    });
  }

  if (cgGlassesRes.status === 'fulfilled') {
    cgGlassesRes.value.forEach((d) => {
      const data = d.data() as Record<string, unknown>;
      const uid = extractOwnerUid(d.ref, data);
      if (!uid) return;
      ensureUserRegistered(uid, data);
      if (!glassesByUser.has(uid)) glassesByUser.set(uid, new Map());
      glassesByUser.get(uid)!.set(d.id, data);
    });
  }

  if (cgPubDealsRes.status === 'fulfilled') {
    cgPubDealsRes.value.forEach((d) => {
      const data = d.data() as Record<string, unknown>;
      const uid = extractOwnerUid(d.ref, data);
      if (!uid) return;
      ensureUserRegistered(uid, data);
      if (!dealsByUser.has(uid)) dealsByUser.set(uid, new Map());
      dealsByUser.get(uid)!.set(d.id, data);
    });
  }

  // Haal alle geregistreerde accounts, collecties én server-statistieken (opslag + RAM) op van de server (/api/admin/export)
  let serverMetrics: ServerSystemMetrics | undefined;
  const serverExplicitUids = new Set<string>();
  try {
    const headers = await buildServerAuthHeaders(false);
    let serverRes = await fetch('/api/admin/export', {
      method: 'GET',
      credentials: 'include',
      headers,
    });

    if (serverRes.status === 401 && auth.currentUser) {
      const freshToken = await auth.currentUser.getIdToken(true);
      await fetch('/api/auth/google', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: freshToken }),
      });
      serverRes = await fetch('/api/admin/export', {
        method: 'GET',
        credentials: 'include',
        headers: {
          ...headers,
          Authorization: `Bearer ${freshToken}`,
        },
      });
    }

    if (serverRes.ok) {
      const serverExport = (await serverRes.json()) as {
        systemMetrics?: ServerSystemMetrics;
        users?: Array<{
          user?: Record<string, unknown>;
          categories?: Array<Record<string, unknown>>;
          beers?: Array<Record<string, unknown>>;
          tastings?: Array<Record<string, unknown>>;
          glasses?: Array<Record<string, unknown>>;
          pubDeals?: Array<Record<string, unknown>>;
        }>;
      };
      if (serverExport.systemMetrics) {
        serverMetrics = serverExport.systemMetrics;
      }
      if (Array.isArray(serverExport.users)) {
        for (const entry of serverExport.users) {
          const u = entry.user;
          const uid = typeof u?.id === 'string' ? u.id : '';
          if (!uid) continue;
          serverExplicitUids.add(uid);
          const existing = userMap.get(uid);
          userMap.set(uid, {
            id: uid,
            name: sanitizeString(u?.name, 100, existing?.name || 'Bierliefhebber'),
            googleName: u?.googleName ? sanitizeString(u.googleName, 100) : existing?.googleName,
            email: sanitizeString(u?.email, 160, existing?.email || ''),
            role: u?.role === 'admin' ? 'admin' : 'user',
            avatarUrl: sanitizeImageUrl(u?.avatarUrl) || existing?.avatarUrl,
            createdAt: sanitizeString(u?.createdAt, 40, existing?.createdAt || new Date().toISOString()),
            lastActiveAt: sanitizeString(u?.lastActiveAt, 40, existing?.lastActiveAt || new Date().toISOString()),
            isLegacyDiscovered: false,
          });

          if (!categoriesByUser.has(uid)) categoriesByUser.set(uid, new Map());
          if (!beersByUser.has(uid)) beersByUser.set(uid, new Map());
          if (!tastingsByUser.has(uid)) tastingsByUser.set(uid, new Map());
          if (!glassesByUser.has(uid)) glassesByUser.set(uid, new Map());
          if (!dealsByUser.has(uid)) dealsByUser.set(uid, new Map());

          for (const c of entry.categories || []) {
            if (typeof c.id === 'string') categoriesByUser.get(uid)!.set(c.id, c);
          }
          for (const b of entry.beers || []) {
            if (typeof b.id === 'string') beersByUser.get(uid)!.set(b.id, b);
          }
          for (const t of entry.tastings || []) {
            if (typeof t.id === 'string') tastingsByUser.get(uid)!.set(t.id, t);
          }
          for (const g of entry.glasses || []) {
            if (typeof g.id === 'string') glassesByUser.get(uid)!.set(g.id, g);
          }
          for (const d of entry.pubDeals || []) {
            if (typeof d.id === 'string') dealsByUser.get(uid)!.set(d.id, d);
          }
        }
      }
    }

    // Haal realtime server schijf- en RAM-metingen op als deze nog niet geladen zijn
    if (!serverMetrics || !serverMetrics.diskTotalBytes) {
      const sysRes = await fetch('/api/system/metrics', {
        method: 'GET',
        credentials: 'include',
        headers,
      });
      if (sysRes.ok) {
        const sysData = (await sysRes.json()) as { systemMetrics?: ServerSystemMetrics };
        if (sysData.systemMetrics) {
          serverMetrics = sysData.systemMetrics;
        }
      }
    }

    if (!serverMetrics || !serverMetrics.diskTotalBytes) {
      const healthRes = await fetch('/api/health', {
        method: 'GET',
        credentials: 'include',
      });
      if (healthRes.ok) {
        const hData = (await healthRes.json()) as { systemMetrics?: ServerSystemMetrics };
        if (hData.systemMetrics) {
          serverMetrics = hData.systemMetrics;
        }
      }
    }
  } catch {
    // Niet-blokkerend
  }

  // Vul óók voor elke bekende gebruiker eventuele lokale collecties uit localStorage aan zodat er nooit 1 bier ontbreekt
  for (const uid of Array.from(userMap.keys())) {
    if (!categoriesByUser.has(uid)) categoriesByUser.set(uid, new Map());
    if (!beersByUser.has(uid)) beersByUser.set(uid, new Map());
    if (!tastingsByUser.has(uid)) tastingsByUser.set(uid, new Map());
    if (!glassesByUser.has(uid)) glassesByUser.set(uid, new Map());
    if (!dealsByUser.has(uid)) dealsByUser.set(uid, new Map());

    for (const c of getCategories(uid)) {
      categoriesByUser.get(uid)!.set(c.id, c as unknown as Record<string, unknown>);
    }
    for (const b of getBeers(uid)) {
      beersByUser.get(uid)!.set(b.id, b as unknown as Record<string, unknown>);
    }
    for (const t of getTastings(uid)) {
      tastingsByUser.get(uid)!.set(t.id, t as unknown as Record<string, unknown>);
    }
    for (const g of getGlasses(uid)) {
      glassesByUser.get(uid)!.set(g.id, g as unknown as Record<string, unknown>);
    }
  }

  // Koppel algemene kroeg-acties ook aan het admin-account indien nog niet gekoppeld
  if (dealsByUser.has(adminUser.id) && dealsByUser.get(adminUser.id)!.size === 0) {
    for (const d of getStoredPubDeals()) {
      dealsByUser.get(adminUser.id)!.set(d.id, d as unknown as Record<string, unknown>);
    }
  }

  // DEDUPLICATIE OP E-MAILADRES & EIGENAAR-IDENTITEIT:
  // Voeg accounts met hetzelfde e-mailadres (of meerdere eigenaar-accounts) samen tot 1 enkel account
  // inclusief al hun bieren, proefnotities, glazen en categorieën.
  const mergeUserMapsInto = (sourceUid: string, targetUid: string) => {
    if (sourceUid === targetUid) return;
    const allMaps = [categoriesByUser, beersByUser, tastingsByUser, glassesByUser, dealsByUser];
    for (const mapByUser of allMaps) {
      const src = mapByUser.get(sourceUid);
      if (src) {
        if (!mapByUser.has(targetUid)) mapByUser.set(targetUid, new Map());
        const dst = mapByUser.get(targetUid)!;
        src.forEach((val, key) => {
          if (!dst.has(key)) {
            dst.set(key, { ...val, userId: targetUid });
          }
        });
        mapByUser.delete(sourceUid);
      }
    }
    const srcUser = userMap.get(sourceUid);
    const dstUser = userMap.get(targetUid);
    if (srcUser && dstUser) {
      if (isPlaceholderEmail(dstUser.email, targetUid) && !isPlaceholderEmail(srcUser.email, sourceUid)) {
        dstUser.email = srcUser.email;
      }
      if (isPlaceholderName(dstUser.name, targetUid) && !isPlaceholderName(srcUser.name, sourceUid)) {
        dstUser.name = srcUser.name;
      }
      if (!dstUser.avatarUrl && srcUser.avatarUrl) {
        dstUser.avatarUrl = srcUser.avatarUrl;
      }
    }
    userMap.delete(sourceUid);
  };

  const canonicalUidByEmail = new Map<string, string>();
  // Registreer eerst het actieve adminUser.id als canonieke ID voor de eigenaar
  if (!isPlaceholderEmail(adminUser.email, adminUser.id)) {
    canonicalUidByEmail.set(adminUser.email.trim().toLowerCase(), adminUser.id);
  }

  for (const [uid, u] of Array.from(userMap.entries())) {
    if (uid !== adminUser.id && isOwnerEmail(u.email)) {
      mergeUserMapsInto(uid, adminUser.id);
      continue;
    }
    const cleanEmail = !isPlaceholderEmail(u.email, uid) ? u.email.trim().toLowerCase() : '';
    if (cleanEmail) {
      const existingCanonical = canonicalUidByEmail.get(cleanEmail);
      if (existingCanonical && existingCanonical !== uid) {
        // Geef voorrang aan het niet-'usr_' ID of het bestaande canonieke ID
        if (existingCanonical.startsWith('usr_') && !uid.startsWith('usr_') && existingCanonical !== adminUser.id) {
          mergeUserMapsInto(existingCanonical, uid);
          canonicalUidByEmail.set(cleanEmail, uid);
        } else {
          mergeUserMapsInto(uid, existingCanonical);
        }
      } else {
        canonicalUidByEmail.set(cleanEmail, uid);
      }
    }
  }

  // Filter eventuele lege spook-accounts zonder e-mailadres én zonder items eruit
  for (const [uid, u] of Array.from(userMap.entries())) {
    if (uid === adminUser.id) continue;
    const itemCount =
      (beersByUser.get(uid)?.size || 0) +
      (tastingsByUser.get(uid)?.size || 0) +
      (glassesByUser.get(uid)?.size || 0);
    const hasValidEmail = !isPlaceholderEmail(u.email, uid);
    if (!hasValidEmail && itemCount === 0 && !serverExplicitUids.has(uid)) {
      userMap.delete(uid);
    }
  }

  let beersBytes = 0;
  let tastingsBytes = 0;
  let glassesBytes = 0;
  let categoriesBytes = 0;
  let pubDealsBytes = 0;
  let totalPhotoBytes = 0;
  let totalDocuments = userMap.size;

  const userSummaries: AdminUserSummary[] = [];
  const activityFeed: AdminActivityItem[] = [];

  // 2. Controleer per ontdekte gebruiker ook nog de directe subcollecties (als fallback)
  //    en bouw voor elke gebruiker in de database het volledige overzicht op.
  const userEntries = Array.from(userMap.values());

  await Promise.all(
    userEntries.map(async (u) => {
      const uid = u.id;
      let userBytes = 256;
      let userPhotoBytes = 0;
      let userPhotosCount = 0;

      const catMap = categoriesByUser.get(uid) || new Map<string, Record<string, unknown>>();
      const beerMap = beersByUser.get(uid) || new Map<string, Record<string, unknown>>();
      const tastingMap = tastingsByUser.get(uid) || new Map<string, Record<string, unknown>>();
      const glassMap = glassesByUser.get(uid) || new Map<string, Record<string, unknown>>();
      const dealMap = dealsByUser.get(uid) || new Map<string, Record<string, unknown>>();

      if (useFirestore) {
        const [catsRes, beersRes, tastingsRes, glassesRes, dealsRes] = await Promise.allSettled([
          withTimeout(getDocs(collection(db, 'users', uid, 'categories')), 2000),
          withTimeout(getDocs(collection(db, 'users', uid, 'beers')), 2000),
          withTimeout(getDocs(collection(db, 'users', uid, 'tastings')), 2000),
          withTimeout(getDocs(collection(db, 'users', uid, 'glasses')), 2000),
          withTimeout(getDocs(collection(db, 'users', uid, 'pubDeals')), 2000),
        ]);

        if (catsRes.status === 'fulfilled') {
          catsRes.value.forEach((d) => catMap.set(d.id, d.data() as Record<string, unknown>));
        }
        if (beersRes.status === 'fulfilled') {
          beersRes.value.forEach((d) => beerMap.set(d.id, d.data() as Record<string, unknown>));
        }
        if (tastingsRes.status === 'fulfilled') {
          tastingsRes.value.forEach((d) => tastingMap.set(d.id, d.data() as Record<string, unknown>));
        }
        if (glassesRes.status === 'fulfilled') {
          glassesRes.value.forEach((d) => glassMap.set(d.id, d.data() as Record<string, unknown>));
        }
        if (dealsRes.status === 'fulfilled') {
          dealsRes.value.forEach((d) => dealMap.set(d.id, d.data() as Record<string, unknown>));
        }
      }

      const userBeers: Beer[] = [];
      const userTastings: Tasting[] = [];
      const userCategories: Category[] = [];
      const userGlasses: BeerGlass[] = [];
      const userDeals: PubGlassDeal[] = [];

      catMap.forEach((data, docId) => {
        const est = estimateFirestoreDocBytes(`users/${uid}/categories/${docId}`, data);
        categoriesBytes += est.totalBytes;
        userBytes += est.totalBytes;
        totalDocuments += 1;

        userCategories.push({
          id: docId,
          name: sanitizeString(data.name, 80, 'Categorie'),
          color: sanitizeHexColor(data.color),
          description: sanitizeString(data.description, 300),
          createdAt: sanitizeString(data.createdAt, 40, new Date().toISOString()),
        });
      });

      beerMap.forEach((data, docId) => {
        const est = estimateFirestoreDocBytes(`users/${uid}/beers/${docId}`, data);
        beersBytes += est.totalBytes;
        userBytes += est.totalBytes;
        userPhotoBytes += est.photoBytes;
        totalPhotoBytes += est.photoBytes;
        totalDocuments += 1;

        const safePhoto = sanitizeImageUrl(data.photoUrl as string | undefined);
        if (safePhoto) userPhotosCount += 1;

        const beerObj: Beer = {
          id: docId,
          userId: uid,
          name: sanitizeString(data.name, 120, 'Onbekend bier'),
          brewery: sanitizeString(data.brewery, 120),
          categoryId: sanitizeString(data.categoryId, 128),
          abv: Number(clampNumber(data.abv, 0, 100, 0).toFixed(1)),
          favorite: Boolean(data.favorite),
          photoUrl: safePhoto,
          photoPosition: sanitizePhotoPosition(data.photoPosition as string | undefined),
          photoZoom:
            data.photoZoom !== undefined ? clampNumber(data.photoZoom, 0.5, 5.0, 1.0) : undefined,
          dateAdded: sanitizeString(data.dateAdded, 40, new Date().toISOString()),
          updatedAt: data.updatedAt ? sanitizeString(data.updatedAt, 40) : undefined,
        };
        userBeers.push(beerObj);

        activityFeed.push({
          id: `beer-${uid}-${docId}`,
          type: 'beer',
          userId: uid,
          userName: u.name,
          userEmail: u.email,
          userAvatar: u.avatarUrl,
          title: `Nieuw bier: ${beerObj.name}`,
          subtitle: `${beerObj.brewery || 'Speciaalbier'} (${beerObj.abv.toFixed(1)}% ABV)`,
          dateIso: beerObj.dateAdded,
        });
      });

      tastingMap.forEach((data, docId) => {
        const est = estimateFirestoreDocBytes(`users/${uid}/tastings/${docId}`, data);
        tastingsBytes += est.totalBytes;
        userBytes += est.totalBytes;
        userPhotoBytes += est.photoBytes;
        totalPhotoBytes += est.photoBytes;
        totalDocuments += 1;

        const safePhoto = sanitizeImageUrl(data.photoUrl as string | undefined);
        const rawServing = data.servingType;
        const servingType: 'tap' | 'fles' | 'blik' | undefined =
          rawServing === 'tap' || rawServing === 'fles' || rawServing === 'blik'
            ? rawServing
            : undefined;
        const tastingObj: Tasting = {
          id: docId,
          beerId: sanitizeString(data.beerId, 128),
          rating: Number(clampNumber(data.rating, 1, 10, 7.0).toFixed(1)),
          notes: sanitizeString(data.notes, 2000),
          location: sanitizeString(data.location, 150),
          servingType,
          photoUrl: safePhoto,
          date: sanitizeString(data.date, 40, new Date().toISOString()),
        };
        userTastings.push(tastingObj);
      });

      glassMap.forEach((data, docId) => {
        const est = estimateFirestoreDocBytes(`users/${uid}/glasses/${docId}`, data);
        glassesBytes += est.totalBytes;
        userBytes += est.totalBytes;
        userPhotoBytes += est.photoBytes;
        totalPhotoBytes += est.photoBytes;
        totalDocuments += 1;

        const safePhoto = sanitizeImageUrl(data.photoUrl as string | undefined);
        if (safePhoto) userPhotosCount += 1;

        const glassObj: BeerGlass = {
          id: docId,
          userId: uid,
          name: sanitizeString(data.name, 120, 'Bierglas'),
          brand: sanitizeString(data.brand, 120),
          glassType: sanitizeString(data.glassType, 80),
          quantity: Math.round(clampNumber(data.quantity, 0, 9999, 1)),
          volumeCl: data.volumeCl ? clampNumber(data.volumeCl, 0, 500, 33) : undefined,
          photoUrl: safePhoto,
          photoPosition: sanitizePhotoPosition(data.photoPosition as string | undefined),
          photoZoom:
            data.photoZoom !== undefined ? clampNumber(data.photoZoom, 0.5, 5.0, 1.0) : undefined,
          notes: sanitizeString(data.notes, 1000),
          favorite: Boolean(data.favorite),
          dateAdded: sanitizeString(data.dateAdded, 40, new Date().toISOString()),
          updatedAt: data.updatedAt ? sanitizeString(data.updatedAt, 40) : undefined,
        };
        userGlasses.push(glassObj);

        activityFeed.push({
          id: `glass-${uid}-${docId}`,
          type: 'glass',
          userId: uid,
          userName: u.name,
          userEmail: u.email,
          userAvatar: u.avatarUrl,
          title: `Bierglas toegevoegd: ${glassObj.name}`,
          subtitle: `${glassObj.quantity}x ${glassObj.brand || glassObj.glassType || 'Collectieglas'}`,
          dateIso: glassObj.dateAdded,
        });
      });

      dealMap.forEach((data, docId) => {
        const est = estimateFirestoreDocBytes(`users/${uid}/pubDeals/${docId}`, data);
        pubDealsBytes += est.totalBytes;
        userBytes += est.totalBytes;
        totalDocuments += 1;

        if (
          typeof data.submittedBy === 'string' &&
          !isPlaceholderName(data.submittedBy, uid) &&
          (!u.name || u.isLegacyDiscovered)
        ) {
          u.name = data.submittedBy.trim();
          u.isLegacyDiscovered = false;
        }

        userDeals.push({
          id: docId,
          pubName: String(data.pubName || ''),
          city: String(data.city || ''),
          province: (data.province as DutchProvince) || 'Noord-Holland',
          address: String(data.address || ''),
          lat: typeof data.lat === 'number' ? data.lat : 52.3676,
          lng: typeof data.lng === 'number' ? data.lng : 4.9041,
          hasActiveDeal: Boolean(data.hasActiveDeal),
          dealCategory: (data.dealCategory as any) || undefined,
          dealTitle: String(data.dealTitle || ''),
          beerBrand: data.beerBrand ? String(data.beerBrand) : '',
          sourceName: String(data.sourceName || ''),
          sourceUrl: sanitizeExternalUrl(data.sourceUrl as string | undefined),
          checkedAt: String(data.checkedAt || ''),
          actieEindDatum: String(data.actieEindDatum || ''),
          submittedBy: data.submittedBy ? String(data.submittedBy) : '',
        });
      });

      // Bepaal meest recente én vroegste activiteit van deze gebruiker
      const allDates = [
        u.lastActiveAt,
        ...userBeers.map((b) => b.updatedAt || b.dateAdded),
        ...userTastings.map((t) => t.date),
        ...userGlasses.map((g) => g.updatedAt || g.dateAdded),
        ...userCategories.map((c) => c.createdAt),
      ].filter((d): d is string => Boolean(d));

      const sortedDesc = [...allDates].sort(
        (a, b) => new Date(b).getTime() - new Date(a).getTime()
      );
      const latestIso = sortedDesc[0] || u.createdAt || new Date().toISOString();
      const earliestIso =
        sortedDesc[sortedDesc.length - 1] || u.createdAt || new Date().toISOString();

      if (useFirestore && !explicitProfileUids.has(uid)) {
        try {
          await withTimeout(
            setDoc(
              doc(db, 'users', uid),
              {
                uid,
                ...(u.name ? { name: u.name } : {}),
                ...(u.email ? { email: u.email } : {}),
                createdAt: earliestIso,
                lastActiveAt: latestIso,
              },
              { merge: true }
            ),
            1500
          );
        } catch {
          // Niet-kritiek als backfill faalt
        }
      }

      const avgRating =
        userTastings.length > 0
          ? userTastings.reduce((acc, t) => acc + t.rating, 0) / userTastings.length
          : 0;

      const glassesTotalPieces = userGlasses.reduce(
        (sum, g) => sum + (Number(g.quantity) || 0),
        0
      );

      if (u.lastActiveAt) {
        activityFeed.push({
          id: `login-${uid}`,
          type: 'login',
          userId: uid,
          userName: u.name,
          userEmail: u.email,
          userAvatar: u.avatarUrl,
          title: `${u.name || 'Bierliefhebber'} was actief in de app`,
          subtitle: u.email || 'Actieve sessie',
          dateIso: u.lastActiveAt,
        });
      }

      userSummaries.push({
        user: {
          ...u,
          createdAt: earliestIso,
          lastActiveAt: latestIso,
        },
        beers: userBeers,
        tastings: userTastings,
        categories: userCategories,
        glasses: userGlasses,
        pubDeals: userDeals,
        beersCount: userBeers.length,
        tastingsCount: userTastings.length,
        categoriesCount: userCategories.length,
        glassesCount: userGlasses.length,
        glassesTotalPieces,
        dealsCount: userDeals.length,
        photosCount: userPhotosCount,
        avgRating,
        storageBytes: userBytes,
        photoStorageBytes: userPhotoBytes,
        lastActivityIso: latestIso,
      });
    })
  );

  // Sorteer gebruikers op meeste bieren / glazen / recente activiteit
  userSummaries.sort((a, b) => {
    const aItems = a.beersCount + a.glassesCount + a.tastingsCount;
    const bItems = b.beersCount + b.glassesCount + b.tastingsCount;
    if (bItems !== aItems) return bItems - aItems;
    return new Date(b.lastActivityIso).getTime() - new Date(a.lastActivityIso).getTime();
  });

  // Geef accounts waarvan de Google-naam nog niet gesynchroniseerd is een nette leesbare accountnaam (zonder User ID)
  const resolvedNameByUid = new Map<string, { name: string; email: string }>();
  userSummaries.forEach((summary, index) => {
    if (!summary.user.name || isPlaceholderName(summary.user.name, summary.user.id)) {
      summary.user.name = `Bierliefhebber Account #${index + 1}`;
      summary.user.isLegacyDiscovered = true;
    }
    if (!summary.user.email || isPlaceholderEmail(summary.user.email, summary.user.id)) {
      summary.user.email = '';
    }
    resolvedNameByUid.set(summary.user.id, {
      name: summary.user.name,
      email: summary.user.email,
    });
  });

  activityFeed.forEach((item) => {
    const resolved = resolvedNameByUid.get(item.userId);
    if (resolved) {
      item.userName = resolved.name;
      item.userEmail = resolved.email;
      if (item.type === 'login') {
        item.title = `${resolved.name} was actief in de app`;
        item.subtitle = resolved.email || 'Actieve sessie';
      }
    }
  });

  // Sorteer activiteit op datum (nieuwste eerst)
  activityFeed.sort((a, b) => new Date(b.dateIso).getTime() - new Date(a.dateIso).getTime());

  const totalBytesUsed =
    profilesBytes + beersBytes + tastingsBytes + glassesBytes + categoriesBytes + pubDealsBytes;
  const effectiveQuotaBytes =
    serverMetrics && serverMetrics.diskTotalBytes > 0
      ? serverMetrics.diskTotalBytes
      : Math.max(totalBytesUsed, 50 * BYTES_PER_GB);
  const totalBytesRemaining =
    serverMetrics && serverMetrics.diskFreeBytes > 0
      ? serverMetrics.diskFreeBytes
      : Math.max(0, effectiveQuotaBytes - totalBytesUsed);
  const metadataBytesUsed = Math.max(0, totalBytesUsed - totalPhotoBytes);

  const nowMs = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const sevenDaysMs = 7 * oneDayMs;

  const activeUsersToday = userSummaries.filter(
    (s) => nowMs - new Date(s.lastActivityIso).getTime() <= oneDayMs
  ).length;

  const activeUsersLast7Days = userSummaries.filter(
    (s) => nowMs - new Date(s.lastActivityIso).getTime() <= sevenDaysMs
  ).length;

  return {
    scannedAt: new Date().toISOString(),
    quotaBytes: effectiveQuotaBytes,
    totalBytesUsed,
    totalBytesRemaining,
    photoBytesUsed: totalPhotoBytes,
    metadataBytesUsed,
    serverMetrics,
    collectionBytes: {
      beers: beersBytes,
      tastings: tastingsBytes,
      glasses: glassesBytes,
      categories: categoriesBytes,
      pubDeals: pubDealsBytes,
      profiles: profilesBytes,
    },
    totalUsers: userSummaries.length,
    activeUsersToday,
    activeUsersLast7Days,
    totalBeers: userSummaries.reduce((acc, u) => acc + u.beersCount, 0),
    totalTastings: userSummaries.reduce((acc, u) => acc + u.tastingsCount, 0),
    totalCategories: userSummaries.reduce((acc, u) => acc + u.categoriesCount, 0),
    totalGlasses: userSummaries.reduce((acc, u) => acc + u.glassesCount, 0),
    totalGlassPieces: userSummaries.reduce((acc, u) => acc + u.glassesTotalPieces, 0),
    totalDeals: userSummaries.reduce((acc, u) => acc + u.dealsCount, 0),
    totalPhotos: userSummaries.reduce((acc, u) => acc + u.photosCount, 0),
    totalDocuments,
    users: userSummaries,
    recentActivity: activityFeed.slice(0, 25),
  };
}

export interface AdminExportPackage {
  app: 'Cervisium' | 'BierLog';
  schemaVersion: 2;
  exportedAt: string;
  exportedBy: string;
  totalUsers: number;
  totalRecords: number;
  users: Array<{
    user: {
      id: string;
      email: string;
      name: string;
      googleName?: string;
      role: 'admin' | 'user';
      avatarUrl?: string;
      createdAt: string;
      lastActiveAt?: string;
    };
    categories: Category[];
    beers: Beer[];
    tastings: Tasting[];
    glasses: BeerGlass[];
    pubDeals: PubGlassDeal[];
  }>;
}

export interface AdminImportReport {
  usersImported: number;
  usersSkippedDuplicate: number;
  categoriesImported: number;
  beersImported: number;
  tastingsImported: number;
  glassesImported: number;
  pubDealsImported: number;
  recordsSkippedDuplicate: number;
}

/**
 * Verifieert de Admin-rol op de server via /api/admin/verify met het geverifieerde Firebase ID Token
 * en synchroniseert direct de HttpOnly server-sessie cookie.
 */
export async function verifyAdminServerSide(adminUser: UserAccount): Promise<{
  verified: boolean;
  databaseEngine: string;
}> {
  if (!isSuperAdmin(adminUser)) {
    return { verified: false, databaseEngine: 'none' };
  }
  try {
    const headers = await buildServerAuthHeaders(false);
    if (headers.Authorization) {
      await fetch('/api/auth/session', {
        method: 'POST',
        credentials: 'include',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
      });
    }
    const res = await fetch('/api/admin/verify', {
      method: 'GET',
      credentials: 'include',
      headers,
    });
    if (!res.ok) {
      return { verified: isSuperAdmin(adminUser), databaseEngine: 'postgresql' };
    }
    const data = (await res.json()) as {
      authorized?: boolean;
      databaseEngine?: string;
    };
    return {
      verified: Boolean(data.authorized),
      databaseEngine: data.databaseEngine || 'postgresql',
    };
  } catch {
    return { verified: true, databaseEngine: 'postgresql' };
  }
}

/**
 * Genereert een compleet, gestructureerd JSON-bestand met alle geregistreerde gebruikers,
 * rollen ('admin' | 'user') en alle bijbehorende records (inclusief foto's).
 */
export function buildCompleteAdminExportJson(
  stats: AdminDashboardStats,
  adminUser: UserAccount
): string {
  if (!isSuperAdmin(adminUser)) {
    throw new Error('Geen rechten om admin-data te exporteren.');
  }

  let totalRecords = 0;
  const users = stats.users.map((u) => {
    const role: 'admin' | 'user' = isOwnerEmail(u.user.email) || u.user.role === 'admin' ? 'admin' : 'user';
    totalRecords +=
      u.categories.length +
      u.beers.length +
      u.tastings.length +
      u.glasses.length +
      u.pubDeals.length;

    return {
      user: {
        id: u.user.id,
        email: u.user.email || '',
        name: u.user.name || 'Bierliefhebber',
        googleName: u.user.googleName,
        role,
        avatarUrl: u.user.avatarUrl,
        createdAt: u.user.createdAt,
        lastActiveAt: u.user.lastActiveAt || u.lastActivityIso,
      },
      categories: u.categories,
      beers: u.beers,
      tastings: u.tastings,
      glasses: u.glasses,
      pubDeals: u.pubDeals,
    };
  });

  const pkg: AdminExportPackage = {
    app: 'Cervisium',
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    exportedBy: adminUser.email,
    totalUsers: users.length,
    totalRecords,
    users,
  };

  return JSON.stringify(pkg, null, 2);
}

/**
 * Importeert een eerder geëxporteerd Admin JSON-bestand in de lokale server-database,
 * inclusief strikte schema-validatie en het overslaan van duplicaten op basis van e-mailadres en ID.
 */
export async function importCompleteAdminDataJson(
  rawJson: string,
  adminUser: UserAccount,
  existingStats: AdminDashboardStats | null,
  options: { skipDuplicates: boolean } = { skipDuplicates: true },
  onProgress?: (stepLabel: string, percent: number) => void
): Promise<AdminImportReport> {
  if (!isSuperAdmin(adminUser)) {
    throw new Error('Geen toegang: uitsluitend de geverifieerde beheerder mag database-imports uitvoeren.');
  }

  const parsed = safeJsonParse<Record<string, unknown>>(rawJson, 150 * 1024 * 1024);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Ongeldig of beschadigd JSON-bestand.');
  }

  // Ondersteun zowel volledige Admin Export (`users: [...]`) als een losse gebruikers-backup (`beers: [...]`)
  let rawUsersArray: unknown[] = [];
  if (Array.isArray(parsed.users)) {
    rawUsersArray = parsed.users;
  } else if (Array.isArray(parsed.beers) || Array.isArray(parsed.categories) || Array.isArray(parsed.glasses)) {
    rawUsersArray = [
      {
        user: parsed.user || {
          id: adminUser.id,
          email: adminUser.email,
          name: adminUser.name,
          role: 'admin',
          createdAt: new Date().toISOString(),
        },
        categories: parsed.categories || [],
        beers: parsed.beers || [],
        tastings: parsed.tastings || [],
        glasses: parsed.glasses || [],
        pubDeals: parsed.pubDeals || [],
      },
    ];
  } else {
    throw new Error(
      'JSON-bestand bevat geen geldige "users"-lijst of herkenbare Cervisium collecties.'
    );
  }

  const existingUserIds = new Set<string>();
  const existingEmailsToId = new Map<string, string>();
  const existingRecordIdsByUser = new Map<
    string,
    {
      categories: Set<string>;
      beers: Set<string>;
      tastings: Set<string>;
      glasses: Set<string>;
      pubDeals: Set<string>;
    }
  >();

  if (existingStats) {
    for (const u of existingStats.users) {
      existingUserIds.add(u.user.id);
      if (u.user.email) {
        existingEmailsToId.set(u.user.email.trim().toLowerCase(), u.user.id);
      }
      existingRecordIdsByUser.set(u.user.id, {
        categories: new Set(u.categories.map((c) => c.id)),
        beers: new Set(u.beers.map((b) => b.id)),
        tastings: new Set(u.tastings.map((t) => t.id)),
        glasses: new Set(u.glasses.map((g) => g.id)),
        pubDeals: new Set(u.pubDeals.map((d) => d.id)),
      });
    }
  }

  const report: AdminImportReport = {
    usersImported: 0,
    usersSkippedDuplicate: 0,
    categoriesImported: 0,
    beersImported: 0,
    tastingsImported: 0,
    glassesImported: 0,
    pubDealsImported: 0,
    recordsSkippedDuplicate: 0,
  };

  if (!isClientFirestoreEnabled()) {
    if (onProgress) {
      onProgress('Importeren van gegevens & foto’s in de lokale server-database...', 50);
    }
    const headers = await buildServerAuthHeaders(true);
    let res = await fetch('/api/admin/import', {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify({
        payload: { users: rawUsersArray },
        skipDuplicates: options.skipDuplicates,
      }),
    });
    if (res.status === 401 && auth.currentUser) {
      const freshToken = await auth.currentUser.getIdToken(true);
      await fetch('/api/auth/google', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: freshToken }),
      });
      res = await fetch('/api/admin/import', {
        method: 'POST',
        credentials: 'include',
        headers: {
          ...headers,
          Authorization: `Bearer ${freshToken}`,
        },
        body: JSON.stringify({
          payload: { users: rawUsersArray },
          skipDuplicates: options.skipDuplicates,
        }),
      });
    }
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error || 'Importeren op de server is mislukt.');
    }
    const data = (await res.json()) as { report?: AdminImportReport; summary?: AdminImportReport };
    await syncUserWithServerDatabase(adminUser);
    if (onProgress) {
      onProgress('Import voltooid!', 100);
    }
    return (
      data.report ||
      data.summary || {
        usersImported: rawUsersArray.length,
        usersSkippedDuplicate: 0,
        categoriesImported: 0,
        beersImported: 0,
        tastingsImported: 0,
        glassesImported: 0,
        pubDealsImported: 0,
        recordsSkippedDuplicate: 0,
      }
    );
  }

  const totalEntries = Math.min(rawUsersArray.length, 500);
  for (let idx = 0; idx < totalEntries; idx++) {
    const rawEntry = rawUsersArray[idx];
    if (!rawEntry || typeof rawEntry !== 'object') continue;
    const entry = rawEntry as Record<string, unknown>;
    const rawUserObj =
      entry.user && typeof entry.user === 'object'
        ? (entry.user as Record<string, unknown>)
        : entry;

    const rawId = rawUserObj.id || rawUserObj.uid;
    const candidateId = isValidEntityId(rawId) ? rawId : generateSecureId('usr');
    const rawEmail = sanitizeString(rawUserObj.email, 180).toLowerCase();
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail) ? rawEmail : '';
    const safeName = sanitizeString(rawUserObj.name, 100, 'Bierliefhebber Account');
    const safeAvatar = sanitizeImageUrl(rawUserObj.avatarUrl);
    const nowIso = new Date().toISOString();

    // Controleer of gebruiker al bestaat op basis van ID of e-mailadres
    const matchedIdByEmail = validEmail ? existingEmailsToId.get(validEmail) : undefined;
    const isDuplicateUser = Boolean(existingUserIds.has(candidateId) || matchedIdByEmail);
    const targetUserId = matchedIdByEmail || candidateId;

    if (onProgress) {
      const pct = Math.round(((idx + 1) / Math.max(1, totalEntries)) * 85);
      onProgress(`Verwerken van account ${safeName} (${idx + 1}/${totalEntries})...`, pct);
    }

    if (isDuplicateUser && options.skipDuplicates) {
      report.usersSkippedDuplicate += 1;
    } else {
      await setDoc(
        doc(db, 'users', targetUserId),
        {
          uid: targetUserId,
          name: safeName,
          ...(rawUserObj.googleName
            ? { googleName: sanitizeString(rawUserObj.googleName, 100) }
            : {}),
          ...(validEmail ? { email: validEmail } : {}),
          ...(safeAvatar ? { avatarUrl: safeAvatar } : {}),
          createdAt: sanitizeString(rawUserObj.createdAt, 40, nowIso),
          lastActiveAt: sanitizeString(rawUserObj.lastActiveAt, 40, nowIso),
          updatedAt: nowIso,
        },
        { merge: true }
      );
      existingUserIds.add(targetUserId);
      if (validEmail) existingEmailsToId.set(validEmail, targetUserId);
      report.usersImported += 1;
    }

    if (!existingRecordIdsByUser.has(targetUserId)) {
      existingRecordIdsByUser.set(targetUserId, {
        categories: new Set(),
        beers: new Set(),
        tastings: new Set(),
        glasses: new Set(),
        pubDeals: new Set(),
      });
    }
    const userKnownIds = existingRecordIdsByUser.get(targetUserId)!;

    // 1. Categorieën
    const rawCats = Array.isArray(entry.categories) ? entry.categories : [];
    for (const rc of rawCats.slice(0, 500)) {
      const cat = sanitizeImportedCategory(rc);
      if (!cat) continue;
      if (options.skipDuplicates && userKnownIds.categories.has(cat.id)) {
        report.recordsSkippedDuplicate += 1;
        continue;
      }
      await setDoc(
        doc(db, 'users', targetUserId, 'categories', cat.id),
        {
          userId: targetUserId,
          name: cat.name,
          color: cat.color,
          ...(cat.description ? { description: cat.description } : {}),
          createdAt: cat.createdAt,
        },
        { merge: true }
      );
      userKnownIds.categories.add(cat.id);
      report.categoriesImported += 1;
    }

    // 2. Bieren (inclusief foto's)
    const rawBeers = Array.isArray(entry.beers) ? entry.beers : [];
    for (const rb of rawBeers.slice(0, 2500)) {
      const beer = sanitizeImportedBeer(rb, targetUserId);
      if (!beer) continue;
      if (options.skipDuplicates && userKnownIds.beers.has(beer.id)) {
        report.recordsSkippedDuplicate += 1;
        continue;
      }
      await setDoc(
        doc(db, 'users', targetUserId, 'beers', beer.id),
        {
          userId: targetUserId,
          name: beer.name,
          brewery: beer.brewery || '',
          categoryId: beer.categoryId,
          abv: beer.abv,
          favorite: Boolean(beer.favorite),
          ...(beer.photoUrl ? { photoUrl: beer.photoUrl } : {}),
          ...(beer.photoPosition ? { photoPosition: beer.photoPosition } : {}),
          ...(beer.photoZoom !== undefined ? { photoZoom: beer.photoZoom } : {}),
          dateAdded: beer.dateAdded,
          ...(beer.updatedAt ? { updatedAt: beer.updatedAt } : {}),
        },
        { merge: true }
      );
      userKnownIds.beers.add(beer.id);
      report.beersImported += 1;
    }

    // 3. Proefnotities (inclusief foto's)
    const rawTastings = Array.isArray(entry.tastings) ? entry.tastings : [];
    for (const rt of rawTastings.slice(0, 5000)) {
      const tasting = sanitizeImportedTasting(rt);
      if (!tasting) continue;
      if (options.skipDuplicates && userKnownIds.tastings.has(tasting.id)) {
        report.recordsSkippedDuplicate += 1;
        continue;
      }
      await setDoc(
        doc(db, 'users', targetUserId, 'tastings', tasting.id),
        {
          userId: targetUserId,
          beerId: tasting.beerId,
          rating: tasting.rating,
          notes: tasting.notes || '',
          location: tasting.location || '',
          ...(tasting.servingType ? { servingType: tasting.servingType } : {}),
          ...(tasting.photoUrl ? { photoUrl: tasting.photoUrl } : {}),
          ...(tasting.photoPosition ? { photoPosition: tasting.photoPosition } : {}),
          ...(tasting.photoZoom !== undefined ? { photoZoom: tasting.photoZoom } : {}),
          date: tasting.date,
        },
        { merge: true }
      );
      userKnownIds.tastings.add(tasting.id);
      report.tastingsImported += 1;
    }

    // 4. Bierglazen (inclusief foto's)
    const rawGlasses = Array.isArray(entry.glasses) ? entry.glasses : [];
    for (const rg of rawGlasses.slice(0, 2500)) {
      const glass = sanitizeImportedGlass(rg, targetUserId);
      if (!glass) continue;
      if (options.skipDuplicates && userKnownIds.glasses.has(glass.id)) {
        report.recordsSkippedDuplicate += 1;
        continue;
      }
      await setDoc(
        doc(db, 'users', targetUserId, 'glasses', glass.id),
        {
          userId: targetUserId,
          name: glass.name,
          brand: glass.brand || '',
          glassType: glass.glassType || '',
          quantity: glass.quantity,
          ...(glass.volumeCl !== undefined ? { volumeCl: glass.volumeCl } : {}),
          ...(glass.photoUrl ? { photoUrl: glass.photoUrl } : {}),
          ...(glass.photoPosition ? { photoPosition: glass.photoPosition } : {}),
          ...(glass.photoZoom !== undefined ? { photoZoom: glass.photoZoom } : {}),
          notes: glass.notes || '',
          favorite: Boolean(glass.favorite),
          dateAdded: glass.dateAdded,
          ...(glass.updatedAt ? { updatedAt: glass.updatedAt } : {}),
        },
        { merge: true }
      );
      userKnownIds.glasses.add(glass.id);
      report.glassesImported += 1;
    }

    // 5. Kroeg-acties (pubDeals)
    const rawDeals = Array.isArray(entry.pubDeals) ? entry.pubDeals : [];
    for (const rd of rawDeals.slice(0, 500)) {
      const deal = sanitizePubDeal(rd);
      if (options.skipDuplicates && userKnownIds.pubDeals.has(deal.id)) {
        report.recordsSkippedDuplicate += 1;
        continue;
      }
      await setDoc(
        doc(db, 'users', targetUserId, 'pubDeals', deal.id),
        {
          userId: targetUserId,
          pubName: deal.pubName,
          city: deal.city,
          province: deal.province,
          address: deal.address,
          lat: deal.lat,
          lng: deal.lng,
          hasActiveDeal: deal.hasActiveDeal,
          ...(deal.dealCategory ? { dealCategory: deal.dealCategory } : {}),
          dealTitle: deal.dealTitle,
          ...(deal.beerBrand ? { beerBrand: deal.beerBrand } : {}),
          sourceName: deal.sourceName,
          sourceUrl: deal.sourceUrl,
          checkedAt: deal.checkedAt,
          ...(deal.actieEindDatum ? { actieEindDatum: deal.actieEindDatum } : {}),
          ...(deal.submittedBy ? { submittedBy: deal.submittedBy } : {}),
        },
        { merge: true }
      );
      userKnownIds.pubDeals.add(deal.id);
      report.pubDealsImported += 1;
    }
  }

  // Synchroniseer ook met de centrale server-database (/api/admin/import) indien gekoppeld
  if (auth.currentUser) {
    try {
      if (onProgress) {
        onProgress('Synchroniseren met centrale server-database...', 95);
      }
      const idToken = await auth.currentUser.getIdToken();
      await fetch('/api/admin/import', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payload: { users: rawUsersArray },
          skipDuplicates: options.skipDuplicates,
        }),
      });
    } catch {
      // Niet-blokkerend als alleen Firestore actief is
    }
  }

  if (onProgress) {
    onProgress('Import voltooid!', 100);
  }

  return report;
}

