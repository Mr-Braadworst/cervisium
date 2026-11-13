import React, { useState, useMemo } from 'react';
import {
  Beer,
  Camera,
  Star,
  MapPin,
  GlassWater,
  Users,
  ArrowRight,
  Plus,
  Compass,
  QrCode,
  Heart,
  Search,
  ChevronRight,
  RotateCcw,
  Check,
  Navigation,
} from 'lucide-react';
import { useAppVersion } from '../version';
import { PWAInstallButton } from './PWAInstallButton';
import heroCraftBeerImg from '../assets/images/hero_craft_beer_tasting_1794225257636.jpg';
import featureGlasswareImg from '../assets/images/feature_glassware_collection_1794225258349.jpg';
import featureFriendsImg from '../assets/images/feature_friends_tasting_1794225260196.jpg';

interface LandingPageProps {
  hasPendingInvite?: boolean;
  onOpenLogin: (mode?: 'login' | 'register') => void;
  onOpenRegister?: () => void;
}

type WorkbenchTab = 'logboek' | 'kroegentocht' | 'glazenkast' | 'stamtafel';

interface DemoBeerEntry {
  id: string;
  indexNo: string;
  name: string;
  brewery: string;
  style: string;
  abv: number;
  score: number;
  serving: 'Van de tap' | 'Fles' | 'Blik';
  location: string;
  date: string;
  note: string;
  favorite: boolean;
  photoUrl: string;
}

interface DemoCrawlStop {
  order: number;
  pubName: string;
  address: string;
  specialty: string;
  recommendedBeer: string;
  checkedIn: boolean;
}

const INITIAL_DEMO_BEERS: DemoBeerEntry[] = [
  {
    id: 'demo-1',
    indexNo: 'NR. 042',
    name: 'St. Bernardus Abt 12',
    brewery: 'Brouwerij St. Bernardus, Watou',
    style: 'Quadrupel',
    abv: 10.0,
    score: 9.4,
    serving: 'Van de tap',
    location: 'Café In de Wildeman, Amsterdam',
    date: 'Vrijdag 21:15',
    note: 'Donker moutig, vijgen en kandij. Schuimkraag blijft tot de laatste slok staan.',
    favorite: true,
    photoUrl: heroCraftBeerImg,
  },
  {
    id: 'demo-2',
    indexNo: 'NR. 041',
    name: 'Orval Trappist (1 jaar gerijpt)',
    brewery: 'Brasserie d’Orval, Villers-devant-Orval',
    style: 'Belgian Pale Ale / Brett',
    abv: 6.2,
    score: 9.1,
    serving: 'Fles',
    location: 'De Gouverneur, Maastricht',
    date: 'Zaterdag 17:40',
    note: 'Kurkdroge afdronk door de wilde gist. In het originele kelkglas geschonken.',
    favorite: true,
    photoUrl: featureGlasswareImg,
  },
  {
    id: 'demo-3',
    indexNo: 'NR. 040',
    name: 'De Molen Hel & Verdoemenis',
    brewery: 'Brouwerij de Molen, Bodegraven',
    style: 'Imperial Stout',
    abv: 10.0,
    score: 8.8,
    serving: 'Fles',
    location: 'Proeflokaal Arendsnest, Amsterdam',
    date: 'Vorige week',
    note: 'Zwart als afgewerkte olie, gebrande espresso en pure chocolade. Rustig nippen.',
    favorite: false,
    photoUrl: featureFriendsImg,
  },
];

const DEMO_CITY_CRAWLS: Record<string, { title: string; subtitle: string; stops: DemoCrawlStop[] }> = {
  Utrecht: {
    title: 'Oudegracht & Werfkelders Tocht',
    subtitle: '4 kroegen langs het water · 1,6 km wandelen',
    stops: [
      {
        order: 1,
        pubName: 'Café Olivier',
        address: 'Achter Clarenburg 6a, Utrecht',
        specialty: 'Belgische klassiekers in een voormalige schuilkerk',
        recommendedBeer: 'Gouden Carolus Classic (8.5%)',
        checkedIn: true,
      },
      {
        order: 2,
        pubName: 'Kafé België',
        address: 'Oudegracht 196, Utrecht',
        specialty: 'Meer dan 200 bieren op fles en rauwe kroegsfeer',
        recommendedBeer: 'Dupont Saison (6.5%)',
        checkedIn: true,
      },
      {
        order: 3,
        pubName: 'De Drie Dorstige Herten',
        address: 'Lange Nieuwstraat 47, Utrecht',
        specialty: 'Klein huiskamerproeflokaal met lokale brouwsels',
        recommendedBeer: 'vandeStreek Playground of Hops',
        checkedIn: false,
      },
      {
        order: 4,
        pubName: 'Brouwerij Maximus Proeflokaal',
        address: 'Pratumplaats 2a, Utrecht',
        specialty: 'Rechtstreeks uit de ketels naast de bar',
        recommendedBeer: 'Maximus Pandora IPA (6.0%)',
        checkedIn: false,
      },
    ],
  },
  Maastricht: {
    title: 'Kasseien & Bruine Kroegen Route',
    subtitle: '3 karakterkroegen in de binnenstad · 1,1 km wandelen',
    stops: [
      {
        order: 1,
        pubName: 'In den Ouden Vogelstruys',
        address: 'Vrijthof 15, Maastricht',
        specialty: 'Huiskamercafé sinds 1730 aan het Vrijthof',
        recommendedBeer: 'Stadsbrouwerij Maastricht Maltezer',
        checkedIn: true,
      },
      {
        order: 2,
        pubName: 'De Gouverneur',
        address: 'Boschstraat 105a, Maastricht',
        specialty: 'Overweldigende bierkaart en trappisten op rijping',
        recommendedBeer: 'Rochefort 10 (11.3%)',
        checkedIn: false,
      },
      {
        order: 3,
        pubName: 'Café Falstaff',
        address: 'Sint Amorsplein 6, Maastricht',
        specialty: 'Wisselende vaten en steengoed terras',
        recommendedBeer: 'Chouffe Bok 6666 (6.6%)',
        checkedIn: false,
      },
    ],
  },
  Groningen: {
    title: 'Kromme Elleboog & Kolenmuur Tocht',
    subtitle: '3 authentieke biercafés · 950 meter wandelen',
    stops: [
      {
        order: 1,
        pubName: 'De Koffer',
        address: 'Nieuwe Blekerstraat 1, Groningen',
        specialty: '280+ speciaalbieren en ouderwetse houten bar',
        recommendedBeer: 'Baxbier Kon Minder (5.3%)',
        checkedIn: true,
      },
      {
        order: 2,
        pubName: 'Café De Sleutel',
        address: 'Noorderhaven 72, Groningen',
        specialty: 'Oudste bruine kroeg aan de haven (sinds 1885)',
        recommendedBeer: 'Westmalle Dubbel van het vat (7.0%)',
        checkedIn: false,
      },
      {
        order: 3,
        pubName: 'Mout & Brouwhuis',
        address: 'Gedempte Zuiderdiep 43, Groningen',
        specialty: 'Lokaal gebrouwen en robuuste proefplankjes',
        recommendedBeer: 'Martinus Rookbier (6.2%)',
        checkedIn: false,
      },
    ],
  },
};

export const LandingPage: React.FC<LandingPageProps> = ({
  hasPendingInvite,
  onOpenLogin,
  onOpenRegister,
}) => {
  const { appVersion, versionDate } = useAppVersion();

  const handleLoginClick = () => onOpenLogin('login');
  const handleRegisterClick = () => {
    if (onOpenRegister) {
      onOpenRegister();
    } else {
      onOpenLogin('register');
    }
  };

  // Interactive workbench state so visitors can test real features on the landing page
  const [activeWorkbench, setActiveWorkbench] = useState<WorkbenchTab>('logboek');
  const [demoBeers, setDemoBeers] = useState<DemoBeerEntry[]>(INITIAL_DEMO_BEERS);
  const [selectedBeerId, setSelectedBeerId] = useState<string>(INITIAL_DEMO_BEERS[0].id);
  const [searchQuery, setSearchQuery] = useState('');

  // Quick-add form inside interactive demo
  const [newBeerName, setNewBeerName] = useState('');
  const [newBeerStyle, setNewBeerStyle] = useState('Tripel');
  const [newBeerScore, setNewBeerScore] = useState<number>(8.6);
  const [newBeerLocation, setNewBeerLocation] = useState('Café Olivier, Utrecht');
  const [justAddedToast, setJustAddedToast] = useState<string | null>(null);

  // Interactive Kroegentocht state
  const [selectedCity, setSelectedCity] = useState<'Utrecht' | 'Maastricht' | 'Groningen'>('Utrecht');
  const [customStops, setCustomStops] = useState<Record<string, DemoCrawlStop[]>>({
    Utrecht: DEMO_CITY_CRAWLS.Utrecht.stops,
    Maastricht: DEMO_CITY_CRAWLS.Maastricht.stops,
    Groningen: DEMO_CITY_CRAWLS.Groningen.stops,
  });

  // Interactive Glassware state
  const [demoGlasses, setDemoGlasses] = useState([
    { id: 'g1', name: 'Orval Kelkglas (Goudbies)', brewery: 'Brasserie d’Orval', type: 'Kelk / Goblet', count: 2 },
    { id: 'g2', name: 'Karmeliet Lelie Bokaal', brewery: 'Brouwerij Bosteels', type: 'Tulp / Bokaal', count: 4 },
    { id: 'g3', name: 'Duvel gegraveerd M-glas', brewery: 'Duvel Moortgat', type: 'Tulpglas', count: 3 },
  ]);

  const activeBeer = useMemo(
    () => demoBeers.find((b) => b.id === selectedBeerId) || demoBeers[0],
    [demoBeers, selectedBeerId]
  );

  const filteredDemoBeers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return demoBeers;
    return demoBeers.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.brewery.toLowerCase().includes(q) ||
        b.style.toLowerCase().includes(q) ||
        b.location.toLowerCase().includes(q)
    );
  }, [demoBeers, searchQuery]);

  const handleAddDemoBeer = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newBeerName.trim() || 'La Chouffe Blond';
    const nextNo = `NR. 0${demoBeers.length + 40}`;
    const created: DemoBeerEntry = {
      id: `demo-${Date.now()}`,
      indexNo: nextNo,
      name: cleanName,
      brewery: 'Toegevoegd in proeflogboek',
      style: newBeerStyle,
      abv: 8.0,
      score: Number(newBeerScore),
      serving: 'Van de tap',
      location: newBeerLocation.trim() || 'Aan de stamtafel',
      date: 'Zojuist genoteerd',
      note: `Geproefd bij ${newBeerLocation.trim() || 'de stamtafel'}. Direct gekoppeld aan je route en bierlijst.`,
      favorite: newBeerScore >= 8.5,
      photoUrl: heroCraftBeerImg,
    };
    setDemoBeers((prev) => [created, ...prev]);
    setSelectedBeerId(created.id);
    setNewBeerName('');
    setJustAddedToast(`"${created.name}" (${created.score.toFixed(1)}) opgeschreven in het proefboek.`);
    setTimeout(() => setJustAddedToast(null), 4000);
  };

  const toggleStopCheckIn = (city: string, order: number, pubName: string) => {
    setCustomStops((prev) => {
      const currentList = prev[city] || [];
      return {
        ...prev,
        [city]: currentList.map((stop) =>
          stop.order === order ? { ...stop, checkedIn: !stop.checkedIn } : stop
        ),
      };
    });
    setNewBeerLocation(`${pubName}, ${city}`);
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-amber-600 selection:text-zinc-950">
      {/* ===================================================================
          TOP BAR CONTRACT: Strictly 1 row, 3 zones separated by gap-8
          Zone 1: Brand Identity | Zone 2: 4 Single-line links | Zone 3: 1 CTA
         =================================================================== */}
      <header className="sticky top-0 z-50 border-b border-zinc-800/90 bg-zinc-950/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Brand Wordmark */}
          <a
            href="#top"
            className="flex items-center gap-3 shrink-0 group focus:outline-none"
          >
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center text-zinc-950 shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
              <Beer className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div className="flex items-baseline gap-2.5">
              <span
                translate="no"
                data-no-translate="true"
                className="notranslate font-display text-2xl font-bold tracking-tight text-zinc-100 group-hover:text-amber-500 transition-colors"
              >
                Cervisium
              </span>
              <span className="hidden sm:inline-block font-mono text-[11px] uppercase tracking-widest text-zinc-500">
                Brouwersdagboek
              </span>
            </div>
          </a>

          {/* Zone 2: Max 4 concise single-line links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
            <button
              type="button"
              onClick={() => scrollToSection('proeflokaal')}
              className="whitespace-nowrap hover:text-zinc-100 transition-colors cursor-pointer"
            >
              Proeflokaal
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('kroegentocht')}
              className="whitespace-nowrap hover:text-zinc-100 transition-colors cursor-pointer"
            >
              Kroegentocht
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('glazenkast')}
              className="whitespace-nowrap hover:text-zinc-100 transition-colors cursor-pointer"
            >
              Glazenkast
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('stamtafel')}
              className="whitespace-nowrap hover:text-zinc-100 transition-colors cursor-pointer"
            >
              Stamtafel
            </button>
          </nav>

          {/* Zone 3: 1 Primary CTA button */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={handleLoginClick}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer stamp-border"
            >
              Open je logboek
            </button>
          </div>
        </div>
      </header>

      {/* Pending Friend Invite Banner */}
      {hasPendingInvite && (
        <div className="bg-amber-600/15 border-b border-amber-500/50 px-4 py-3">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
            <div className="text-amber-300">
              ★ UITNODIGING VOOR DE STAMTAFEL ONTVANGEN — Log in of maak je logboek aan om direct
              met je vriend gekoppeld te worden.
            </div>
            <button
              type="button"
              onClick={handleLoginClick}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold uppercase tracking-wider cursor-pointer shrink-0"
            >
              Koppeling voltooien →
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================
          ASYMMETRIC EDITORIAL HERO (No centered SaaS template, no pills)
         =================================================================== */}
      <section id="top" className="relative border-b border-zinc-800/90 pt-10 pb-16 sm:pt-16 sm:pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Editorial Broadsheet Masthead Strip */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-5 mb-10 border-b border-zinc-800 text-xs font-mono text-zinc-400">
            <div>
              UITGAVE VOOR BIERLIEFHEBBERS · GEEN ADVERTENTIES · GEEN ALGORITMES
            </div>
            <div className="tabular-nums">
              LOGBOEK VERSIE v{appVersion}{versionDate ? ` · ${versionDate}` : ''}
            </div>
          </div>

          {/* 12-Column Asymmetric Split (7 cols editorial typography / 5 cols documentary frame + overlapping index card) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
            {/* Left 7 Columns: Raw, direct, human story */}
            <div className="lg:col-span-7 space-y-8">
              <div className="font-mono text-xs uppercase tracking-widest text-amber-500">
                00 / Het notitieboek voor aan de toog
              </div>

              <h1 className="font-display text-4xl sm:text-6xl lg:text-[4.15rem] font-bold tracking-tight text-zinc-100 leading-[1.03]">
                Goed bier verdient meer dan een vage foto op je filmrol.
              </h1>

              <p className="text-lg sm:text-xl text-zinc-300 leading-relaxed max-w-[60ch]">
                Je kent het: twee maanden geleden dronk je in een bruine kroeg een fantastische
                Quadrupel van het vat, maar je weet de brouwer of de naam niet meer.{' '}
                <strong className="text-zinc-100 font-semibold">Cervisium</strong> is jouw eigen,
                nuchtere bierboekje. Schrijf op wat je drinkt, geef een eerlijk cijfer van 1 tot 10,
                stippel een kroegentocht uit en kijk wat je vrienden hebben geproefd.
              </p>

              {/* Action Row: Direct, grounded buttons + unboxed link */}
              <div className="pt-2 flex flex-wrap items-center gap-5">
                <button
                  type="button"
                  onClick={handleRegisterClick}
                  className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold text-sm tracking-wide transition-all cursor-pointer stamp-border"
                >
                  <span>Begin je eigen bierboekje</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleLoginClick}
                  className="inline-flex items-center gap-2 px-5 py-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 font-semibold text-sm transition-colors cursor-pointer"
                >
                  <span>Ik heb al een logboek (Inloggen)</span>
                </button>

                <PWAInstallButton variant="landing" />
              </div>

              {/* Unboxed Editorial Ledger Facts (Zero-pill discipline, clean tabular numbers) */}
              <div className="pt-8 border-t border-zinc-800 grid grid-cols-2 sm:grid-cols-3 gap-6">
                <div>
                  <div className="font-mono text-2xl sm:text-3xl font-bold text-zinc-100 tabular-nums">
                    1,0 — 10
                  </div>
                  <div className="text-xs text-zinc-400 mt-1 leading-snug">
                    Rapportcijfers op een halve punt nauwkeurig, zoals het hoort.
                  </div>
                </div>
                <div className="border-l border-zinc-800 pl-5">
                  <div className="font-mono text-2xl sm:text-3xl font-bold text-amber-500 tabular-nums">
                    100% Privé
                  </div>
                  <div className="text-xs text-zinc-400 mt-1 leading-snug">
                    Alleen vrienden die jouw QR-code scannen mogen meekijken.
                  </div>
                </div>
                <div className="col-span-2 sm:col-span-1 border-t sm:border-t-0 sm:border-l border-zinc-800 pt-4 sm:pt-0 sm:pl-5">
                  <div className="font-mono text-2xl sm:text-3xl font-bold text-zinc-100 tabular-nums">
                    Stad &amp; Dorp
                  </div>
                  <div className="text-xs text-zinc-400 mt-1 leading-snug">
                    Maak een kroegentocht op maat en vink je stops onderweg af.
                  </div>
                </div>
              </div>
            </div>

            {/* Right 5 Columns: Documentary Photography + Overlapping Index Card */}
            <div className="lg:col-span-5 relative">
              {/* Documentary Photo Frame */}
              <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-3 stamp-border">
                <div className="relative aspect-[4/5] rounded-xl overflow-hidden bg-zinc-950">
                  <img
                    src={heroCraftBeerImg}
                    alt="Proefglas donker speciaalbier op een houten kroegtafel"
                    className="w-full h-full object-cover photo-analog"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/20 to-transparent" />

                  {/* Documentary archive stamp in top corner */}
                  <div className="absolute top-3 left-3 rounded-lg bg-zinc-950/90 border border-zinc-700 px-2.5 py-1 font-mono text-[11px] text-zinc-300">
                    ARCHIEFBEELD · STAMTAFEL #04
                  </div>
                </div>

                <div className="pt-3 pb-1 px-1 flex items-center justify-between text-[11px] font-mono text-zinc-400">
                  <span>FIG. 1 — PROEFNOTITIE AAN DE BAR</span>
                  <span className="tabular-nums">10.0% ABV · 12°C</span>
                </div>
              </div>

              {/* Overlapping Tactile Tasting Index Card */}
              <div className="mt-4 sm:-mt-16 sm:-ml-8 relative z-10 bg-zinc-900 border border-amber-600/60 rounded-2xl p-5 stamp-border max-w-md">
                <div className="flex items-baseline justify-between border-b border-zinc-800 pb-2.5 mb-3">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-amber-500">
                    LAATSTE NOTITIE · NR. 042
                  </span>
                  <span className="font-mono text-lg font-bold text-amber-400 tabular-nums">
                    9.4 / 10
                  </span>
                </div>
                <h2 className="font-display text-xl font-bold text-zinc-100">
                  St. Bernardus Abt 12
                </h2>
                <p className="text-xs font-mono text-zinc-400 mt-0.5">
                  Quadrupel · 10.0% ABV · Van de tap · Café In de Wildeman
                </p>
                <p className="text-sm text-zinc-300 mt-3 italic leading-relaxed border-l-2 border-amber-600 pl-3">
                  &ldquo;Volle mout, gedroogde vijg en donkere kandij. Geschonken in eigen kelkglas
                  op kelderkoeling.&rdquo;
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
          INTERACTIVE PROEFLOKAAL WORKBENCH
          Visitors can test the actual logbook, kroegentocht & glassware live
         =================================================================== */}
      <section id="proeflokaal" className="py-16 sm:py-24 border-b border-zinc-800/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Asymmetric Editorial Header */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end mb-10">
            <div className="lg:col-span-7">
              <div className="font-mono text-xs uppercase tracking-widest text-amber-500 mb-2">
                01 / Probeer het hier direct uit
              </div>
              <h2 className="font-display text-3xl sm:text-5xl font-bold text-zinc-100 tracking-tight">
                Geen plaatjes van schermen, maar een werkend proefblad.
              </h2>
            </div>
            <div className="lg:col-span-5 text-sm text-zinc-400 leading-relaxed">
              Klik hieronder door een echt voorbeeld van het logboek. Schrijf een proefnotitie bij,
              vink een kroeg af op een kroegentocht door Utrecht of Maastricht, of bekijk de
              glazenkast.
            </div>
          </div>

          {/* Interactive Ledger Container */}
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl overflow-hidden stamp-border">
            {/* Workbench Folder Tabs */}
            <div className="border-b border-zinc-800 bg-zinc-950/70 px-4 sm:px-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 py-2.5">
                <button
                  type="button"
                  onClick={() => setActiveWorkbench('logboek')}
                  className={`px-4 py-2 text-xs font-mono uppercase tracking-wider rounded-xl transition-colors cursor-pointer ${
                    activeWorkbench === 'logboek'
                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 border border-transparent'
                  }`}
                >
                  I. Bierlogboek ({demoBeers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveWorkbench('kroegentocht')}
                  className={`px-4 py-2 text-xs font-mono uppercase tracking-wider rounded-xl transition-colors cursor-pointer ${
                    activeWorkbench === 'kroegentocht'
                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 border border-transparent'
                  }`}
                >
                  II. Kroegentocht Route
                </button>
                <button
                  type="button"
                  onClick={() => setActiveWorkbench('glazenkast')}
                  className={`px-4 py-2 text-xs font-mono uppercase tracking-wider rounded-xl transition-colors cursor-pointer ${
                    activeWorkbench === 'glazenkast'
                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 border border-transparent'
                  }`}
                >
                  III. De Glazenkast
                </button>
                <button
                  type="button"
                  onClick={() => setActiveWorkbench('stamtafel')}
                  className={`px-4 py-2 text-xs font-mono uppercase tracking-wider rounded-xl transition-colors cursor-pointer ${
                    activeWorkbench === 'stamtafel'
                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 border border-transparent'
                  }`}
                >
                  IV. Vrienden &amp; Alleen-lezen
                </button>
              </div>

              <div className="hidden sm:flex items-center gap-3 text-xs font-mono text-zinc-500 py-2">
                <span>INTERACTIEF PROEFMODEL</span>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => {
                    setDemoBeers(INITIAL_DEMO_BEERS);
                    setSelectedBeerId(INITIAL_DEMO_BEERS[0].id);
                  }}
                  className="inline-flex items-center gap-1 text-zinc-400 hover:text-amber-400 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </button>
              </div>
            </div>

            {/* WORKBENCH PANEL 1: BIERLOGBOEK */}
            {activeWorkbench === 'logboek' && (
              <div className="p-5 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left 7 columns: Ledger list + search + quick add */}
                <div className="lg:col-span-7 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800">
                    <div>
                      <h3 className="font-display text-xl font-bold text-zinc-100">
                        Geproefde Bieren Register
                      </h3>
                      <p className="text-xs text-zinc-400">
                        Klik op een regel om de volledige kaart te bekijken of voeg er zelf een toe.
                      </p>
                    </div>
                    <div className="relative w-full sm:w-56">
                      <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Zoek op bier, stijl of kroeg..."
                        className="w-full pl-8 pr-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  {justAddedToast && (
                    <div className="p-3 bg-amber-600/15 border border-amber-500/40 rounded-xl text-xs text-amber-300 font-mono">
                      ✓ {justAddedToast}
                    </div>
                  )}

                  {/* Beer Index Rows */}
                  <div className="divide-y divide-zinc-800 border border-zinc-800 bg-zinc-950/60 rounded-2xl overflow-hidden">
                    {filteredDemoBeers.map((beer) => {
                      const isSelected = beer.id === activeBeer.id;
                      return (
                        <button
                          key={beer.id}
                          type="button"
                          onClick={() => setSelectedBeerId(beer.id)}
                          className={`w-full text-left p-4 transition-colors flex items-start justify-between gap-4 cursor-pointer ${
                            isSelected
                              ? 'bg-amber-600/10 border-l-4 border-l-amber-500'
                              : 'hover:bg-zinc-900/80'
                          }`}
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="font-mono text-[11px] text-zinc-500 flex items-center gap-2">
                              <span>{beer.indexNo}</span>
                              <span>·</span>
                              <span>{beer.date}</span>
                              {beer.favorite && (
                                <>
                                  <span>·</span>
                                  <span className="text-amber-400">★ Favoriet</span>
                                </>
                              )}
                            </div>
                            <div className="font-display text-lg font-bold text-zinc-100 truncate">
                              {beer.name}
                            </div>
                            <div className="text-xs text-zinc-400 font-mono">
                              {beer.style} · {beer.abv.toFixed(1)}% ABV · {beer.serving} · {beer.location}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="font-mono text-xl font-bold text-amber-400 tabular-nums">
                              {beer.score.toFixed(1)}
                            </div>
                            <div className="font-mono text-[10px] uppercase text-zinc-500">
                              Rapportcijfer
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Quick-write a beer entry into the demo logbook */}
                  <form
                    onSubmit={handleAddDemoBeer}
                    className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs uppercase tracking-wider text-amber-500">
                        + Test het zelf: schrijf een biertje bij op dit proefblad
                      </span>
                      <span className="font-mono text-[11px] text-zinc-500">
                        Locatie vooringevuld vanuit kroegentocht
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                      <input
                        type="text"
                        value={newBeerName}
                        onChange={(e) => setNewBeerName(e.target.value)}
                        placeholder="Naam van het bier (bijv. Westmalle Tripel)"
                        className="sm:col-span-5 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                      />
                      <select
                        value={newBeerStyle}
                        onChange={(e) => setNewBeerStyle(e.target.value)}
                        className="sm:col-span-3 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                      >
                        <option value="Tripel">Tripel</option>
                        <option value="Quadrupel">Quadrupel</option>
                        <option value="Blond">Blond</option>
                        <option value="Stout">Imperial Stout</option>
                        <option value="IPA">IPA</option>
                        <option value="Bock">Herfstbock</option>
                      </select>
                      <div className="sm:col-span-2 flex items-center gap-1.5 px-2.5 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-mono text-amber-400">
                        <span>Cijfer:</span>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          step="0.1"
                          value={newBeerScore}
                          onChange={(e) => setNewBeerScore(Number(e.target.value))}
                          className="w-12 bg-transparent text-zinc-100 font-bold focus:outline-none tabular-nums"
                        />
                      </div>
                      <button
                        type="submit"
                        className="sm:col-span-2 px-3 py-2 bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-colors"
                      >
                        Noteer
                      </button>
                    </div>
                  </form>
                </div>

                {/* Right 5 columns: Detailed Index Card for Selected Beer */}
                <div className="lg:col-span-5">
                  <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 space-y-5 h-full flex flex-col justify-between">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                        <span className="font-mono text-xs text-zinc-400">
                          STAMKAART · {activeBeer.indexNo}
                        </span>
                        <span className="font-mono text-xs text-amber-400">
                          {activeBeer.serving}
                        </span>
                      </div>

                      <div className="aspect-[16/10] overflow-hidden border border-zinc-800 bg-zinc-900 rounded-xl relative">
                        <img
                          src={activeBeer.photoUrl}
                          alt={activeBeer.name}
                          className="w-full h-full object-cover photo-analog"
                        />
                        <div className="absolute bottom-2 right-2 bg-zinc-950/90 border border-zinc-700 rounded-lg px-2.5 py-1 font-mono text-sm font-bold text-amber-400 tabular-nums">
                          {activeBeer.score.toFixed(1)} / 10
                        </div>
                      </div>

                      <div>
                        <h4 className="font-display text-2xl font-bold text-zinc-100">
                          {activeBeer.name}
                        </h4>
                        <p className="text-xs font-mono text-zinc-400 mt-1">
                          {activeBeer.brewery}
                        </p>
                      </div>

                      {/* Unboxed Metadata Line */}
                      <div className="py-2.5 border-y border-zinc-800 font-mono text-xs text-zinc-300 tabular-nums">
                        {activeBeer.style} · {activeBeer.abv.toFixed(1)}% ABV · {activeBeer.location}
                      </div>

                      <div>
                        <div className="font-mono text-[11px] uppercase tracking-wider text-zinc-500 mb-1">
                          Proefnotitie van de avond
                        </div>
                        <p className="text-sm text-zinc-300 leading-relaxed italic">
                          &ldquo;{activeBeer.note}&rdquo;
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
                      <span className="text-xs text-zinc-500">
                        In je eigen account kun je onbeperkt foto&apos;s en proefmomenten toevoegen.
                      </span>
                      <button
                        type="button"
                        onClick={handleRegisterClick}
                        className="text-xs font-bold text-amber-500 hover:text-amber-400 whitespace-nowrap ml-3 cursor-pointer"
                      >
                        Eigen lijst starten →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* WORKBENCH PANEL 2: KROEGENTOCHT PLANNER */}
            {activeWorkbench === 'kroegentocht' && (
              <div className="p-5 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-5 space-y-5">
                  <div className="font-mono text-xs uppercase tracking-wider text-amber-500">
                    Kroegentocht Generator &amp; Eigen Route
                  </div>
                  <h3 className="font-display text-2xl sm:text-3xl font-bold text-zinc-100">
                    Vul een stad of dorp in en loop langs echte karakterkroegen.
                  </h3>
                  <p className="text-sm text-zinc-300 leading-relaxed">
                    Geen zin om op een drukke vrijdagavond op straat te zoeken waar je een goed glas
                    kunt drinken? Kies een plaatsnaam voor een kant-en-klare route, of stel je eigen
                    kroegentocht samen en deel hem met je vrienden.
                  </p>

                  {/* City Switcher */}
                  <div className="space-y-2">
                    <label className="block font-mono text-xs uppercase text-zinc-400">
                      Kies een voorbeeldstad:
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['Utrecht', 'Maastricht', 'Groningen'] as const).map((city) => (
                        <button
                          key={city}
                          type="button"
                          onClick={() => setSelectedCity(city)}
                          className={`py-2.5 px-3 text-xs font-mono uppercase tracking-wider border rounded-xl text-center cursor-pointer transition-colors ${
                            selectedCity === city
                              ? 'bg-amber-600 text-zinc-950 border-amber-500 font-bold'
                              : 'bg-zinc-950 text-zinc-300 border-zinc-800 hover:border-zinc-700'
                          }`}
                        >
                          {city}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-2 text-xs text-zinc-400">
                    <div className="font-mono text-amber-400 uppercase">
                      Slimme koppeling tijdens het lopen
                    </div>
                    <p className="leading-relaxed">
                      Ben je gestart met een kroegentocht? Zodra je een nieuw biertje aanmeldt,
                      staan de kroegen van je route al voor je klaar met één tik. Je hoeft dus nooit
                      zelf het adres of de kroegnaam in te typen aan de bar.
                    </p>
                  </div>
                </div>

                <div className="lg:col-span-7">
                  <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 space-y-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-zinc-800 pb-3">
                      <div>
                        <h4 className="font-display text-xl font-bold text-zinc-100">
                          {DEMO_CITY_CRAWLS[selectedCity].title}
                        </h4>
                        <p className="font-mono text-xs text-zinc-400 mt-0.5">
                          {DEMO_CITY_CRAWLS[selectedCity].subtitle}
                        </p>
                      </div>
                      <span className="font-mono text-xs text-amber-500">
                        Klik op een stop om af te vinken
                      </span>
                    </div>

                    <div className="space-y-3">
                      {(customStops[selectedCity] || []).map((stop) => (
                        <div
                          key={stop.order}
                          className={`p-4 border rounded-xl transition-colors ${
                            stop.checkedIn
                              ? 'bg-amber-600/10 border-amber-600/50'
                              : 'bg-zinc-900/60 border-zinc-800'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3.5">
                              <button
                                type="button"
                                onClick={() =>
                                  toggleStopCheckIn(selectedCity, stop.order, stop.pubName)
                                }
                                className={`w-7 h-7 shrink-0 font-mono text-xs font-bold flex items-center justify-center border rounded-lg cursor-pointer transition-colors ${
                                  stop.checkedIn
                                    ? 'bg-amber-500 text-zinc-950 border-amber-400'
                                    : 'bg-zinc-950 text-zinc-400 border-zinc-700 hover:border-amber-500'
                                }`}
                              >
                                {stop.checkedIn ? <Check className="w-4 h-4" /> : stop.order}
                              </button>
                              <div>
                                <div className="font-display text-base font-bold text-zinc-100">
                                  {stop.pubName}
                                </div>
                                <div className="font-mono text-xs text-zinc-400 mt-0.5">
                                  {stop.address} · Aanrader: {stop.recommendedBeer}
                                </div>
                                <p className="text-xs text-zinc-300 mt-1.5">{stop.specialty}</p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setNewBeerLocation(`${stop.pubName}, ${selectedCity}`);
                                setActiveWorkbench('logboek');
                              }}
                              className="shrink-0 px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-lg font-mono text-[11px] text-amber-400 cursor-pointer"
                            >
                              + Bier hier loggen
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* WORKBENCH PANEL 3: GLAZENKAST */}
            {activeWorkbench === 'glazenkast' && (
              <div className="p-5 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-5 space-y-4">
                  <div className="font-mono text-xs uppercase tracking-wider text-amber-500">
                    Vitrine &amp; Voorraad
                  </div>
                  <h3 className="font-display text-2xl sm:text-3xl font-bold text-zinc-100">
                    Elk speciaalbier hoort in zijn eigen glas.
                  </h3>
                  <p className="text-sm text-zinc-300 leading-relaxed">
                    Verzamel je brouwerijglazen? Houd in je persoonlijke glazenkast bij welke kelken,
                    bokalen en tulpglazen je thuis op de plank hebt staan, inclusief eigen foto&apos;s
                    en aantallen.
                  </p>
                </div>

                <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {demoGlasses.map((glass) => (
                    <div
                      key={glass.id}
                      className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between space-y-4"
                    >
                      <div>
                        <div className="font-mono text-[11px] text-zinc-500 uppercase">
                          {glass.type}
                        </div>
                        <div className="font-display text-base font-bold text-zinc-100 mt-1">
                          {glass.name}
                        </div>
                        <div className="font-mono text-xs text-zinc-400 mt-0.5">
                          {glass.brewery}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
                        <span className="font-mono text-xs text-zinc-400">Aantal in kast:</span>
                        <div className="flex items-center gap-2 font-mono">
                          <button
                            type="button"
                            onClick={() =>
                              setDemoGlasses((prev) =>
                                prev.map((g) =>
                                  g.id === glass.id ? { ...g, count: Math.max(0, g.count - 1) } : g
                                )
                              )
                            }
                            className="w-6 h-6 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-300 hover:border-amber-500 cursor-pointer"
                          >
                            -
                          </button>
                          <span className="text-sm font-bold text-amber-400 w-5 text-center tabular-nums">
                            {glass.count}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setDemoGlasses((prev) =>
                                prev.map((g) =>
                                  g.id === glass.id ? { ...g, count: g.count + 1 } : g
                                )
                              )
                            }
                            className="w-6 h-6 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-300 hover:border-amber-500 cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* WORKBENCH PANEL 4: STAMTAFEL & VRIENDEN */}
            {activeWorkbench === 'stamtafel' && (
              <div className="p-5 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-6 space-y-4">
                  <div className="font-mono text-xs uppercase tracking-wider text-amber-500">
                    Koppelen via QR of Uitnodigingslink
                  </div>
                  <h3 className="font-display text-2xl sm:text-3xl font-bold text-zinc-100">
                    Geen openbaar sociaal netwerk. Alleen jouw eigen stamtafel.
                  </h3>
                  <p className="text-sm text-zinc-300 leading-relaxed">
                    Je kunt bij ons niemand zomaar op e-mailadres toevoegen. Je wordt pas vrienden
                    als je aan tafel elkaars persoonlijke QR-code scant of een uitnodigingslink
                    deelt. Beiden krijgen direct een bevestiging zodra jullie gekoppeld zijn.
                  </p>
                  <p className="text-xs font-mono text-zinc-400 border-l-2 border-amber-500 pl-3">
                    Kijk je in de bierlijst van een vriend? Dan staat het logboek automatisch in een
                    rustige <strong className="text-zinc-200">alleen-lezen weergave</strong> zonder
                    bewerkknoppen.
                  </p>
                </div>

                <div className="lg:col-span-6 bg-zinc-950 border border-zinc-800 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                    <div className="flex items-center gap-2.5">
                      <QrCode className="w-5 h-5 text-amber-500" />
                      <span className="font-display text-base font-bold text-zinc-100">
                        Voorbeeld Vrienden-koppeling
                      </span>
                    </div>
                    <span className="font-mono text-[11px] text-emerald-400">
                      ✓ Bevestigd aan beide kanten
                    </span>
                  </div>

                  <div className="p-3.5 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-zinc-100">Jeroen van der Berg</div>
                      <div className="font-mono text-xs text-zinc-400">
                        68 bieren geproefd · Topfavoriet: Rochefort 10 (9.6)
                      </div>
                    </div>
                    <span className="font-mono text-xs text-amber-400">Alleen-lezen modus</span>
                  </div>

                  <div className="p-3.5 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-zinc-100">Sanne de Vries</div>
                      <div className="font-mono text-xs text-zinc-400">
                        44 bieren geproefd · Topfavoriet: Karmeliet Tripel (9.2)
                      </div>
                    </div>
                    <span className="font-mono text-xs text-amber-400">Alleen-lezen modus</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ===================================================================
          ASYMMETRIC EDITORIAL CHAPTERS (Replaces cliché 3-column check cards)
         =================================================================== */}
      <section id="kroegentocht" className="py-16 sm:py-24 border-b border-zinc-800/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-24">
          {/* Chapter 02: Kroegentocht & Locatie Snelkeuze (Asymmetric 5 / 7 split) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-5 space-y-5">
              <div className="font-mono text-xs uppercase tracking-widest text-amber-500">
                02 / Op pad door stad of dorp
              </div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-zinc-100 leading-tight">
                Stippel een kroegentocht uit en log je bieren zonder getyp aan de bar.
              </h2>
              <p className="text-base text-zinc-300 leading-relaxed">
                Vul een willekeurige stad of dorp in en Cervisium stelt een wandelroute samen langs
                goede biercafés en lokale brouwerijen. Liever zelf de kroegen kiezen? Bouw je eigen
                route, sla hem op voor later en deel hem met één link met je vriendengroep.
              </p>
              <div className="pt-2 space-y-2 font-mono text-xs text-zinc-400 border-t border-zinc-800">
                <div>— Route op maat per stad of dorp met specialiteiten per café</div>
                <div>— Directe Google Maps wandelroute van kroeg naar kroeg</div>
                <div>— Snelknoppen bij het bier aanmelden zodra je tocht gestart is</div>
              </div>
            </div>

            <div className="lg:col-span-7 bg-zinc-900 border border-zinc-800 p-6 sm:p-8 stamp-border space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-zinc-800">
                <div>
                  <span className="font-mono text-[11px] uppercase tracking-wider text-amber-500">
                    ACTIEVE ROUTE ONDERWEG
                  </span>
                  <h3 className="font-display text-2xl font-bold text-zinc-100">
                    Hoe de locatie-snelkeuze werkt tijdens je tocht
                  </h3>
                </div>
                <Compass className="w-6 h-6 text-amber-500" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2">
                  <div className="font-mono text-xs text-amber-400">STAP 1 · START DE TOCHT</div>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    Je drukt op &ldquo;Start Kroegentocht&rdquo;. Bovenin je scherm verschijnt een
                    compacte routebalk met je huidige stop, bijvoorbeeld{' '}
                    <strong className="text-zinc-100">Stop 2/4: Kafé België</strong>.
                  </p>
                </div>
                <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2">
                  <div className="font-mono text-xs text-amber-400">STAP 2 · ÉÉN TIK BIJ AANMELDEN</div>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    Bestel je een biertje? In het aanmeldscherm staan alle kroegen uit je route al
                    als snelknop klaar. Eén tik en de kroegnaam + plaatsnaam staan ingevuld.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Chapter 03: Glazenkast & Stamtafel (Asymmetric 7 / 5 split with documentary photos) */}
          <div id="glazenkast" className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start pt-12 border-t border-zinc-800">
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 stamp-border">
                <div className="aspect-[4/3] overflow-hidden rounded-xl bg-zinc-950">
                  <img
                    src={featureGlasswareImg}
                    alt="Collectie speciaalbierglazen op een houten plank"
                    className="w-full h-full object-cover photo-analog"
                  />
                </div>
                <div className="pt-3 px-1">
                  <div className="font-mono text-[11px] text-amber-500 uppercase">
                    DE GLAZENKAST
                  </div>
                  <h3 className="font-display text-lg font-bold text-zinc-100 mt-0.5">
                    Weet precies welke glazen je thuis hebt staan.
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    Van gegraveerde Duvel-glazen tot zeldzame trappistenkelken: fotografeer je eigen
                    glazen en houd bij waar een kroeg een glas-actie heeft.
                  </p>
                </div>
              </div>

              <div id="stamtafel" className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 stamp-border sm:mt-10">
                <div className="aspect-[4/3] overflow-hidden rounded-xl bg-zinc-950">
                  <img
                    src={featureFriendsImg}
                    alt="Vrienden proosten met speciaalbier aan een houten tafel"
                    className="w-full h-full object-cover photo-analog"
                  />
                </div>
                <div className="pt-3 px-1">
                  <div className="font-mono text-[11px] text-amber-500 uppercase">
                    AAN DE STAMTAFEL
                  </div>
                  <h3 className="font-display text-lg font-bold text-zinc-100 mt-0.5">
                    Samen proeven en eerlijk vergelijken.
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    Scan elkaars QR-code op een bieravond. Bekijk de toplijst van je maten zonder
                    dat iemand per ongeluk iets in jouw lijst kan aanpassen.
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 space-y-6 lg:pt-6">
              <div className="font-mono text-xs uppercase tracking-widest text-amber-500">
                03 / Waarom wij dit zo gebouwd hebben
              </div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-zinc-100 leading-tight">
                Gemaakt voor liefhebbers, niet voor dataverkopers.
              </h2>
              <p className="text-base text-zinc-300 leading-relaxed">
                De meeste bier-apps zitten vol met drukke badges, reclames en ongevraagde meldingen.
                Cervisium houdt het bewust rustig en overzichtelijk:
              </p>

              <dl className="space-y-4 border-t border-zinc-800 pt-4 text-sm">
                <div className="border-b border-zinc-800 pb-4">
                  <dt className="font-display font-bold text-zinc-100">
                    Eigen categorieën &amp; stijlen
                  </dt>
                  <dd className="text-zinc-400 text-xs mt-1 leading-relaxed">
                    Deel je bieren in zoals jij dat wilt: op stijl (Tripel, Quadrupel, Bock, IPA)
                    of maak je eigen lijsten voor bijvoorbeeld je vakantie of bieravond.
                  </dd>
                </div>
                <div className="border-b border-zinc-800 pb-4">
                  <dt className="font-display font-bold text-zinc-100">
                    Meerdere proefmomenten per bier
                  </dt>
                  <dd className="text-zinc-400 text-xs mt-1 leading-relaxed">
                    Smaakt een bier van de tap in Antwerpen anders dan uit fles thuis op de bank?
                    Voeg per bier meerdere proeverijen toe; je gemiddelde cijfer rekent zichzelf uit.
                  </dd>
                </div>
                <div>
                  <dt className="font-display font-bold text-zinc-100">
                    Bierteller voor op het terras
                  </dt>
                  <dd className="text-zinc-400 text-xs mt-1 leading-relaxed">
                    Houd tijdens een avond met één knop de rekening en de rondjes bij, inclusief een
                    nuchtere indicatie wanneer je weer veilig naar huis kunt.
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
          CLOSING EDITORIAL CALL TO ACTION
         =================================================================== */}
      <section className="py-16 sm:py-24 bg-zinc-900/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-8 sm:p-12 stamp-border grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-3">
              <div className="font-mono text-xs uppercase tracking-widest text-amber-500">
                Klaar voor het volgende glas?
              </div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-zinc-100">
                Leg je eerste proefnotitie vast in minder dan een halve minuut.
              </h2>
              <p className="text-sm text-zinc-300 leading-relaxed max-w-xl">
                Maak gratis je eigen logboek aan of log in om verder te gaan waar je gebleven was.
                Werkt direct op je telefoon aan de bar én thuis op je computer.
              </p>
            </div>

            <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-3">
              <button
                type="button"
                onClick={handleRegisterClick}
                className="w-full py-3.5 px-5 bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold text-xs uppercase tracking-wider text-center rounded-xl cursor-pointer stamp-border"
              >
                Nieuw logboek openen
              </button>
              <button
                type="button"
                onClick={handleLoginClick}
                className="w-full py-3.5 px-5 bg-zinc-950 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 font-semibold text-xs uppercase tracking-wider text-center rounded-xl cursor-pointer"
              >
                Inloggen op bestaand account
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
          FOOTER (No decorative pulsing dots, clean colophon)
         =================================================================== */}
      <footer className="border-t border-zinc-800 bg-zinc-950 py-8 text-xs text-zinc-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span translate="no" data-no-translate="true" className="notranslate text-zinc-300 font-bold">
              CERVISIUM
            </span>{' '}
            · PERSOONLIJK BIERLOGBOEK &amp; KROEGENTOCHT PLANNER
          </div>
          <div className="tabular-nums">
            UITGAVE v{appVersion}{versionDate ? ` · ${versionDate}` : ''} · ALLE RECHTEN VOORBEHOUDEN
          </div>
        </div>
      </footer>
    </div>
  );
};
