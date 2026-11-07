import React, { useState, useMemo, useEffect } from 'react';
import { UserAccount, UserSettings, Category, Beer, Tasting, BeerGlass, AppLanguagePreference } from '../types';
import {
  exportUserData,
  importUserData,
  ImportedBackupPayload,
  DEFAULT_USER_SETTINGS,
  setActiveUser as persistActiveUser,
} from '../services/storage';
import { PhotoLightboxModal } from './PhotoLightboxModal';
import { isSuperAdmin } from '../services/adminService';
import { detectBrowserLocale, setLanguagePreference } from '../utils/i18n';
import {
  Settings,
  User,
  Bell,
  Sliders,
  Download,
  Upload,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  Check,
  LogOut,
  Beer as BeerIcon,
  Sparkles,
  RotateCcw,
  Sun,
  Moon,
  Image as ImageIcon,
  CupSoda,
  LayoutGrid,
  Rows3,
  Maximize2,
  Globe,
} from 'lucide-react';

interface GalleryPhotoItem {
  id: string;
  itemId: string;
  type: 'beer' | 'glass';
  title: string;
  subtitle: string;
  photoUrl: string;
  photoPosition: string;
  photoZoom: number;
  dateAdded: string;
}

interface SettingsViewProps {
  activeUser: UserAccount;
  settings: UserSettings;
  categories?: Category[];
  beers?: Beer[];
  tastings?: Tasting[];
  glasses?: BeerGlass[];
  isAdmin?: boolean;
  onOpenAdminPanel?: () => void;
  onUpdateSettings: (nextSettings: UserSettings) => void;
  onUpdateUserProfile: (updatedUser: UserAccount) => Promise<void> | void;
  onSwitchUser: (user: UserAccount) => void;
  onDataImported: (importedData?: ImportedBackupPayload) => Promise<void> | void;
  onResetToSampleData: () => void;
  onClearAllData: () => void;
  onLogout: () => void;
  onUpdateBeerPhotoPosition?: (
    beerId: string,
    position: string,
    zoom?: number,
    newPhotoUrl?: string
  ) => void;
  onUpdateGlass?: (glassId: string, updates: Partial<BeerGlass>) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  activeUser,
  settings,
  categories,
  beers = [],
  tastings = [],
  glasses = [],
  isAdmin = false,
  onOpenAdminPanel,
  onUpdateSettings,
  onUpdateUserProfile,
  onDataImported,
  onResetToSampleData,
  onClearAllData,
  onLogout,
  onUpdateBeerPhotoPosition,
  onUpdateGlass,
}) => {
  const [displayName, setDisplayName] = useState(activeUser.name);
  const [profileSavedMsg, setProfileSavedMsg] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    setDisplayName(activeUser.name);
  }, [activeUser.id, activeUser.name]);

  // Gallery state: default is 'all' (alles in 1 keer)
  const [galleryViewMode, setGalleryViewMode] = useState<'all' | 'split' | 'beers' | 'glasses'>('all');
  const [selectedGalleryPhoto, setSelectedGalleryPhoto] = useState<GalleryPhotoItem | null>(null);

  const beerPhotos = useMemo<GalleryPhotoItem[]>(() => {
    const items: GalleryPhotoItem[] = [];
    beers.forEach((beer) => {
      const beerTastings = tastings.filter((t) => t.beerId === beer.id);
      const heroPhoto = beer.photoUrl || beerTastings.find((t) => t.photoUrl)?.photoUrl;
      if (heroPhoto) {
        items.push({
          id: `beer-${beer.id}`,
          itemId: beer.id,
          type: 'beer',
          title: beer.name,
          subtitle: beer.brewery || 'Speciaalbier',
          photoUrl: heroPhoto,
          photoPosition: beer.photoPosition || '50% 50%',
          photoZoom: beer.photoZoom || 1.0,
          dateAdded: beer.dateAdded,
        });
      }
    });
    return items.sort(
      (a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime()
    );
  }, [beers, tastings]);

  const glassPhotos = useMemo<GalleryPhotoItem[]>(() => {
    return glasses
      .filter((g) => Boolean(g.photoUrl))
      .map((glass) => ({
        id: `glass-${glass.id}`,
        itemId: glass.id,
        type: 'glass' as const,
        title: glass.name,
        subtitle: glass.brand || glass.glassType || 'Bierglas',
        photoUrl: glass.photoUrl!,
        photoPosition: glass.photoPosition || '50% 50%',
        photoZoom: glass.photoZoom || 1.0,
        dateAdded: glass.dateAdded,
      }))
      .sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());
  }, [glasses]);

  const allPhotos = useMemo<GalleryPhotoItem[]>(() => {
    return [...beerPhotos, ...glassPhotos].sort(
      (a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime()
    );
  }, [beerPhotos, glassPhotos]);

  const renderPhotoCard = (item: GalleryPhotoItem) => (
    <button
      key={item.id}
      type="button"
      onClick={() => setSelectedGalleryPhoto(item)}
      className="group relative aspect-square rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800 hover:border-amber-500/60 shadow-md transition-all text-left"
      title={`${item.title} bekijken of bewerken`}
    >
      <img
        src={item.photoUrl}
        alt={item.title}
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        style={{
          objectPosition: item.photoPosition,
          transform: `scale(${item.photoZoom})`,
          transformOrigin: item.photoPosition,
        }}
      />

      {/* Top badge: Biertje vs Bierglas */}
      <div className="absolute top-2 left-2 z-10">
        {item.type === 'beer' ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/90 text-zinc-950 shadow-sm">
            <BeerIcon className="w-3 h-3" />
            Biertje
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/90 text-zinc-950 shadow-sm">
            <CupSoda className="w-3 h-3" />
            Bierglas
          </span>
        )}
      </div>

      {/* Hover action badge */}
      <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="p-1.5 rounded-lg bg-zinc-950/85 text-amber-400 border border-zinc-700 flex items-center justify-center">
          <Maximize2 className="w-3.5 h-3.5" />
        </span>
      </div>

      {/* Bottom caption overlay */}
      <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
        <p className="text-xs font-bold text-white truncate">{item.title}</p>
        <p className="text-[10px] text-zinc-300 truncate">{item.subtitle}</p>
      </div>
    </button>
  );

  const toggleSetting = (
    key: keyof Pick<
      UserSettings,
      | 'lightMode'
      | 'showExtrasDealBadge'
      | 'showNavCollectionCounts'
      | 'showExtrasTab'
      | 'showDealScanner'
    >
  ) => {
    onUpdateSettings({
      ...settings,
      [key]: !settings[key],
    });
  };

  const handleSaveProfileName = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = displayName.replace(/\0/g, '').trim().slice(0, 60);
    if (!cleanName) return;
    const updated: UserAccount = {
      ...activeUser,
      name: cleanName,
    };
    await onUpdateUserProfile(updated);
    setDisplayName(cleanName);
    setProfileSavedMsg('Profielnaam opgeslagen in de database!');
    setTimeout(() => setProfileSavedMsg(null), 3000);
  };

  const handleExport = () => {
    const jsonStr = exportUserData(activeUser.id, {
      categories,
      beers,
      tastings,
      glasses,
    });
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cervisium_${activeUser.name.toLowerCase().replace(/[^a-z0-9_-]/gi, '_')}_backup.json`;
    a.click();
    URL.revokeObjectURL(url);
    setImportStatus(
      `Back-up gedownload inclusief ${allPhotos.length} geüploade foto's (${beers.length} bieren en ${glasses.length} glazen)!`
    );
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
      setImportStatus('Fout: Back-up bestand is te groot (maximaal 100 MB toegestaan).');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const res = importUserData(activeUser.id, content);
      if (res.success && res.count) {
        setImportStatus(
          `Succesvol geïmporteerd: ${res.count.categories} categorieën, ${res.count.beers} bieren, ${res.count.tastings} proefnotities, ${res.count.glasses || 0} glazen én ${res.count.photos || 0} geüploade foto's!`
        );
        await onDataImported(res.importedData);
      } else {
        setImportStatus(`Fout: ${res.message || 'Kon bestand niet lezen'}`);
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-950/70 via-zinc-900 to-zinc-900 border border-amber-500/30 rounded-2xl p-6 sm:p-7 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative z-10">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              {activeUser.avatarUrl ? (
                <img
                  src={activeUser.avatarUrl}
                  alt={activeUser.name}
                  className="w-16 h-16 rounded-2xl object-cover ring-2 ring-amber-500/50 shadow-lg"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-300 font-black flex items-center justify-center text-2xl border border-amber-500/40">
                  {activeUser.name.charAt(0)}
                </div>
              )}
              <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-md bg-emerald-500 text-zinc-950 text-[10px] font-black">
                PROFIEL
              </span>
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-1.5">
                <Settings className="w-3.5 h-3.5" />
                Mijn Profiel &amp; App Instellingen
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-100 tracking-tight">
                {activeUser.name}
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400 font-mono">
                {activeUser.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {isAdmin && isSuperAdmin(activeUser) && onOpenAdminPanel && (
              <button
                type="button"
                onClick={onOpenAdminPanel}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-extrabold shadow-lg shadow-amber-500/20 transition-all w-fit"
              >
                <ShieldCheck className="w-4 h-4" />
                Admin Panel
              </button>
            )}

            <button
              onClick={onLogout}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-rose-500/15 border border-zinc-700 hover:border-rose-500/40 text-zinc-300 hover:text-rose-300 text-xs font-bold transition-all w-fit"
            >
              <LogOut className="w-4 h-4" />
              Uitloggen
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Linkerkolom: Taal, Weergave, Navigatie & Voorkeuren */}
        <div className="lg:col-span-7 space-y-6">
          {/* Sectie 0: Taal & Regio Instellingen */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-zinc-100">
                    Taal &amp; Regio
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Kies de taal van de app of volg automatisch je browser- en telefooninstellingen (merknamen blijven ongewijzigd)
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-semibold text-zinc-300">
                App-taal
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(
                  [
                    {
                      value: 'auto',
                      flag: '🌐',
                      label: 'Automatisch',
                      sub: `Browser (${detectBrowserLocale().toUpperCase()})`,
                      noTranslate: false,
                    },
                    {
                      value: 'nl',
                      flag: '🇳🇱',
                      label: 'Nederlands',
                      sub: 'NL',
                      noTranslate: true,
                    },
                    {
                      value: 'en',
                      flag: '🇬🇧',
                      label: 'English',
                      sub: 'EN',
                      noTranslate: true,
                    },
                    {
                      value: 'de',
                      flag: '🇩🇪',
                      label: 'Deutsch',
                      sub: 'DE',
                      noTranslate: true,
                    },
                    {
                      value: 'fr',
                      flag: '🇫🇷',
                      label: 'Français',
                      sub: 'FR',
                      noTranslate: true,
                    },
                    {
                      value: 'es',
                      flag: '🇪🇸',
                      label: 'Español',
                      sub: 'ES',
                      noTranslate: true,
                    },
                  ] as Array<{
                    value: AppLanguagePreference;
                    flag: string;
                    label: string;
                    sub: string;
                    noTranslate: boolean;
                  }>
                ).map((langOpt) => {
                  const currentLang = settings.language || 'auto';
                  const isSelected = currentLang === langOpt.value;
                  return (
                    <button
                      key={langOpt.value}
                      type="button"
                      onClick={() => {
                        setLanguagePreference(langOpt.value);
                        onUpdateSettings({
                          ...settings,
                          language: langOpt.value,
                        });
                      }}
                      className={`flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'bg-amber-500/15 border-amber-500 text-amber-300 shadow-sm'
                          : 'bg-zinc-950/80 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:text-zinc-100'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base shrink-0" translate="no">
                          {langOpt.flag}
                        </span>
                        <div className="truncate">
                          <span
                            className="text-xs font-bold block truncate"
                            translate={langOpt.noTranslate ? 'no' : undefined}
                          >
                            {langOpt.label}
                          </span>
                          <span
                            className="text-[10px] text-zinc-400 block"
                            translate="no"
                          >
                            {langOpt.sub}
                          </span>
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-amber-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sectie 1: Navigatiebalk & Badges Instellingen */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-lg space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-zinc-100">
                    Weergave, Thema &amp; Navigatiebalk
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Schakel Licht Modus (wit thema) in of pas de knoppen en tellers in de bovenbalk aan
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setLanguagePreference('auto');
                  onUpdateSettings({ ...DEFAULT_USER_SETTINGS });
                }}
                className="flex items-center gap-1 text-[11px] font-semibold text-zinc-400 hover:text-amber-400 transition-colors"
                title="Herstel standaardinstellingen"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Standaard
              </button>
            </div>

            <div className="space-y-3.5">
              {/* Toggle 0: Licht Modus (Wit Thema) */}
              <div className="p-4 rounded-xl bg-zinc-950/80 border border-amber-500/30 flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0 mt-0.5">
                    {settings.lightMode ? (
                      <Sun className="w-4 h-4" />
                    ) : (
                      <Moon className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-zinc-100">
                        Licht Modus (Wit Thema)
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        {settings.lightMode ? 'Wit thema actief' : 'Donker thema actief'}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                      Activeert een helder wit thema voor de volledige applicatie in plaats van de donkere modus.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.lightMode}
                  onClick={() => toggleSetting('lightMode')}
                  className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    settings.lightMode ? 'bg-amber-500' : 'bg-zinc-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      settings.lightMode ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Toggle 1: Actie-teller bij Extra's knop (Standaard UIT) */}
              <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-zinc-100">
                      Actie-teller bij &ldquo;Extra&apos;s&rdquo; knop tonen
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                      Standaard uit
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                    Toont een groen getal met het aantal actieve kroeg-deals naast de knop &ldquo;Extra&apos;s&rdquo; in de navigatiebalk.
                  </p>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.showExtrasDealBadge}
                  onClick={() => toggleSetting('showExtrasDealBadge')}
                  className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    settings.showExtrasDealBadge ? 'bg-emerald-500' : 'bg-zinc-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      settings.showExtrasDealBadge ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Toggle 2: Aantallen bij Mijn Bieren & Bierglazen */}
              <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-between gap-4">
                <div>
                  <span className="text-sm font-bold text-zinc-100 block">
                    Tellers bij &ldquo;Mijn Bieren&rdquo; en &ldquo;Bierglazen&rdquo;
                  </span>
                  <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                    Toont het totaal aantal geproefde bieren en glazen als badge op de menuknoppen.
                  </p>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.showNavCollectionCounts}
                  onClick={() => toggleSetting('showNavCollectionCounts')}
                  className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    settings.showNavCollectionCounts ? 'bg-amber-500' : 'bg-zinc-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      settings.showNavCollectionCounts ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Toggle 3: Extra's knop in navigatiebalk */}
              <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-between gap-4">
                <div>
                  <span className="text-sm font-bold text-zinc-100 block">
                    &ldquo;Extra&apos;s&rdquo; knop in de navigatiebalk tonen
                  </span>
                  <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                    Geeft direct toegang tot Bier &amp; Kroeg Acties NL en de Live Bier Counter in het hoofdmenu.
                  </p>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.showExtrasTab}
                  onClick={() => toggleSetting('showExtrasTab')}
                  className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    settings.showExtrasTab ? 'bg-amber-500' : 'bg-zinc-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      settings.showExtrasTab ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Toggle 4: Deal Scanner tonen bij Bier & Kroeg Acties */}
              <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-between gap-4">
                <div>
                  <span className="text-sm font-bold text-zinc-100 block">
                    Deal Scanner balk tonen bij Bier &amp; Kroeg Acties
                  </span>
                  <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                    Toont de 1-Klik Deal Scanner bovenaan het acties-overzicht om nieuwe kroegdeals te zoeken.
                  </p>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.showDealScanner}
                  onClick={() => toggleSetting('showDealScanner')}
                  className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    settings.showDealScanner ? 'bg-amber-500' : 'bg-zinc-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      settings.showDealScanner ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Sectie 2: Algemene Voorkeuren & Bier Counter Standaardwaarden */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-lg space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-zinc-800">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-zinc-100">
                  App Voorkeuren &amp; Bier Counter
                </h2>
                <p className="text-xs text-zinc-400">
                  Standaard startscherm en berekeningswaarden voor je avondteller
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Standaard Startpagina */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Standaard starttabblad bij openen van Cervisium
                </label>
                <select
                  value={settings.defaultStartTab}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      defaultStartTab: e.target.value as UserSettings['defaultStartTab'],
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="dashboard">Dashboard (Overzicht)</option>
                  <option value="list">Mijn Bieren</option>
                  <option value="top">Top Bieren</option>
                  <option value="categories">Categorieën</option>
                  <option value="glasses">Bierglazen Collectie</option>
                  <option value="extras">Extra&apos;s (Acties &amp; Bier Counter)</option>
                </select>
              </div>

              {/* Standaard prijs per bier */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Standaard prijs per bier (&euro;)
                </label>
                <input
                  type="number"
                  step="0.25"
                  min="0.5"
                  max="25"
                  value={settings.defaultBeerPrice}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      defaultBeerPrice: Math.max(0.5, parseFloat(e.target.value) || 3.8),
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Standaard glasformaat */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Standaard glasformaat (Bier Counter)
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[25, 30, 33, 50].map((cl) => (
                    <button
                      key={cl}
                      type="button"
                      onClick={() =>
                        onUpdateSettings({
                          ...settings,
                          defaultGlassSizeCl: cl,
                        })
                      }
                      className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${
                        settings.defaultGlassSizeCl === cl
                          ? 'bg-amber-500 text-zinc-950 border-amber-400'
                          : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                      }`}
                    >
                      {cl}cl
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Rechterkolom: Profielgegevens, Account wisselen & Back-up */}
        <div className="lg:col-span-5 space-y-6">
          {/* Profiel Gegevens */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-lg space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-zinc-800">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-zinc-100">Mijn Google Profiel</h2>
                <p className="text-xs text-zinc-400">Beheer de weergavenaam van je gekoppelde Google-account</p>
              </div>
            </div>

            <form onSubmit={handleSaveProfileName} className="space-y-3">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <label className="block text-xs font-semibold text-zinc-300">
                    Jouw Weergavenaam (standaard je Google-accountnaam)
                  </label>
                  {activeUser.googleName && activeUser.googleName !== displayName && (
                    <button
                      type="button"
                      onClick={async () => {
                        const restoredName = activeUser.googleName!;
                        setDisplayName(restoredName);
                        await onUpdateUserProfile({
                          ...activeUser,
                          name: restoredName,
                        });
                        setProfileSavedMsg('Google-accountnaam hersteld en opgeslagen in de database!');
                        setTimeout(() => setProfileSavedMsg(null), 3000);
                      }}
                      className="text-[11px] font-semibold text-amber-400 hover:underline"
                    >
                      Herstel Google-naam ({activeUser.googleName})
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Jouw naam..."
                    className="flex-1 px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold transition-all shrink-0"
                  >
                    Opslaan
                  </button>
                </div>
              </div>

              {profileSavedMsg && (
                <div className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  {profileSavedMsg}
                </div>
              )}
            </form>

            <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800 text-xs text-zinc-400 flex items-start gap-2 leading-relaxed">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                Al je bieren, glazen, scores en voorkeuren worden persoonlijk opgeslagen voor{' '}
                <strong className="text-zinc-200">{activeUser.email}</strong>.
              </span>
            </div>
          </div>

          {/* Data Back-up & Export / Import */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-lg space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-zinc-800">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Download className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-zinc-100">
                  Data Back-up &amp; Beheer
                </h2>
                <p className="text-xs text-zinc-400">
                  Exporteer of importeer je collectie én al je geüploade foto&apos;s ({allPhotos.length}) als JSON-bestand
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleExport}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                Download Back-up
              </button>

              <label className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-amber-400" />
                <span>Importeer JSON</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportFile}
                  className="hidden"
                />
              </label>
            </div>

            {importStatus && (
              <div className="p-2.5 rounded-xl bg-zinc-950 border border-amber-500/30 text-amber-300 text-xs text-center">
                {importStatus}
              </div>
            )}

            <div className="pt-3 border-t border-zinc-800 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  onResetToSampleData();
                  setImportStatus('Voorbeeld craftbieren en categorieën zijn geladen!');
                }}
                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-amber-400 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Laad voorbeeld bieren
              </button>

              {!confirmClear ? (
                <button
                  type="button"
                  onClick={() => setConfirmClear(true)}
                  className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 transition-colors"
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  Wis mijn data
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClearAllData();
                      setConfirmClear(false);
                      setImportStatus('Je bieren en categorieën zijn gewist.');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-rose-500 text-white text-[11px] font-bold"
                  >
                    Bevestig wissen
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClear(false)}
                    className="text-[11px] text-zinc-400 hover:text-zinc-200"
                  >
                    Annuleer
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mijn Foto Galerij (Alle foto's van Biertjes & Bierglazen) */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-lg space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-extrabold text-zinc-100">
                  Mijn Foto&apos;s ({allPhotos.length})
                </h2>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                  {beerPhotos.length} biertjes &bull; {glassPhotos.length} bierglazen
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Bekijk en beheer al je geüploade foto&apos;s in één overzicht of scheid de bierglazen van de biertjes
              </p>
            </div>
          </div>

          {/* Weergave keuze: Alles in 1 keer (Standaard) of Gescheiden / Gefilterd */}
          <div className="flex flex-wrap items-center gap-1.5 bg-zinc-950 p-1.5 rounded-xl border border-zinc-800">
            <button
              type="button"
              onClick={() => setGalleryViewMode('all')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                galleryViewMode === 'all'
                  ? 'bg-amber-500 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Alles in 1 keer ({allPhotos.length})
            </button>

            <button
              type="button"
              onClick={() => setGalleryViewMode('split')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                galleryViewMode === 'split'
                  ? 'bg-amber-500 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Rows3 className="w-3.5 h-3.5" />
              Gescheiden
            </button>

            <button
              type="button"
              onClick={() => setGalleryViewMode('beers')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                galleryViewMode === 'beers'
                  ? 'bg-amber-500 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <BeerIcon className="w-3.5 h-3.5" />
              Biertjes ({beerPhotos.length})
            </button>

            <button
              type="button"
              onClick={() => setGalleryViewMode('glasses')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                galleryViewMode === 'glasses'
                  ? 'bg-amber-500 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <CupSoda className="w-3.5 h-3.5" />
              Bierglazen ({glassPhotos.length})
            </button>
          </div>
        </div>

        {allPhotos.length === 0 ? (
          <div className="p-8 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 text-center space-y-2">
            <ImageIcon className="w-8 h-8 text-zinc-500 mx-auto" />
            <p className="text-sm font-bold text-zinc-300">Nog geen foto&apos;s toegevoegd</p>
            <p className="text-xs text-zinc-500 max-w-md mx-auto">
              Zodra je een foto toevoegt bij een biertje of een bierglas in je collectie, verschijnen ze hier automatisch.
            </p>
          </div>
        ) : (
          <>
            {/* Mode 1: Alles in 1 keer (Standaard) */}
            {galleryViewMode === 'all' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                {allPhotos.map(renderPhotoCard)}
              </div>
            )}

            {/* Mode 2: Gescheiden weergave (Biertjes en Bierglazen apart onder elkaar) */}
            {galleryViewMode === 'split' && (
              <div className="space-y-6">
                {/* Subsectie Biertjes */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                    <div className="flex items-center gap-2">
                      <BeerIcon className="w-4 h-4 text-amber-400" />
                      <h3 className="text-sm font-extrabold text-zinc-100">
                        Biertjes Foto&apos;s ({beerPhotos.length})
                      </h3>
                    </div>
                  </div>
                  {beerPhotos.length === 0 ? (
                    <p className="text-xs text-zinc-500 italic py-2">
                      Geen foto&apos;s van biertjes gevonden.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                      {beerPhotos.map(renderPhotoCard)}
                    </div>
                  )}
                </div>

                {/* Subsectie Bierglazen */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                    <div className="flex items-center gap-2">
                      <CupSoda className="w-4 h-4 text-sky-400" />
                      <h3 className="text-sm font-extrabold text-zinc-100">
                        Bierglazen Foto&apos;s ({glassPhotos.length})
                      </h3>
                    </div>
                  </div>
                  {glassPhotos.length === 0 ? (
                    <p className="text-xs text-zinc-500 italic py-2">
                      Geen foto&apos;s van bierglazen gevonden.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                      {glassPhotos.map(renderPhotoCard)}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Mode 3: Alleen Biertjes */}
            {galleryViewMode === 'beers' && (
              <div>
                {beerPhotos.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic py-4 text-center">
                    Je hebt nog geen foto&apos;s bij je biertjes toegevoegd.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                    {beerPhotos.map(renderPhotoCard)}
                  </div>
                )}
              </div>
            )}

            {/* Mode 4: Alleen Bierglazen */}
            {galleryViewMode === 'glasses' && (
              <div>
                {glassPhotos.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic py-4 text-center">
                    Je hebt nog geen foto&apos;s bij je bierglazen toegevoegd.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                    {glassPhotos.map(renderPhotoCard)}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Lightbox voor geselecteerde foto in Instellingen */}
      {selectedGalleryPhoto && (
        <PhotoLightboxModal
          isOpen={!!selectedGalleryPhoto}
          onClose={() => setSelectedGalleryPhoto(null)}
          photoUrl={selectedGalleryPhoto.photoUrl}
          title={selectedGalleryPhoto.title}
          subtitle={selectedGalleryPhoto.subtitle}
          initialPosition={selectedGalleryPhoto.photoPosition}
          initialZoom={selectedGalleryPhoto.photoZoom}
          onSavePosition={(newPosition, newZoom, newPhotoUrl) => {
            if (selectedGalleryPhoto.type === 'beer' && onUpdateBeerPhotoPosition) {
              onUpdateBeerPhotoPosition(
                selectedGalleryPhoto.itemId,
                newPosition,
                newZoom,
                newPhotoUrl
              );
            } else if (selectedGalleryPhoto.type === 'glass' && onUpdateGlass) {
              onUpdateGlass(selectedGalleryPhoto.itemId, {
                photoPosition: newPosition,
                photoZoom: newZoom,
                ...(newPhotoUrl ? { photoUrl: newPhotoUrl } : {}),
              });
            }
            setSelectedGalleryPhoto((prev) =>
              prev
                ? {
                    ...prev,
                    photoPosition: newPosition,
                    photoZoom: newZoom,
                    ...(newPhotoUrl ? { photoUrl: newPhotoUrl } : {}),
                  }
                : null
            );
          }}
        />
      )}
    </div>
  );
};
