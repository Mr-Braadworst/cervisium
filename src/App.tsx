import React, { useState, useEffect, useCallback } from 'react';
import { UserAccount, Category, Beer, Tasting, BeerGlass, PubGlassDeal, UserSettings } from './types';
import {
  getActiveUser,
  setActiveUser as persistActiveUser,
  loginUser,
  logoutUser,
  getAllUsers,
  getCategories,
  saveCategories,
  addCategory as addCategoryLocal,
  updateCategory as updateCategoryLocal,
  deleteCategory as deleteCategoryLocal,
  getBeers,
  saveBeers,
  addBeer as addBeerLocal,
  updateBeer as updateBeerLocal,
  deleteBeer as deleteBeerLocal,
  getTastings,
  saveTastings,
  addTasting as addTastingLocal,
  updateTasting as updateTastingLocal,
  deleteTasting as deleteTastingLocal,
  getGlasses,
  saveGlasses,
  addGlass as addGlassLocal,
  updateGlass as updateGlassLocal,
  deleteGlass as deleteGlassLocal,
  loadSampleCraftData,
  getUserSettings,
  saveUserSettings,
  DEFAULT_USER_SETTINGS,
  ImportedBackupPayload,
} from './services/storage';

import {
  subscribeToCategories,
  addCategoryFirestore,
  updateCategoryFirestore,
  deleteCategoryFirestore,
  subscribeToBeers,
  addBeerFirestore,
  updateBeerFirestore,
  deleteBeerFirestore,
  subscribeToTastings,
  addTastingFirestore,
  deleteTastingFirestore,
  updateTastingFirestore,
  subscribeToGlasses,
  addGlassFirestore,
  updateGlassFirestore,
  deleteGlassFirestore,
  subscribeToPubDeals,
  savePubDealFirestore,
  deletePubDealFirestore,
  syncUserProfileFirestore,
  fetchAndSyncGoogleUserProfile,
  subscribeToUserProfile,
  syncImportedDataToFirestore,
} from './services/firestoreService';

import {
  getStoredPubDeals,
  saveStoredPubDeals,
} from './services/glassDealsService';

import { auth, onAuthStateChanged, signOut } from './firebase';

import { Navbar, NavTab } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { BeerListView } from './components/BeerListView';
import { TopRankingsView } from './components/TopRankingsView';
import { CategoriesView } from './components/CategoriesView';
import { BeerModal } from './components/BeerModal';
import { BeerDetailModal } from './components/BeerDetailModal';
import { AccountModal } from './components/AccountModal';
import { LoginScreen } from './components/LoginScreen';
import { AddTastingModal } from './components/AddTastingModal';
import { BeerGlassesView } from './components/BeerGlassesView';
import { ExtrasHubView } from './components/ExtrasHubView';
import { SettingsView } from './components/SettingsView';
import { AdminPanelView } from './components/AdminPanelView';
import { isSuperAdmin, AdminUserSummary } from './services/adminService';
import { Eye, ShieldCheck, ArrowLeft } from 'lucide-react';

export default function App() {
  const [authenticatedUser, setAuthenticatedUser] = useState<UserAccount | null>(() => getActiveUser());
  const [activeUser, setActiveUserState] = useState<UserAccount | null>(() => getActiveUser());
  const [userSettings, setUserSettings] = useState<UserSettings>(() =>
    activeUser ? getUserSettings(activeUser.id) : DEFAULT_USER_SETTINGS
  );
  const [categories, setCategories] = useState<Category[]>(() =>
    activeUser ? getCategories(activeUser.id) : []
  );
  const [beers, setBeers] = useState<Beer[]>(() =>
    activeUser ? getBeers(activeUser.id) : []
  );
  const [tastings, setTastings] = useState<Tasting[]>(() =>
    activeUser ? getTastings(activeUser.id) : []
  );
  const [glasses, setGlasses] = useState<BeerGlass[]>(() =>
    activeUser ? getGlasses(activeUser.id) : []
  );
  const [pubDeals, setPubDeals] = useState<PubGlassDeal[]>(() => getStoredPubDeals());

  // Navigation tab (starts on the user's configured defaultStartTab)
  const [activeTab, setActiveTab] = useState<NavTab>(() =>
    activeUser ? getUserSettings(activeUser.id).defaultStartTab : 'dashboard'
  );

  // Modals
  const [beerModalOpen, setBeerModalOpen] = useState(false);
  const [editingBeer, setEditingBeer] = useState<Beer | null>(null);
  const [selectedBeer, setSelectedBeer] = useState<Beer | null>(null);
  const [tastingBeer, setTastingBeer] = useState<Beer | null>(null);
  const [editingTasting, setEditingTasting] = useState<Tasting | null>(null);
  const [prefillTastingDraft, setPrefillTastingDraft] = useState<Partial<Tasting> | null>(null);
  const [accountModalOpen, setAccountModalOpen] = useState(false);

  // Sync state when active user changes
  const reloadDataForUser = useCallback((user: UserAccount) => {
    const cats = getCategories(user.id);
    const userBeers = getBeers(user.id);
    const userTastings = getTastings(user.id);
    const userGlasses = getGlasses(user.id);
    const loadedSettings = getUserSettings(user.id);
    setCategories(cats);
    setBeers(userBeers);
    setTastings(userTastings);
    setGlasses(userGlasses);
    setUserSettings(loadedSettings);
  }, []);

  // Pas Licht Modus (White Thema) direct toe op het document
  useEffect(() => {
    const isLight = Boolean(activeUser && userSettings.lightMode);
    document.documentElement.classList.toggle('light-mode', isLight);
    document.body.classList.toggle('light-mode', isLight);
  }, [activeUser, userSettings.lightMode]);

  // Listen to Firebase Auth state (Zero-Trust: synchroniseert met echte Google Auth sessie)
  const [firebaseUid, setFirebaseUid] = useState<string | null>(() => auth.currentUser?.uid || null);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setFirebaseUid(fbUser.uid);
        const stored = getActiveUser();
        const googleName =
          (fbUser.displayName && fbUser.displayName.trim()) ||
          fbUser.email?.split('@')[0] ||
          'Bierliefhebber';

        const initialAccount: UserAccount = {
          id: fbUser.uid,
          name:
            stored && stored.id === fbUser.uid && stored.name
              ? stored.name
              : googleName,
          googleName,
          email: fbUser.email || 'gebruiker@bierlog.nl',
          avatarUrl: fbUser.photoURL || undefined,
          createdAt: stored?.createdAt || new Date().toISOString(),
        };
        loginUser(initialAccount);
        setAuthenticatedUser(initialAccount);
        setActiveUserState(initialAccount);
        reloadDataForUser(initialAccount);

        const syncedAccount = await fetchAndSyncGoogleUserProfile(fbUser, stored);
        loginUser(syncedAccount);
        setAuthenticatedUser(syncedAccount);
        setActiveUserState((prev) =>
          !prev || prev.id === syncedAccount.id ? syncedAccount : prev
        );
      } else {
        setFirebaseUid(null);
        // Controleer of er een actieve Docker PostgreSQL server-sessie (HttpOnly cookie) bestaat
        try {
          const res = await fetch('/api/me', {
            method: 'GET',
            credentials: 'include',
          });
          if (res.ok) {
            const data = await res.json();
            if (data?.user?.id) {
              const serverAccount: UserAccount = {
                id: data.user.id,
                name: data.user.name || 'Bierliefhebber',
                googleName: data.user.googleName,
                email: data.user.email || '',
                role: data.user.role,
                avatarUrl: data.user.avatarUrl,
                createdAt: data.user.createdAt || new Date().toISOString(),
              };
              if (data.records) {
                if (Array.isArray(data.records.categories) && data.records.categories.length > 0) {
                  saveCategories(serverAccount.id, data.records.categories);
                }
                if (Array.isArray(data.records.beers) && data.records.beers.length > 0) {
                  saveBeers(serverAccount.id, data.records.beers);
                }
                if (Array.isArray(data.records.tastings) && data.records.tastings.length > 0) {
                  saveTastings(serverAccount.id, data.records.tastings);
                }
                if (Array.isArray(data.records.glasses) && data.records.glasses.length > 0) {
                  saveGlasses(serverAccount.id, data.records.glasses);
                }
              }
              loginUser(serverAccount);
              setAuthenticatedUser(serverAccount);
              setActiveUserState(serverAccount);
              reloadDataForUser(serverAccount);
              return;
            }
          }
        } catch {
          // Server niet bereikbaar of geen actieve sessie
        }

        logoutUser();
        setAuthenticatedUser(null);
        setActiveUserState(null);
      }
    });

    return () => unsubAuth();
  }, [reloadDataForUser]);

  // Firestore Real-Time Subscriptions voor de eigen gebruiker OF wanneer de geverifieerde Admin meekijkt met een andere gebruiker
  useEffect(() => {
    const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env || {};
    if (env.VITE_USE_FIRESTORE === 'false') return;

    const canSubscribe =
      Boolean(activeUser && firebaseUid) &&
      (activeUser!.id === firebaseUid || isSuperAdmin(authenticatedUser));
    if (!canSubscribe || !activeUser) return;

    const isImpersonating = Boolean(
      authenticatedUser && activeUser.id !== authenticatedUser.id
    );

    const unsubCategories = subscribeToCategories(activeUser.id, (remoteCats) => {
      if (remoteCats.length > 0 || isImpersonating) {
        setCategories(remoteCats);
        saveCategories(activeUser.id, remoteCats);
      }
    });

    const unsubBeers = subscribeToBeers(activeUser.id, (remoteBeers) => {
      if (remoteBeers.length > 0 || isImpersonating) {
        setBeers(remoteBeers);
        saveBeers(activeUser.id, remoteBeers);
      }
    });

    const unsubTastings = subscribeToTastings(activeUser.id, (remoteTastings) => {
      if (remoteTastings.length > 0 || isImpersonating) {
        setTastings(remoteTastings);
        saveTastings(activeUser.id, remoteTastings);
      }
    });

    const unsubGlasses = subscribeToGlasses(activeUser.id, (remoteGlasses) => {
      if (remoteGlasses.length > 0 || isImpersonating) {
        setGlasses(remoteGlasses);
        saveGlasses(activeUser.id, remoteGlasses);
      }
    });

    const unsubPubDeals = subscribeToPubDeals(activeUser.id, (remoteDeals) => {
      const stored = getStoredPubDeals();
      if (remoteDeals.length > 0) {
        // Merge remote custom/updated deals with stored deals
        const remoteMap = new Map(remoteDeals.map((d) => [d.id, d]));
        const merged = [
          ...remoteDeals,
          ...stored.filter((s) => !remoteMap.has(s.id)),
        ];
        setPubDeals(merged);
        saveStoredPubDeals(merged);
      } else {
        setPubDeals(stored);
      }
    });

    const unsubProfile = subscribeToUserProfile(activeUser.id, (profileUpdates) => {
      setActiveUserState((prev) => {
        if (!prev || prev.id !== activeUser.id) return prev;
        const next: UserAccount = { ...prev, ...profileUpdates };
        if (!isImpersonating) {
          persistActiveUser(next);
          setAuthenticatedUser(next);
        }
        return next;
      });
    });

    return () => {
      unsubProfile();
      unsubCategories();
      unsubBeers();
      unsubTastings();
      unsubGlasses();
      unsubPubDeals();
    };
  }, [activeUser?.id, firebaseUid, authenticatedUser?.id]);

  const handleLogin = (user: UserAccount) => {
    if (!user || !user.id) return;
    loginUser(user);
    setAuthenticatedUser(user);
    setActiveUserState(user);
    reloadDataForUser(user);
    if (auth.currentUser && auth.currentUser.uid === user.id) {
      syncUserProfileFirestore(user).catch((e) =>
        console.warn('User profile sync notice:', e)
      );
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Ignore server logout errors
    }
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('Firebase signout warning:', e);
    }
    logoutUser();
    setAuthenticatedUser(null);
    setActiveUserState(null);
    setCategories([]);
    setBeers([]);
    setTastings([]);
    setSelectedBeer(null);
    setBeerModalOpen(false);
    setTastingBeer(null);
  };

  const handleSwitchUser = (newUser: UserAccount) => {
    const fbUser = auth.currentUser;
    const isOwnSession = Boolean(
      (fbUser && fbUser.uid === newUser.id) ||
        (authenticatedUser && authenticatedUser.id === newUser.id)
    );
    if (!isOwnSession && !isSuperAdmin(authenticatedUser)) {
      return;
    }
    if (isOwnSession) {
      persistActiveUser(newUser);
      setAuthenticatedUser(newUser);
    }
    setActiveUserState(newUser);
    reloadDataForUser(newUser);
    if (fbUser && fbUser.uid === newUser.id) {
      syncUserProfileFirestore(newUser).catch((e) =>
        console.warn('User profile sync notice:', e)
      );
    }
  };

  const handleUpdateUserProfile = async (updatedUser: UserAccount) => {
    const fbUser = auth.currentUser;
    const isOwnSession = Boolean(
      (fbUser && fbUser.uid === updatedUser.id) ||
        (authenticatedUser && authenticatedUser.id === updatedUser.id)
    );
    if (!isOwnSession && !isSuperAdmin(authenticatedUser)) {
      return;
    }
    setActiveUserState(updatedUser);
    if (isOwnSession && (!authenticatedUser || authenticatedUser.id === updatedUser.id)) {
      persistActiveUser(updatedUser);
      setAuthenticatedUser(updatedUser);
    }
    if (isOwnSession) {
      fetch('/api/me/profile', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: updatedUser.name, avatarUrl: updatedUser.avatarUrl }),
      }).catch(() => {});
    }
    if (fbUser && fbUser.uid === updatedUser.id) {
      try {
        await syncUserProfileFirestore(updatedUser);
      } catch (e) {
        console.warn('User profile sync notice:', e);
      }
    }
  };

  // Admin: Bekijk de volledige website zoals een geselecteerde gebruiker deze ziet
  const handleViewAsUser = (summary: AdminUserSummary) => {
    if (!isSuperAdmin(authenticatedUser)) return;
    setActiveUserState(summary.user);
    setCategories(summary.categories);
    setBeers(summary.beers);
    setTastings(summary.tastings);
    setGlasses(summary.glasses);
    setUserSettings(getUserSettings(summary.user.id));
    setSelectedBeer(null);
    setActiveTab('dashboard');
  };

  const handleStopViewingAsUser = (returnTab: NavTab = 'admin') => {
    if (!authenticatedUser) return;
    persistActiveUser(authenticatedUser);
    setActiveUserState(authenticatedUser);
    reloadDataForUser(authenticatedUser);
    setSelectedBeer(null);
    setActiveTab(returnTab);
  };

  // Add or update category
  const handleAddCategory = async (name: string, color?: string, description?: string): Promise<Category> => {
    if (!activeUser) throw new Error('No user');
    const catColor = color || '#f59e0b';
    const localCat = addCategoryLocal(activeUser.id, name, catColor, description);
    setCategories((prev) => [...prev, localCat]);

    try {
      await addCategoryFirestore(activeUser.id, name, catColor, description);
    } catch (e) {
      console.warn('Firestore category sync fallback to local:', e);
    }
    return localCat;
  };

  const handleUpdateCategory = async (id: string, name: string, color: string, description?: string) => {
    if (!activeUser) return;
    const updated = updateCategoryLocal(activeUser.id, id, name, color, description);
    if (updated) {
      setCategories((prev) => prev.map((c) => (c.id === id ? updated : c)));
    }
    try {
      await updateCategoryFirestore(activeUser.id, id, name, color, description);
    } catch (e) {
      console.warn('Firestore category update fallback to local:', e);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!activeUser) return;
    deleteCategoryLocal(activeUser.id, id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
    try {
      await deleteCategoryFirestore(activeUser.id, id);
    } catch (e) {
      console.warn('Firestore category delete fallback to local:', e);
    }
  };

  // Preset categories suggestion loader
  const handleLoadPresetSuggestions = () => {
    if (!activeUser) return;
    const presets = [
      { name: 'IPA (India Pale Ale)', color: '#f59e0b', desc: 'Hoppig, fris en bitter' },
      { name: 'Tripel', color: '#eab308', desc: 'Goudblond, krachtig en kruidig' },
      { name: 'Blond', color: '#10b981', desc: 'Toegankelijk en fris moutig' },
      { name: 'Stout / Porter', color: '#78350f', desc: 'Donker met koffie- en chocoladetonen' },
      { name: 'Geuze / Zuur', color: '#06b6d4', desc: 'Spontane gisting, complex en friszuur' },
    ];
    presets.forEach((p) => {
      handleAddCategory(p.name, p.color, p.desc);
    });
  };

  // Beers CRUD
  const handleSaveBeer = async (
    beerData: Omit<Beer, 'id' | 'userId' | 'dateAdded'>,
    tastingData: { rating: number; notes?: string; location?: string; servingType?: 'tap' | 'fles' | 'blik'; date: string }
  ) => {
    if (!activeUser) return;

    if (editingBeer) {
      // Just edit beer profile info
      const updated = updateBeerLocal(activeUser.id, editingBeer.id, beerData);
      if (updated) {
        setBeers((prev) => prev.map((b) => (b.id === editingBeer.id ? updated : b)));
        if (selectedBeer?.id === editingBeer.id) {
          setSelectedBeer(updated);
        }
      }
      try {
        await updateBeerFirestore(activeUser.id, editingBeer.id, beerData);
      } catch (e) {
        console.warn('Firestore beer update fallback:', e);
      }

      // Also update the corresponding tasting so rating, notes, location, and date changes are saved
      const beerTastings = tastings
        .filter((t) => t.beerId === editingBeer.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      if (beerTastings.length > 0) {
        const targetTasting = beerTastings[0];
        const tastingUpdates: Partial<Tasting> = {
          beerId: editingBeer.id,
          rating: tastingData.rating,
          notes: tastingData.notes,
          location: tastingData.location,
          servingType: tastingData.servingType,
          date: tastingData.date,
          photoUrl: beerData.photoUrl,
        };
        const updatedTasting = updateTastingLocal(activeUser.id, targetTasting.id, tastingUpdates);
        if (updatedTasting) {
          setTastings((prev) => prev.map((t) => (t.id === targetTasting.id ? updatedTasting : t)));
        }
        try {
          await updateTastingFirestore(activeUser.id, targetTasting.id, tastingUpdates);
        } catch (e) {
          console.warn('Firestore tasting update fallback:', e);
        }
      } else {
        const createdTasting = addTastingLocal(activeUser.id, {
          beerId: editingBeer.id,
          rating: tastingData.rating,
          notes: tastingData.notes,
          location: tastingData.location,
          servingType: tastingData.servingType,
          photoUrl: beerData.photoUrl,
          date: tastingData.date,
        });
        setTastings((prev) => [...prev, createdTasting]);
        try {
          await addTastingFirestore(
            activeUser.id,
            {
              beerId: editingBeer.id,
              rating: tastingData.rating,
              notes: tastingData.notes,
              location: tastingData.location,
              servingType: tastingData.servingType,
              photoUrl: beerData.photoUrl,
              date: tastingData.date,
            },
            createdTasting.id
          );
        } catch (e) {
          console.warn('Firestore tasting create fallback:', e);
        }
      }
    } else {
      // Create beer profile AND first tasting
      const createdBeer = addBeerLocal(activeUser.id, beerData);
      setBeers((prev) => [...prev, createdBeer]);

      const createdTasting = addTastingLocal(activeUser.id, {
        beerId: createdBeer.id,
        rating: tastingData.rating,
        notes: tastingData.notes,
        location: tastingData.location,
        servingType: tastingData.servingType,
        photoUrl: beerData.photoUrl,
        date: tastingData.date,
      });
      setTastings((prev) => [...prev, createdTasting]);

      try {
        await addBeerFirestore(activeUser.id, beerData, createdBeer.id);
        await addTastingFirestore(
          activeUser.id,
          {
            beerId: createdBeer.id,
            rating: tastingData.rating,
            notes: tastingData.notes,
            location: tastingData.location,
            servingType: (tastingData as any).servingType,
            photoUrl: beerData.photoUrl,
            date: tastingData.date,
          },
          createdTasting.id
        );
      } catch (e) {
        console.warn('Firestore beer create fallback:', e);
      }
    }
    setEditingBeer(null);
  };

  const handleAddTasting = async (beerId: string, tastingData: Omit<Tasting, 'id' | 'beerId'>) => {
    if (!activeUser) return;
    const createdTasting = addTastingLocal(activeUser.id, { beerId, ...tastingData });
    setTastings((prev) => [...prev, createdTasting]);

    try {
      await addTastingFirestore(activeUser.id, { beerId, ...tastingData }, createdTasting.id);
    } catch (e) {
      console.warn('Firestore tasting create fallback:', e);
    }
  };

  const handleUpdateTasting = async (tastingId: string, updates: Partial<Tasting>) => {
    if (!activeUser) return;
    const updated = updateTastingLocal(activeUser.id, tastingId, updates);
    if (updated) {
      setTastings((prev) => prev.map((t) => (t.id === tastingId ? updated : t)));
    }
    try {
      await updateTastingFirestore(activeUser.id, tastingId, updates);
    } catch (e) {
      console.warn('Firestore tasting update fallback:', e);
    }
  };

  const handleDeleteTasting = async (tastingId: string) => {
    if (!activeUser) return;
    deleteTastingLocal(activeUser.id, tastingId);
    setTastings((prev) => prev.filter((t) => t.id !== tastingId));
    try {
      await deleteTastingFirestore(activeUser.id, tastingId);
    } catch (e) {
      console.warn('Firestore tasting delete fallback:', e);
    }
  };

  const handleDeleteBeer = async (beerId: string) => {
    if (!activeUser) return;
    const relatedTastings = tastings.filter((t) => t.beerId === beerId);
    deleteBeerLocal(activeUser.id, beerId);
    setBeers((prev) => prev.filter((b) => b.id !== beerId));
    setTastings((prev) => prev.filter((t) => t.beerId !== beerId));
    if (selectedBeer?.id === beerId) {
      setSelectedBeer(null);
    }
    try {
      await deleteBeerFirestore(activeUser.id, beerId);
      for (const t of relatedTastings) {
        await deleteTastingFirestore(activeUser.id, t.id);
      }
    } catch (e) {
      console.warn('Firestore beer delete fallback:', e);
    }
  };

  const handleToggleFavorite = async (beer: Beer) => {
    if (!activeUser) return;
    const newStatus = !beer.favorite;
    const updated = updateBeerLocal(activeUser.id, beer.id, { favorite: newStatus });
    if (updated) {
      setBeers((prev) => prev.map((b) => (b.id === beer.id ? updated : b)));
      if (selectedBeer?.id === beer.id) {
        setSelectedBeer(updated);
      }
    }
    try {
      await updateBeerFirestore(activeUser.id, beer.id, { favorite: newStatus });
    } catch (e) {
      console.warn('Firestore favorite update fallback:', e);
    }
  };

  const handleUpdateBeerPhotoPosition = async (
    beerId: string,
    photoPosition: string,
    photoZoom?: number,
    newPhotoUrl?: string
  ) => {
    if (!activeUser) return;
    const updates: Partial<Beer> = {
      photoPosition,
      photoZoom,
      ...(newPhotoUrl ? { photoUrl: newPhotoUrl } : {}),
    };
    const updated = updateBeerLocal(activeUser.id, beerId, updates);
    if (updated) {
      setBeers((prev) => prev.map((b) => (b.id === beerId ? updated : b)));
      if (selectedBeer?.id === beerId) {
        setSelectedBeer(updated);
      }
    }
    try {
      await updateBeerFirestore(activeUser.id, beerId, updates);
    } catch (e) {
      console.warn('Firestore photo position fallback:', e);
    }
  };

  // Beer Glasses CRUD
  const handleAddGlass = async (glassData: Omit<BeerGlass, 'id' | 'userId' | 'dateAdded'> & { dateAdded?: string }) => {
    if (!activeUser) return;
    const createdGlass = addGlassLocal(activeUser.id, glassData);
    setGlasses((prev) => [...prev, createdGlass]);
    try {
      await addGlassFirestore(activeUser.id, glassData, createdGlass.id);
    } catch (e) {
      console.warn('Firestore glass create fallback:', e);
    }
  };

  const handleUpdateGlass = async (glassId: string, updates: Partial<BeerGlass>) => {
    if (!activeUser) return;
    const updated = updateGlassLocal(activeUser.id, glassId, updates);
    if (updated) {
      setGlasses((prev) => prev.map((g) => (g.id === glassId ? updated : g)));
    }
    try {
      await updateGlassFirestore(activeUser.id, glassId, updates);
    } catch (e) {
      console.warn('Firestore glass update fallback:', e);
    }
  };

  const handleDeleteGlass = async (glassId: string) => {
    if (!activeUser) return;
    deleteGlassLocal(activeUser.id, glassId);
    setGlasses((prev) => prev.filter((g) => g.id !== glassId));
    try {
      await deleteGlassFirestore(activeUser.id, glassId);
    } catch (e) {
      console.warn('Firestore glass delete fallback:', e);
    }
  };

  // Pub Glass Deals CRUD (Landelijke Bier & Glas-Actie Finder)
  const handleAddPubDeal = async (newDeal: PubGlassDeal) => {
    setPubDeals((prev) => {
      const next = [newDeal, ...prev.filter((d) => d.id !== newDeal.id)];
      saveStoredPubDeals(next);
      return next;
    });
    if (activeUser) {
      try {
        await savePubDealFirestore(activeUser.id, newDeal);
      } catch (e) {
        console.warn('Firestore pubDeal create fallback:', e);
      }
    }
  };

  const handleUpdatePubDeals = async (nextDeals: PubGlassDeal[]) => {
    setPubDeals(nextDeals);
    saveStoredPubDeals(nextDeals);
    if (activeUser) {
      try {
        for (const deal of nextDeals) {
          await savePubDealFirestore(activeUser.id, deal);
        }
      } catch (e) {
        console.warn('Firestore pubDeals update fallback:', e);
      }
    }
  };

  const handleDeletePubDeal = async (dealId: string) => {
    setPubDeals((prev) => {
      const next = prev.filter((d) => d.id !== dealId);
      saveStoredPubDeals(next);
      return next;
    });
    if (activeUser) {
      try {
        await deletePubDealFirestore(activeUser.id, dealId);
      } catch (e) {
        console.warn('Firestore pubDeal delete fallback:', e);
      }
    }
  };

  // Demo sample data loader
  const handleResetToSampleData = () => {
    if (!activeUser) return;
    const { categories: sampleCats, beers: sampleBeers, tastings: sampleTastings } = loadSampleCraftData(
      activeUser.id
    );
    setCategories(sampleCats);
    setBeers(sampleBeers);
    setTastings(sampleTastings);
  };

  // Clear all data
  const handleClearAllData = () => {
    if (!activeUser) return;
    saveCategories(activeUser.id, []);
    saveBeers(activeUser.id, []);
    saveTastings(activeUser.id, []);
    setCategories([]);
    setBeers([]);
    setTastings([]);
    setSelectedBeer(null);
  };

  // Update User Settings
  const handleUpdateSettings = (nextSettings: UserSettings) => {
    if (!activeUser) return;
    const saved = saveUserSettings(activeUser.id, nextSettings);
    setUserSettings(saved);
  };

  // Verwerk geïmporteerde back-up (inclusief alle geüploade foto's) in state én Cloud Firestore
  const handleDataImported = async (importedData?: ImportedBackupPayload) => {
    if (!activeUser) return;
    if (importedData) {
      setCategories(importedData.categories);
      setBeers(importedData.beers);
      setTastings(importedData.tastings);
      setGlasses(importedData.glasses);
      try {
        await syncImportedDataToFirestore(activeUser.id, importedData);
      } catch (e) {
        console.warn('Firestore import sync melding:', e);
      }
    } else {
      reloadDataForUser(activeUser);
    }
  };

  // If user is not logged in, present Google Sign-In Screen
  if (!activeUser) {
    return (
      <LoginScreen
        onLogin={handleLogin}
        recentUsers={getAllUsers()}
      />
    );
  }

  // Category lookup for selected beer
  const selectedBeerCategory = categories.find((c) => c.id === selectedBeer?.categoryId);
  const selectedBeerTastings = selectedBeer
    ? tastings.filter((t) => t.beerId === selectedBeer.id)
    : [];

  const isOwnerAdmin = isSuperAdmin(authenticatedUser || activeUser);
  const isViewingAsOtherUser = Boolean(
    isOwnerAdmin &&
      authenticatedUser &&
      activeUser &&
      activeUser.id !== authenticatedUser.id
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-amber-500 selection:text-zinc-950">
      {/* Admin Meekijk-Balk wanneer je de website bekijkt als een andere gebruiker */}
      {isViewingAsOtherUser && (
        <div className="sticky top-0 z-50 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-zinc-950 px-4 py-2.5 shadow-lg border-b border-amber-600/40">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-extrabold">
              <Eye className="w-4 h-4 shrink-0" />
              <span>
                Admin Modus: Je bekijkt de website nu zoals{' '}
                <u className=" decoration-2">{activeUser.name}</u> ({activeUser.email}) hem ziet ({beers.length} bieren &bull; {glasses.length} glazen)
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleStopViewingAsUser('admin')}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-amber-300 text-xs font-extrabold transition-colors"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Terug naar Admin Panel
              </button>
              <button
                type="button"
                onClick={() => handleStopViewingAsUser('dashboard')}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-zinc-900/20 hover:bg-zinc-900/30 text-zinc-950 border border-zinc-950/30 text-xs font-extrabold transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Eigen Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeUser={activeUser}
        onAddNewBeer={() => {
          setEditingBeer(null);
          setBeerModalOpen(true);
        }}
        onLogout={handleLogout}
        beerCount={beers.length}
        glassCount={glasses.reduce((sum, g) => sum + (Number(g.quantity) || 0), 0)}
        activeDealCount={
          pubDeals.filter(
            (d) =>
              d.hasActiveDeal &&
              (!d.actieEindDatum || d.actieEindDatum >= new Date().toISOString().split('T')[0])
          ).length
        }
        settings={userSettings}
      />

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'dashboard' && (
          <DashboardView
            activeUser={activeUser}
            beers={beers}
            tastings={tastings}
            categories={categories}
            onSelectBeer={(beer) => setSelectedBeer(beer)}
            onAddNewBeer={() => {
              setEditingBeer(null);
              setBeerModalOpen(true);
            }}
            onNavigateToTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'list' && (
          <BeerListView
            beers={beers}
            tastings={tastings}
            categories={categories}
            onSelectBeer={(beer) => setSelectedBeer(beer)}
            onEditBeer={(beer) => {
              setEditingBeer(beer);
              setBeerModalOpen(true);
            }}
            onDeleteBeer={handleDeleteBeer}
            onToggleFavorite={handleToggleFavorite}
            onAddNewBeer={() => {
              setEditingBeer(null);
              setBeerModalOpen(true);
            }}
            onOpenCategories={() => setActiveTab('categories')}
          />
        )}

        {activeTab === 'top' && (
          <TopRankingsView
            beers={beers}
            tastings={tastings}
            categories={categories}
            onSelectBeer={(beer) => setSelectedBeer(beer)}
            onToggleFavorite={handleToggleFavorite}
            onAddNewBeer={() => {
              setEditingBeer(null);
              setBeerModalOpen(true);
            }}
          />
        )}

        {activeTab === 'categories' && (
          <CategoriesView
            categories={categories}
            beers={beers}
            tastings={tastings}
            onAddCategory={handleAddCategory}
            onUpdateCategory={handleUpdateCategory}
            onDeleteCategory={handleDeleteCategory}
            onLoadPresetSuggestions={handleLoadPresetSuggestions}
            onSelectBeer={(beer) => setSelectedBeer(beer)}
          />
        )}

        {activeTab === 'glasses' && (
          <BeerGlassesView
            glasses={glasses}
            onAddGlass={handleAddGlass}
            onUpdateGlass={handleUpdateGlass}
            onDeleteGlass={handleDeleteGlass}
          />
        )}

        {(activeTab === 'extras' || activeTab === 'deals' || activeTab === 'counter') && (
          <ExtrasHubView
            activeUser={activeUser}
            deals={pubDeals}
            onAddDeal={handleAddPubDeal}
            onUpdateDeals={handleUpdatePubDeals}
            onDeleteDeal={handleDeletePubDeal}
            initialTool={activeTab === 'deals' ? 'deals' : activeTab === 'counter' ? 'counter' : 'overview'}
            settings={userSettings}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            activeUser={activeUser}
            settings={userSettings}
            categories={categories}
            beers={beers}
            tastings={tastings}
            glasses={glasses}
            isAdmin={Boolean(isOwnerAdmin && !isViewingAsOtherUser && isSuperAdmin(activeUser))}
            onOpenAdminPanel={() => setActiveTab('admin')}
            onUpdateSettings={handleUpdateSettings}
            onUpdateUserProfile={handleUpdateUserProfile}
            onSwitchUser={handleSwitchUser}
            onDataImported={handleDataImported}
            onResetToSampleData={handleResetToSampleData}
            onClearAllData={handleClearAllData}
            onLogout={handleLogout}
            onUpdateBeerPhotoPosition={handleUpdateBeerPhotoPosition}
            onUpdateGlass={handleUpdateGlass}
          />
        )}

        {activeTab === 'admin' && isOwnerAdmin && authenticatedUser && (
          <AdminPanelView
            adminUser={authenticatedUser}
            currentlyViewingUser={isViewingAsOtherUser ? activeUser : null}
            onViewAsUser={handleViewAsUser}
            onStopViewingAsUser={() => handleStopViewingAsUser('admin')}
            onBackToSettings={() => setActiveTab('settings')}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/80 bg-zinc-950 py-6 text-center text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="font-semibold text-zinc-400">BierLog</span>
            <span>&bull; Jouw persoonlijke craft bier &amp; proefnotities app</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-zinc-500">
            <span>Ingelogd via Google: {activeUser.email}</span>
            <button
              onClick={() => setActiveTab('settings')}
              className="text-amber-400 hover:underline font-medium"
            >
              Profiel &amp; Instellingen
            </button>
            <button
              onClick={handleLogout}
              className="text-rose-400 hover:underline font-medium"
            >
              Uitloggen
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AccountModal
        isOpen={accountModalOpen}
        onClose={() => setAccountModalOpen(false)}
        activeUser={activeUser}
        categories={categories}
        beers={beers}
        tastings={tastings}
        glasses={glasses}
        onSwitchUser={handleSwitchUser}
        onDataImported={handleDataImported}
        onResetToSampleData={handleResetToSampleData}
        onClearAllData={handleClearAllData}
      />

      <BeerModal
        isOpen={beerModalOpen}
        onClose={() => {
          setBeerModalOpen(false);
          setEditingBeer(null);
        }}
        onSave={handleSaveBeer}
        categories={categories}
        beers={beers}
        tastings={tastings}
        glasses={glasses}
        onAddCategory={handleAddCategory}
        onSelectExistingBeer={(beer, draft) => {
          setBeerModalOpen(false);
          setEditingBeer(null);
          setEditingTasting(null);
          setPrefillTastingDraft(draft || null);
          setTastingBeer(beer);
        }}
        onOpenCategoryManager={() => {
          setBeerModalOpen(false);
          setActiveTab('categories');
        }}
        initialBeer={editingBeer}
        initialTasting={
          editingBeer
            ? [...tastings.filter((t) => t.beerId === editingBeer.id)].sort(
                (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
              )[0] || null
            : null
        }
      />

      <BeerDetailModal
        beer={selectedBeer}
        tastings={selectedBeerTastings}
        category={selectedBeerCategory}
        isOpen={!!selectedBeer}
        onClose={() => setSelectedBeer(null)}
        onEdit={(beer) => {
          setSelectedBeer(null);
          setEditingBeer(beer);
          setBeerModalOpen(true);
        }}
        onDelete={handleDeleteBeer}
        onToggleFavorite={handleToggleFavorite}
        onOpenAddTasting={(beer) => {
          setEditingTasting(null);
          setPrefillTastingDraft(null);
          setTastingBeer(beer);
        }}
        onDeleteTasting={handleDeleteTasting}
        onEditTasting={(tasting) => {
          setPrefillTastingDraft(null);
          setTastingBeer(selectedBeer);
          setEditingTasting(tasting);
        }}
        onUpdatePhotoPosition={handleUpdateBeerPhotoPosition}
      />

      {/* Add Tasting Modal ("Nog een keer gedronken") */}
      <AddTastingModal
        isOpen={!!tastingBeer}
        beer={tastingBeer}
        currentTastings={tastingBeer ? tastings.filter((t) => t.beerId === tastingBeer.id) : []}
        allLocations={Array.from(
          new Set(
            tastings
              .map((t) => t.location?.trim())
              .filter((l): l is string => Boolean(l))
          )
        )}
        onClose={() => {
          setTastingBeer(null);
          setEditingTasting(null);
          setPrefillTastingDraft(null);
        }}
        onSaveTasting={handleAddTasting}
        onUpdateTasting={handleUpdateTasting}
        initialTasting={editingTasting || undefined}
        prefillDraft={prefillTastingDraft || undefined}
      />

    </div>
  );
}
