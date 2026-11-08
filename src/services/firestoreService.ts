import { UserAccount, Category, Beer, Tasting, BeerGlass, PubGlassDeal } from '../types';
import {
  generateSecureId,
  sanitizeImageUrl,
  sanitizePubDeal,
  sanitizePhotoPosition,
  sanitizeString,
  sanitizeHexColor,
  clampNumber,
  getCanonicalUserIdForEmail,
} from '../utils/security';
import {
  auth,
  db,
  collection,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  handleFirestoreError,
  OperationType,
  FirebaseUser,
  isClientFirestoreEnabled,
} from '../firebase';

function isGenericPlaceholderName(val: unknown, uid: string): boolean {
  if (typeof val !== 'string') return true;
  const trimmed = val.trim();
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

function formatReadableNameFromEmail(email?: string | null): string {
  if (!email || !email.includes('@')) return 'Bierliefhebber';
  const local = email.split('@')[0] || '';
  const cleaned = local
    .replace(/[._-]+/g, ' ')
    .replace(/\d+/g, ' ')
    .trim();
  if (!cleaned) return local || 'Bierliefhebber';
  return cleaned
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export async function syncUserProfileFirestore(user: UserAccount): Promise<void> {
  if (!isClientFirestoreEnabled()) return;
  const path = `users/${user.id}`;
  try {
    const docRef = doc(db, 'users', user.id);
    const fbCurrent = auth.currentUser;
    const isOwnAuth = fbCurrent && fbCurrent.uid === user.id;
    const googleName =
      user.googleName?.trim() ||
      (isOwnAuth && fbCurrent.displayName ? fbCurrent.displayName.trim() : '') ||
      '';

    const cleanName = !isGenericPlaceholderName(user.name, user.id)
      ? user.name.trim()
      : googleName || formatReadableNameFromEmail(user.email);

    const safeAvatar =
      sanitizeImageUrl(user.avatarUrl || (isOwnAuth ? fbCurrent.photoURL || '' : '')) || '';

    const payload: Record<string, unknown> = {
      uid: user.id,
      name: sanitizeString(cleanName, 100, 'Bierliefhebber'),
      email: sanitizeString(user.email, 180, 'gebruiker@bierlog.nl'),
      avatarUrl: safeAvatar,
      createdAt: sanitizeString(user.createdAt, 60, new Date().toISOString()),
      lastActiveAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (googleName) {
      payload.googleName = sanitizeString(googleName, 100);
    }

    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fetchAndSyncGoogleUserProfile(
  fbUser: FirebaseUser,
  localFallback?: UserAccount | null
): Promise<UserAccount> {
  const cleanEmail = (fbUser.email && fbUser.email.trim().toLowerCase()) || '';
  const canonicalId = (cleanEmail && getCanonicalUserIdForEmail(cleanEmail)) || fbUser.uid;
  const uid = canonicalId;
  const googleDisplayName =
    (fbUser.displayName && fbUser.displayName.trim()) ||
    formatReadableNameFromEmail(fbUser.email);
  const googleEmail = (fbUser.email && fbUser.email.trim()) || 'gebruiker@bierlog.nl';
  const googleAvatar = fbUser.photoURL || localFallback?.avatarUrl || undefined;
  const nowIso = new Date().toISOString();

  let resolvedName = googleDisplayName;
  let resolvedCreatedAt = localFallback?.createdAt || nowIso;

  if (
    localFallback &&
    localFallback.id === uid &&
    !isGenericPlaceholderName(localFallback.name, uid)
  ) {
    resolvedName = localFallback.name.trim();
  }

  if (isClientFirestoreEnabled()) {
    try {
      const docRef = doc(db, 'users', uid);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        if (typeof data.name === 'string' && !isGenericPlaceholderName(data.name, uid)) {
          resolvedName = data.name.trim();
        }
        if (typeof data.createdAt === 'string' && data.createdAt) {
          resolvedCreatedAt = data.createdAt;
        }
      }

      await setDoc(
        docRef,
        {
          uid,
          name: resolvedName,
          googleName: googleDisplayName,
          email: googleEmail,
          avatarUrl: googleAvatar || '',
          createdAt: resolvedCreatedAt,
          lastActiveAt: nowIso,
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('Firestore profiel synchronisatie melding:', err);
    }
  }

  return {
    id: uid,
    name: resolvedName,
    googleName: googleDisplayName,
    email: googleEmail,
    avatarUrl: googleAvatar,
    createdAt: resolvedCreatedAt,
  };
}

export function subscribeToUserProfile(
  userId: string,
  onProfile: (profile: Partial<UserAccount>) => void
) {
  if (!isClientFirestoreEnabled()) return () => {};
  const docRef = doc(db, 'users', userId);
  return onSnapshot(
    docRef,
    (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      const updates: Partial<UserAccount> = {};
      if (typeof data.name === 'string' && !isGenericPlaceholderName(data.name, userId)) {
        updates.name = sanitizeString(data.name, 100);
      }
      if (typeof data.googleName === 'string' && data.googleName.trim()) {
        updates.googleName = sanitizeString(data.googleName, 100);
      }
      if (typeof data.email === 'string' && data.email.includes('@')) {
        updates.email = sanitizeString(data.email, 180);
      }
      const safeAvatar = sanitizeImageUrl(data.avatarUrl);
      if (safeAvatar) {
        updates.avatarUrl = safeAvatar;
      }
      if (Object.keys(updates).length > 0) {
        onProfile(updates);
      }
    },
    () => {}
  );
}

export function subscribeToCategories(
  userId: string,
  onData: (categories: Category[]) => void,
  onError?: (err: Error) => void
) {
  if (!isClientFirestoreEnabled()) return () => {};
  const path = `users/${userId}/categories`;
  const colRef = collection(db, 'users', userId, 'categories');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: Category[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        items.push({
          id: d.id,
          name: sanitizeString(data.name, 100, 'Onbekend'),
          color: sanitizeHexColor(data.color),
          description: sanitizeString(data.description, 500),
          createdAt: sanitizeString(data.createdAt, 60),
        });
      });
      onData(items);
    },
    (err) => {
      try {
        handleFirestoreError(err, OperationType.LIST, path);
      } catch (e) {
        if (onError && e instanceof Error) onError(e);
      }
    }
  );
}

export async function addCategoryFirestore(
  userId: string,
  name: string,
  color: string,
  description?: string
): Promise<Category> {
  const catId = generateSecureId('cat');
  const safeColor = sanitizeHexColor(color);
  const newCat: Category = {
    id: catId,
    name: sanitizeString(name, 100, 'Speciaalbier'),
    color: safeColor,
    description: sanitizeString(description, 500),
    createdAt: new Date().toISOString(),
  };

  if (!isClientFirestoreEnabled()) return newCat;

  const path = `users/${userId}/categories/${catId}`;
  try {
    const docRef = doc(db, 'users', userId, 'categories', catId);
    await setDoc(docRef, {
      userId,
      name: newCat.name,
      color: newCat.color,
      description: newCat.description || '',
      createdAt: newCat.createdAt,
    });
    return newCat;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateCategoryFirestore(
  userId: string,
  id: string,
  name: string,
  color: string,
  description?: string
): Promise<void> {
  if (!isClientFirestoreEnabled()) return;
  const path = `users/${userId}/categories/${id}`;
  try {
    const docRef = doc(db, 'users', userId, 'categories', id);
    await setDoc(
      docRef,
      {
        userId,
        name: sanitizeString(name, 100, 'Speciaalbier'),
        color: sanitizeHexColor(color),
        description: sanitizeString(description, 500),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteCategoryFirestore(userId: string, id: string): Promise<void> {
  if (!isClientFirestoreEnabled()) return;
  const path = `users/${userId}/categories/${id}`;
  try {
    const docRef = doc(db, 'users', userId, 'categories', id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeToBeers(
  userId: string,
  onData: (beers: Beer[]) => void,
  onError?: (err: Error) => void
) {
  if (!isClientFirestoreEnabled()) return () => {};
  const path = `users/${userId}/beers`;
  const colRef = collection(db, 'users', userId, 'beers');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: Beer[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        items.push({
          id: d.id,
          userId,
          name: sanitizeString(data.name, 150, 'Speciaalbier'),
          brewery: sanitizeString(data.brewery, 150, ''),
          categoryId: sanitizeString(data.categoryId, 128, 'cat-ipa'),
          abv: Number(clampNumber(data.abv, 0, 100, 5.0).toFixed(1)),
          favorite: !!data.favorite,
          photoUrl: sanitizeImageUrl(data.photoUrl),
          photoPosition: sanitizePhotoPosition(data.photoPosition),
          photoZoom:
            data.photoZoom !== undefined
              ? clampNumber(data.photoZoom, 0.5, 5.0, 1.0)
              : undefined,
          dateAdded: sanitizeString(data.dateAdded, 60, new Date().toISOString()),
          updatedAt: data.updatedAt ? sanitizeString(data.updatedAt, 60) : undefined,
        });
      });
      onData(items);
    },
    (err) => {
      try {
        handleFirestoreError(err, OperationType.LIST, path);
      } catch (e) {
        if (onError && e instanceof Error) onError(e);
      }
    }
  );
}

export async function addBeerFirestore(
  userId: string,
  beerData: Omit<Beer, 'id' | 'userId' | 'dateAdded'> & { dateAdded?: string },
  customId?: string
): Promise<Beer> {
  const beerId = customId || generateSecureId('beer');
  const now = new Date().toISOString();
  const safePhoto = sanitizeImageUrl(beerData.photoUrl);
  const safePos = sanitizePhotoPosition(beerData.photoPosition);
  const safeZoom = beerData.photoZoom ? clampNumber(beerData.photoZoom, 0.5, 5.0, 1.0) : undefined;
  const newBeer: Beer = {
    id: beerId,
    userId,
    ...beerData,
    name: sanitizeString(beerData.name, 150, 'Speciaalbier'),
    brewery: sanitizeString(beerData.brewery, 150, ''),
    categoryId: sanitizeString(beerData.categoryId, 128, 'cat-ipa'),
    abv: Number(clampNumber(beerData.abv, 0, 100, 5.0).toFixed(1)),
    photoUrl: safePhoto,
    photoPosition: safePos,
    photoZoom: safeZoom,
    dateAdded: sanitizeString(beerData.dateAdded, 60, now),
  };

  if (!isClientFirestoreEnabled()) return newBeer;

  const path = `users/${userId}/beers/${beerId}`;
  try {
    const docRef = doc(db, 'users', userId, 'beers', beerId);
    const payload: Record<string, unknown> = {
      userId,
      name: newBeer.name,
      brewery: newBeer.brewery || '',
      categoryId: newBeer.categoryId,
      abv: newBeer.abv,
      favorite: !!newBeer.favorite,
      photoUrl: safePhoto || '',
      dateAdded: newBeer.dateAdded,
    };
    if (safePos) payload.photoPosition = safePos;
    if (safeZoom) payload.photoZoom = safeZoom;
    await setDoc(docRef, payload);
    return newBeer;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateBeerFirestore(
  userId: string,
  beerId: string,
  updates: Partial<Beer>
): Promise<void> {
  if (!isClientFirestoreEnabled()) return;
  const path = `users/${userId}/beers/${beerId}`;
  try {
    const docRef = doc(db, 'users', userId, 'beers', beerId);
    const sanitizedUpdates: Record<string, unknown> = {
      userId,
      updatedAt: new Date().toISOString(),
    };
    if ('name' in updates && updates.name !== undefined) {
      sanitizedUpdates.name = sanitizeString(updates.name, 150, 'Bier');
    }
    if ('brewery' in updates) {
      sanitizedUpdates.brewery = sanitizeString(updates.brewery, 150, '');
    }
    if ('categoryId' in updates && updates.categoryId !== undefined) {
      sanitizedUpdates.categoryId = sanitizeString(updates.categoryId, 128);
    }
    if ('abv' in updates && updates.abv !== undefined) {
      sanitizedUpdates.abv = clampNumber(updates.abv, 0, 100, 0);
    }
    if ('favorite' in updates && updates.favorite !== undefined) {
      sanitizedUpdates.favorite = Boolean(updates.favorite);
    }
    if ('photoUrl' in updates) {
      sanitizedUpdates.photoUrl = sanitizeImageUrl(updates.photoUrl) || '';
    }
    if ('photoPosition' in updates && updates.photoPosition !== undefined) {
      sanitizedUpdates.photoPosition = sanitizePhotoPosition(updates.photoPosition) || '50% 50%';
    }
    if ('photoZoom' in updates && updates.photoZoom !== undefined) {
      sanitizedUpdates.photoZoom = clampNumber(updates.photoZoom, 0.5, 5.0, 1.0);
    }
    if ('dateAdded' in updates && updates.dateAdded !== undefined) {
      sanitizedUpdates.dateAdded = sanitizeString(updates.dateAdded, 60);
    }

    await setDoc(docRef, sanitizedUpdates, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteBeerFirestore(userId: string, beerId: string): Promise<void> {
  if (!isClientFirestoreEnabled()) return;
  const path = `users/${userId}/beers/${beerId}`;
  try {
    const docRef = doc(db, 'users', userId, 'beers', beerId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeToTastings(
  userId: string,
  onData: (tastings: Tasting[]) => void,
  onError?: (err: Error) => void
) {
  if (!isClientFirestoreEnabled()) return () => {};
  const path = `users/${userId}/tastings`;
  const colRef = collection(db, 'users', userId, 'tastings');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: Tasting[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        const st = data.servingType;
        items.push({
          id: d.id,
          beerId: sanitizeString(data.beerId, 128),
          rating: Number(clampNumber(data.rating, 1, 10, 7.0).toFixed(1)),
          notes: sanitizeString(data.notes, 3000, ''),
          location: sanitizeString(data.location, 200, ''),
          servingType: st === 'tap' || st === 'fles' || st === 'blik' ? st : undefined,
          photoUrl: sanitizeImageUrl(data.photoUrl),
          photoPosition: sanitizePhotoPosition(data.photoPosition),
          photoZoom:
            data.photoZoom !== undefined
              ? clampNumber(data.photoZoom, 0.5, 5.0, 1.0)
              : undefined,
          date: sanitizeString(data.date, 60, new Date().toISOString().split('T')[0]),
        });
      });
      onData(items);
    },
    (err) => {
      try {
        handleFirestoreError(err, OperationType.LIST, path);
      } catch (e) {
        if (onError && e instanceof Error) onError(e);
      }
    }
  );
}

export async function addTastingFirestore(
  userId: string,
  tastingData: Omit<Tasting, 'id'>,
  customId?: string
): Promise<Tasting> {
  const tastingId = customId || generateSecureId('tast');
  const safePhoto = sanitizeImageUrl(tastingData.photoUrl);
  const safePos = sanitizePhotoPosition(tastingData.photoPosition);
  const safeZoom = tastingData.photoZoom
    ? clampNumber(tastingData.photoZoom, 0.5, 5.0, 1.0)
    : undefined;
  const st = tastingData.servingType;
  const newTasting: Tasting = {
    id: tastingId,
    ...tastingData,
    beerId: sanitizeString(tastingData.beerId, 128),
    rating: Number(clampNumber(tastingData.rating, 1, 10, 7.0).toFixed(1)),
    notes: sanitizeString(tastingData.notes, 3000, ''),
    location: sanitizeString(tastingData.location, 200, ''),
    servingType: st === 'tap' || st === 'fles' || st === 'blik' ? st : 'fles',
    photoUrl: safePhoto,
    photoPosition: safePos,
    photoZoom: safeZoom,
    date: sanitizeString(tastingData.date, 60, new Date().toISOString().split('T')[0]),
  };

  if (!isClientFirestoreEnabled()) return newTasting;

  const path = `users/${userId}/tastings/${tastingId}`;
  try {
    const docRef = doc(db, 'users', userId, 'tastings', tastingId);
    const payload: Record<string, unknown> = {
      userId,
      beerId: newTasting.beerId,
      rating: newTasting.rating,
      notes: newTasting.notes || '',
      location: newTasting.location || '',
      servingType: newTasting.servingType || 'fles',
      photoUrl: safePhoto || '',
      date: newTasting.date,
    };
    if (safePos) payload.photoPosition = safePos;
    if (safeZoom) payload.photoZoom = safeZoom;
    await setDoc(docRef, payload);
    return newTasting;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteTastingFirestore(userId: string, tastingId: string): Promise<void> {
  if (!isClientFirestoreEnabled()) return;
  const path = `users/${userId}/tastings/${tastingId}`;
  try {
    const docRef = doc(db, 'users', userId, 'tastings', tastingId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function updateTastingFirestore(
  userId: string,
  tastingId: string,
  updates: Partial<Tasting>
): Promise<void> {
  if (!isClientFirestoreEnabled()) return;
  const path = `users/${userId}/tastings/${tastingId}`;
  try {
    const docRef = doc(db, 'users', userId, 'tastings', tastingId);
    const sanitizedUpdates: Record<string, unknown> = {
      userId,
    };
    if ('beerId' in updates && updates.beerId !== undefined) {
      sanitizedUpdates.beerId = sanitizeString(updates.beerId, 128);
    }
    if ('rating' in updates && updates.rating !== undefined) {
      sanitizedUpdates.rating = clampNumber(updates.rating, 1, 10, 7);
    }
    if ('notes' in updates) {
      sanitizedUpdates.notes = sanitizeString(updates.notes, 3000, '');
    }
    if ('location' in updates) {
      sanitizedUpdates.location = sanitizeString(updates.location, 200, '');
    }
    if ('servingType' in updates) {
      const st = updates.servingType;
      sanitizedUpdates.servingType =
        st === 'tap' || st === 'fles' || st === 'blik' ? st : '';
    }
    if ('photoUrl' in updates) {
      sanitizedUpdates.photoUrl = sanitizeImageUrl(updates.photoUrl) || '';
    }
    if ('photoPosition' in updates && updates.photoPosition !== undefined) {
      sanitizedUpdates.photoPosition = sanitizePhotoPosition(updates.photoPosition) || '50% 50%';
    }
    if ('photoZoom' in updates && updates.photoZoom !== undefined) {
      sanitizedUpdates.photoZoom = clampNumber(updates.photoZoom, 0.5, 5.0, 1.0);
    }
    if ('date' in updates && updates.date !== undefined) {
      sanitizedUpdates.date = sanitizeString(updates.date, 60);
    }

    await setDoc(docRef, sanitizedUpdates, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function subscribeToGlasses(
  userId: string,
  onData: (glasses: BeerGlass[]) => void,
  onError?: (err: Error) => void
) {
  if (!isClientFirestoreEnabled()) return () => {};
  const path = `users/${userId}/glasses`;
  const colRef = collection(db, 'users', userId, 'glasses');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: BeerGlass[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        items.push({
          id: d.id,
          userId,
          name: sanitizeString(data.name, 150, 'Bierglas'),
          brand: sanitizeString(data.brand, 150, ''),
          glassType: sanitizeString(data.glassType, 100, ''),
          quantity: Math.round(clampNumber(data.quantity, 0, 99999, 1)),
          volumeCl: data.volumeCl ? clampNumber(data.volumeCl, 0, 1000, 33) : undefined,
          photoUrl: sanitizeImageUrl(data.photoUrl),
          photoPosition: sanitizePhotoPosition(data.photoPosition),
          photoZoom:
            data.photoZoom !== undefined
              ? clampNumber(data.photoZoom, 0.5, 5.0, 1.0)
              : undefined,
          notes: sanitizeString(data.notes, 2000, ''),
          favorite: !!data.favorite,
          dateAdded: sanitizeString(data.dateAdded, 60, new Date().toISOString()),
          updatedAt: data.updatedAt ? sanitizeString(data.updatedAt, 60) : undefined,
        });
      });
      onData(items);
    },
    (err) => {
      try {
        handleFirestoreError(err, OperationType.LIST, path);
      } catch (e) {
        if (onError && e instanceof Error) onError(e);
      }
    }
  );
}

export async function addGlassFirestore(
  userId: string,
  glassData: Omit<BeerGlass, 'id' | 'userId' | 'dateAdded'> & { dateAdded?: string },
  customId?: string
): Promise<BeerGlass> {
  const glassId = customId || generateSecureId('glass');
  const now = new Date().toISOString();
  const safePhoto = sanitizeImageUrl(glassData.photoUrl);
  const safePos = sanitizePhotoPosition(glassData.photoPosition);
  const safeZoom = glassData.photoZoom
    ? clampNumber(glassData.photoZoom, 0.5, 5.0, 1.0)
    : undefined;
  const newGlass: BeerGlass = {
    id: glassId,
    userId,
    ...glassData,
    name: sanitizeString(glassData.name, 150, 'Bierglas'),
    brand: sanitizeString(glassData.brand, 150, ''),
    glassType: sanitizeString(glassData.glassType, 100, ''),
    quantity: Math.round(clampNumber(glassData.quantity, 0, 99999, 1)),
    volumeCl: glassData.volumeCl ? clampNumber(glassData.volumeCl, 0, 1000, 33) : 0,
    notes: sanitizeString(glassData.notes, 2000, ''),
    photoUrl: safePhoto,
    photoPosition: safePos,
    photoZoom: safeZoom,
    dateAdded: sanitizeString(glassData.dateAdded, 60, now),
  };

  if (!isClientFirestoreEnabled()) return newGlass;

  const path = `users/${userId}/glasses/${glassId}`;
  try {
    const docRef = doc(db, 'users', userId, 'glasses', glassId);
    const payload: Record<string, unknown> = {
      userId,
      name: newGlass.name,
      brand: newGlass.brand || '',
      glassType: newGlass.glassType || '',
      quantity: newGlass.quantity,
      volumeCl: newGlass.volumeCl || 0,
      photoUrl: safePhoto || '',
      notes: newGlass.notes || '',
      favorite: !!newGlass.favorite,
      dateAdded: newGlass.dateAdded,
    };
    if (safePos) payload.photoPosition = safePos;
    if (safeZoom) payload.photoZoom = safeZoom;
    await setDoc(docRef, payload);
    return newGlass;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateGlassFirestore(
  userId: string,
  glassId: string,
  updates: Partial<BeerGlass>
): Promise<void> {
  if (!isClientFirestoreEnabled()) return;
  const path = `users/${userId}/glasses/${glassId}`;
  try {
    const docRef = doc(db, 'users', userId, 'glasses', glassId);
    const sanitizedUpdates: Record<string, unknown> = {
      userId,
      updatedAt: new Date().toISOString(),
    };
    if ('name' in updates && updates.name !== undefined) {
      sanitizedUpdates.name = sanitizeString(updates.name, 150, 'Bierglas');
    }
    if ('brand' in updates) {
      sanitizedUpdates.brand = sanitizeString(updates.brand, 150, '');
    }
    if ('glassType' in updates) {
      sanitizedUpdates.glassType = sanitizeString(updates.glassType, 100, '');
    }
    if ('quantity' in updates && updates.quantity !== undefined) {
      sanitizedUpdates.quantity = clampNumber(updates.quantity, 0, 99999, 1);
    }
    if ('volumeCl' in updates && updates.volumeCl !== undefined) {
      sanitizedUpdates.volumeCl = clampNumber(updates.volumeCl, 0, 1000, 0);
    }
    if ('photoUrl' in updates) {
      sanitizedUpdates.photoUrl = sanitizeImageUrl(updates.photoUrl) || '';
    }
    if ('photoPosition' in updates && updates.photoPosition !== undefined) {
      sanitizedUpdates.photoPosition = sanitizePhotoPosition(updates.photoPosition) || '50% 50%';
    }
    if ('photoZoom' in updates && updates.photoZoom !== undefined) {
      sanitizedUpdates.photoZoom = clampNumber(updates.photoZoom, 0.5, 5.0, 1.0);
    }
    if ('notes' in updates) {
      sanitizedUpdates.notes = sanitizeString(updates.notes, 2000, '');
    }
    if ('favorite' in updates && updates.favorite !== undefined) {
      sanitizedUpdates.favorite = Boolean(updates.favorite);
    }
    if ('dateAdded' in updates && updates.dateAdded !== undefined) {
      sanitizedUpdates.dateAdded = sanitizeString(updates.dateAdded, 60);
    }

    await setDoc(docRef, sanitizedUpdates, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteGlassFirestore(userId: string, glassId: string): Promise<void> {
  if (!isClientFirestoreEnabled()) return;
  const path = `users/${userId}/glasses/${glassId}`;
  try {
    const docRef = doc(db, 'users', userId, 'glasses', glassId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeToPubDeals(
  userId: string,
  onData: (deals: PubGlassDeal[]) => void,
  onError?: (err: Error) => void
) {
  if (!isClientFirestoreEnabled()) return () => {};
  const path = `users/${userId}/pubDeals`;
  const colRef = collection(db, 'users', userId, 'pubDeals');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: PubGlassDeal[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        items.push(
          sanitizePubDeal({
            id: d.id,
            ...data,
          })
        );
      });
      onData(items);
    },
    (err) => {
      try {
        handleFirestoreError(err, OperationType.LIST, path);
      } catch (e) {
        if (onError && e instanceof Error) onError(e);
      }
    }
  );
}

export async function savePubDealFirestore(userId: string, rawDeal: PubGlassDeal): Promise<void> {
  if (!isClientFirestoreEnabled()) return;
  const deal = sanitizePubDeal(rawDeal);
  const path = `users/${userId}/pubDeals/${deal.id}`;
  try {
    const docRef = doc(db, 'users', userId, 'pubDeals', deal.id);
    await setDoc(
      docRef,
      {
        userId,
        pubName: deal.pubName,
        city: deal.city,
        province: deal.province,
        address: deal.address,
        lat: deal.lat,
        lng: deal.lng,
        hasActiveDeal: deal.hasActiveDeal,
        dealCategory: deal.dealCategory || 'glas',
        dealTitle: deal.dealTitle,
        beerBrand: deal.beerBrand || '',
        sourceName: deal.sourceName,
        sourceUrl: deal.sourceUrl,
        checkedAt: deal.checkedAt,
        actieEindDatum: deal.actieEindDatum,
        submittedBy: deal.submittedBy || '',
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deletePubDealFirestore(userId: string, dealId: string): Promise<void> {
  if (!isClientFirestoreEnabled()) return;
  const path = `users/${userId}/pubDeals/${dealId}`;
  try {
    const docRef = doc(db, 'users', userId, 'pubDeals', dealId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function syncImportedDataToFirestore(
  userId: string,
  data: {
    categories: Category[];
    beers: Beer[];
    tastings: Tasting[];
    glasses: BeerGlass[];
  }
): Promise<void> {
  if (!isClientFirestoreEnabled()) return;

  for (const cat of data.categories) {
    try {
      const docRef = doc(db, 'users', userId, 'categories', cat.id);
      await setDoc(
        docRef,
        {
          userId,
          name: sanitizeString(cat.name, 100, 'Speciaalbier'),
          color: sanitizeHexColor(cat.color),
          description: sanitizeString(cat.description, 500, ''),
          createdAt: sanitizeString(cat.createdAt, 60, new Date().toISOString()),
        },
        { merge: true }
      );
    } catch (e) {
      console.warn('Firestore import categorie sync melding:', e);
    }
  }

  for (const beer of data.beers) {
    try {
      const docRef = doc(db, 'users', userId, 'beers', beer.id);
      const safePhoto = sanitizeImageUrl(beer.photoUrl) || '';
      const safePos = sanitizePhotoPosition(beer.photoPosition);
      const safeZoom = beer.photoZoom ? clampNumber(beer.photoZoom, 0.5, 5.0, 1.0) : undefined;
      const payload: Record<string, unknown> = {
        userId,
        name: sanitizeString(beer.name, 150, 'Bier'),
        brewery: sanitizeString(beer.brewery, 150, ''),
        categoryId: sanitizeString(beer.categoryId, 128, 'cat-ipa'),
        abv: clampNumber(beer.abv, 0, 100, 5.0),
        favorite: Boolean(beer.favorite),
        photoUrl: safePhoto,
        dateAdded: sanitizeString(beer.dateAdded, 60, new Date().toISOString()),
        updatedAt: new Date().toISOString(),
      };
      if (safePos) payload.photoPosition = safePos;
      if (safeZoom) payload.photoZoom = safeZoom;
      await setDoc(docRef, payload, { merge: true });
    } catch (e) {
      console.warn('Firestore import bier sync melding:', e);
    }
  }

  for (const tasting of data.tastings) {
    try {
      const docRef = doc(db, 'users', userId, 'tastings', tasting.id);
      const safePhoto = sanitizeImageUrl(tasting.photoUrl) || '';
      const safePos = sanitizePhotoPosition(tasting.photoPosition);
      const safeZoom = tasting.photoZoom ? clampNumber(tasting.photoZoom, 0.5, 5.0, 1.0) : undefined;
      const payload: Record<string, unknown> = {
        userId,
        beerId: sanitizeString(tasting.beerId, 128),
        rating: clampNumber(tasting.rating, 1, 10, 7),
        notes: sanitizeString(tasting.notes, 3000, ''),
        location: sanitizeString(tasting.location, 200, ''),
        servingType:
          tasting.servingType === 'tap' ||
          tasting.servingType === 'fles' ||
          tasting.servingType === 'blik'
            ? tasting.servingType
            : 'fles',
        photoUrl: safePhoto,
        date: sanitizeString(tasting.date, 60, new Date().toISOString().split('T')[0]),
      };
      if (safePos) payload.photoPosition = safePos;
      if (safeZoom) payload.photoZoom = safeZoom;
      await setDoc(docRef, payload, { merge: true });
    } catch (e) {
      console.warn('Firestore import tasting sync melding:', e);
    }
  }

  for (const glass of data.glasses) {
    try {
      const docRef = doc(db, 'users', userId, 'glasses', glass.id);
      const safePhoto = sanitizeImageUrl(glass.photoUrl) || '';
      const safePos = sanitizePhotoPosition(glass.photoPosition);
      const safeZoom = glass.photoZoom ? clampNumber(glass.photoZoom, 0.5, 5.0, 1.0) : undefined;
      const payload: Record<string, unknown> = {
        userId,
        name: sanitizeString(glass.name, 150, 'Bierglas'),
        brand: sanitizeString(glass.brand, 150, ''),
        glassType: sanitizeString(glass.glassType, 100, ''),
        quantity: clampNumber(glass.quantity, 0, 99999, 1),
        volumeCl: glass.volumeCl ? clampNumber(glass.volumeCl, 0, 1000, 0) : 0,
        photoUrl: safePhoto,
        notes: sanitizeString(glass.notes, 2000, ''),
        favorite: Boolean(glass.favorite),
        dateAdded: sanitizeString(glass.dateAdded, 60, new Date().toISOString()),
        updatedAt: new Date().toISOString(),
      };
      if (safePos) payload.photoPosition = safePos;
      if (safeZoom) payload.photoZoom = safeZoom;
      await setDoc(docRef, payload, { merge: true });
    } catch (e) {
      console.warn('Firestore import glas sync melding:', e);
    }
  }
}


