import React, { useState, useEffect } from 'react';
import { Gift, Calculator, Sparkles, ArrowRight, Compass, Play } from 'lucide-react';
import { GlassDealsFinderView } from './GlassDealsFinderView';
import { BeerCounterView } from './BeerCounterView';
import { PubCrawlView } from './PubCrawlView';
import {
  ActivePubCrawlState,
  FriendUser,
  PubCrawl,
  PubGlassDeal,
  Tasting,
  UserAccount,
  UserSettings,
} from '../types';

interface ExtrasHubViewProps {
  activeUser: UserAccount;
  deals: PubGlassDeal[];
  onAddDeal?: (deal: PubGlassDeal) => void;
  onUpdateDeals: (deals: PubGlassDeal[]) => void;
  onDeleteDeal: (dealId: string) => void;
  initialTool?: 'overview' | 'pubcrawl' | 'deals' | 'counter';
  settings?: UserSettings;
  savedPubCrawls: PubCrawl[];
  activePubCrawl: ActivePubCrawlState | null;
  friends: FriendUser[];
  tastings: Tasting[];
  onSavePubCrawl: (crawl: PubCrawl) => void;
  onDeletePubCrawl: (crawlId: string) => void;
  onStartPubCrawl: (crawl: PubCrawl) => void;
  onUpdateActivePubCrawl: (next: ActivePubCrawlState | null) => void;
  onQuickAddBeerAtLocation: (locationName: string) => void;
}

export const ExtrasHubView: React.FC<ExtrasHubViewProps> = ({
  activeUser,
  deals = [],
  onAddDeal,
  onUpdateDeals,
  onDeleteDeal,
  initialTool = 'overview',
  settings,
  savedPubCrawls,
  activePubCrawl,
  friends,
  tastings,
  onSavePubCrawl,
  onDeletePubCrawl,
  onStartPubCrawl,
  onUpdateActivePubCrawl,
  onQuickAddBeerAtLocation,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'pubcrawl' | 'deals' | 'counter'>(
    initialTool === 'deals'
      ? 'deals'
      : initialTool === 'counter'
      ? 'counter'
      : 'pubcrawl'
  );

  useEffect(() => {
    if (initialTool === 'deals') {
      setActiveSubTab('deals');
    } else if (initialTool === 'counter') {
      setActiveSubTab('counter');
    } else if (initialTool === 'pubcrawl') {
      setActiveSubTab('pubcrawl');
    }
  }, [initialTool]);

  return (
    <div className="space-y-6">
      {/* Header & Overzicht van Extra's */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-stone-900 via-stone-900 to-amber-950/35 border border-stone-800 p-5 sm:p-7 shadow-xl">
        <div className="relative z-10 flex flex-col gap-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                Kroegentocht, Acties &amp; Tools
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Cervisium Extra&apos;s
              </h2>
              <p className="text-stone-400 text-xs sm:text-sm mt-1 max-w-2xl">
                Plan een kroegentocht op stad of dorp, deel routes met je vrienden, bekijk actuele bieracties en houd je avond bij met de Bier Counter.
              </p>
            </div>
          </div>

          {/* 3 Overzichtelijke Keuze-tegels */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* Tegel 1: Kroegentocht Planner */}
            <button
              type="button"
              onClick={() => setActiveSubTab('pubcrawl')}
              className={`group text-left p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                activeSubTab === 'pubcrawl'
                  ? 'bg-amber-500/15 border-amber-500/60 shadow-lg shadow-amber-500/10'
                  : 'bg-stone-950/60 border-stone-800/90 hover:bg-stone-800/60 hover:border-stone-700'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    activeSubTab === 'pubcrawl'
                      ? 'bg-amber-500 text-stone-950 shadow-md'
                      : 'bg-stone-800 text-amber-400 group-hover:bg-stone-700'
                  }`}
                >
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm sm:text-base font-bold text-white">
                      Kroegentocht Planner
                    </h3>
                    {activePubCrawl ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500 text-stone-950 flex items-center gap-1">
                        <Play className="w-2.5 h-2.5 fill-current" /> Actief
                      </span>
                    ) : (
                      activeSubTab === 'pubcrawl' && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500 text-stone-950">
                          Geopend
                        </span>
                      )
                    )}
                  </div>
                  <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                    Vul een stad of dorp in voor een leuke kroegentocht, maak je eigen route, sla op en deel met vrienden.
                  </p>
                </div>
              </div>
              <ArrowRight
                className={`w-4 h-4 shrink-0 mt-1 transition-transform ${
                  activeSubTab === 'pubcrawl'
                    ? 'text-amber-400 translate-x-0.5'
                    : 'text-stone-600 group-hover:text-stone-400'
                }`}
              />
            </button>

            {/* Tegel 2: Bier & Kroeg Acties */}
            <button
              type="button"
              onClick={() => setActiveSubTab('deals')}
              className={`group text-left p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                activeSubTab === 'deals'
                  ? 'bg-amber-500/15 border-amber-500/60 shadow-lg shadow-amber-500/10'
                  : 'bg-stone-950/60 border-stone-800/90 hover:bg-stone-800/60 hover:border-stone-700'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    activeSubTab === 'deals'
                      ? 'bg-amber-500 text-stone-950 shadow-md'
                      : 'bg-stone-800 text-amber-400 group-hover:bg-stone-700'
                  }`}
                >
                  <Gift className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-bold text-white">
                      Bier &amp; Kroeg Acties
                    </h3>
                    {activeSubTab === 'deals' && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500 text-stone-950">
                        Geopend
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                    Interactieve kaart van Nederland met gratis bierglas-acties, proefplankjes en kroegdeals.
                  </p>
                </div>
              </div>
              <ArrowRight
                className={`w-4 h-4 shrink-0 mt-1 transition-transform ${
                  activeSubTab === 'deals'
                    ? 'text-amber-400 translate-x-0.5'
                    : 'text-stone-600 group-hover:text-stone-400'
                }`}
              />
            </button>

            {/* Tegel 3: Bier Counter & Rondjes Teller */}
            <button
              type="button"
              onClick={() => setActiveSubTab('counter')}
              className={`group text-left p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                activeSubTab === 'counter'
                  ? 'bg-amber-500/15 border-amber-500/60 shadow-lg shadow-amber-500/10'
                  : 'bg-stone-950/60 border-stone-800/90 hover:bg-stone-800/60 hover:border-stone-700'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    activeSubTab === 'counter'
                      ? 'bg-amber-500 text-stone-950 shadow-md'
                      : 'bg-stone-800 text-amber-400 group-hover:bg-stone-700'
                  }`}
                >
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-bold text-white">
                      Bier Counter &amp; Rondjes
                    </h3>
                    {activeSubTab === 'counter' && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500 text-stone-950">
                        Geopend
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                    Houd tijdens het stappen je glazen, kosten en geschatte afbraaktijd bij en sla sessies op.
                  </p>
                </div>
              </div>
              <ArrowRight
                className={`w-4 h-4 shrink-0 mt-1 transition-transform ${
                  activeSubTab === 'counter'
                    ? 'text-amber-400 translate-x-0.5'
                    : 'text-stone-600 group-hover:text-stone-400'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Actieve Sub-weergave */}
      <div className="pt-1">
        {activeSubTab === 'pubcrawl' ? (
          <PubCrawlView
            userName={activeUser.name}
            savedPubCrawls={savedPubCrawls}
            activePubCrawl={activePubCrawl}
            friends={friends}
            pubDeals={deals}
            tastings={tastings}
            onSavePubCrawl={onSavePubCrawl}
            onDeletePubCrawl={onDeletePubCrawl}
            onStartPubCrawl={onStartPubCrawl}
            onUpdateActivePubCrawl={onUpdateActivePubCrawl}
            onQuickAddBeerAtLocation={onQuickAddBeerAtLocation}
          />
        ) : activeSubTab === 'deals' ? (
          <GlassDealsFinderView
            deals={deals}
            onAddDeal={onAddDeal}
            onUpdateDeals={onUpdateDeals}
            onDeleteDeal={onDeleteDeal}
            showDealScanner={settings?.showDealScanner ?? true}
          />
        ) : (
          <BeerCounterView
            activeUser={activeUser}
            defaultPricePerBeer={settings?.defaultBeerPrice}
            defaultGlassSizeCl={settings?.defaultGlassSizeCl}
          />
        )}
      </div>
    </div>
  );
};
