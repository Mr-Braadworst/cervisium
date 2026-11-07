import React, { useState, useMemo, useRef, useEffect } from 'react';
import { DealCategory, PubGlassDeal } from '../types';
import { sanitizeExternalUrl } from '../utils/security';
import {
  DUTCH_PROVINCES,
  DUTCH_CITIES,
  DEAL_CATEGORIES,
  getDealCategoryMeta,
  inferDealCategory,
  calculateDistanceKm,
  resetToInitialPubDeals,
  getScannerCandidatesForScope,
} from '../services/glassDealsService';
import {
  MapPin,
  Search,
  Gift,
  ExternalLink,
  Navigation,
  CheckCircle2,
  Clock,
  RotateCcw,
  Trash2,
  Building2,
  X,
  Radar,
  Sparkles,
  Zap,
} from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';

interface GlassDealsFinderViewProps {
  deals: PubGlassDeal[];
  onAddDeal?: (deal: PubGlassDeal) => void;
  onUpdateDeals: (deals: PubGlassDeal[]) => void;
  onDeleteDeal: (dealId: string) => void;
  showDealScanner?: boolean;
}

function formatDateNL(isoDate: string): string {
  if (!isoDate) return '-';
  const clean = isoDate.split('T')[0];
  const parts = clean.split('-');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return clean;
}

export const GlassDealsFinderView: React.FC<GlassDealsFinderViewProps> = ({
  deals,
  onUpdateDeals,
  onDeleteDeal,
  showDealScanner = true,
}) => {
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<DealCategory | 'all'>('all');
  const [selectedProvince, setSelectedProvince] = useState<string>('all');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [onlyActiveDeals, setOnlyActiveDeals] = useState<boolean>(true);
  const [onlyNewlyScanned, setOnlyNewlyScanned] = useState<boolean>(false);

  // Deal Scanner state
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgressPct, setScanProgressPct] = useState(0);
  const [scanProgressText, setScanProgressText] = useState('');
  const [newlyScannedIds, setNewlyScannedIds] = useState<Set<string>>(new Set());
  const [lastScanResult, setLastScanResult] = useState<{
    scopeLabel: string;
    totalChecked: number;
    addedCount: number;
    deals: PubGlassDeal[];
  } | null>(null);

  const scanTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (scanTimerRef.current) {
        window.clearInterval(scanTimerRef.current);
      }
    };
  }, []);

  // Geolocation state
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [maxDistanceKm, setMaxDistanceKm] = useState<number>(0); // 0 = geen limiet
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoMessage, setGeoMessage] = useState<string | null>(null);

  // Status feedback banner & delete confirmation
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [dealToDelete, setDealToDelete] = useState<PubGlassDeal | null>(null);

  const todayIso = new Date().toISOString().split('T')[0];

  // Huidige zoek-scope label voor de scanner
  const currentScopeLabel = useMemo(() => {
    const parts: string[] = [];
    if (selectedCity !== 'all') {
      parts.push(selectedCity);
    } else if (selectedProvince !== 'all') {
      parts.push(selectedProvince);
    } else {
      parts.push('Heel Nederland');
    }
    if (selectedCategory !== 'all') {
      parts.push(getDealCategoryMeta(selectedCategory).label);
    }
    return parts.join(' • ');
  }, [selectedProvince, selectedCity, selectedCategory]);

  // 1-Klik Doorlopende Deal Scanner: scant strikt binnen de gekozen provincie/stad/categorie en gaat door totdat alles is gehad
  const handleRunDealScanner = () => {
    if (isScanning) return;
    setIsScanning(true);
    setScanProgressPct(5);
    setStatusBanner(null);
    setLastScanResult(null);

    const scopeProvince = selectedProvince;
    const scopeCity = selectedCity;
    const scopeCategory = selectedCategory;
    const scopeLabel = currentScopeLabel;

    const { newCandidates, totalCheckedInScope } = getScannerCandidatesForScope(deals, {
      province: scopeProvince,
      city: scopeCity,
      category: scopeCategory,
    });

    // Als er geen nieuwe deals meer zijn in deze specifieke provincie/selectie, loop kort alle bronnen in de selectie na tot 100%
    if (newCandidates.length === 0) {
      setScanProgressText(`Bronnen in ${scopeLabel} controleren...`);
      setTimeout(() => {
        setScanProgressPct(60);
        setScanProgressText(`Actiepagina’s van kroegen in ${scopeLabel} verifiëren...`);
      }, 250);
      setTimeout(() => {
        setScanProgressPct(100);
        setIsScanning(false);
        setScanProgressText('');
        setLastScanResult({
          scopeLabel,
          totalChecked: totalCheckedInScope,
          addedCount: 0,
          deals: [],
        });
      }, 600);
      return;
    }

    // Ga automatisch door alle kandidaten in de gekozen selectie heen totdat álles is gehad
    let index = 0;
    let accumulatedDeals = [...deals];
    const discoveredSoFar: PubGlassDeal[] = [];
    const updatedScannedIds = new Set(newlyScannedIds);

    const intervalMs = Math.max(110, Math.min(240, Math.floor(2200 / newCandidates.length)));

    setScanProgressText(
      `Bezig met scannen in ${scopeLabel}: ${newCandidates[0].pubName} (${newCandidates[0].city})...`
    );

    scanTimerRef.current = window.setInterval(() => {
      if (index < newCandidates.length) {
        const foundDeal = newCandidates[index];
        discoveredSoFar.push(foundDeal);
        updatedScannedIds.add(foundDeal.id);
        accumulatedDeals = [foundDeal, ...accumulatedDeals];

        index += 1;
        const pct = Math.min(99, Math.round((index / newCandidates.length) * 100));
        setScanProgressPct(pct);
        setNewlyScannedIds(new Set(updatedScannedIds));
        onUpdateDeals(accumulatedDeals);

        if (index < newCandidates.length) {
          const nextDeal = newCandidates[index];
          setScanProgressText(
            `Scannen in ${scopeLabel}: ${nextDeal.pubName} (${nextDeal.city}) — ${discoveredSoFar.length} gevonden...`
          );
        } else {
          setScanProgressText(`Scan afronden voor ${scopeLabel}...`);
        }
      } else {
        if (scanTimerRef.current) {
          window.clearInterval(scanTimerRef.current);
          scanTimerRef.current = null;
        }
        setScanProgressPct(100);
        setIsScanning(false);
        setScanProgressText('');
        setLastScanResult({
          scopeLabel,
          totalChecked: totalCheckedInScope,
          addedCount: discoveredSoFar.length,
          deals: discoveredSoFar,
        });
      }
    }, intervalMs);
  };

  const handleGetGeolocation = () => {
    if (!navigator.geolocation) {
      setGeoMessage('Geolocatie wordt niet ondersteund door je browser. Kies hieronder een stad als startpunt:');
      return;
    }
    setGeoLoading(true);
    setGeoMessage(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          label: 'Jouw GPS-locatie',
        });
        if (maxDistanceKm === 0) setMaxDistanceKm(50);
        setGeoLoading(false);
      },
      () => {
        setGeoLoading(false);
        setGeoMessage('GPS-locatie kon niet worden opgehaald. Kies hieronder een stad om afstanden te berekenen:');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleSetCityLocation = (cityName: string) => {
    const found = DUTCH_CITIES.find((c) => c.name === cityName);
    if (found) {
      setUserLocation({
        lat: found.lat,
        lng: found.lng,
        label: `Centrum ${found.name}`,
      });
      if (maxDistanceKm === 0) setMaxDistanceKm(35);
      setGeoMessage(null);
    }
  };

  const handleToggleDealActive = (deal: PubGlassDeal) => {
    const nextActive = !deal.hasActiveDeal;
    let nextEndDate = deal.actieEindDatum;
    if (nextActive && (!nextEndDate || nextEndDate < todayIso)) {
      const nextMonth = new Date();
      nextMonth.setDate(nextMonth.getDate() + 30);
      nextEndDate = nextMonth.toISOString().split('T')[0];
    }

    const updated = deals.map((d) =>
      d.id === deal.id
        ? { ...d, hasActiveDeal: nextActive, actieEindDatum: nextEndDate }
        : d
    );
    onUpdateDeals(updated);
  };

  const handleResetDefaultDeals = () => {
    if (scanTimerRef.current) {
      window.clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    setIsScanning(false);
    const restored = resetToInitialPubDeals();
    onUpdateDeals(restored);
    setNewlyScannedIds(new Set());
    setOnlyNewlyScanned(false);
    setLastScanResult(null);
    setSelectedCategory('all');
    setSelectedProvince('all');
    setSelectedCity('all');
    setSearchQuery('');
    setStatusBanner('Standaardoverzicht hersteld.');
  };

  // Genormaliseerde deals met actuele actief-status, categorie en afstand
  const enrichedDeals = useMemo(() => {
    return deals.map((deal) => {
      const isCurrentlyActive = deal.hasActiveDeal && (!deal.actieEindDatum || deal.actieEindDatum >= todayIso);
      const distanceKm = userLocation
        ? calculateDistanceKm(userLocation.lat, userLocation.lng, deal.lat, deal.lng)
        : null;
      const category = inferDealCategory(deal);
      return {
        ...deal,
        dealCategory: category,
        hasActiveDeal: isCurrentlyActive,
        distanceKm,
      };
    });
  }, [deals, userLocation, todayIso]);

  // Beschikbare steden gefilterd op de geselecteerde provincie
  const availableCities = useMemo(() => {
    const citySet = new Set<string>();
    DUTCH_CITIES.forEach((c) => {
      if (selectedProvince === 'all' || c.province === selectedProvince) {
        citySet.add(c.name);
      }
    });
    enrichedDeals.forEach((d) => {
      if (selectedProvince === 'all' || d.province === selectedProvince) {
        citySet.add(d.city);
      }
    });
    return Array.from(citySet).sort((a, b) => a.localeCompare(b));
  }, [enrichedDeals, selectedProvince]);

  // Aantallen per soort actie (rekening houdend met actief-filter & provincie)
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: 0 };
    DEAL_CATEGORIES.forEach((c) => {
      counts[c.id] = 0;
    });
    enrichedDeals.forEach((deal) => {
      if (onlyActiveDeals && !deal.hasActiveDeal) return;
      if (onlyNewlyScanned && !newlyScannedIds.has(deal.id)) return;
      if (selectedProvince !== 'all' && deal.province !== selectedProvince) return;
      if (selectedCity !== 'all' && deal.city.toLowerCase() !== selectedCity.toLowerCase()) return;
      counts.all += 1;
      const cat = deal.dealCategory || 'glas';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [enrichedDeals, onlyActiveDeals, onlyNewlyScanned, newlyScannedIds, selectedProvince, selectedCity]);

  // Aantallen per provincie (rekening houdend met actief-filter & categorie)
  const provinceCounts = useMemo(() => {
    const counts: Record<string, number> = { all: 0 };
    DUTCH_PROVINCES.forEach((p) => {
      counts[p] = 0;
    });
    enrichedDeals.forEach((deal) => {
      if (onlyActiveDeals && !deal.hasActiveDeal) return;
      if (onlyNewlyScanned && !newlyScannedIds.has(deal.id)) return;
      if (selectedCategory !== 'all' && deal.dealCategory !== selectedCategory) return;
      counts.all += 1;
      counts[deal.province] = (counts[deal.province] || 0) + 1;
    });
    return counts;
  }, [enrichedDeals, onlyActiveDeals, onlyNewlyScanned, newlyScannedIds, selectedCategory]);

  // Gefilterde en gesorteerde kroegen
  const processedDeals = useMemo(() => {
    return enrichedDeals
      .filter((deal) => {
        if (onlyActiveDeals && !deal.hasActiveDeal) return false;
        if (onlyNewlyScanned && !newlyScannedIds.has(deal.id)) return false;
        if (selectedCategory !== 'all' && deal.dealCategory !== selectedCategory) return false;
        if (selectedProvince !== 'all' && deal.province !== selectedProvince) return false;
        if (selectedCity !== 'all' && deal.city.toLowerCase() !== selectedCity.toLowerCase()) return false;
        if (userLocation && maxDistanceKm > 0 && deal.distanceKm !== null && deal.distanceKm > maxDistanceKm) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const catMeta = getDealCategoryMeta(deal.dealCategory);
          return (
            deal.pubName.toLowerCase().includes(q) ||
            deal.city.toLowerCase().includes(q) ||
            deal.province.toLowerCase().includes(q) ||
            deal.dealTitle.toLowerCase().includes(q) ||
            catMeta.label.toLowerCase().includes(q) ||
            (deal.beerBrand && deal.beerBrand.toLowerCase().includes(q)) ||
            deal.address.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        const aNew = newlyScannedIds.has(a.id) ? 1 : 0;
        const bNew = newlyScannedIds.has(b.id) ? 1 : 0;
        if (!userLocation && aNew !== bNew) {
          return bNew - aNew;
        }
        if (a.distanceKm !== null && b.distanceKm !== null) {
          return a.distanceKm - b.distanceKm;
        }
        if (a.hasActiveDeal !== b.hasActiveDeal) {
          return a.hasActiveDeal ? -1 : 1;
        }
        return a.city.localeCompare(b.city);
      });
  }, [
    enrichedDeals,
    onlyActiveDeals,
    onlyNewlyScanned,
    newlyScannedIds,
    selectedCategory,
    selectedProvince,
    selectedCity,
    userLocation,
    maxDistanceKm,
    searchQuery,
  ]);

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-amber-950/70 via-zinc-900 to-zinc-900 border border-amber-500/30 rounded-2xl p-6 sm:p-7 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-2.5">
              <Gift className="w-3.5 h-3.5" />
              Landelijke Bier &amp; Kroeg Acties (12 Provincies)
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-100 tracking-tight">
              Speciaalbier &amp; Kroeg Acties in Nederland
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-2xl leading-relaxed">
              Ontdek waar je in Nederland profiteert van gratis speciaalbierglazen, voordelige bierproeverijen,
              2+1 kortingsacties, borrelarrangementen en tap takeovers — of gebruik de <strong>Deal Scanner</strong> om direct nieuwe acties te zoeken.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-500 text-zinc-950 shadow-lg shadow-amber-500/20">
              <MapPin className="w-4 h-4" />
              Acties Ontdekken ({processedDeals.length})
            </div>
          </div>
        </div>
      </div>

      {/* DOORLOPENDE DEAL SCANNER BALK */}
      {showDealScanner && (
        <div className="bg-gradient-to-r from-emerald-950/60 via-zinc-900 to-zinc-900 border border-emerald-500/40 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div
                className={`w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 ${
                  isScanning ? 'animate-pulse' : ''
                }`}
              >
                <Radar className={`w-6 h-6 ${isScanning ? 'animate-spin' : ''}`} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-extrabold text-zinc-100">
                    Deal Scanner
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/35">
                    Zoekgebied: {currentScopeLabel}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {isScanning ? (
                    <span className="text-emerald-300 font-semibold">{scanProgressText}</span>
                  ) : selectedProvince !== 'all' ? (
                    <>
                      Scant alle bekende brouwerijen, proeflokalen en biercafés in{' '}
                      <strong className="text-zinc-200">{selectedProvince}</strong>
                      {selectedCity !== 'all' ? ` (${selectedCity})` : ''} totdat alle bronnen zijn gecontroleerd.
                    </>
                  ) : (
                    <>
                      Scant alle bekende brouwerijen, proeflokalen en biercafés in{' '}
                      <strong className="text-zinc-200">heel Nederland</strong> (of kies eerst een provincie hieronder) totdat alles is gecontroleerd.
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                disabled={isScanning}
                onClick={handleRunDealScanner}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-zinc-950 font-black text-xs sm:text-sm shadow-lg shadow-emerald-500/25 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
              >
                <Zap className={`w-4 h-4 fill-zinc-950 ${isScanning ? 'animate-bounce' : ''}`} />
                {isScanning
                  ? `Bezig met scannen (${scanProgressPct}%)...`
                  : selectedProvince !== 'all'
                  ? `Scan op Nieuwe Deals in ${selectedProvince}`
                  : 'Scan op Nieuwe Deals'}
              </button>
            </div>
          </div>

          {/* Voortgangsbalk tijdens het scannen */}
          {isScanning && (
            <div className="mt-4">
              <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden border border-emerald-500/30">
                <div
                  className="h-full bg-emerald-400 transition-all duration-150 rounded-full"
                  style={{ width: `${scanProgressPct}%` }}
                />
              </div>
            </div>
          )}

          {/* Scan Resultaten Melding */}
          {lastScanResult && !isScanning && (
            <div className="mt-4 pt-3.5 border-t border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-emerald-300 font-semibold flex-wrap">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                {lastScanResult.addedCount > 0 ? (
                  <span>
                    <strong>
                      Scan voltooid voor {lastScanResult.scopeLabel}: {lastScanResult.addedCount} nieuwe{' '}
                      {lastScanResult.addedCount === 1 ? 'deal' : 'deals'} gevonden!
                    </strong>{' '}
                    <span className="text-zinc-300">
                      (Alle {lastScanResult.totalChecked} bronnen in dit gebied zijn gecontroleerd)
                    </span>
                  </span>
                ) : (
                  <span>
                    <strong>Scan voltooid voor {lastScanResult.scopeLabel}:</strong>{' '}
                    <span className="text-zinc-300">
                      Alle {lastScanResult.totalChecked} bekende kroegen en brouwerijen in deze selectie zijn gecontroleerd — alle beschikbare deals staan al in je overzicht!
                    </span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {newlyScannedIds.size > 0 && (
                  <button
                    type="button"
                    onClick={() => setOnlyNewlyScanned(!onlyNewlyScanned)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                      onlyNewlyScanned
                        ? 'bg-emerald-500 text-zinc-950 border-emerald-400'
                        : 'bg-zinc-900 hover:bg-zinc-800 text-emerald-300 border-emerald-500/40'
                    }`}
                  >
                    {onlyNewlyScanned
                      ? 'Toon alle deals in selectie'
                      : 'Alleen nieuw gescande tonen'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setLastScanResult(null)}
                  className="p-1 text-zinc-400 hover:text-zinc-200"
                  title="Melding sluiten"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* LANDELIJKE ACTIE FINDER */}
      <div className="space-y-5">
        {/* Soort Actie Categorie-Tegels / Filterbalk */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
              selectedCategory === 'all'
                ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-lg shadow-amber-500/15'
                : 'bg-zinc-900/90 text-zinc-300 border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-1">
              <span className="text-base">🍺</span>
              <span
                className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${
                  selectedCategory === 'all' ? 'bg-zinc-950 text-amber-300' : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                {categoryCounts.all}
              </span>
            </div>
            <div className="text-xs font-extrabold truncate">Alle Acties</div>
          </button>

          {DEAL_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            const count = categoryCounts[cat.id] || 0;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(isSelected ? 'all' : cat.id)}
                className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-lg shadow-amber-500/15'
                    : 'bg-zinc-900/90 text-zinc-300 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-base">{cat.emoji}</span>
                  <span
                    className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${
                      isSelected ? 'bg-zinc-950 text-amber-300' : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {count}
                  </span>
                </div>
                <div className="text-xs font-extrabold truncate">{cat.label}</div>
              </button>
            );
          })}
        </div>

        {/* Search, Province, City & Geolocation Controls */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-lg">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Zoekbalk */}
            <div className="md:col-span-5 relative">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Zoek op kroeg, stad, biermerk of soort actie..."
                className="w-full pl-10 pr-8 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700/80 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Provincie Dropdown (Alle 12 Provincies) */}
            <div className="md:col-span-3">
              <select
                value={selectedProvince}
                onChange={(e) => {
                  setSelectedProvince(e.target.value);
                  setSelectedCity('all');
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700/80 text-xs sm:text-sm text-zinc-200 focus:outline-none focus:border-amber-500"
              >
                <option value="all">🇳🇱 Alle 12 Provincies</option>
                {DUTCH_PROVINCES.map((prov) => (
                  <option key={prov} value={prov}>
                    {prov}
                  </option>
                ))}
              </select>
            </div>

            {/* Stad Dropdown */}
            <div className="md:col-span-2">
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700/80 text-xs sm:text-sm text-zinc-200 focus:outline-none focus:border-amber-500"
              >
                <option value="all">Alle Steden</option>
                {availableCities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* "In de buurt" Geolocatie Knop */}
            <div className="md:col-span-2">
              <button
                type="button"
                onClick={handleGetGeolocation}
                disabled={geoLoading}
                className={`w-full h-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                  userLocation
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-amber-500 hover:bg-amber-400 text-zinc-950 border-amber-400 shadow-md shadow-amber-500/10'
                }`}
              >
                <Navigation className={`w-3.5 h-3.5 ${geoLoading ? 'animate-spin' : ''}`} />
                {geoLoading ? 'Zoeken...' : userLocation ? 'In de buurt ✓' : '📍 In de buurt'}
              </button>
            </div>
          </div>

          {/* Geolocatie Balk & Afstandsfilter indien actief of melding */}
          {(userLocation || geoMessage) && (
            <div className="p-3.5 rounded-xl bg-zinc-950/90 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                {userLocation && (
                  <span className="text-zinc-300">
                    Afstand vanaf: <strong className="text-amber-400">{userLocation.label}</strong>
                  </span>
                )}
                {geoMessage && <span className="text-amber-300">{geoMessage}</span>}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-zinc-500">Kies stad:</span>
                  {['Amsterdam', 'Rotterdam', 'Utrecht', 'Eindhoven', 'Groningen', 'Zwolle', 'Maastricht'].map(
                    (c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => handleSetCityLocation(c)}
                        className="px-2 py-0.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 text-[11px]"
                      >
                        {c}
                      </button>
                    )
                  )}
                </div>
              </div>

              {userLocation && (
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <span className="text-zinc-400">Max. afstand:</span>
                  {[0, 10, 25, 50, 100].map((km) => (
                    <button
                      key={km}
                      type="button"
                      onClick={() => setMaxDistanceKm(km)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                        maxDistanceKm === km
                          ? 'bg-amber-500 text-zinc-950 border-amber-400'
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                      }`}
                    >
                      {km === 0 ? 'Heel NL' : `< ${km} km`}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setUserLocation(null);
                      setMaxDistanceKm(0);
                    }}
                    className="text-rose-400 hover:underline ml-1"
                  >
                    Reset
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Actieve Acties Filterknop & Acties Herstellen */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-zinc-800">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setOnlyActiveDeals(!onlyActiveDeals)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-extrabold border transition-all ${
                  onlyActiveDeals
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-md shadow-emerald-500/10'
                    : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-200'
                }`}
              >
                <Gift className={`w-4 h-4 ${onlyActiveDeals ? 'text-emerald-400' : 'text-zinc-500'}`} />
                <span>Alleen actieve acties tonen</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] ${
                    onlyActiveDeals ? 'bg-emerald-500 text-zinc-950 font-black' : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {onlyActiveDeals ? 'AAN' : 'UIT'}
                </span>
              </button>

              {newlyScannedIds.size > 0 && (
                <button
                  type="button"
                  onClick={() => setOnlyNewlyScanned(!onlyNewlyScanned)}
                  className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                    onlyNewlyScanned
                      ? 'bg-amber-500 text-zinc-950 border-amber-400'
                      : 'bg-zinc-950 text-amber-300 border-amber-500/30 hover:border-amber-400'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Nieuw gescand
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {(selectedCategory !== 'all' ||
                selectedProvince !== 'all' ||
                selectedCity !== 'all' ||
                onlyNewlyScanned ||
                searchQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('all');
                    setSelectedProvince('all');
                    setSelectedCity('all');
                    setOnlyNewlyScanned(false);
                    setSearchQuery('');
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-[11px] font-semibold text-amber-400 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  Filters wissen
                </button>
              )}

              <button
                type="button"
                onClick={handleResetDefaultDeals}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-[11px] font-semibold text-zinc-400 hover:text-zinc-200 transition-colors"
                title="Zet de beginlijst van standaard kroeg-acties terug"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                Reset lijst
              </button>
            </div>
          </div>

          {statusBanner && (
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
              <span>{statusBanner}</span>
              <button onClick={() => setStatusBanner(null)} className="text-[11px] underline ml-2">
                Sluiten
              </button>
            </div>
          )}
        </div>

        {/* 12 Provincies Horizontale Balk */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
          <button
            onClick={() => {
              setSelectedProvince('all');
              setSelectedCity('all');
            }}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap border transition-all ${
              selectedProvince === 'all'
                ? 'bg-amber-500 text-zinc-950 border-amber-400'
                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
            }`}
          >
            Heel Nederland ({provinceCounts.all})
          </button>
          {DUTCH_PROVINCES.map((prov) => {
            const count = provinceCounts[prov] || 0;
            const active = selectedProvince === prov;
            return (
              <button
                key={prov}
                onClick={() => {
                  setSelectedProvince(active ? 'all' : prov);
                  setSelectedCity('all');
                }}
                className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap border transition-all ${
                  active
                    ? 'bg-amber-500 text-zinc-950 border-amber-400 font-bold'
                    : 'bg-zinc-900/80 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-200'
                }`}
              >
                {prov} ({count})
              </button>
            );
          })}
        </div>

        {/* Kroegen & Acties Grid */}
        {processedDeals.length === 0 ? (
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-12 text-center space-y-3">
            <Radar className="w-10 h-10 text-emerald-400 mx-auto opacity-85" />
            <h3 className="text-base font-bold text-zinc-200">
              Geen acties gevonden met deze filterinstellingen
            </h3>
            <p className="text-xs text-zinc-400 max-w-md mx-auto">
              Klik op <strong>Scan op Nieuwe Deals</strong> om in {currentScopeLabel} naar kroeg-acties te zoeken, of pas je filters aan.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
              <button
                onClick={handleRunDealScanner}
                disabled={isScanning}
                className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-xs font-extrabold text-zinc-950 flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
              >
                <Zap className="w-3.5 h-3.5 fill-zinc-950" />
                {selectedProvince !== 'all'
                  ? `Scan op Nieuwe Deals in ${selectedProvince}`
                  : 'Scan op Nieuwe Deals'}
              </button>
              {onlyActiveDeals && (
                <button
                  onClick={() => setOnlyActiveDeals(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200"
                >
                  Toon ook verlopen/inactieve acties
                </button>
              )}
              {selectedCategory !== 'all' && (
                <button
                  onClick={() => setSelectedCategory('all')}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200"
                >
                  Toon alle soorten acties
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {processedDeals.map((deal) => {
              const catMeta = getDealCategoryMeta(deal.dealCategory);
              const isNewlyScanned = newlyScannedIds.has(deal.id);
              return (
                <div
                  key={deal.id}
                  className={`rounded-2xl p-5 border transition-all flex flex-col justify-between shadow-lg ${
                    isNewlyScanned
                      ? 'bg-zinc-900/95 border-emerald-500/50 ring-1 ring-emerald-500/20'
                      : deal.hasActiveDeal
                      ? 'bg-zinc-900/90 border-amber-500/30 hover:border-amber-400/60'
                      : 'bg-zinc-900/50 border-zinc-800 opacity-75'
                  }`}
                >
                  <div>
                    {/* Top Row: Category Badge, Province, City & Distance + Delete */}
                    <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {isNewlyScanned && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-zinc-950 uppercase tracking-wider">
                            ✨ Nieuw Gescand
                          </span>
                        )}
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${catMeta.badgeBg} ${catMeta.badgeText} ${catMeta.badgeBorder}`}
                        >
                          {catMeta.emoji} {catMeta.shortLabel}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
                          {deal.province}
                        </span>
                        <span className="text-xs font-bold text-zinc-300 flex items-center gap-1 ml-0.5">
                          <Building2 className="w-3.5 h-3.5 text-zinc-500" />
                          {deal.city}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {deal.distanceKm !== null && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            <Navigation className="w-3 h-3" />
                            {deal.distanceKm.toFixed(1)} km
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => setDealToDelete(deal)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
                          title="Actie verwijderen"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Pub Name & Address */}
                    <h3 className="text-lg font-extrabold text-zinc-100">{deal.pubName}</h3>
                    <p className="text-xs text-zinc-400 flex items-center gap-1.5 mt-0.5 mb-4">
                      <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      {deal.address}
                    </p>

                    {/* ACTIE STATUS BOX */}
                    {deal.hasActiveDeal ? (
                      <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/60 via-amber-950/40 to-zinc-950 border border-emerald-500/40 mb-4">
                        <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Actieve {catMeta.shortLabel} Actie
                          </span>
                          <div className="flex items-center gap-1.5">
                            {deal.beerBrand && (
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                🍺 {deal.beerBrand}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleToggleDealActive(deal)}
                              className="text-[10px] px-2 py-0.5 rounded bg-zinc-900/90 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-300 border border-zinc-700/80 transition-colors"
                              title="Klik om deze actie op inactief te zetten"
                            >
                              Zet op inactief
                            </button>
                          </div>
                        </div>
                        <p className="text-sm font-extrabold text-zinc-100 leading-snug">
                          {deal.dealTitle}
                        </p>
                        <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 mt-2">
                          <Clock className="w-3 h-3 text-amber-400" />
                          <span>
                            Geldig t/m: <strong>{formatDateNL(deal.actieEindDatum)}</strong>
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 mb-4 flex items-center justify-between gap-2">
                        <div>
                          <span className="text-xs font-bold text-zinc-400 block">
                            Actie momenteel inactief{' '}
                            {deal.actieEindDatum ? `(Einddatum: ${formatDateNL(deal.actieEindDatum)})` : ''}
                          </span>
                          <span className="text-xs text-zinc-500 line-clamp-1 mt-0.5">{deal.dealTitle}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggleDealActive(deal)}
                          className="text-[10px] px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 font-bold transition-colors shrink-0"
                          title="Klik om deze actie weer op actief te zetten"
                        >
                          Activeer weer ✓
                        </button>
                      </div>
                    )}
                  </div>

                  {/* KLIKBARE BRONVERMELDING */}
                  <div className="pt-3 border-t border-zinc-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="text-zinc-400">
                      <span>Bron: </span>
                      <a
                        href={sanitizeExternalUrl(deal.sourceUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-amber-400 hover:text-amber-300 underline inline-flex items-center gap-1"
                      >
                        {deal.sourceName}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <span className="text-zinc-500 block sm:inline sm:ml-1.5 text-[11px]">
                        (Gecheckt: {formatDateNL(deal.checkedAt)})
                      </span>
                    </div>

                    <a
                      href={sanitizeExternalUrl(deal.sourceUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-semibold transition-colors shrink-0"
                    >
                      Bekijk Actiepagina
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!dealToDelete}
        title="Kroeg-actie verwijderen?"
        message={
          dealToDelete
            ? `Weet je zeker dat je de actie bij "${dealToDelete.pubName}" (${dealToDelete.city}) uit het overzicht wilt verwijderen?`
            : ''
        }
        onConfirm={() => {
          if (dealToDelete) {
            onDeleteDeal(dealToDelete.id);
          }
        }}
        onCancel={() => setDealToDelete(null)}
      />
    </div>
  );
};
