import React, { useState } from 'react';
import { APP_VERSION, getFormattedVersionDate } from '../version';
import { RatingBadge } from './RatingBadge';
import {
  ArrowRight,
  LogIn,
  UserPlus,
  Camera,
  QrCode,
  SlidersHorizontal,
  ShieldCheck,
  MapPin,
  Wine,
  Heart,
  PlusCircle,
  Calendar,
  Building2,
  Clock,
  Beer as BeerIcon,
  Users,
  Copy,
  Check,
  Eye,
  Plus,
  Minus,
  Gift,
  Droplets,
} from 'lucide-react';

import heroBeerImg from '../assets/images/hero_craft_beer_tasting_1794225257636.jpg';
import glasswareImg from '../assets/images/feature_glassware_collection_1794225258349.jpg';
import friendsFlightImg from '../assets/images/feature_friends_tasting_1794225260196.jpg';

interface LandingPageProps {
  onOpenLogin: (initialMode?: 'login' | 'register') => void;
  hasPendingInvite?: boolean;
}

interface SampleBeerEntry {
  id: string;
  name: string;
  brewery: string;
  style: string;
  styleColor: string;
  abv: number;
  favorite: boolean;
  photoUrl: string;
  avgScore: number;
  sessions: {
    id: string;
    date: string;
    location: string;
    servingType: 'tap' | 'fles' | 'blik';
    score: number;
    notes: string;
  }[];
}

const SAMPLE_BEERS: SampleBeerEntry[] = [
  {
    id: 'st-bernardus-12',
    name: 'St. Bernardus Abt 12',
    brewery: 'Brouwerij St. Bernardus',
    style: 'Quadrupel',
    styleColor: '#f59e0b',
    abv: 10.0,
    favorite: true,
    photoUrl: heroBeerImg,
    avgScore: 9.4,
    sessions: [
      {
        id: 's1',
        date: '14 okt 2026',
        location: 'Café Gollem, Amsterdam',
        servingType: 'tap',
        score: 9.6,
        notes: 'Diepe tonen van gedroogde vijgen, karamelmout en een zachte, verwarmende afdronk.',
      },
      {
        id: 's2',
        date: '22 aug 2026',
        location: 'Thuis op het terras',
        servingType: 'fles',
        score: 9.2,
        notes: 'Rijk donker fruit en kruidige gisttonen, iets koeler geschonken.',
      },
    ],
  },
  {
    id: 'karmeliet-tripel',
    name: 'Tripel Karmeliet',
    brewery: 'Brouwerij Bosteels',
    style: 'Tripel',
    styleColor: '#eab308',
    abv: 8.4,
    favorite: true,
    photoUrl: glasswareImg,
    avgScore: 8.9,
    sessions: [
      {
        id: 's3',
        date: '03 nov 2026',
        location: 'Proeflokaal Arendsnest',
        servingType: 'tap',
        score: 9.0,
        notes: 'Romige schuimkraag door gerst, tarwe en haver. Frisse toets van sinaasappelschil en vanille.',
      },
      {
        id: 's4',
        date: '19 jul 2026',
        location: 'Stadsstrand Utrecht',
        servingType: 'fles',
        score: 8.8,
        notes: 'Verfrissend kruidig en volmondig, perfecte balans tussen zoet en bitter.',
      },
    ],
  },
  {
    id: 'moersleutel-motor-oil',
    name: 'Motor Oil Imperial Stout',
    brewery: 'De Moersleutel',
    style: 'Imperial Stout',
    styleColor: '#a855f7',
    abv: 12.0,
    favorite: false,
    photoUrl: friendsFlightImg,
    avgScore: 9.2,
    sessions: [
      {
        id: 's5',
        date: '29 okt 2026',
        location: 'Biercafé Olivier',
        servingType: 'blik',
        score: 9.2,
        notes: 'Stroperige body met krachtige espresso, pure chocolade en geroosterde mout.',
      },
    ],
  },
  {
    id: 'uiltje-juicy-lucy',
    name: 'Juicy Lucy NEIPA',
    brewery: 'Het Uiltje Brewing Co.',
    style: 'NEIPA',
    styleColor: '#10b981',
    abv: 6.5,
    favorite: false,
    photoUrl: friendsFlightImg,
    avgScore: 8.6,
    sessions: [
      {
        id: 's6',
        date: '11 sep 2026',
        location: 'Taproom Haarlem',
        servingType: 'tap',
        score: 8.6,
        notes: 'Troebel goudgeel met uitgesproken aroma van mango, passievrucht en zachte hopbitterheid.',
      },
    ],
  },
];

interface SampleGlassItem {
  id: string;
  name: string;
  brand: string;
  glassType: string;
  volumeCl: number;
  quantity: number;
  favorite: boolean;
  notes: string;
}

const INITIAL_SAMPLE_GLASSES: SampleGlassItem[] = [
  {
    id: 'g1',
    name: 'St. Bernardus Kelk met Gouden Rand',
    brand: 'St. Bernardus',
    glassType: 'Kelk / Bokaal',
    volumeCl: 33,
    quantity: 4,
    favorite: true,
    notes: 'Originele abdijkelk met gegraveerde stermotieven in de bodem voor constante schuimvorming.',
  },
  {
    id: 'g2',
    name: 'Tripel Karmeliet Lelie-Bokaal',
    brand: 'Bosteels',
    glassType: 'Kelk / Bokaal',
    volumeCl: 33,
    quantity: 2,
    favorite: true,
    notes: 'Sierlijk bol glas ontworpen door Antoine Bosteels met Franse lelie in reliëf.',
  },
  {
    id: 'g3',
    name: 'Saison Proefglas',
    brand: 'Dupont',
    glassType: 'Tulpglas',
    volumeCl: 25,
    quantity: 3,
    favorite: false,
    notes: 'Taps toelopend tulpglas dat kruidige gist- en hoparoma’s vasthoudt.',
  },
];

type PreviewModuleTab = 'bierlijst' | 'glazenkast' | 'vrienden' | 'bierteller';

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenLogin,
  hasPendingInvite = false,
}) => {
  const [activePreviewModule, setActivePreviewModule] = useState<PreviewModuleTab>('bierlijst');
  const [selectedStyleFilter, setSelectedStyleFilter] = useState<string>('Alle stijlen');
  const [selectedSampleId, setSelectedSampleId] = useState<string>(SAMPLE_BEERS[0].id);
  const [sampleFavorites, setSampleFavorites] = useState<Record<string, boolean>>({
    'st-bernardus-12': true,
    'karmeliet-tripel': true,
  });

  // Interactieve staat voor het Glazenkast-voorbeeld
  const [sampleGlasses, setSampleGlasses] = useState<SampleGlassItem[]>(INITIAL_SAMPLE_GLASSES);

  // Interactieve staat voor het Vrienden-voorbeeld
  const [copiedDemoLink, setCopiedDemoLink] = useState(false);
  const [viewingDemoFriend, setViewingDemoFriend] = useState<string | null>('Thomas de Vries');

  // Interactieve staat voor de Avond Bierteller
  const [demoBeersDrunk, setDemoBeersDrunk] = useState<number>(3);
  const [demoWaterGlasses, setDemoWaterGlasses] = useState<number>(1);

  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [glassImgFailed, setGlassImgFailed] = useState(false);
  const [friendsImgFailed, setFriendsImgFailed] = useState(false);

  const styleOptions = ['Alle stijlen', 'Quadrupel', 'Tripel', 'Imperial Stout', 'NEIPA'];

  const filteredSamples =
    selectedStyleFilter === 'Alle stijlen'
      ? SAMPLE_BEERS
      : SAMPLE_BEERS.filter((b) => b.style === selectedStyleFilter);

  const activeSample =
    filteredSamples.find((b) => b.id === selectedSampleId) ||
    filteredSamples[0] ||
    SAMPLE_BEERS[0];

  const handleAdjustGlassQty = (id: string, delta: number) => {
    setSampleGlasses((prev) =>
      prev.map((g) => (g.id === id ? { ...g, quantity: Math.max(0, g.quantity + delta) } : g))
    );
  };

  const versionDate = getFormattedVersionDate();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-amber-500 selection:text-zinc-950">
      {/* Top Bar Contract: Strictly 1 row, 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single text element wordmark */}
          <a
            href="#top"
            translate="no"
            data-no-translate="true"
            className="notranslate text-xl font-bold tracking-tight text-zinc-100 whitespace-nowrap shrink-0 font-['Playfair_Display',serif]"
          >
            Cervisium
          </a>

          {/* Zone 2: 4 concise single-line text navigation links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-zinc-400">
            <a
              href="#app-onderdelen"
              className="hover:text-zinc-100 hover:underline underline-offset-8 decoration-amber-500/80 transition-colors whitespace-nowrap shrink-0"
            >
              App Voorbeelden
            </a>
            <a
              href="#wat-is-cervisium"
              className="hover:text-zinc-100 hover:underline underline-offset-8 decoration-amber-500/80 transition-colors whitespace-nowrap shrink-0"
            >
              Mogelijkheden
            </a>
            <a
              href="#glazen-en-tools"
              className="hover:text-zinc-100 hover:underline underline-offset-8 decoration-amber-500/80 transition-colors whitespace-nowrap shrink-0"
            >
              Glazenkast &amp; Tools
            </a>
            <a
              href="#vrienden-en-privacy"
              className="hover:text-zinc-100 hover:underline underline-offset-8 decoration-amber-500/80 transition-colors whitespace-nowrap shrink-0"
            >
              Vrienden &amp; Privacy
            </a>
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => onOpenLogin('login')}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-zinc-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Inloggen
            </button>
          </div>
        </div>
      </header>

      <main id="top" className="flex-1">
        {/* Pending Friend Invite Banner if user clicked an invite link */}
        {hasPendingInvite && (
          <div className="border-b border-amber-500/30 bg-amber-500/10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs sm:text-sm text-amber-200">
              <span>
                Je hebt een vriendschapsuitnodiging geopend. Log in of maak een gratis account aan om elkaars biercollectie te bekijken.
              </span>
              <button
                type="button"
                onClick={() => onOpenLogin('login')}
                className="text-amber-400 hover:text-amber-300 font-semibold underline underline-offset-4 whitespace-nowrap shrink-0 text-left sm:text-right cursor-pointer"
              >
                Nu accepteren &rarr;
              </button>
            </div>
          </div>
        )}

        {/* Section 1: Hero Proposition */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-16 pb-12 sm:pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch gap-8 lg:gap-12">
            {/* Left Column: Editorial Value Proposition */}
            <div className="lg:col-span-6 flex flex-col justify-between space-y-8 py-2">
              <div className="space-y-5">
                <p className="text-xs sm:text-sm font-medium text-amber-400 tracking-wide">
                  Persoonlijk Speciaalbier Archief &middot; Proefnotities &middot; Glazenkast
                </p>

                <h1
                  className="font-['Playfair_Display',serif] font-bold text-zinc-100 tracking-tight leading-[1.12]"
                  style={{
                    fontSize: 'clamp(2.25rem, 4vw, 3.65rem)',
                    textWrap: 'balance',
                  }}
                >
                  Bewaar elk bijzonder bier dat je proeft, inclusief waar en met wie.
                </h1>

                <p className="text-base sm:text-lg text-zinc-300 leading-relaxed max-w-xl">
                  Cervisium is jouw persoonlijke digitale proefboek. Leg gedronken bieren vast met een eigen foto, geef een cijfer van 1 tot 10, noteer het café of terras waar je zat en bouw een overzichtelijke lijst op die je nooit meer kwijtraakt.
                </p>
              </div>

              <div className="space-y-5 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <button
                    type="button"
                    onClick={() => onOpenLogin('register')}
                    className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-lg shadow-amber-500/15"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Start je eigen bierlijst</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenLogin('login')}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl border border-zinc-800 hover:border-zinc-700 bg-zinc-900/60 hover:bg-zinc-900 text-zinc-200 font-semibold text-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <LogIn className="w-4 h-4 text-amber-400" />
                    <span>Ik heb al een account</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400">
                  <span>Inloggen met e-mail of Google</span>
                  <span aria-hidden="true">&middot;</span>
                  <span>Werkt op telefoon &amp; desktop</span>
                  <span aria-hidden="true">&middot;</span>
                  <span>Eigen JSON-backup &amp; import</span>
                </div>
              </div>
            </div>

            {/* Right Column: High-Impact Editorial Photography with Real Record Overlay */}
            <div className="lg:col-span-6 flex">
              <div className="relative w-full min-h-[320px] sm:min-h-[420px] lg:h-full rounded-2xl overflow-hidden border border-zinc-800/90 bg-zinc-900 flex flex-col justify-end">
                {!heroImgFailed ? (
                  <img
                    src={heroBeerImg}
                    alt="Belgisch speciaalbier in tulpglas naast een leren proefnotitieboek op een eikenhouten bar"
                    referrerPolicy="no-referrer"
                    onError={() => setHeroImgFailed(true)}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-950 to-amber-950/30 flex items-center justify-center">
                    <Wine className="w-16 h-16 text-amber-500/30" />
                  </div>
                )}

                {/* Measured contrast scrim */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent" />

                {/* Authentic unboxed logbook caption */}
                <div className="relative z-10 p-6 sm:p-8 space-y-2">
                  <div className="flex items-center justify-between gap-4 text-xs text-amber-300/90 font-medium">
                    <span>Voorbeeld uit het proeflogboek</span>
                    <span className="font-mono tabular-nums text-zinc-200">
                      Gemiddelde score: 9.4 / 10 (Uitmuntend)
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                    St. Bernardus Abt 12
                  </h2>
                  <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                    Brouwerij St. Bernardus &middot; Quadrupel &middot; 10.0% ABV &middot; Van het vat bij Café Gollem
                  </p>
                  <p className="text-xs text-zinc-400 italic pt-1">
                    &ldquo;Volle moutbody met gedroogde vijgen, donkere kandij en een lange, zachte afdronk.&rdquo;
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Full-width 4-column specification bar below the hero split */}
          <div className="mt-12 pt-8 border-t border-zinc-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            <div className="space-y-1.5">
              <div className="text-2xl font-bold text-zinc-100 font-mono tabular-nums">
                1.0 &ndash; 10.0
              </div>
              <div className="text-sm font-semibold text-zinc-200">
                Meerdere proefsessies per bier
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Drink je hetzelfde bier later nog eens van het vat of uit blik? Voeg een nieuwe sessie toe en zie direct je actuele gemiddelde.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="text-2xl font-bold text-zinc-100 font-mono tabular-nums">
                &le; 80 KB
              </div>
              <div className="text-sm font-semibold text-zinc-200">
                Directe camera &amp; fotocompressie
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Maak op je telefoon direct een foto van je bier of glas. Foto&apos;s tot 100 MB worden automatisch scherp verkleind en kadrering pas je zelf aan.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="text-2xl font-bold text-zinc-100 font-mono tabular-nums">
                QR &amp; Link
              </div>
              <div className="text-sm font-semibold text-zinc-200">
                Vrienden uitnodigen aan tafel
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Laat vrienden jouw persoonlijke QR-code scannen om elkaars bierlijst, top-scores en proefnotities te bekijken.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="text-2xl font-bold text-zinc-100 font-mono tabular-nums">
                100% Privé
              </div>
              <div className="text-sm font-semibold text-zinc-200">
                Strikte alleen-lezen bescherming
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Jouw collectie is gekoppeld aan jouw eigen account. Vrienden kunnen jouw lijst bewonderen, maar nooit iets wijzigen of wissen.
              </p>
            </div>
          </div>
        </section>

        {/* Section 2: ECHTE VISUELE VOORBEELDEN VAN DE APP-ONDERDELEN */}
        <section id="app-onderdelen" className="py-16 sm:py-20 border-t border-zinc-800/80 bg-zinc-900/25">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <p className="text-xs font-medium text-amber-400 tracking-wide">
                  Echte weergave van de applicatie
                </p>
                <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100 tracking-tight font-['Playfair_Display',serif]">
                  Probeer de onderdelen van Cervisium hier direct uit
                </h2>
                <p className="text-sm text-zinc-400">
                  Wissel tussen de 4 hoofdonderdelen om te zien hoe jouw echte bierkaarten, proefgeschiedenis, glazenkast, vrienden-QR en avondteller werken.
                </p>
              </div>

              {/* Module Switcher Tabs (echte knoppen uit de app-navigatie) */}
              <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-zinc-900 border border-zinc-800 rounded-xl self-start">
                <button
                  type="button"
                  onClick={() => setActivePreviewModule('bierlijst')}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    activePreviewModule === 'bierlijst'
                      ? 'bg-amber-500 text-zinc-950'
                      : 'text-zinc-400 hover:text-zinc-100'
                  }`}
                >
                  <BeerIcon className="w-3.5 h-3.5" />
                  <span>1. Bierlijst &amp; Proefkaart</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActivePreviewModule('glazenkast')}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    activePreviewModule === 'glazenkast'
                      ? 'bg-amber-500 text-zinc-950'
                      : 'text-zinc-400 hover:text-zinc-100'
                  }`}
                >
                  <Wine className="w-3.5 h-3.5" />
                  <span>2. Bierglazenkast</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActivePreviewModule('vrienden')}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    activePreviewModule === 'vrienden'
                      ? 'bg-amber-500 text-zinc-950'
                      : 'text-zinc-400 hover:text-zinc-100'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>3. Vrienden &amp; QR-Scanner</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActivePreviewModule('bierteller')}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    activePreviewModule === 'bierteller'
                      ? 'bg-amber-500 text-zinc-950'
                      : 'text-zinc-400 hover:text-zinc-100'
                  }`}
                >
                  <Gift className="w-3.5 h-3.5" />
                  <span>4. Bierteller &amp; Acties</span>
                </button>
              </div>
            </div>

            {/* MODULE 1: ECHTE BIERKAARTEN & PROEFGESCHIEDENIS WEERGAVE */}
            {activePreviewModule === 'bierlijst' && (
              <div className="space-y-6">
                {/* Filterbalk per stijl */}
                <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-zinc-800/80">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {styleOptions.map((style) => {
                      const isActive = selectedStyleFilter === style;
                      return (
                        <button
                          key={style}
                          type="button"
                          onClick={() => {
                            setSelectedStyleFilter(style);
                            const nextList =
                              style === 'Alle stijlen'
                                ? SAMPLE_BEERS
                                : SAMPLE_BEERS.filter((b) => b.style === style);
                            if (nextList.length > 0) {
                              setSelectedSampleId(nextList[0].id);
                            }
                          }}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            isActive
                              ? 'bg-zinc-800 text-amber-400 border border-amber-500/40'
                              : 'text-zinc-400 hover:text-zinc-200 bg-zinc-900/60 border border-zinc-800/80'
                          }`}
                        >
                          {style}
                        </button>
                      );
                    })}
                  </div>
                  <span className="text-xs text-zinc-400">
                    Klik op een bierkaart links om rechts het volledige proefvenster te bekijken
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Links: Echte BeerCard weergaves uit de app */}
                  <div className="lg:col-span-5 space-y-4">
                    {filteredSamples.map((beer, idx) => {
                      const isSelected = activeSample.id === beer.id;
                      const lastSession = beer.sessions[0];
                      const isFav = sampleFavorites[beer.id] ?? beer.favorite;
                      return (
                        <div
                          key={beer.id}
                          onClick={() => setSelectedSampleId(beer.id)}
                          className={`group relative bg-zinc-900/90 border rounded-2xl p-5 transition-all cursor-pointer ${
                            isSelected
                              ? 'border-amber-500/80 ring-1 ring-amber-500/30'
                              : 'border-zinc-800 hover:border-zinc-700'
                          }`}
                        >
                          {/* Top Row: Rank, Stijl, ABV & Favoriet-hartje */}
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2 text-xs text-zinc-300">
                              <span className="font-mono tabular-nums font-bold text-amber-400">
                                #{idx + 1}
                              </span>
                              <span aria-hidden="true">&middot;</span>
                              <span className="font-semibold" style={{ color: beer.styleColor }}>
                                {beer.style}
                              </span>
                              <span aria-hidden="true">&middot;</span>
                              <span className="font-mono tabular-nums text-zinc-400">
                                {beer.abv.toFixed(1)}% ABV
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSampleFavorites((prev) => ({
                                  ...prev,
                                  [beer.id]: !isFav,
                                }));
                              }}
                              aria-label="Favoriet wisselen"
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition-colors cursor-pointer"
                            >
                              <Heart
                                className={`w-4 h-4 ${
                                  isFav ? 'text-rose-500 fill-rose-500' : 'text-zinc-500'
                                }`}
                              />
                            </button>
                          </div>

                          {/* Middle Row: Biernaam, Brouwerij, Locatie & Foto */}
                          <div className="flex items-start justify-between gap-3.5 mb-3">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-lg text-zinc-100 group-hover:text-amber-300 transition-colors truncate">
                                {beer.name}
                              </h3>
                              <p className="text-sm text-zinc-400 mb-2 truncate font-medium">
                                {beer.brewery}
                              </p>
                              <div className="flex items-center gap-2 flex-wrap text-xs text-zinc-400">
                                <span>
                                  {beer.sessions.length === 1
                                    ? '1x gedronken'
                                    : `${beer.sessions.length}x gedronken`}
                                </span>
                                <span aria-hidden="true">&middot;</span>
                                <span className="text-amber-300">
                                  {lastSession.servingType === 'tap'
                                    ? 'Van de tap'
                                    : lastSession.servingType === 'fles'
                                    ? 'Fles'
                                    : 'Blik'}
                                </span>
                                <span aria-hidden="true">&middot;</span>
                                <span className="inline-flex items-center gap-1 text-zinc-300 truncate max-w-[160px]">
                                  <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                                  <span className="truncate">{lastSession.location}</span>
                                </span>
                              </div>
                            </div>

                            <div className="w-16 h-16 rounded-xl overflow-hidden border border-zinc-700/80 shrink-0 bg-zinc-950">
                              <img
                                src={beer.photoUrl}
                                alt={beer.name}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </div>

                          {/* Proefnotitie */}
                          <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed mb-4 italic bg-zinc-950/50 p-2.5 rounded-lg border border-zinc-800/60">
                            &ldquo;{lastSession.notes}&rdquo;
                          </p>

                          {/* Bottom Row: Echte RatingBadge + Inchecken knop */}
                          <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                            <RatingBadge rating={beer.avgScore} size="md" showLabel />
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-bold">
                                <PlusCircle className="w-3.5 h-3.5" />
                                <span>Inchecken</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Rechts: Het echte BeerDetailModal venster uit de app */}
                  <div className="lg:col-span-7 bg-zinc-900 border border-zinc-700/80 rounded-2xl p-6 sm:p-7 text-zinc-100 space-y-6">
                    <div className="flex items-center justify-between pb-4 border-b border-zinc-800 text-xs text-zinc-400">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold" style={{ color: activeSample.styleColor }}>
                          {activeSample.style}
                        </span>
                        <span aria-hidden="true">&middot;</span>
                        <span className="font-mono tabular-nums text-zinc-300">
                          {activeSample.abv.toFixed(1)}% ABV
                        </span>
                      </div>
                      <span>Voorbeeld: Detailvenster in de app</span>
                    </div>

                    {/* Hero title & RatingBadge lg */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border border-zinc-700 shrink-0 bg-zinc-950">
                          <img
                            src={activeSample.photoUrl}
                            alt={activeSample.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <h3 className="text-2xl sm:text-3xl font-extrabold text-zinc-100 tracking-tight">
                            {activeSample.name}
                          </h3>
                          <div className="flex items-center gap-2 text-zinc-400 mt-1.5 text-sm font-medium">
                            <Building2 className="w-4 h-4 text-amber-500" />
                            <span>{activeSample.brewery}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-zinc-500 mt-1">
                            <Clock className="w-3.5 h-3.5 text-zinc-600" />
                            <span>
                              {activeSample.sessions.length === 1
                                ? '1x gedronken'
                                : `${activeSample.sessions.length}x gedronken`}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 flex flex-col items-start sm:items-center">
                        <RatingBadge rating={activeSample.avgScore} size="lg" showLabel />
                        <span className="text-[10px] text-zinc-400 mt-1 font-medium">
                          Gemiddelde score
                        </span>
                      </div>
                    </div>

                    {/* De "Nog een keer gedronken?" knop uit BeerDetailModal */}
                    <div>
                      <button
                        type="button"
                        onClick={() => onOpenLogin('register')}
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-sm shadow-lg shadow-amber-500/15 transition-colors cursor-pointer"
                      >
                        <PlusCircle className="w-4 h-4 stroke-[2.5]" />
                        <span>Nog een keer gedronken? Opnieuw ranken &amp; locatie toevoegen</span>
                      </button>
                    </div>

                    {/* Proefgeschiedenis & Locaties lijst */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-amber-400" />
                          Proefgeschiedenis &amp; Locaties ({activeSample.sessions.length})
                        </h4>
                        <span className="text-[11px] text-zinc-500">Nieuwste eerst</span>
                      </div>

                      <div className="space-y-2.5">
                        {activeSample.sessions.map((session) => (
                          <div
                            key={session.id}
                            className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 space-y-1.5"
                          >
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2 flex-wrap text-xs">
                                <RatingBadge rating={session.score} size="sm" />
                                <span className="text-zinc-300 font-medium">
                                  {session.servingType === 'tap'
                                    ? 'Van de tap'
                                    : session.servingType === 'fles'
                                    ? 'Fles'
                                    : 'Blik'}
                                </span>
                                <span aria-hidden="true" className="text-zinc-600">&middot;</span>
                                <span className="inline-flex items-center gap-1 text-amber-300 font-medium">
                                  <MapPin className="w-3 h-3 text-amber-400" />
                                  {session.location}
                                </span>
                              </div>
                              <span className="text-[11px] font-mono tabular-nums text-zinc-500">
                                {session.date}
                              </span>
                            </div>

                            <p className="text-xs text-zinc-300 italic pt-1 border-t border-zinc-800/60 leading-relaxed">
                              &ldquo;{session.notes}&rdquo;
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* MODULE 2: ECHTE BIERGLAZENKAST WEERGAVE */}
            {activePreviewModule === 'glazenkast' && (
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-800">
                  <div>
                    <h3 className="text-xl font-bold text-zinc-100">
                      Mijn Bierglazen Collectie
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Houd bij welke glazen je thuis hebt staan en pas direct het aantal stuks aan met de + en &minus; knoppen.
                    </p>
                  </div>

                  <div className="flex items-center gap-6 text-sm">
                    <div>
                      <span className="text-zinc-400">Totaal in kast: </span>
                      <strong className="font-mono tabular-nums text-amber-400">
                        {sampleGlasses.reduce((acc, g) => acc + g.quantity, 0)} glazen
                      </strong>
                    </div>
                    <div>
                      <span className="text-zinc-400">Unieke modellen: </span>
                      <strong className="font-mono tabular-nums text-zinc-100">
                        {sampleGlasses.length}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {sampleGlasses.map((glass) => (
                    <div
                      key={glass.id}
                      className="bg-zinc-950/80 border border-zinc-800/90 rounded-2xl p-5 flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs text-zinc-400">
                          <span className="text-amber-400 font-medium">{glass.glassType}</span>
                          <span className="font-mono tabular-nums">{glass.volumeCl} cl</span>
                        </div>

                        <div>
                          <h4 className="font-bold text-base text-zinc-100">{glass.name}</h4>
                          <p className="text-xs text-zinc-400 font-medium">{glass.brand}</p>
                        </div>

                        <p className="text-xs text-zinc-400 italic leading-relaxed">
                          &ldquo;{glass.notes}&rdquo;
                        </p>
                      </div>

                      <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between">
                        <span className="text-xs text-zinc-400">Aantal in bezit:</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleAdjustGlassQty(glass.id, -1)}
                            className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-700 hover:border-amber-500 flex items-center justify-center text-zinc-200 cursor-pointer"
                            aria-label="Minder"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-7 text-center font-mono tabular-nums font-bold text-sm text-amber-400">
                            {glass.quantity}x
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAdjustGlassQty(glass.id, 1)}
                            className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-700 hover:border-amber-500 flex items-center justify-center text-zinc-200 cursor-pointer"
                            aria-label="Meer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* MODULE 3: ECHTE VRIENDEN, QR-CODE & ALLEEN-LEZEN WEERGAVE */}
            {activePreviewModule === 'vrienden' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Links: Uitnodigingslink & QR-Scanner kaart */}
                <div className="lg:col-span-5 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 space-y-5">
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                      <QrCode className="w-5 h-5 text-amber-400" />
                      <span>Vrienden Uitnodigen via Link of QR</span>
                    </h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Deel jouw persoonlijke link (via jouw eigen domein) of laat een vriend direct jouw QR-code scannen met de ingebouwde camera-scanner.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-2">
                    <code className="text-xs font-mono text-amber-300 truncate">
                      https://cervisium.nl/?invite=usr_voorbeeld
                    </code>
                    <button
                      type="button"
                      onClick={() => {
                        setCopiedDemoLink(true);
                        setTimeout(() => setCopiedDemoLink(false), 2500);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shrink-0 cursor-pointer"
                    >
                      {copiedDemoLink ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Gekopieerd</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Kopieer</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800 text-center space-y-1">
                      <QrCode className="w-6 h-6 text-amber-400 mx-auto" />
                      <div className="text-xs font-bold text-zinc-200">Mijn QR-Code</div>
                      <div className="text-[11px] text-zinc-500">Laat vriend scannen</div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800 text-center space-y-1">
                      <Camera className="w-6 h-6 text-emerald-400 mx-auto" />
                      <div className="text-xs font-bold text-zinc-200">Scan QR-Code</div>
                      <div className="text-[11px] text-zinc-500">Direct met je camera</div>
                    </div>
                  </div>
                </div>

                {/* Rechts: Gekoppelde Vrienden + Alleen-Lezen balk voorbeeld */}
                <div className="lg:col-span-7 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 space-y-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-zinc-100">
                      Jouw Biervrienden (2)
                    </h3>
                    <span className="text-xs text-emerald-400 font-medium">
                      100% beveiligd: Alleen-lezen weergave
                    </span>
                  </div>

                  {/* Voorbeeld van de gele "Je bekijkt de biercollectie van..." balk uit App.tsx */}
                  {viewingDemoFriend && (
                    <div className="bg-zinc-950 border border-amber-500/40 text-amber-300 px-4 py-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>
                          Je bekijkt nu de biercollectie van <strong>{viewingDemoFriend}</strong> (Alleen-lezen modus: aanpassen of verwijderen is uitgeschakeld)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setViewingDemoFriend(null)}
                        className="text-amber-400 hover:underline font-bold whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Sluiten
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      {
                        name: 'Thomas de Vries',
                        beers: 48,
                        tastings: 64,
                        glasses: 11,
                        favStyle: 'Quadrupel & Tripel',
                      },
                      {
                        name: 'Sanne Jansen',
                        beers: 31,
                        tastings: 39,
                        glasses: 7,
                        favStyle: 'NEIPA & Saison',
                      },
                    ].map((friend) => (
                      <div
                        key={friend.name}
                        className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/90 flex flex-col justify-between space-y-4"
                      >
                        <div>
                          <div className="font-bold text-sm text-zinc-100">{friend.name}</div>
                          <div className="text-xs text-zinc-400 mt-1 font-mono tabular-nums">
                            {friend.beers} bieren &middot; {friend.tastings} proeverijen &middot; {friend.glasses} glazen
                          </div>
                          <div className="text-[11px] text-zinc-500 mt-1">
                            Favoriete stijlen: {friend.favStyle}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setViewingDemoFriend(friend.name)}
                          className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-zinc-950 border border-amber-500/30 text-xs font-bold transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Bekijk Bierlijst</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* MODULE 4: ECHTE AVOND BIERTELLER & KROEG-ACTIES WEERGAVE */}
            {activePreviewModule === 'bierteller' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Links: Interactieve Bier Counter preview */}
                <div className="lg:col-span-6 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-zinc-100">
                        Avond Bierteller &amp; Water-Tracker
                      </h3>
                      <p className="text-xs text-zinc-400">
                        Houd tijdens een avond op het terras je consumpties, kosten en glazen water bij.
                      </p>
                    </div>
                    <span className="font-mono tabular-nums text-lg font-bold text-amber-400">
                      &euro; {(demoBeersDrunk * 5.5).toFixed(2).replace('.', ',')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
                      <div className="flex items-center justify-between text-xs text-zinc-400">
                        <span>Gedronken bieren</span>
                        <BeerIcon className="w-4 h-4 text-amber-400" />
                      </div>
                      <div className="text-3xl font-extrabold font-mono tabular-nums text-zinc-100">
                        {demoBeersDrunk}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setDemoBeersDrunk((c) => Math.max(0, c - 1))}
                          className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-200 cursor-pointer"
                        >
                          &minus;1
                        </button>
                        <button
                          type="button"
                          onClick={() => setDemoBeersDrunk((c) => c + 1)}
                          className="flex-1 py-1.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold cursor-pointer"
                        >
                          +1 Bier
                        </button>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
                      <div className="flex items-center justify-between text-xs text-zinc-400">
                        <span>Glazen water</span>
                        <Droplets className="w-4 h-4 text-sky-400" />
                      </div>
                      <div className="text-3xl font-extrabold font-mono tabular-nums text-sky-400">
                        {demoWaterGlasses}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setDemoWaterGlasses((w) => Math.max(0, w - 1))}
                          className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-200 cursor-pointer"
                        >
                          &minus;1
                        </button>
                        <button
                          type="button"
                          onClick={() => setDemoWaterGlasses((w) => w + 1)}
                          className="flex-1 py-1.5 px-3 rounded-lg bg-sky-500 hover:bg-sky-400 text-zinc-950 text-xs font-bold cursor-pointer"
                        >
                          +1 Water
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Rechts: Landelijke Bier & Glas-Acties Finder preview */}
                <div className="lg:col-span-6 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 space-y-4 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-emerald-400 font-medium">
                      <span>Onderdeel: Bier &amp; Kroeg Acties NL</span>
                      <span>Geverifieerde acties</span>
                    </div>
                    <h3 className="text-lg font-bold text-zinc-100">
                      Ontdek waar je een gratis speciaalbierglas of proefplank-actie krijgt
                    </h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      In de ingebouwde actie-finder zie je lopende promoties van brouwerijen en biercafés door heel Nederland, of voeg je zelf een gespotte actie toe.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1.5">
                    <div className="text-xs font-bold text-emerald-400">
                      Voorbeeld Actie &middot; La Chouffe &amp; Duvel
                    </div>
                    <div className="text-sm font-bold text-zinc-100">
                      Gratis origineel tulpglas bij bestelling van 2 speciaalbieren van het vat
                    </div>
                    <div className="text-xs text-zinc-400">
                      Deelnemende speciaalbiercafés &middot; Inclusief directe link naar de actievoorwaarden
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Section 3: Core Capabilities (Asymmetric Bento Grid with Editorial Numbering & Photography) */}
        <section
          id="wat-is-cervisium"
          className="border-t border-zinc-800/80 bg-zinc-950 py-16 sm:py-20"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="max-w-2xl space-y-3">
              <p className="text-xs font-medium text-amber-400 tracking-wide">
                Overzicht van alle functies
              </p>
              <h2
                className="text-2xl sm:text-4xl font-bold text-zinc-100 tracking-tight font-['Playfair_Display',serif]"
                style={{ textWrap: 'balance' }}
              >
                Ontworpen voor de proever die meer wil onthouden dan alleen een naam.
              </h2>
              <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
                Geen rommelige tijdlijnen of reclames, maar een gestructureerd persoonlijk naslagwerk voor je bieren, proeflocaties, bierglazen en avondjes in het café.
              </p>
            </div>

            {/* Asymmetric Bento Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* 01. Marquee capability (col-span-7) */}
              <div className="lg:col-span-7 rounded-2xl border border-zinc-800/90 bg-zinc-900/70 p-6 sm:p-8 flex flex-col justify-between space-y-6">
                <div className="space-y-3">
                  <span className="text-xs font-mono tabular-nums text-amber-400 font-semibold">
                    01. Proeflogboek &amp; Herhaalproeverijen
                  </span>
                  <h3 className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight">
                    Leg elk bier vast met foto, schenkwijze, locatie en proefnotities
                  </h3>
                  <p className="text-sm text-zinc-300 leading-relaxed">
                    Voeg binnen enkele seconden een nieuw bier toe. Noteer de brouwerij, het alcoholpercentage (ABV), de stijl en hoe je het bier dronk: van het vat, uit fles of uit blik. Drink je hetzelfde bier maanden later opnieuw op een ander terras? Met de functie <em>&ldquo;Nog een keer gedronken&rdquo;</em> voeg je een nieuwe datum, locatie en score toe zonder dubbele bieren in je lijst.
                  </p>
                </div>

                <div className="pt-4 border-t border-zinc-800/80 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-zinc-300">
                  <div>
                    <div className="font-semibold text-zinc-100">Schenkwijze &amp; Plek</div>
                    <div className="text-zinc-400 mt-0.5">Tap &middot; Fles &middot; Blik &middot; Café of thuis</div>
                  </div>
                  <div>
                    <div className="font-semibold text-zinc-100">Slimme Duplicaatcheck</div>
                    <div className="text-zinc-400 mt-0.5">Herkent bieren die al in je lijst staan</div>
                  </div>
                  <div>
                    <div className="font-semibold text-zinc-100">Interactieve Fotokadrering</div>
                    <div className="text-zinc-400 mt-0.5">Verschuif en zoom elke bierfoto op maat</div>
                  </div>
                </div>
              </div>

              {/* 02. Secondary capability (col-span-5) */}
              <div className="lg:col-span-5 rounded-2xl border border-zinc-800/90 bg-zinc-900/70 p-6 sm:p-8 flex flex-col justify-between space-y-6">
                <div className="space-y-3">
                  <span className="text-xs font-mono tabular-nums text-amber-400 font-semibold">
                    02. Eigen Bierstijlen &amp; Persoonlijke Top 10
                  </span>
                  <h3 className="text-xl font-bold text-zinc-100 tracking-tight">
                    Jouw eigen categorieën, kleuren en ranglijsten
                  </h3>
                  <p className="text-sm text-zinc-300 leading-relaxed">
                    Bepaal zelf hoe je jouw collectie indeelt. Gebruik de voorgebouwde bierstijlen (zoals Tripel, Quadrupel, Blond, NEIPA, Weizen en Imperial Stout) of maak eigen categorieën met een eigen kleurcode.
                  </p>
                </div>

                <div className="pt-4 border-t border-zinc-800/80 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between text-zinc-300">
                    <span>Top Rankings per categorie</span>
                    <span className="font-mono tabular-nums text-amber-400">Automatisch berekend</span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-300">
                    <span>Filter op favorieten, brouwerij of ABV</span>
                    <span className="font-mono tabular-nums text-zinc-400">Direct zoeken</span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-300">
                    <span>Statistieken op je dashboard</span>
                    <span className="font-mono tabular-nums text-zinc-400">Totaal &amp; gemiddelden</span>
                  </div>
                </div>
              </div>

              {/* 03. Glassware & Extras (col-span-6 with photography) */}
              <div
                id="glazen-en-tools"
                className="lg:col-span-6 rounded-2xl border border-zinc-800/90 bg-zinc-900/70 overflow-hidden flex flex-col justify-between"
              >
                <div className="relative h-56 sm:h-64 w-full bg-zinc-950 overflow-hidden">
                  {!glassImgFailed ? (
                    <img
                      src={glasswareImg}
                      alt="Verzameling van Belgische kelkglazen en tulpglazen op een donkere plank"
                      referrerPolicy="no-referrer"
                      onError={() => setGlassImgFailed(true)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-zinc-900 to-zinc-950 flex items-center justify-center">
                      <Wine className="w-12 h-12 text-amber-500/30" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/20 to-transparent" />
                </div>

                <div className="p-6 sm:p-8 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-2.5">
                    <span className="text-xs font-mono tabular-nums text-amber-400 font-semibold">
                      03. Bierglazenkast &amp; Glas-Deals
                    </span>
                    <h3 className="text-xl font-bold text-zinc-100 tracking-tight">
                      Beheer je thuiscollectie speciaalbierglazen
                    </h3>
                    <p className="text-sm text-zinc-300 leading-relaxed">
                      Houd precies bij welke originele brouwerijglazen je thuis in de kast hebt staan, inclusief aantallen, glastype (kelk, tulpglas, snifter, pul) en eigen foto&apos;s. Daarnaast bekijk je onder Extra&apos;s actuele aanbiedingen en hebbedingetjes voor je thuisbar.
                    </p>
                  </div>
                  <p className="text-xs text-zinc-400 pt-3 border-t border-zinc-800/80">
                    Inclusief avond-bierteller &middot; Water-herinnering &middot; Geschatte promillage- en afbreektijd-calculator
                  </p>
                </div>
              </div>

              {/* 04. Friends & QR Code (col-span-6 with photography) */}
              <div
                id="vrienden-en-privacy"
                className="lg:col-span-6 rounded-2xl border border-zinc-800/90 bg-zinc-900/70 overflow-hidden flex flex-col justify-between"
              >
                <div className="relative h-56 sm:h-64 w-full bg-zinc-950 overflow-hidden">
                  {!friendsImgFailed ? (
                    <img
                      src={friendsFlightImg}
                      alt="Houten proefplank met vier verschillende speciaalbieren in een gezellig biercafé"
                      referrerPolicy="no-referrer"
                      onError={() => setFriendsImgFailed(true)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-zinc-900 to-zinc-950 flex items-center justify-center">
                      <QrCode className="w-12 h-12 text-amber-500/30" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/20 to-transparent" />
                </div>

                <div className="p-6 sm:p-8 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-2.5">
                    <span className="text-xs font-mono tabular-nums text-amber-400 font-semibold">
                      04. Vrienden &amp; QR-Code Scanner
                    </span>
                    <h3 className="text-xl font-bold text-zinc-100 tracking-tight">
                      Wissel bierlijsten uit met vrienden via QR of uitnodigingslink
                    </h3>
                    <p className="text-sm text-zinc-300 leading-relaxed">
                      Zit je samen op het terras en wil je zien welke bieren een vriend een 9+ heeft gegeven? Scan elkaars QR-code direct met je camera of stuur een uitnodigingslink. Zodra jullie vrienden zijn, kun je met één klik door de bierlijst, proefnotities en glazen van je vriend bladeren.
                    </p>
                  </div>
                  <p className="text-xs text-zinc-400 pt-3 border-t border-zinc-800/80">
                    Volledig alleen-lezen voor vrienden &middot; Niemand kan jouw bieren of scores aanpassen
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Concrete Workflow & Privacy Overview */}
        <section className="py-16 sm:py-20 border-t border-zinc-800/80 bg-zinc-900/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="max-w-2xl space-y-2">
              <p className="text-xs font-medium text-amber-400 tracking-wide">
                Zo werkt het in de praktijk
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100 tracking-tight font-['Playfair_Display',serif]">
                Gebouwd voor snelheid op het terras en overzicht thuis
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 text-sm font-bold text-zinc-100">
                  <Camera className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Maak direct een foto met je camera</span>
                </div>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Open Cervisium op je mobiel, kies <em>&ldquo;Maak foto&rdquo;</em> om direct je camera te openen of selecteer een bestaande foto uit je galerij. Zelfs grote 100 MB camerafoto&apos;s worden automatisch geoptimaliseerd tot onder de 80 KB zonder kwaliteitsverlies.
                </p>
              </div>

              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 text-sm font-bold text-zinc-100">
                  <SlidersHorizontal className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Overal gesynchroniseerd &amp; exporteerbaar</span>
                </div>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Je bieren, proefsessies en glazen worden veilig opgeslagen op je persoonlijke account. Daarnaast kun je op elk moment een volledige back-up exporteren of importeren en kiezen tussen het donkere of lichte thema.
                </p>
              </div>

              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 text-sm font-bold text-zinc-100">
                  <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Afgeschermde accounts zonder reclame</span>
                </div>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Jouw lijst is privé. Alleen vrienden die jij zelf via een vriendschapslink of QR-code accepteert, kunnen jouw lijst in alleen-lezen modus bekijken. Niemand anders kan jouw bieren aanpassen of verwijderen.
                </p>
              </div>
            </div>

            {/* Final Conversion Banner */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-8 sm:p-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-2 max-w-xl">
                <h3 className="text-xl sm:text-2xl font-bold text-zinc-100 font-['Playfair_Display',serif]">
                  Klaar om je eerste speciaalbier toe te voegen?
                </h3>
                <p className="text-sm text-zinc-300 leading-relaxed">
                  Log in op je bestaande account of maak direct een nieuw account aan met je e-mailadres of Google.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => onOpenLogin('register')}
                  className="px-6 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Gratis account aanmaken
                </button>
                <button
                  type="button"
                  onClick={() => onOpenLogin('login')}
                  className="px-6 py-3.5 rounded-xl border border-zinc-700 hover:border-zinc-600 bg-zinc-950 text-zinc-200 hover:text-white font-semibold text-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Inloggen op mijn account
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-zinc-800/80 bg-zinc-950 py-8 text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span
              translate="no"
              data-no-translate="true"
              className="notranslate font-bold text-zinc-300 font-['Playfair_Display',serif]"
            >
              Cervisium
            </span>
            <span aria-hidden="true">&middot;</span>
            <span>Persoonlijke craft bier &amp; proefnotities applicatie</span>
            <span aria-hidden="true">&middot;</span>
            <span className="font-mono tabular-nums text-zinc-400">
              v{APP_VERSION}
              {versionDate ? ` (${versionDate})` : ''}
            </span>
          </div>

          <div className="flex items-center gap-6">
            <a href="#app-onderdelen" className="hover:text-zinc-300 transition-colors">
              App Voorbeelden
            </a>
            <a href="#wat-is-cervisium" className="hover:text-zinc-300 transition-colors">
              Mogelijkheden
            </a>
            <button
              type="button"
              onClick={() => onOpenLogin('login')}
              className="text-amber-400 hover:text-amber-300 font-semibold cursor-pointer"
            >
              Inloggen &rarr;
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
