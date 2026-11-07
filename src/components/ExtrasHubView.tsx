import React, { useState } from 'react';
import { UserAccount, PubGlassDeal, UserSettings } from '../types';
import { GlassDealsFinderView } from './GlassDealsFinderView';
import { BeerCounterView } from './BeerCounterView';
import {
  Gift,
  Beer as BeerIcon,
  Sparkles,
  ArrowRight,
  LayoutGrid,
  ChevronLeft,
  MapPin,
  Flame,
  Euro,
  History,
  Tag,
  CheckCircle2,
} from 'lucide-react';

interface ExtrasHubViewProps {
  activeUser: UserAccount;
  deals: PubGlassDeal[];
  onAddDeal: (deal: PubGlassDeal) => void;
  onUpdateDeals: (deals: PubGlassDeal[]) => void;
  onDeleteDeal: (dealId: string) => void;
  initialTool?: 'overview' | 'deals' | 'counter';
  settings?: UserSettings;
}

export const ExtrasHubView: React.FC<ExtrasHubViewProps> = ({
  activeUser,
  deals,
  onAddDeal,
  onUpdateDeals,
  onDeleteDeal,
  initialTool = 'overview',
  settings,
}) => {
  const [selectedTool, setSelectedTool] = useState<'overview' | 'deals' | 'counter'>(initialTool);

  const todayIso = new Date().toISOString().split('T')[0];
  const activeDealsCount = deals.filter(
    (d) => d.hasActiveDeal && (!d.actieEindDatum || d.actieEindDatum >= todayIso)
  ).length;

  return (
    <div className="space-y-6">
      {/* Top Header & Navigation Bar when inside a tool */}
      {selectedTool !== 'overview' && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-zinc-900/90 border border-zinc-800 rounded-2xl backdrop-blur-sm">
          <button
            onClick={() => setSelectedTool('overview')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-300 hover:text-white text-xs font-bold transition-all w-fit group"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <LayoutGrid className="w-3.5 h-3.5 text-amber-400" />
            Terug naar Tegeloverzicht
          </button>

          {/* Quick Segmented Switcher between both tools */}
          <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800/80 w-full sm:w-auto">
            <button
              onClick={() => setSelectedTool('deals')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedTool === 'deals'
                  ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'
              }`}
            >
              <Gift className="w-3.5 h-3.5" />
              Bier &amp; Kroeg Acties
              {activeDealsCount > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    selectedTool === 'deals'
                      ? 'bg-zinc-950 text-emerald-300'
                      : 'bg-emerald-500/20 text-emerald-300'
                  }`}
                >
                  {activeDealsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setSelectedTool('counter')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedTool === 'counter'
                  ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'
              }`}
            >
              <BeerIcon className="w-3.5 h-3.5" />
              Bier Counter
            </button>
          </div>
        </div>
      )}

      {/* OVERVIEW MODE: The Two Rich Tiles ("Tegels") */}
      {selectedTool === 'overview' && (
        <div className="space-y-8 animate-fadeIn">
          {/* Header intro */}
          <div className="text-center max-w-2xl mx-auto space-y-2 pt-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              Extra Tools &amp; Interactieve Functies
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-100 tracking-tight">
              Kies een functie
            </h1>
            <p className="text-sm text-zinc-400">
              Selecteer hieronder welke tool je wilt gebruiken om speciaalbierdeals te ontdekken of je drankjes bij te houden.
            </p>
          </div>

          {/* Interactive Tiles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {/* TEGEL 1: Bier & Kroeg Acties NL */}
            <div
              onClick={() => setSelectedTool('deals')}
              className="group relative bg-gradient-to-b from-zinc-900 to-zinc-900/90 hover:to-zinc-850 rounded-3xl p-6 sm:p-7 border border-emerald-500/30 hover:border-emerald-400 shadow-xl shadow-emerald-500/5 hover:shadow-emerald-500/15 cursor-pointer transition-all duration-200 hover:-translate-y-1 flex flex-col justify-between"
            >
              {/* Background ambient glow */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-emerald-500/15 transition-all" />

              <div className="space-y-5 relative">
                {/* Top Badge & Icon */}
                <div className="flex items-center justify-between">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-zinc-950 shadow-lg shadow-emerald-500/25 group-hover:scale-105 transition-transform">
                    <Gift className="w-7 h-7 stroke-[2.2]" />
                  </div>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    {activeDealsCount} actieve acties
                  </span>
                </div>

                {/* Title & Description */}
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl sm:text-2xl font-black text-zinc-100 group-hover:text-emerald-300 transition-colors">
                      Bier &amp; Kroeg Acties NL
                    </h2>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Deals &amp; Events
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 font-medium mt-1">
                    Gratis bierglazen, proeverijen, 2+1 korting, borrelplanken &amp; tap takeovers
                  </p>
                  <p className="text-sm text-zinc-300 mt-3 leading-relaxed">
                    Ontdek actuele speciaalbier-acties bij kroegen en brouwerijen in alle 12 provincies. Gebruik de <strong>1-Klik Deal Scanner</strong> om direct tientallen nieuwe acties te vinden of filter op afstand in kilometers.
                  </p>
                </div>

                {/* Key feature pills */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className="flex items-center gap-2 text-xs text-zinc-300 bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>1-Klik Deal Scanner</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-300 bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800">
                    <Tag className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>5 Soorten bierdeals</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-300 bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>In de buurt (km GPS)</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-300 bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>12 Provincies &amp; steden</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-6 relative">
                <div className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-emerald-500 group-hover:bg-emerald-400 text-zinc-950 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/30 transition-all">
                  <span>Open Bier &amp; Kroeg Acties</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>

            {/* TEGEL 2: Bier Counter */}
            <div
              onClick={() => setSelectedTool('counter')}
              className="group relative bg-gradient-to-b from-zinc-900 to-zinc-900/90 hover:to-zinc-850 rounded-3xl p-6 sm:p-7 border border-amber-500/30 hover:border-amber-400 shadow-xl shadow-amber-500/5 hover:shadow-amber-500/15 cursor-pointer transition-all duration-200 hover:-translate-y-1 flex flex-col justify-between"
            >
              {/* Background ambient glow */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-amber-500/15 transition-all" />

              <div className="space-y-5 relative">
                {/* Top Badge & Icon */}
                <div className="flex items-center justify-between">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-zinc-950 shadow-lg shadow-amber-500/25 group-hover:scale-105 transition-transform">
                    <BeerIcon className="w-7 h-7 stroke-[2.2]" />
                  </div>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    Live Avond Teller
                  </span>
                </div>

                {/* Title & Description */}
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl sm:text-2xl font-black text-zinc-100 group-hover:text-amber-300 transition-colors">
                      Bier Counter
                    </h2>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      Avond Teller
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 font-medium mt-1">
                    Tel live je drankjes, calorieën en geschatte kosten
                  </p>
                  <p className="text-sm text-zinc-300 mt-3 leading-relaxed">
                    Houd eenvoudig bij hoeveel biertjes je op een stapavond drinkt met grote live knoppen. Bereken direct je volume, calorieën en kosten, en sla voltooide sessies op in je archief.
                  </p>
                </div>

                {/* Key feature pills */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className="flex items-center gap-2 text-xs text-zinc-300 bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800">
                    <BeerIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Live + en - bierknop</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-300 bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800">
                    <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Calorieën &amp; volume</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-300 bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800">
                    <Euro className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Geschatte avondkosten</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-300 bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800">
                    <History className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Sessies &amp; notities opslaan</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-6 relative">
                <div className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-amber-500 group-hover:bg-amber-400 text-zinc-950 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 group-hover:shadow-amber-500/30 transition-all">
                  <span>Open Bier Counter</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SELECTED TOOL: Bier & Kroeg Acties Finder */}
      {selectedTool === 'deals' && (
        <GlassDealsFinderView
          deals={deals}
          onAddDeal={onAddDeal}
          onUpdateDeals={onUpdateDeals}
          onDeleteDeal={onDeleteDeal}
          showDealScanner={settings?.showDealScanner ?? true}
        />
      )}

      {/* SELECTED TOOL: Bier Counter */}
      {selectedTool === 'counter' && (
        <BeerCounterView
          activeUser={activeUser}
          defaultPricePerBeer={settings?.defaultBeerPrice ?? 3.8}
          defaultGlassSizeCl={settings?.defaultGlassSizeCl ?? 30}
        />
      )}
    </div>
  );
};
