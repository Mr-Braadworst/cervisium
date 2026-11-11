import React, { useState, useMemo } from 'react';
import {
  MapPin,
  Compass,
  Plus,
  Trash2,
  Share2,
  Play,
  CheckCircle2,
  Sparkles,
  Bookmark,
  Navigation,
  Users,
  Copy,
  Check,
  Edit3,
  ArrowUp,
  ArrowDown,
  Beer as BeerIcon,
  Square,
  ExternalLink,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import {
  ActivePubCrawlState,
  FriendUser,
  PubCrawl,
  PubCrawlStop,
  PubDeal,
  Tasting,
} from '../types';
import {
  PubCrawlTheme,
  buildGoogleMapsWalkingRouteUrl,
  encodePubCrawlShareParam,
  generateCityPubCrawl,
  sharePubCrawlWithFriendApi,
} from '../services/pubCrawlService';

interface PubCrawlViewProps {
  userName?: string;
  savedPubCrawls: PubCrawl[];
  activePubCrawl: ActivePubCrawlState | null;
  friends: FriendUser[];
  pubDeals: PubDeal[];
  tastings: Tasting[];
  onSavePubCrawl: (crawl: PubCrawl) => void;
  onDeletePubCrawl: (crawlId: string) => void;
  onStartPubCrawl: (crawl: PubCrawl) => void;
  onUpdateActivePubCrawl: (next: ActivePubCrawlState | null) => void;
  onQuickAddBeerAtLocation: (locationName: string) => void;
}

const POPULAR_PLACES = [
  'Utrecht',
  'Amsterdam',
  'Breda',
  'Rotterdam',
  'Eindhoven',
  'Groningen',
  'Maastricht',
  'Haarlem',
  'Den Bosch',
  'Nijmegen',
  'Tilburg',
  'Den Haag',
  'Antwerpen',
];

export const PubCrawlView: React.FC<PubCrawlViewProps> = ({
  userName,
  savedPubCrawls,
  activePubCrawl,
  friends,
  pubDeals,
  tastings,
  onSavePubCrawl,
  onDeletePubCrawl,
  onStartPubCrawl,
  onUpdateActivePubCrawl,
  onQuickAddBeerAtLocation,
}) => {
  const [subTab, setSubTab] = useState<'generate' | 'create' | 'saved'>('generate');

  // Generator state
  const [cityInput, setCityInput] = useState('');
  const [stopCount, setStopCount] = useState<number>(4);
  const [theme, setTheme] = useState<PubCrawlTheme>('mix');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCrawl, setGeneratedCrawl] = useState<PubCrawl | null>(null);
  const [genError, setGenError] = useState<string | null>(null);

  // Custom creator / editor state
  const [editingCrawlId, setEditingCrawlId] = useState<string | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [customCity, setCustomCity] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [customStops, setCustomStops] = useState<PubCrawlStop[]>([
    {
      id: 'stop_init_1',
      pubName: '',
      address: '',
      city: '',
      specialty: '',
      recommendedBeer: '',
    },
    {
      id: 'stop_init_2',
      pubName: '',
      address: '',
      city: '',
      specialty: '',
      recommendedBeer: '',
    },
  ]);

  // Share state
  const [sharingCrawl, setSharingCrawl] = useState<PubCrawl | null>(null);
  const [sharingFriendId, setSharingFriendId] = useState<string | null>(null);
  const [copiedLinkCrawlId, setCopiedLinkCrawlId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4200);
  };

  // Eerdere kroeglocaties uit eigen proefnotities
  const userVisitedLocations = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of tastings) {
      const loc = (t.location || '').trim();
      if (!loc || loc.toLowerCase() === 'thuis') continue;
      counts.set(loc, (counts.get(loc) || 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([loc]) => loc)
      .slice(0, 12);
  }, [tastings]);

  // Bekende kroegen voor de ingevulde plaats bij "Zelf Maken"
  const suggestedPubsForCustomCity = useMemo(() => {
    const cleanCity = customCity.trim().toLowerCase();
    if (!cleanCity) return [];
    return pubDeals
      .filter((d) => d.city.toLowerCase().includes(cleanCity))
      .slice(0, 8);
  }, [customCity, pubDeals]);

  const handleGenerate = async (e?: React.FormEvent, overrideCity?: string) => {
    if (e) e.preventDefault();
    const targetCity = (overrideCity ?? cityInput).trim();
    if (!targetCity) {
      setGenError('Vul eerst een stad of dorp in (bijv. Utrecht, Breda, Valkenburg of Texel).');
      return;
    }
    setGenError(null);
    setIsGenerating(true);
    try {
      const crawl = await generateCityPubCrawl({
        city: targetCity,
        stopCount,
        theme,
        knownDeals: pubDeals,
        userTastingLocations: userVisitedLocations,
        createdBy: userName || 'Cervisium Gebruiker',
      });
      setGeneratedCrawl(crawl);
    } catch {
      setGenError('Er ging iets mis bij het maken van de kroegentocht. Probeer het opnieuw.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveGenerated = (crawl: PubCrawl) => {
    onSavePubCrawl(crawl);
    showToast(`"${crawl.title}" opgeslagen bij je kroegentochten!`);
  };

  const openEditorWithCrawl = (crawl: PubCrawl) => {
    setEditingCrawlId(crawl.id);
    setCustomTitle(crawl.title);
    setCustomCity(crawl.city);
    setCustomDescription(crawl.description || '');
    setCustomStops(
      crawl.stops.map((s, idx) => ({
        id: s.id || `stop_edit_${idx + 1}`,
        pubName: s.pubName,
        address: s.address,
        city: s.city || crawl.city,
        specialty: s.specialty || '',
        recommendedBeer: s.recommendedBeer || '',
        notes: s.notes || '',
        lat: s.lat,
        lng: s.lng,
      }))
    );
    setSubTab('create');
  };

  const resetCustomForm = () => {
    setEditingCrawlId(null);
    setCustomTitle('');
    setCustomCity('');
    setCustomDescription('');
    setCustomStops([
      {
        id: `stop_${Date.now()}_1`,
        pubName: '',
        address: '',
        city: '',
        specialty: '',
        recommendedBeer: '',
      },
      {
        id: `stop_${Date.now()}_2`,
        pubName: '',
        address: '',
        city: '',
        specialty: '',
        recommendedBeer: '',
      },
    ]);
  };

  const handleAddStopField = (prefill?: {
    pubName: string;
    address?: string;
    specialty?: string;
    recommendedBeer?: string;
  }) => {
    setCustomStops((prev) => {
      // Als de laatste stop nog helemaal leeg is en we klikken op een snelkeuze, vul die eerst
      if (
        prefill &&
        prev.length > 0 &&
        !prev[prev.length - 1].pubName.trim()
      ) {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          pubName: prefill.pubName,
          address: prefill.address || (customCity ? `Centrum, ${customCity}` : ''),
          city: customCity,
          specialty: prefill.specialty || '',
          recommendedBeer: prefill.recommendedBeer || '',
        };
        return updated;
      }
      return [
        ...prev,
        {
          id: `stop_${Date.now()}_${prev.length + 1}`,
          pubName: prefill?.pubName || '',
          address: prefill?.address || (customCity ? `Centrum, ${customCity}` : ''),
          city: customCity,
          specialty: prefill?.specialty || '',
          recommendedBeer: prefill?.recommendedBeer || '',
        },
      ];
    });
  };

  const handleUpdateStopField = (
    index: number,
    field: keyof PubCrawlStop,
    value: string
  ) => {
    setCustomStops((prev) =>
      prev.map((st, idx) => (idx === index ? { ...st, [field]: value } : st))
    );
  };

  const handleMoveStop = (index: number, direction: 'up' | 'down') => {
    setCustomStops((prev) => {
      const targetIdx = direction === 'up' ? index - 1 : index + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy;
    });
  };

  const handleRemoveStopField = (index: number) => {
    setCustomStops((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSaveCustomCrawl = (andStart = false) => {
    const validStops = customStops
      .map((s, idx) => ({
        ...s,
        id: s.id || `stop_custom_${idx + 1}`,
        pubName: s.pubName.trim(),
        address: s.address.trim() || (customCity.trim() ? `Centrum, ${customCity.trim()}` : 'Centrum'),
        city: customCity.trim() || s.city || 'Onbekende plaats',
      }))
      .filter((s) => Boolean(s.pubName));

    if (validStops.length === 0) {
      showToast('Voeg minimaal één kroeg toe aan je kroegentocht.');
      return;
    }

    const cityLabel = customCity.trim() || validStops[0].city || 'Plaats';
    const titleLabel =
      customTitle.trim() || `Kroegentocht ${cityLabel} (${validStops.length} kroegen)`;

    const crawlToSave: PubCrawl = {
      id: editingCrawlId || `crawl_custom_${Date.now()}`,
      title: titleLabel,
      city: cityLabel,
      description:
        customDescription.trim() ||
        `Eigen samengestelde kroegentocht in ${cityLabel} langs ${validStops.length} kroegen.`,
      stops: validStops,
      createdBy: userName || 'Jijzelf',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSavePubCrawl(crawlToSave);
    resetCustomForm();
    if (andStart) {
      onStartPubCrawl(crawlToSave);
      showToast(`"${crawlToSave.title}" opgeslagen én direct gestart!`);
    } else {
      setSubTab('saved');
      showToast(`"${crawlToSave.title}" is opgeslagen!`);
    }
  };

  const handleCopyShareLink = async (crawl: PubCrawl) => {
    const encoded = encodePubCrawlShareParam(crawl);
    const shareUrl = `${window.location.origin}/?crawl=${encoded}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLinkCrawlId(crawl.id);
      showToast('Deellink gekopieerd! Stuur hem door naar je vrienden.');
      window.setTimeout(() => {
        setCopiedLinkCrawlId((prev) => (prev === crawl.id ? null : prev));
      }, 3000);
    } catch {
      showToast('Kon deellink niet automatisch kopiëren.');
    }
  };

  const handleShareViaWhatsApp = (crawl: PubCrawl) => {
    const encoded = encodePubCrawlShareParam(crawl);
    const shareUrl = `${window.location.origin}/?crawl=${encoded}`;
    const stopsList = crawl.stops
      .map((s, idx) => `${idx + 1}. ${s.pubName}`)
      .join('\n');
    const text = `🍻 *${crawl.title}* (${crawl.city})\n\nOnze route langs ${crawl.stops.length} kroegen:\n${stopsList}\n\nOpen en start deze kroegentocht direct in Cervisium:\n${shareUrl}`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.location.href = waUrl;
  };

  const handleShareWithCervisiumFriend = async (friend: FriendUser, crawl: PubCrawl) => {
    setSharingFriendId(friend.id);
    try {
      // Sla hem ook op bij jezelf als dat nog niet gebeurd is
      onSavePubCrawl(crawl);
      const res = await sharePubCrawlWithFriendApi(friend.id, crawl);
      showToast(res.message);
      if (res.ok) {
        setSharingCrawl(null);
      }
    } finally {
      setSharingFriendId(null);
    }
  };

  // Actieve kroegentocht helpers
  const activeCurrentStop =
    activePubCrawl &&
    activePubCrawl.pubCrawl.stops[activePubCrawl.currentStopIndex]
      ? activePubCrawl.pubCrawl.stops[activePubCrawl.currentStopIndex]
      : activePubCrawl?.pubCrawl.stops[0];

  const handleToggleVisitedStop = (stopId: string, stopIndex: number) => {
    if (!activePubCrawl) return;
    const isVisited = activePubCrawl.visitedStopIds.includes(stopId);
    const nextVisited = isVisited
      ? activePubCrawl.visitedStopIds.filter((id) => id !== stopId)
      : [...activePubCrawl.visitedStopIds, stopId];

    // Zet automatisch de volgende nog niet bezochte kroeg klaar als huidige stop
    let nextIndex = stopIndex;
    if (!isVisited && stopIndex + 1 < activePubCrawl.pubCrawl.stops.length) {
      nextIndex = stopIndex + 1;
    }

    onUpdateActivePubCrawl({
      ...activePubCrawl,
      currentStopIndex: nextIndex,
      visitedStopIds: nextVisited,
    });
  };

  const handleSelectActiveStopIndex = (index: number) => {
    if (!activePubCrawl) return;
    onUpdateActivePubCrawl({
      ...activePubCrawl,
      currentStopIndex: index,
    });
  };

  return (
    <div className="space-y-6">
      {/* Melding Toast */}
      {toastMessage && (
        <div className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 px-4 py-3 rounded-2xl flex items-center justify-between gap-3 shadow-lg animate-fade-in">
          <div className="flex items-center gap-2.5 text-sm font-medium">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-xs text-emerald-300 hover:text-white underline"
          >
            Sluiten
          </button>
        </div>
      )}

      {/* =====================================================================
          ACTIEVE KROEGENTOCHT DASHBOARD (Zichtbaar zodra een tocht gestart is)
         ===================================================================== */}
      {activePubCrawl && (
        <div className="bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-stone-900 border-2 border-amber-500/50 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-bold uppercase tracking-wider mb-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                Actieve Kroegentocht in {activePubCrawl.pubCrawl.city}
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white">
                {activePubCrawl.pubCrawl.title}
              </h3>
              <p className="text-xs sm:text-sm text-stone-300 mt-0.5">
                {activePubCrawl.visitedStopIds.length} van {activePubCrawl.pubCrawl.stops.length}{' '}
                kroegen afgevinkt • Locaties staan direct voor je klaar bij het aanmelden van een bier!
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <a
                href={buildGoogleMapsWalkingRouteUrl(activePubCrawl.pubCrawl)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-900/90 hover:bg-stone-800 text-stone-200 border border-stone-700 text-xs font-semibold transition-colors"
              >
                <Navigation className="w-3.5 h-3.5 text-amber-400" />
                Wandelroute op Kaart
                <ExternalLink className="w-3 h-3 text-stone-400" />
              </a>
              <button
                type="button"
                onClick={() => {
                  onUpdateActivePubCrawl(null);
                  showToast('Actieve kroegentocht beëindigd.');
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 text-xs font-semibold transition-colors"
              >
                <Square className="w-3.5 h-3.5" />
                Stop Tocht
              </button>
            </div>
          </div>

          {/* Huidige Kroeg Uitgelicht + 1-Klik Bier Aanmelden */}
          {activeCurrentStop && (
            <div className="bg-stone-950/80 border border-amber-500/40 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  Huidige Stop ({activePubCrawl.currentStopIndex + 1} van{' '}
                  {activePubCrawl.pubCrawl.stops.length})
                </div>
                <div className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-amber-400 shrink-0" />
                  <span>
                    {activeCurrentStop.pubName}, {activePubCrawl.pubCrawl.city}
                  </span>
                </div>
                <p className="text-xs text-stone-400">{activeCurrentStop.address}</p>
                {activeCurrentStop.recommendedBeer && (
                  <p className="text-xs text-amber-300/90 pt-1">
                    🍺 Tip: <span className="font-semibold">{activeCurrentStop.recommendedBeer}</span>
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() =>
                    onQuickAddBeerAtLocation(
                      `${activeCurrentStop.pubName}, ${activePubCrawl.pubCrawl.city}`
                    )
                  }
                  className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                >
                  <BeerIcon className="w-4 h-4" />
                  + Bier Aanmelden bij {activeCurrentStop.pubName}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleToggleVisitedStop(
                      activeCurrentStop.id,
                      activePubCrawl.currentStopIndex
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-3.5 py-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {activePubCrawl.visitedStopIds.includes(activeCurrentStop.id)
                    ? 'Bezocht ✓'
                    : 'Kroeg Afvinken & Volgende'}
                </button>
              </div>
            </div>
          )}

          {/* Alle stops op een rij om snel te wisselen of direct een bier te loggen */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {activePubCrawl.pubCrawl.stops.map((stop, idx) => {
              const isCurrent = idx === activePubCrawl.currentStopIndex;
              const isVisited = activePubCrawl.visitedStopIds.includes(stop.id);
              const fullLoc = `${stop.pubName}, ${activePubCrawl.pubCrawl.city}`;
              return (
                <div
                  key={stop.id || idx}
                  className={`rounded-xl p-3 border transition-all flex flex-col justify-between gap-2 ${
                    isCurrent
                      ? 'bg-amber-500/15 border-amber-400 text-white'
                      : isVisited
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-stone-300'
                      : 'bg-stone-900/70 border-stone-800 text-stone-300 hover:border-stone-700'
                  }`}
                >
                  <div
                    onClick={() => handleSelectActiveStopIndex(idx)}
                    className="cursor-pointer space-y-0.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                        Stop {idx + 1}
                      </span>
                      {isVisited && (
                        <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Bezocht
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-sm text-white truncate">{stop.pubName}</div>
                    <div className="text-[11px] text-stone-400 truncate">{stop.address}</div>
                  </div>

                  <div className="flex items-center gap-1.5 pt-1 border-t border-stone-800/80">
                    <button
                      type="button"
                      onClick={() => onQuickAddBeerAtLocation(fullLoc)}
                      className="flex-1 py-1.5 px-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/35 text-amber-300 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      Bier hier loggen
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleVisitedStop(stop.id, idx)}
                      title="Markeer als bezocht"
                      className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                        isVisited
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                          : 'bg-stone-800 border-stone-700 text-stone-400 hover:text-white'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-NAVIGATIE VOOR KROEGENTOCHT PLANNER
         ===================================================================== */}
      <div className="flex flex-wrap items-center gap-2 bg-stone-900/90 border border-stone-800 p-1.5 rounded-2xl">
        <button
          type="button"
          onClick={() => setSubTab('generate')}
          className={`flex-1 min-w-[160px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            subTab === 'generate'
              ? 'bg-amber-500 text-stone-950 shadow-md'
              : 'text-stone-300 hover:text-white hover:bg-stone-800/60'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Stad of Dorp Generator
        </button>

        <button
          type="button"
          onClick={() => setSubTab('create')}
          className={`flex-1 min-w-[160px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            subTab === 'create'
              ? 'bg-amber-500 text-stone-950 shadow-md'
              : 'text-stone-300 hover:text-white hover:bg-stone-800/60'
          }`}
        >
          <Plus className="w-4 h-4" />
          {editingCrawlId ? 'Kroegentocht Bewerken' : 'Zelf Kroegentocht Maken'}
        </button>

        <button
          type="button"
          onClick={() => setSubTab('saved')}
          className={`flex-1 min-w-[160px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            subTab === 'saved'
              ? 'bg-amber-500 text-stone-950 shadow-md'
              : 'text-stone-300 hover:text-white hover:bg-stone-800/60'
          }`}
        >
          <Bookmark className="w-4 h-4" />
          Opgeslagen & Gedeeld ({savedPubCrawls.length})
        </button>
      </div>

      {/* =====================================================================
          MODAL OM KROEGENTOCHT TE DELEN MET VRIENDEN
         ===================================================================== */}
      {sharingCrawl && (
        <div className="bg-stone-900 border-2 border-amber-500/50 rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl animate-fade-in">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h4 className="text-lg font-bold text-white flex items-center gap-2">
                <Share2 className="w-5 h-5 text-amber-400" />
                Deel "{sharingCrawl.title}" met Vrienden
              </h4>
              <p className="text-xs text-stone-400 mt-0.5">
                Stuur deze kroegentocht rechtstreeks naar je Cervisium-vrienden of deel hem via WhatsApp.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSharingCrawl(null)}
              className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold"
            >
              Sluiten
            </button>
          </div>

          {/* 1. Rechtstreeks sturen naar gekoppelde Cervisium-vrienden */}
          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-amber-400" />
              Direct sturen naar jouw Cervisium-vrienden:
            </div>
            {friends.length === 0 ? (
              <p className="text-xs text-stone-400 bg-stone-950/60 border border-stone-800 rounded-xl p-3">
                Je hebt nog geen gekoppelde vrienden in je vriendenlijst. Gebruik hieronder de WhatsApp-knop of kopieer de deellink!
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {friends.map((friend) => (
                  <button
                    key={friend.id}
                    type="button"
                    disabled={sharingFriendId === friend.id}
                    onClick={() => handleShareWithCervisiumFriend(friend, sharingCrawl)}
                    className="flex items-center justify-between gap-2 p-3 rounded-xl bg-stone-950 hover:bg-stone-800 border border-stone-800 hover:border-amber-500/40 text-left transition-all cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white truncate">{friend.name}</div>
                      <div className="text-[11px] text-stone-400">Ontvangt direct jouw route</div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 text-xs font-bold shrink-0">
                      {sharingFriendId === friend.id ? 'Sturen...' : 'Stuur →'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 2. Delen via WhatsApp of Deellink */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-stone-800">
            <button
              type="button"
              onClick={() => handleShareViaWhatsApp(sharingCrawl)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              Deel via WhatsApp
            </button>
            <button
              type="button"
              onClick={() => handleCopyShareLink(sharingCrawl)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 text-xs font-bold transition-colors cursor-pointer"
            >
              {copiedLinkCrawlId === sharingCrawl.id ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  Deellink Gekopieerd!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-amber-400" />
                  Kopieer Deellink
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 1: GENEREER KROEGENTOCHT OP STAD OF DORP
         ===================================================================== */}
      {subTab === 'generate' && (
        <div className="space-y-6">
          <div className="bg-stone-900/80 border border-stone-800 rounded-3xl p-5 sm:p-6 space-y-5">
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <Compass className="w-5 h-5 text-amber-400" />
                Waar gaan jullie op kroegentocht?
              </h3>
              <p className="text-xs sm:text-sm text-stone-400 mt-1">
                Vul een willekeurige stad of dorp in. Wij zoeken automatisch leuke lokale kroegen en proeflokalen op loopafstand voor je bij elkaar!
              </p>
            </div>

            <form onSubmit={(e) => handleGenerate(e)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-6">
                  <label className="block text-xs font-semibold text-stone-400 mb-1.5">
                    Stad of Dorp
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-amber-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={cityInput}
                      onChange={(e) => setCityInput(e.target.value)}
                      placeholder="Bijv. Utrecht, Breda, Valkenburg, Texel..."
                      className="w-full pl-10 pr-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-sm text-white placeholder:text-stone-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="md:col-span-3">
                  <label className="block text-xs font-semibold text-stone-400 mb-1.5">
                    Aantal Kroegen
                  </label>
                  <select
                    value={stopCount}
                    onChange={(e) => setStopCount(Number(e.target.value))}
                    className="w-full px-3.5 py-3 bg-stone-950 border border-stone-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value={3}>3 kroegen (Korte route)</option>
                    <option value={4}>4 kroegen (Ideale avond)</option>
                    <option value={5}>5 kroegen (Klassieke tocht)</option>
                    <option value={6}>6 kroegen (Grote tocht)</option>
                    <option value={7}>7 kroegen (Avontuurlijk)</option>
                    <option value={8}>8 kroegen (Ultieme kroegentocht)</option>
                  </select>
                </div>

                <div className="md:col-span-3">
                  <label className="block text-xs font-semibold text-stone-400 mb-1.5">
                    Sfeer & Stijl
                  </label>
                  <select
                    value={theme}
                    onChange={(e) => setTheme(e.target.value as PubCrawlTheme)}
                    className="w-full px-3.5 py-3 bg-stone-950 border border-stone-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="mix">Gezellige Avondje Uit Mix</option>
                    <option value="speciaalbier">Speciaalbier & Proeflokalen</option>
                    <option value="bruin">Authentieke Bruine Kroegen</option>
                  </select>
                </div>
              </div>

              {/* Populaire steden snelkeuze */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-stone-400">
                  Snel kiezen of typ zelf elk gewenst dorp of stad:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_PLACES.map((place) => (
                    <button
                      key={place}
                      type="button"
                      onClick={() => {
                        setCityInput(place);
                        handleGenerate(undefined, place);
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                        cityInput.trim().toLowerCase() === place.toLowerCase()
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-white hover:border-stone-700'
                      }`}
                    >
                      {place}
                    </button>
                  ))}
                </div>
              </div>

              {genError && (
                <div className="text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded-xl px-3.5 py-2.5">
                  {genError}
                </div>
              )}

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-stone-950 font-black text-sm shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Leuke kroegen zoeken in {cityInput || 'jouw plaats'}...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Genereer Kroegentocht
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Gegenereerde Kroegentocht Resultaat */}
          {generatedCrawl && (
            <div className="bg-stone-900 border border-amber-500/40 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xl animate-fade-in">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-stone-800">
                <div>
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-400">
                    <MapPin className="w-3.5 h-3.5" />
                    Kroegentocht voorgesteld voor {generatedCrawl.city}
                  </span>
                  <h4 className="text-xl sm:text-2xl font-black text-white mt-0.5">
                    {generatedCrawl.title}
                  </h4>
                  <p className="text-xs sm:text-sm text-stone-400 mt-1">
                    {generatedCrawl.description}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onSavePubCrawl(generatedCrawl);
                      onStartPubCrawl(generatedCrawl);
                      showToast(
                        `Kroegentocht in ${generatedCrawl.city} gestart! Je kunt nu bij elk biertje met 1 klik de kroeg aanvinken.`
                      );
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    Start Kroegentocht
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSaveGenerated(generatedCrawl)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-100 border border-stone-700 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
                  >
                    <Bookmark className="w-4 h-4 text-amber-400" />
                    Opslaan
                  </button>

                  <button
                    type="button"
                    onClick={() => setSharingCrawl(generatedCrawl)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-100 border border-stone-700 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
                  >
                    <Share2 className="w-4 h-4 text-amber-400" />
                    Deel met Vrienden
                  </button>

                  <button
                    type="button"
                    onClick={() => openEditorWithCrawl(generatedCrawl)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-stone-950 hover:bg-stone-800 text-stone-300 border border-stone-800 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4 text-stone-400" />
                    Stops Aanpassen
                  </button>
                </div>
              </div>

              {/* De Route Stops */}
              <div className="space-y-3">
                {generatedCrawl.stops.map((stop, idx) => (
                  <div
                    key={stop.id || idx}
                    className="bg-stone-950/90 border border-stone-800/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-black text-sm flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </div>
                      <div className="space-y-1">
                        <div className="font-bold text-white text-base">{stop.pubName}</div>
                        <div className="text-xs text-stone-400 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                          <span>{stop.address}</span>
                        </div>
                        {stop.specialty && (
                          <p className="text-xs text-stone-300">{stop.specialty}</p>
                        )}
                        {stop.recommendedBeer && (
                          <p className="text-xs text-amber-400/90 font-medium">
                            🍺 Aanrader: {stop.recommendedBeer}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:self-center">
                      <button
                        type="button"
                        onClick={() =>
                          onQuickAddBeerAtLocation(`${stop.pubName}, ${generatedCrawl.city}`)
                        }
                        className="px-3 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <BeerIcon className="w-3.5 h-3.5" />
                        Bier hier aanmelden
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 flex items-center justify-between flex-wrap gap-3 text-xs text-stone-400">
                <span>
                  Tip: Klik op <strong>Start Kroegentocht</strong> zodat deze kroegen direct als snelkeuze-knoppen verschijnen wanneer je een biertje aanmeldt!
                </span>
                <a
                  href={buildGoogleMapsWalkingRouteUrl(generatedCrawl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-amber-400 hover:text-amber-300 font-semibold"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  Bekijk wandelroute in Google Maps
                  <ChevronRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          TAB 2: ZELF KROEGENTOCHT MAKEN OF BEWERKEN
         ===================================================================== */}
      {subTab === 'create' && (
        <div className="bg-stone-900/80 border border-stone-800 rounded-3xl p-5 sm:p-6 space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-400" />
                {editingCrawlId ? 'Kroegentocht Bewerken' : 'Zelf een Kroegentocht Samenstellen'}
              </h3>
              <p className="text-xs sm:text-sm text-stone-400 mt-0.5">
                Stel je eigen favoriete kroegenroute samen, sla hem op en deel hem met je biervrienden.
              </p>
            </div>
            {editingCrawlId && (
              <button
                type="button"
                onClick={resetCustomForm}
                className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold"
              >
                Nieuwe Blanco Tocht
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-400 mb-1.5">
                Stad of Dorp *
              </label>
              <input
                type="text"
                value={customCity}
                onChange={(e) => setCustomCity(e.target.value)}
                placeholder="Bijv. Breda, Zwolle, Oirschot..."
                className="w-full px-3.5 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-sm text-white placeholder:text-stone-500 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-400 mb-1.5">
                Naam van je Kroegentocht
              </label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder={
                  customCity
                    ? `Bijv. Vrijdagavond Kroegentocht ${customCity}`
                    : 'Bijv. Verjaardag Kroegentocht'
                }
                className="w-full px-3.5 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-sm text-white placeholder:text-stone-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-400 mb-1.5">
              Korte omschrijving of afspraak (optioneel)
            </label>
            <input
              type="text"
              value={customDescription}
              onChange={(e) => setCustomDescription(e.target.value)}
              placeholder="Bijv. Verzamelen om 20:00 uur bij de eerste kroeg op de Markt!"
              className="w-full px-3.5 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-sm text-white placeholder:text-stone-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Snelkeuze uit bekende kroegen in deze stad of eerder bezochte kroegen */}
          {(suggestedPubsForCustomCity.length > 0 || userVisitedLocations.length > 0) && (
            <div className="bg-stone-950/70 border border-stone-800/80 rounded-2xl p-3.5 space-y-2.5">
              <div className="text-xs font-bold text-amber-400">
                ⚡ Snel een kroeg toevoegen aan je route:
              </div>
              {suggestedPubsForCustomCity.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {suggestedPubsForCustomCity.map((deal) => (
                    <button
                      key={deal.id}
                      type="button"
                      onClick={() =>
                        handleAddStopField({
                          pubName: deal.pubName,
                          address: deal.address,
                          specialty: deal.dealTitle,
                          recommendedBeer: deal.beerBrand,
                        })
                      }
                      className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-200 text-xs font-medium transition-colors cursor-pointer"
                    >
                      + {deal.pubName}
                    </button>
                  ))}
                </div>
              )}
              {userVisitedLocations.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {userVisitedLocations.map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() =>
                        handleAddStopField({
                          pubName: loc.split(',')[0].trim(),
                          address: loc,
                        })
                      }
                      className="px-2.5 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-300 text-xs transition-colors cursor-pointer"
                    >
                      + {loc}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Lijst van stops */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-400">
                Kroegen op de route ({customStops.length})
              </span>
              <button
                type="button"
                onClick={() => handleAddStopField()}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Extra Kroeg Toevoegen
              </button>
            </div>

            {customStops.map((stop, idx) => (
              <div
                key={stop.id || idx}
                className="bg-stone-950 border border-stone-800 rounded-2xl p-4 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2 text-xs font-bold text-amber-400">
                    <span className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
                      {idx + 1}
                    </span>
                    Stop {idx + 1}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveStop(idx, 'up')}
                      className="p-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 disabled:opacity-30 text-stone-400 hover:text-white"
                      title="Verplaats omhoog"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === customStops.length - 1}
                      onClick={() => handleMoveStop(idx, 'down')}
                      className="p-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 disabled:opacity-30 text-stone-400 hover:text-white"
                      title="Verplaats omlaag"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    {customStops.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveStopField(idx)}
                        className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400"
                        title="Verwijder stop"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-stone-400 mb-1">
                      Naam van de Kroeg *
                    </label>
                    <input
                      type="text"
                      value={stop.pubName}
                      onChange={(e) => handleUpdateStopField(idx, 'pubName', e.target.value)}
                      placeholder="Bijv. Café De Beyerd"
                      className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-stone-400 mb-1">
                      Straat / Plein (optioneel)
                    </label>
                    <input
                      type="text"
                      value={stop.address}
                      onChange={(e) => handleUpdateStopField(idx, 'address', e.target.value)}
                      placeholder="Bijv. Grote Markt 12"
                      className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-stone-400 mb-1">
                      Biertip of opmerking (optioneel)
                    </label>
                    <input
                      type="text"
                      value={stop.recommendedBeer || ''}
                      onChange={(e) =>
                        handleUpdateStopField(idx, 'recommendedBeer', e.target.value)
                      }
                      placeholder="Bijv. Proef hier de huis-Tripel"
                      className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() => handleAddStopField()}
              className="w-full py-3 rounded-2xl border border-dashed border-stone-700 hover:border-amber-500/50 text-stone-300 hover:text-amber-300 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Nog een kroeg toevoegen aan de route
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => handleSaveCustomCrawl(true)}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              Opslaan & Direct Starten
            </button>

            <button
              type="button"
              onClick={() => handleSaveCustomCrawl(false)}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-white border border-stone-700 font-bold text-xs sm:text-sm transition-colors cursor-pointer"
            >
              <Bookmark className="w-4 h-4 text-amber-400" />
              Kroegentocht Opslaan
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 3: OPGESLAGEN & GEDEELDE KROEGENTOCHTEN
         ===================================================================== */}
      {subTab === 'saved' && (
        <div className="space-y-4">
          {savedPubCrawls.length === 0 ? (
            <div className="bg-stone-900/70 border border-stone-800 rounded-3xl p-8 text-center space-y-3">
              <Compass className="w-10 h-10 text-amber-400 mx-auto" />
              <h4 className="text-lg font-bold text-white">
                Nog geen opgeslagen kroegentochten
              </h4>
              <p className="text-xs sm:text-sm text-stone-400 max-w-md mx-auto">
                Genereer een kroegentocht op basis van een stad of dorp, of stel zelf een kroegentocht samen om te bewaren en te delen met vrienden.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSubTab('generate')}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs cursor-pointer"
                >
                  Genereer op Stad of Dorp
                </button>
                <button
                  type="button"
                  onClick={() => setSubTab('create')}
                  className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs cursor-pointer"
                >
                  Zelf Samenstellen
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {savedPubCrawls.map((crawl) => {
                const isCurrentlyActive = activePubCrawl?.pubCrawl.id === crawl.id;
                return (
                  <div
                    key={crawl.id}
                    className={`rounded-3xl p-5 border transition-all space-y-4 ${
                      isCurrentlyActive
                        ? 'bg-amber-500/10 border-amber-500/50'
                        : 'bg-stone-900/80 border-stone-800'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 text-xs font-bold">
                            {crawl.city}
                          </span>
                          <span className="text-xs text-stone-400">
                            {crawl.stops.length} kroegen
                          </span>
                          {crawl.sharedBy && (
                            <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                              🤝 Gedeeld door {crawl.sharedBy}
                            </span>
                          )}
                        </div>
                        <h4 className="text-lg font-bold text-white">{crawl.title}</h4>
                        {crawl.description && (
                          <p className="text-xs text-stone-400 mt-0.5">{crawl.description}</p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            onStartPubCrawl(crawl);
                            showToast(
                              `Kroegentocht "${crawl.title}" is gestart! De kroegen staan klaar bij het aanmelden van je bieren.`
                            );
                          }}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition-colors cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          {isCurrentlyActive ? 'Actief (Herstart)' : 'Start Kroegentocht'}
                        </button>

                        <button
                          type="button"
                          onClick={() => setSharingCrawl(crawl)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <Share2 className="w-3.5 h-3.5 text-amber-400" />
                          Delen
                        </button>

                        <a
                          href={buildGoogleMapsWalkingRouteUrl(crawl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 text-xs font-semibold transition-colors"
                        >
                          <Navigation className="w-3.5 h-3.5 text-amber-400" />
                          Route
                        </a>

                        <button
                          type="button"
                          onClick={() => openEditorWithCrawl(crawl)}
                          className="p-2 rounded-xl bg-stone-950 hover:bg-stone-800 text-stone-400 hover:text-white border border-stone-800"
                          title="Kroegentocht bewerken"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            onDeletePubCrawl(crawl.id);
                            showToast(`"${crawl.title}" verwijderd.`);
                          }}
                          className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20"
                          title="Kroegentocht verwijderen"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Overzicht van de kroegen in deze opgeslagen tocht */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-2 border-t border-stone-800/80">
                      {crawl.stops.map((st, idx) => (
                        <div
                          key={st.id || idx}
                          className="bg-stone-950/70 border border-stone-800/80 rounded-xl p-2.5 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="text-[11px] font-bold text-amber-400">
                              Stop {idx + 1}
                            </div>
                            <div className="text-xs font-semibold text-white truncate">
                              {st.pubName}
                            </div>
                            <div className="text-[11px] text-stone-500 truncate">{st.address}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              onQuickAddBeerAtLocation(`${st.pubName}, ${crawl.city}`)
                            }
                            title={`Meld bier aan bij ${st.pubName}`}
                            className="p-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 shrink-0 cursor-pointer"
                          >
                            <BeerIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
