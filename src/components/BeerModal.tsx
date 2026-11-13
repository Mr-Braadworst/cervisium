import React, { useState, useEffect, useMemo } from 'react';
import { ActivePubCrawlState, Beer, Category, PubCrawl, Tasting, BeerGlass } from '../types';
import { X, Star, Beer as BeerIcon, Plus, Heart, MapPin, ArrowRight, CheckCircle2, History, Building2, ChevronDown, Camera, Image as ImageIcon, Compass } from 'lucide-react';
import confetti from 'canvas-confetti';
import { getScoreLabel, getScoreColorClass } from './RatingBadge';
import { DatePickerInput } from './DatePickerInput';
import { ConfirmModal } from './ConfirmModal';
import { CameraCaptureModal } from './CameraCaptureModal';
import { ColorWheelPicker } from './ColorWheelPicker';
import { COLOR_PALETTE } from '../services/storage';
import { validateAndCompressImageFile, safeIsoDate } from '../utils/security';

const DEFAULT_LOCATION_SUGGESTIONS = [
  'Thuis',
  'Café / Kroeg',
  'Terras',
  'Proeflokaal',
  'Bij de brouwerij',
  'Restaurant',
  'Bierfestival',
  'Vrienden / Familie',
];

const DEFAULT_BREWERY_SUGGESTIONS = [
  'Hertog Jan',
  "Brouwerij 't IJ",
  'La Trappe',
  'De Moersleutel',
  'Uiltje Brewing Co.',
  'Jopen',
  'Kompaan',
  'Texels',
  'Duvel Moortgat',
  'Brouwerij Bosteels',
  'St. Bernardus',
  'Westmalle',
];

interface BeerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    beerData: Omit<Beer, 'id' | 'userId' | 'dateAdded'>,
    tastingData: { rating: number; notes?: string; location?: string; servingType?: 'tap' | 'fles' | 'blik'; date: string }
  ) => void;
  categories: Category[];
  onOpenCategoryManager: () => void;
  initialBeer?: Beer | null;
  initialTasting?: Tasting | null;
  beers?: Beer[];
  tastings?: Tasting[];
  glasses?: BeerGlass[];
  onSelectExistingBeer?: (beer: Beer, prefillDraft?: Partial<Tasting>) => void;
  onAddCategory?: (name: string, color?: string, description?: string) => Promise<Category>;
  activePubCrawl?: ActivePubCrawlState | null;
  savedPubCrawls?: PubCrawl[];
  initialLocation?: string;
}

export const BeerModal: React.FC<BeerModalProps> = ({
  isOpen,
  onClose,
  onSave,
  categories,
  onOpenCategoryManager,
  initialBeer,
  initialTasting,
  beers = [],
  tastings = [],
  glasses = [],
  onSelectExistingBeer,
  onAddCategory,
  activePubCrawl,
  savedPubCrawls = [],
  initialLocation,
}) => {
  const [name, setName] = useState('');
  const [brewery, setBrewery] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [abv, setAbv] = useState<number>(6.5);
  const [rating, setRating] = useState<number>(8.0);
  const [location, setLocation] = useState('');
  const [servingType, setServingType] = useState<'tap' | 'fles' | 'blik' | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const [favorite, setFavorite] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(undefined);
  const [dateAdded, setDateAdded] = useState(new Date().toISOString().split('T')[0]);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState(COLOR_PALETTE[0]);
  const [error, setError] = useState<string | null>(null);
  const [confirmRemovePhoto, setConfirmRemovePhoto] = useState(false);
  const [cameraModalOpen, setCameraModalOpen] = useState(false);

  // Focus states voor live autocomplete dropdowns op de 3 velden
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);
  const [showBrewerySuggestions, setShowBrewerySuggestions] = useState(false);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [duplicatePromptBeer, setDuplicatePromptBeer] = useState<Beer | null>(null);

  // 1. Eerder ingevulde bieren (gesorteerd op hoe vaak geproefd + recentheid)
  const sortedPreviousBeers = useMemo(() => {
    const tastingCounts = new Map<string, number>();
    for (const t of tastings) {
      tastingCounts.set(t.beerId, (tastingCounts.get(t.beerId) || 0) + 1);
    }
    return [...beers].sort((a, b) => {
      const countDiff = (tastingCounts.get(b.id) || 0) - (tastingCounts.get(a.id) || 0);
      if (countDiff !== 0) return countDiff;
      return new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime();
    });
  }, [beers, tastings]);

  // 2. Eerder ingevulde brouwerijen uit bieren + glazen + aanvullende suggesties
  const brewerySuggestionsList = useMemo(() => {
    const counts = new Map<string, { label: string; count: number; latest: number; isFromHistory: boolean }>();
    for (const b of beers) {
      const raw = (b.brewery || '').trim();
      if (!raw) continue;
      const key = raw.toLowerCase();
      const ts = new Date(b.dateAdded).getTime() || 0;
      const prev = counts.get(key);
      if (prev) {
        prev.count += 1;
        if (ts > prev.latest) prev.latest = ts;
      } else {
        counts.set(key, { label: raw, count: 1, latest: ts, isFromHistory: true });
      }
    }
    for (const g of glasses) {
      const raw = (g.brand || '').trim();
      if (!raw) continue;
      const key = raw.toLowerCase();
      if (!counts.has(key)) {
        counts.set(key, { label: raw, count: 1, latest: 0, isFromHistory: true });
      }
    }
    const userBreweries = Array.from(counts.values()).sort(
      (a, b) => b.count - a.count || b.latest - a.latest
    );
    const lowerSet = new Set(userBreweries.map((item) => item.label.toLowerCase()));
    const combined = [...userBreweries];
    for (const def of DEFAULT_BREWERY_SUGGESTIONS) {
      if (!lowerSet.has(def.toLowerCase())) {
        combined.push({ label: def, count: 0, latest: 0, isFromHistory: false });
      }
    }
    return combined;
  }, [beers, glasses]);

  // 3. Eerder ingevulde locaties uit proefnotities + standaard locaties
  const locationSuggestionsList = useMemo(() => {
    const counts = new Map<string, { label: string; count: number; latest: number; isFromHistory: boolean }>();
    for (const t of tastings) {
      const raw = (t.location || '').trim();
      if (!raw) continue;
      const key = raw.toLowerCase();
      const ts = new Date(t.date).getTime() || 0;
      const prev = counts.get(key);
      if (prev) {
        prev.count += 1;
        if (ts > prev.latest) prev.latest = ts;
      } else {
        counts.set(key, { label: raw, count: 1, latest: ts, isFromHistory: true });
      }
    }
    const userLocs = Array.from(counts.values()).sort(
      (a, b) => b.count - a.count || b.latest - a.latest
    );
    const lowerSet = new Set(userLocs.map((l) => l.label.toLowerCase()));
    const combined = [...userLocs];

    // Voeg kroegen uit de actieve of opgeslagen kroegentochten bovenaan de suggesties toe
    const crawlStopsToSuggest: string[] = [];
    if (activePubCrawl?.pubCrawl?.stops) {
      for (const st of activePubCrawl.pubCrawl.stops) {
        crawlStopsToSuggest.push(`${st.pubName}, ${activePubCrawl.pubCrawl.city}`);
      }
    }
    for (const c of savedPubCrawls) {
      for (const st of c.stops || []) {
        crawlStopsToSuggest.push(`${st.pubName}, ${c.city}`);
      }
    }
    for (const locLabel of crawlStopsToSuggest) {
      if (!lowerSet.has(locLabel.toLowerCase())) {
        lowerSet.add(locLabel.toLowerCase());
        combined.unshift({ label: locLabel, count: 1, latest: Date.now(), isFromHistory: true });
      }
    }

    for (const def of DEFAULT_LOCATION_SUGGESTIONS) {
      if (!lowerSet.has(def.toLowerCase())) {
        combined.push({ label: def, count: 0, latest: 0, isFromHistory: false });
      }
    }
    return combined;
  }, [tastings, activePubCrawl, savedPubCrawls]);

  const matchingNameBeers = useMemo(() => {
    const q = name.trim().toLowerCase();
    if (!q) return sortedPreviousBeers;
    return sortedPreviousBeers.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        (b.brewery && b.brewery.toLowerCase().includes(q))
    );
  }, [name, sortedPreviousBeers]);

  const matchingBreweries = useMemo(() => {
    const q = brewery.trim().toLowerCase();
    if (!q) return brewerySuggestionsList;
    return brewerySuggestionsList.filter((item) =>
      item.label.toLowerCase().includes(q)
    );
  }, [brewery, brewerySuggestionsList]);

  const matchingLocations = useMemo(() => {
    const q = location.trim().toLowerCase();
    if (!q) return locationSuggestionsList;
    return locationSuggestionsList.filter((item) =>
      item.label.toLowerCase().includes(q)
    );
  }, [location, locationSuggestionsList]);

  const existingMatch = useMemo(() => {
    if (initialBeer || name.trim().length < 1) return null;
    const normalized = name.trim().toLowerCase();
    return beers.find((b) => b.name.trim().toLowerCase() === normalized) || null;
  }, [initialBeer, name, beers]);

  const compressImage = (file: File, maxDimension = 850, quality = 0.82): Promise<string> =>
    validateAndCompressImageFile(file, maxDimension, quality);

  const handleQuickAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim() || !onAddCategory) return;
    try {
      const created = await onAddCategory(newCategoryName.trim(), newCategoryColor);
      if (created && created.id) {
        setCategoryId(created.id);
      }
      setNewCategoryName('');
      setShowNewCategoryInput(false);
    } catch (err) {
      console.warn('Failed to add category inline:', err);
    }
  };

  useEffect(() => {
    if (initialBeer) {
      setName(initialBeer.name);
      setBrewery(initialBeer.brewery || '');
      setCategoryId(initialBeer.categoryId);
      setAbv(initialBeer.abv);
      setFavorite(!!initialBeer.favorite);
      setPhotoUrl(initialBeer.photoUrl || initialTasting?.photoUrl);
      setDateAdded(
        initialTasting?.date
          ? initialTasting.date.split('T')[0]
          : initialBeer.dateAdded
          ? initialBeer.dateAdded.split('T')[0]
          : new Date().toISOString().split('T')[0]
      );
      setRating(initialTasting?.rating !== undefined ? initialTasting.rating : 8.0);
      setLocation(initialTasting?.location || '');
      setServingType(initialTasting?.servingType);
      setNotes(initialTasting?.notes || '');
    } else {
      setName('');
      setBrewery('');
      setCategoryId('');
      setAbv(0);
      setRating(8.0);
      const currentActiveStop =
        activePubCrawl?.pubCrawl?.stops?.[activePubCrawl.currentStopIndex] ||
        activePubCrawl?.pubCrawl?.stops?.[0];
      const defaultCrawlLoc = currentActiveStop
        ? `${currentActiveStop.pubName}, ${activePubCrawl?.pubCrawl.city}`
        : '';
      setLocation(initialLocation || defaultCrawlLoc || '');
      setServingType(undefined);
      setNotes('');
      setFavorite(false);
      setPhotoUrl(undefined);
      setDateAdded(new Date().toISOString().split('T')[0]);
    }
    setDuplicatePromptBeer(null);
    setShowNameSuggestions(false);
    setShowBrewerySuggestions(false);
    setShowLocationSuggestions(false);
    setError(null);
  }, [initialBeer?.id, initialTasting?.id, isOpen, initialLocation, activePubCrawl]);

  if (!isOpen) return null;

  const handleTransferToCheckIn = (targetBeer: Beer) => {
    if (!onSelectExistingBeer) return;
    const isoDate =
      dateAdded === new Date().toISOString().split('T')[0]
        ? new Date().toISOString()
        : safeIsoDate(dateAdded);

    setDuplicatePromptBeer(null);
    onSelectExistingBeer(targetBeer, {
      rating: Math.min(10, Math.max(1, Number(rating) || 8.0)),
      location: location.trim(),
      servingType,
      notes: notes.trim(),
      photoUrl,
      date: isoDate,
    });
  };

  const handleSelectSuggestedBeer = (b: Beer) => {
    setName(b.name);
    if (b.brewery) setBrewery(b.brewery);
    if (b.categoryId) setCategoryId(b.categoryId);
    if (b.abv) setAbv(b.abv);
    setShowNameSuggestions(false);
  };

  const executeSaveBeer = () => {
    if (rating >= 9.0) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#f59e0b', '#d97706', '#fbbf24', '#ffffff'],
      });
    }

    const isoDate =
      initialTasting?.date && initialTasting.date.split('T')[0] === dateAdded
        ? safeIsoDate(initialTasting.date)
        : dateAdded === new Date().toISOString().split('T')[0]
        ? new Date().toISOString()
        : safeIsoDate(dateAdded);

    onSave(
      {
        name: name.trim(),
        brewery: brewery.trim(),
        categoryId,
        abv: Number(abv) || 0,
        favorite,
        photoUrl,
      },
      {
        rating: Math.min(10, Math.max(1, Number(rating))),
        notes: notes.trim(),
        location: location.trim(),
        servingType,
        date: isoDate,
      }
    );

    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Vul ten minste de naam van het bier in.');
      return;
    }
    if (!initialBeer && existingMatch && onSelectExistingBeer) {
      setDuplicatePromptBeer(existingMatch);
      return;
    }
    if (!categoryId) {
      setError('Selecteer of maak eerst een categorie aan.');
      return;
    }
    executeSaveBeer();
  };

  const scoreColors = getScoreColorClass(rating);

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto overscroll-contain bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl p-4 sm:p-6 text-zinc-100 my-2 sm:my-4 pb-8 sm:pb-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <BeerIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-100">
                {initialBeer ? 'Bier Bewerken' : 'Nieuw Bier Toevoegen'}
              </h2>
              <p className="text-xs text-zinc-400">
                {initialBeer ? 'Pas de gegevens en notities aan' : 'Voeg een proefnotitie toe aan je collectie'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* 1. Beer Name */}
          <div className="relative">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-zinc-300">
                Naam van het bier <span className="text-amber-400">*</span>
              </label>
              {sortedPreviousBeers.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowNameSuggestions((prev) => !prev)}
                  className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
                >
                  <History className="w-3 h-3" />
                  <span>Eerder ingevuld ({sortedPreviousBeers.length})</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${showNameSuggestions ? 'rotate-180' : ''}`} />
                </button>
              )}
            </div>
            <input
              type="text"
              required
              autoComplete="off"
              value={name}
              onFocus={() => setShowNameSuggestions(true)}
              onBlur={() => setTimeout(() => setShowNameSuggestions(false), 200)}
              onChange={(e) => {
                setName(e.target.value);
                setShowNameSuggestions(true);
              }}
              placeholder="bijv. Westvleteren 12, Tripel Karmeliet, Hazy DIPA"
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            />

            {/* Dropdown met suggesties van eerder ingevulde bieren */}
            {showNameSuggestions && matchingNameBeers.length > 0 && (
              <div className="mt-1.5 rounded-xl bg-zinc-950 border border-amber-500/40 shadow-2xl overflow-hidden z-30">
                <div className="px-3 py-1.5 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between text-[11px] text-amber-300 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-amber-400" />
                    Eerder ingevulde bieren (klik om in te vullen of direct in te checken)
                  </span>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setShowNameSuggestions(false);
                    }}
                    className="text-zinc-400 hover:text-zinc-200 text-[10px]"
                  >
                    Sluiten
                  </button>
                </div>
                <div className="max-h-48 overflow-y-auto divide-y divide-zinc-800/80">
                  {matchingNameBeers.map((b) => (
                    <div
                      key={b.id}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectSuggestedBeer(b);
                      }}
                      className="px-3 py-2.5 hover:bg-zinc-900 cursor-pointer flex items-center justify-between gap-2 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-zinc-100 truncate">{b.name}</div>
                        <div className="text-[11px] text-zinc-400 truncate">
                          {b.brewery || 'Brouwerij onbekend'} &bull; {b.abv}% ABV
                        </div>
                      </div>
                      {onSelectExistingBeer && (
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleTransferToCheckIn(b);
                          }}
                          className="shrink-0 text-[11px] font-extrabold px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 flex items-center gap-1 shadow-sm transition-colors"
                        >
                          <span>Check-in &amp; zet over</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Direct zichtbare suggestie-knopjes onder Naam van het bier */}
            {!initialBeer && sortedPreviousBeers.length > 0 && !existingMatch && (
              <div className="flex items-center gap-1.5 flex-wrap mt-2">
                <span className="text-[10px] text-amber-400/90 font-semibold flex items-center gap-1 mr-0.5">
                  <History className="w-3 h-3" /> Eerder ingevuld:
                </span>
                {sortedPreviousBeers.slice(0, 5).map((b) => (
                  <button
                    type="button"
                    key={b.id}
                    onClick={() => handleSelectSuggestedBeer(b)}
                    className={`text-[11px] px-2.5 py-0.5 rounded-lg border transition-colors ${
                      name.trim().toLowerCase() === b.name.toLowerCase()
                        ? 'bg-amber-500 text-zinc-950 border-amber-400 font-bold'
                        : 'bg-zinc-950 text-zinc-300 border-zinc-700/80 hover:text-amber-300 hover:border-amber-500/50'
                    }`}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            )}

            {/* Melding wanneer de naam van het bier al bestaat + directe vraag om Check-in te doen en over te zetten */}
            {existingMatch && (
              <div className="mt-2.5 p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/50 text-amber-100 space-y-2.5 shadow-lg">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs leading-relaxed">
                    <strong className="text-amber-300">&ldquo;{existingMatch.name}&rdquo; staat al in je collectie!</strong>{' '}
                    ({existingMatch.brewery || 'Onbekende brouwerij'}, {existingMatch.abv}% ABV). Wil je een nieuwe{' '}
                    <strong>check-in</strong> doen voor dit bier? Dan zetten we al je ingevulde gegevens direct over.
                  </div>
                </div>
                {onSelectExistingBeer && (
                  <div className="flex items-center gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={() => handleTransferToCheckIn(existingMatch)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-extrabold shadow-md shadow-amber-500/20 transition-all"
                    >
                      <span>Ja, doe een Check-in &amp; zet over</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. Brewery */}
          <div className="relative">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-zinc-300">
                Brouwerij <span className="text-zinc-500 font-normal">(optioneel)</span>
              </label>
              <button
                type="button"
                onClick={() => setShowBrewerySuggestions((prev) => !prev)}
                className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
              >
                <Building2 className="w-3 h-3" />
                <span>Suggesties ({brewerySuggestionsList.length})</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${showBrewerySuggestions ? 'rotate-180' : ''}`} />
              </button>
            </div>
            <input
              type="text"
              autoComplete="off"
              value={brewery}
              onFocus={() => setShowBrewerySuggestions(true)}
              onBlur={() => setTimeout(() => setShowBrewerySuggestions(false), 200)}
              onChange={(e) => {
                setBrewery(e.target.value);
                setShowBrewerySuggestions(true);
              }}
              placeholder="bijv. Brouwerij 't IJ, Moersleutel, Hertog Jan"
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            />

            {/* Dropdown suggesties bij klikken of typen op Brouwerij */}
            {showBrewerySuggestions && matchingBreweries.length > 0 && (
              <div className="mt-1.5 rounded-xl bg-zinc-950 border border-amber-500/40 shadow-xl overflow-hidden z-20">
                <div className="px-3 py-1.5 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between text-[11px] text-amber-300 font-semibold">
                  <span>Kies een brouwerij</span>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setShowBrewerySuggestions(false);
                    }}
                    className="text-zinc-400 hover:text-zinc-200 text-[10px]"
                  >
                    Sluiten
                  </button>
                </div>
                <div className="max-h-40 overflow-y-auto divide-y divide-zinc-800/70">
                  {matchingBreweries.map((item) => (
                    <button
                      type="button"
                      key={item.label}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setBrewery(item.label);
                        setShowBrewerySuggestions(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-900 hover:text-amber-300 flex items-center justify-between transition-colors"
                    >
                      <span className="font-semibold truncate">{item.label}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded ${
                          item.isFromHistory
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold'
                            : 'text-zinc-500'
                        }`}
                      >
                        {item.isFromHistory ? `Eerder ingevuld${item.count > 1 ? ` (${item.count}x)` : ''}` : 'Suggestie'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Altijd zichtbare klikbare suggestie-knopjes onder Brouwerij */}
            <div className="flex items-center gap-1.5 flex-wrap mt-2">
              <span className="text-[10px] text-amber-400/90 font-semibold mr-0.5">Suggesties:</span>
              {brewerySuggestionsList.slice(0, 5).map((item) => (
                <button
                  type="button"
                  key={item.label}
                  onClick={() => setBrewery(item.label)}
                  className={`text-[11px] px-2.5 py-0.5 rounded-lg border transition-colors ${
                    brewery.trim().toLowerCase() === item.label.toLowerCase()
                      ? 'bg-amber-500 text-zinc-950 border-amber-400 font-bold'
                      : item.isFromHistory
                      ? 'bg-zinc-950 text-zinc-200 border-amber-500/40 hover:border-amber-400 hover:text-amber-300'
                      : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:border-zinc-700'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category & ABV row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Category select */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-zinc-300">
                  Categorie <span className="text-amber-400">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowNewCategoryInput(!showNewCategoryInput)}
                  className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> {showNewCategoryInput ? 'Sluiten' : 'Nieuwe categorie'}
                </button>
              </div>

              {showNewCategoryInput && (
                <div className="mb-3 p-3 rounded-xl bg-zinc-900 border border-zinc-700/70 space-y-2.5">
                  <div className="text-[11px] font-bold text-amber-400">Nieuwe categorie toevoegen:</div>
                  <div className="flex flex-col gap-2.5">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="bijv. Weizen, Bock, Porter..."
                      className="w-full px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-700 text-zinc-100 text-xs focus:outline-none focus:border-amber-500"
                    />
                    <ColorWheelPicker
                      value={newCategoryColor}
                      onChange={setNewCategoryColor}
                      compact
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleQuickAddCategory}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-amber-600 text-zinc-950 text-xs font-bold hover:bg-amber-500 transition-colors cursor-pointer"
                      >
                        Categorie toevoegen
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowNewCategoryInput(false)}
                        className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 text-xs font-semibold hover:text-white cursor-pointer"
                      >
                        Annuleren
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {categories.length === 0 ? (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200">
                  Nog geen categorieën. Maak er hierboven een aan!
                </div>
              ) : (
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-zinc-100 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                >
                  <option value="" disabled>Kies een categorie...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* ABV */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Alcoholpercentage (% ABV)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="40"
                  value={abv}
                  onChange={(e) => setAbv(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-zinc-100 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-zinc-400 font-semibold">
                  % vol
                </span>
              </div>
            </div>
          </div>

          {/* Rating / Score (1 - 10) */}
          <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                Cijfer / Score (1 - 10)
              </label>
              <div className={`px-2.5 py-0.5 rounded-md text-xs font-bold border ${scoreColors.bg}`}>
                {rating.toFixed(1)} / 10 &bull; {getScoreLabel(rating)}
              </div>
            </div>

            {/* Slider */}
            <input
              type="range"
              min="1"
              max="10"
              step="0.1"
              value={rating}
              onChange={(e) => setRating(parseFloat(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer h-2 bg-zinc-800 rounded-lg appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-500 [&::-webkit-slider-thumb]:hover:bg-amber-400 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-amber-200 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:shadow-amber-500/50 [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-amber-500 [&::-moz-range-thumb]:hover:bg-amber-400 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-amber-200 [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:cursor-pointer"
            />

            {/* Quick Star Buttons 1 to 10 */}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-800/80">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <button
                  type="button"
                  key={num}
                  onClick={() => setRating(num)}
                  className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                    Math.round(rating) === num
                      ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20 scale-110'
                      : 'bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          {/* Serving Type (Tap / Fles / Blik) */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <span>🍺</span> Hoe geserveerd? <span className="text-zinc-500 font-normal">(tap, fles of blik)</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'tap', label: 'Van de Tap', icon: '🚰' },
                { id: 'fles', label: 'Uit Fles', icon: '🍾' },
                { id: 'blik', label: 'Uit Blik', icon: '🥫' },
              ].map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setServingType(servingType === item.id ? undefined : (item.id as any))}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                    servingType === item.id
                      ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-md shadow-amber-500/20'
                      : 'bg-zinc-950 text-zinc-300 border-zinc-800 hover:border-zinc-700 hover:text-white'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Photo Upload (Direct met Camera of uit Galerij) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-zinc-300">
                Foto van het bier
              </label>
              {photoUrl && (
                <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  ✓ Foto toegevoegd
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Directe Camera-knop (vraagt camera-permissie en opent de live camera) */}
              <button
                type="button"
                onClick={() => setCameraModalOpen(true)}
                className="cursor-pointer flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:bg-amber-500/25 hover:border-amber-400 transition-colors text-xs sm:text-sm font-semibold"
              >
                <Camera className="w-4 h-4 text-amber-400" />
                <span>Maak foto</span>
              </button>

              {/* Galerij / Bestand kiezen */}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/heic,image/heif,image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (file) {
                    try {
                      const compressed = await compressImage(file);
                      setPhotoUrl(compressed);
                      setError(null);
                    } catch (err: any) {
                      setError(err?.message || 'Ongeldig afbeeldingsbestand.');
                    }
                  }
                }}
                className="hidden"
                id="beer-photo-upload"
              />
              <label
                htmlFor="beer-photo-upload"
                className="cursor-pointer flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-zinc-300 hover:text-white hover:border-amber-500 transition-colors text-xs sm:text-sm font-medium"
              >
                <ImageIcon className="w-4 h-4 text-zinc-400" />
                <span>Kies uit galerij</span>
              </label>

              {photoUrl && (
                <div className="relative ml-1">
                  <img src={photoUrl} alt="Preview" className="w-16 h-16 rounded-xl object-cover border border-zinc-700" />
                  <button
                    type="button"
                    onClick={() => setConfirmRemovePhoto(true)}
                    className="absolute -top-2 -right-2 bg-rose-500 hover:bg-rose-600 text-white rounded-full p-0.5 transition-colors shadow"
                    title="Foto verwijderen"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 3. Location where tasted */}
          <div className="relative">
            {activePubCrawl && activePubCrawl.pubCrawl.stops.length > 0 && (
              <div className="mb-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/40 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    Actieve Kroegentocht ({activePubCrawl.pubCrawl.city}) — Kies je kroeg:
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {activePubCrawl.pubCrawl.stops.map((st, idx) => {
                    const stopLoc = `${st.pubName}, ${activePubCrawl.pubCrawl.city}`;
                    const isSelected =
                      location.trim().toLowerCase() === stopLoc.toLowerCase() ||
                      location.trim().toLowerCase() === st.pubName.toLowerCase();
                    const isCurrent = idx === activePubCrawl.currentStopIndex;
                    return (
                      <button
                        type="button"
                        key={st.id || idx}
                        onClick={() => setLocation(stopLoc)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500 text-zinc-950 border-amber-400 font-bold shadow-sm'
                            : isCurrent
                            ? 'bg-amber-500/20 text-amber-200 border-amber-400/60 hover:bg-amber-500/30'
                            : 'bg-zinc-900/90 text-zinc-300 border-zinc-700 hover:border-amber-500/40 hover:text-white'
                        }`}
                      >
                        <span className="text-[10px] opacity-75">{idx + 1}.</span>
                        <span>{st.pubName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                Waar gedronken? <span className="text-zinc-500 font-normal">(locatie)</span>
              </label>
              <button
                type="button"
                onClick={() => setShowLocationSuggestions((prev) => !prev)}
                className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
              >
                <MapPin className="w-3 h-3" />
                <span>Suggesties ({locationSuggestionsList.length})</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${showLocationSuggestions ? 'rotate-180' : ''}`} />
              </button>
            </div>
            <input
              type="text"
              autoComplete="off"
              value={location}
              onFocus={() => setShowLocationSuggestions(true)}
              onBlur={() => setTimeout(() => setShowLocationSuggestions(false), 200)}
              onChange={(e) => {
                setLocation(e.target.value);
                setShowLocationSuggestions(true);
              }}
              placeholder="bijv. Café De Zotte Amsterdam, Zomers terras, Thuis..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            />

            {/* Dropdown suggesties bij klikken of typen op Locatie */}
            {showLocationSuggestions && matchingLocations.length > 0 && (
              <div className="mt-1.5 rounded-xl bg-zinc-950 border border-amber-500/40 shadow-xl overflow-hidden z-20">
                <div className="px-3 py-1.5 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between text-[11px] text-amber-300 font-semibold">
                  <span>Kies een locatie</span>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setShowLocationSuggestions(false);
                    }}
                    className="text-zinc-400 hover:text-zinc-200 text-[10px]"
                  >
                    Sluiten
                  </button>
                </div>
                <div className="max-h-40 overflow-y-auto divide-y divide-zinc-800/70">
                  {matchingLocations.map((item) => (
                    <button
                      type="button"
                      key={item.label}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setLocation(item.label);
                        setShowLocationSuggestions(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-900 hover:text-amber-300 flex items-center justify-between transition-colors"
                    >
                      <span className="font-semibold truncate">{item.label}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded ${
                          item.isFromHistory
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold'
                            : 'text-zinc-500'
                        }`}
                      >
                        {item.isFromHistory ? `Eerder ingevuld${item.count > 1 ? ` (${item.count}x)` : ''}` : 'Suggestie'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Altijd zichtbare klikbare suggestie-knopjes onder Locatie */}
            <div className="flex items-center gap-1.5 flex-wrap mt-2 max-h-24 overflow-y-auto pr-1">
              <span className="text-[10px] text-amber-400/90 font-semibold mr-0.5">Suggesties:</span>
              {locationSuggestionsList.map((item) => (
                <button
                  type="button"
                  key={item.label}
                  onClick={() => setLocation(item.label)}
                  className={`text-[11px] px-2.5 py-0.5 rounded-lg border transition-colors ${
                    location.trim().toLowerCase() === item.label.toLowerCase()
                      ? 'bg-amber-500 text-zinc-950 border-amber-400 font-bold'
                      : item.isFromHistory
                      ? 'bg-zinc-950 text-zinc-200 border-amber-500/40 hover:border-amber-400 hover:text-amber-300'
                      : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:border-zinc-700'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tasting Notes */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Persoonlijke proefnotities / smaakervaring
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Wat viel op? Frisse hoptonen, lichte karamel, mooie dikke schuimkraag..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 leading-relaxed"
            />
          </div>

          {/* Date & Favorite */}
          <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
            <div className="flex items-center gap-2">
              <label className="text-xs text-zinc-400 font-medium">Geproefd op:</label>
              <DatePickerInput
                value={dateAdded}
                onChange={(val) => setDateAdded(val)}
              />
            </div>

            <button
              type="button"
              onClick={() => setFavorite(!favorite)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                favorite
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : 'bg-zinc-800/60 text-zinc-400 border-zinc-700 hover:text-zinc-200'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${favorite ? 'text-rose-500 fill-rose-500' : ''}`} />
              Favoriet
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              Annuleren
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-sm font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-lg shadow-amber-500/20 transition-all"
            >
              {initialBeer ? 'Wijzigingen Opslaan' : 'Bier Opslaan'}
            </button>
          </div>
        </form>
      </div>

      {/* Pop-up vraag wanneer gebruiker op Opslaan klikt met een biernaam die al bestaat */}
      {duplicatePromptBeer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-zinc-900 border border-amber-500/40 rounded-2xl p-6 shadow-2xl space-y-4 text-zinc-100">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                <BeerIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-zinc-100">
                  &ldquo;{duplicatePromptBeer.name}&rdquo; staat al in je collectie!
                </h3>
                <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                  Je hebt dit bier ({duplicatePromptBeer.brewery || 'brouwerij onbekend'}) al eerder toegevoegd. Wil je een nieuwe{' '}
                  <strong>check-in</strong> doen voor dit bestaande bier? Dan zetten we al je ingevulde gegevens direct over.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setDuplicatePromptBeer(null)}
                className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors"
              >
                Terug
              </button>
              <button
                type="button"
                onClick={() => {
                  setDuplicatePromptBeer(null);
                  if (!categoryId) {
                    setError('Selecteer of maak eerst een categorie aan om als nieuw bier op te slaan.');
                    return;
                  }
                  executeSaveBeer();
                }}
                className="px-3.5 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-semibold transition-colors"
              >
                Toch als nieuw bier opslaan
              </button>
              <button
                type="button"
                onClick={() => handleTransferToCheckIn(duplicatePromptBeer)}
                className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-extrabold shadow-lg shadow-amber-500/20 transition-all"
              >
                <span>Ja, zet over naar Check-in</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmRemovePhoto}
        title="Foto verwijderen?"
        message="Weet je zeker dat je deze foto van het biertje wilt verwijderen?"
        onConfirm={() => {
          setPhotoUrl(undefined);
          const input = document.getElementById('beer-photo-upload') as HTMLInputElement;
          if (input) input.value = '';
        }}
        onCancel={() => setConfirmRemovePhoto(false)}
      />

      <CameraCaptureModal
        isOpen={cameraModalOpen}
        onClose={() => setCameraModalOpen(false)}
        title="Maak foto van je bier"
        onCaptureFile={async (file) => {
          try {
            const compressed = await compressImage(file);
            setPhotoUrl(compressed);
            setError(null);
          } catch (err: any) {
            setError(err?.message || 'Ongeldig afbeeldingsbestand.');
          }
        }}
      />
    </div>
  );
};
