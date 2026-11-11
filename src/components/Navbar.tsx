import React from 'react';
import { UserAccount, UserSettings } from '../types';
import {
  Beer as BeerIcon,
  LayoutDashboard,
  Wine,
  Trophy,
  Tag,
  Plus,
  ShieldCheck,
  LogOut,
  CupSoda,
  Sparkles,
  Settings,
  Users,
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

export type NavTab =
  | 'dashboard'
  | 'list'
  | 'top'
  | 'categories'
  | 'glasses'
  | 'extras'
  | 'deals'
  | 'counter'
  | 'friends'
  | 'settings'
  | 'admin';

interface NavbarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  activeUser: UserAccount;
  onAddNewBeer: () => void;
  onLogout: () => void;
  beerCount: number;
  glassCount?: number;
  activeDealCount?: number;
  settings?: UserSettings;
  readOnly?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  activeUser,
  onAddNewBeer,
  onLogout,
  beerCount,
  glassCount = 0,
  activeDealCount = 0,
  settings,
  readOnly = false,
}) => {
  // Standaard is de actie-teller op de Extra's knop UITGESCHAKELD (zoals gevraagd), en via Instellingen aan te zetten
  const showExtrasDealBadge = settings?.showExtrasDealBadge ?? false;
  const showNavCollectionCounts = settings?.showNavCollectionCounts ?? true;
  const showExtrasTab = settings?.showExtrasTab ?? true;

  return (
    <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-2">
          {/* Logo */}
          <div
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-3 cursor-pointer group shrink-0"
          >
            <div className="relative">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center text-zinc-950 shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
                <BeerIcon className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span
                  translate="no"
                  data-no-translate="true"
                  className="notranslate font-extrabold text-lg sm:text-xl tracking-tight text-zinc-100 group-hover:text-amber-400 transition-colors"
                >
                  Cervisium
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 hidden sm:block">
                Persoonlijke Bier Collectie
              </p>
            </div>
          </div>

          {/* Navigation Desktop Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-zinc-900/90 p-1.5 rounded-2xl border border-zinc-800">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </button>

            <button
              onClick={() => setActiveTab('list')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'list'
                  ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
              }`}
            >
              <BeerIcon className="w-4 h-4" />
              Mijn Bieren
              {showNavCollectionCounts && beerCount > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    activeTab === 'list' ? 'bg-zinc-950 text-amber-300' : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {beerCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('top')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'top'
                  ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
              }`}
            >
              <Trophy className="w-4 h-4" />
              Top Bieren
            </button>

            <button
              onClick={() => setActiveTab('categories')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'categories'
                  ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
              }`}
            >
              <Tag className="w-4 h-4" />
              Categorieën
            </button>

            <button
              onClick={() => setActiveTab('glasses')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'glasses'
                  ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
              }`}
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M7 4c-.5 3.5-1 6.5 1.5 9a4.5 4.5 0 0 0 7 0c2.5-2.5 2-5.5 1.5-9H7Z" />
                <path d="M6.7 7.5c1.8 1 3.5-1 5.3 0s3.5 1 5.3 0" />
                <path d="M12 14.8V20" />
                <path d="M8.5 20h7" />
              </svg>
              Bierglazen
              {showNavCollectionCounts && glassCount > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    activeTab === 'glasses' ? 'bg-zinc-950 text-amber-300' : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {glassCount}
                </span>
              )}
            </button>

            {showExtrasTab && (
              <button
                onClick={() => setActiveTab('extras')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'extras' || activeTab === 'deals' || activeTab === 'counter'
                    ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                Extra's
                {showExtrasDealBadge && activeDealCount > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      activeTab === 'extras' || activeTab === 'deals' || activeTab === 'counter'
                        ? 'bg-zinc-950 text-amber-300'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}
                    title={`${activeDealCount} actieve acties`}
                  >
                    {activeDealCount}
                  </span>
                )}
              </button>
            )}

            <button
              onClick={() => setActiveTab('friends')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'friends'
                  ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
              }`}
            >
              <Users className="w-4 h-4" />
              Vrienden
            </button>

            {/* Apart Instellingen-tabje dat tevoorschijn komt als je op je profiel hebt geklikt */}
            {activeTab === 'settings' && (
              <button
                onClick={() => setActiveTab('settings')}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20"
              >
                <Settings className="w-4 h-4" />
                Instellingen
              </button>
            )}
          </nav>

          {/* Right actions: Add Beer & User Profile */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Quick Add Beer button */}
            <PWAInstallButton />
            {!readOnly && (
              <button
                onClick={onAddNewBeer}
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-lg shadow-amber-500/20 transition-all hover:scale-105 active:scale-95 shrink-0"
              >
                <Plus className="w-4 h-4 stroke-[3] shrink-0" />
                <span className="hidden xs:inline">Bier</span> Toevoegen
              </button>
            )}

            {/* User Profile Pill - Klik op je eigen profiel om naar het aparte Instellingen-tabje te gaan */}
            <div className="flex items-center gap-1.5 shrink-0">
              <div
                onClick={() => setActiveTab('settings')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActiveTab('settings');
                  }
                }}
                title="Klik om je Profiel & Instellingen te openen"
                className={`flex items-center justify-center p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-zinc-900 border text-left cursor-pointer transition-colors shrink-0 ${
                  activeTab === 'settings'
                    ? 'border-amber-500 ring-2 ring-amber-500/30 bg-amber-500/10'
                    : 'border-zinc-800 hover:border-amber-500/50'
                }`}
              >
                <div className="relative w-8 h-8 shrink-0">
                  {activeUser.avatarUrl ? (
                    <img
                      src={activeUser.avatarUrl}
                      alt={activeUser.name}
                      className="w-8 h-8 min-w-[2rem] min-h-[2rem] rounded-full object-cover ring-1 ring-amber-500/30 shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 min-w-[2rem] min-h-[2rem] rounded-full bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center text-xs shrink-0">
                      {activeUser.name.charAt(0)}
                    </div>
                  )}
                  {/* Google small logo */}
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-white flex items-center justify-center shadow-xs shrink-0">
                    <svg className="w-2.5 h-2.5 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                  </div>
                </div>

                <div className="hidden">
                  <div className="text-xs font-bold text-zinc-200 line-clamp-1 flex items-center gap-1">
                    {activeUser.name.split(' ')[0]}
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  </div>
                  <div className="text-[10px] text-zinc-500 font-mono truncate max-w-[120px]">
                    {activeUser.email}
                  </div>
                </div>
              </div>

              {/* Explicit Logout Button */}
              <button
                onClick={onLogout}
                className="p-2 sm:px-2.5 sm:py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-rose-500/50 hover:bg-rose-500/10 text-zinc-400 hover:text-rose-300 transition-all flex items-center gap-1.5 text-xs font-semibold shrink-0"
                title="Uitloggen uit Google Account"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span className="hidden xl:inline">Uitloggen</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden flex items-center justify-around bg-zinc-950 border-t border-zinc-800 py-2 px-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl text-[10px] font-bold transition-colors shrink-0 ${
            activeTab === 'dashboard' ? 'text-amber-400' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          Dashboard
        </button>

        <button
          onClick={() => setActiveTab('list')}
          className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl text-[10px] font-bold transition-colors shrink-0 ${
            activeTab === 'list' ? 'text-amber-400' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <BeerIcon className="w-4 h-4" />
          Bieren
        </button>

        <button
          onClick={() => setActiveTab('top')}
          className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl text-[10px] font-bold transition-colors shrink-0 ${
            activeTab === 'top' ? 'text-amber-400' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Trophy className="w-4 h-4" />
          Top
        </button>

        <button
          onClick={() => setActiveTab('categories')}
          className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl text-[10px] font-bold transition-colors shrink-0 ${
            activeTab === 'categories' ? 'text-amber-400' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Tag className="w-4 h-4" />
          Categorieën
        </button>

        <button
          onClick={() => setActiveTab('glasses')}
          className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl text-[10px] font-bold transition-colors shrink-0 ${
            activeTab === 'glasses' ? 'text-amber-400' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M7 4c-.5 3.5-1 6.5 1.5 9a4.5 4.5 0 0 0 7 0c2.5-2.5 2-5.5 1.5-9H7Z" />
            <path d="M6.7 7.5c1.8 1 3.5-1 5.3 0s3.5 1 5.3 0" />
            <path d="M12 14.8V20" />
            <path d="M8.5 20h7" />
          </svg>
          Glazen
        </button>

        {showExtrasTab && (
          <button
            onClick={() => setActiveTab('extras')}
            className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl text-[10px] font-bold transition-colors shrink-0 ${
              activeTab === 'extras' || activeTab === 'deals' || activeTab === 'counter'
                ? 'text-amber-400'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <div className="relative">
              <Sparkles className="w-4 h-4" />
              {showExtrasDealBadge && activeDealCount > 0 && (
                <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-emerald-400" />
              )}
            </div>
            Extra's
          </button>
        )}

        <button
          onClick={() => setActiveTab('friends')}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl text-[10px] font-bold transition-colors shrink-0 ${
            activeTab === 'friends' ? 'text-amber-400' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Users className="w-4 h-4" />
          Vrienden
        </button>

        {activeTab === 'settings' && (
          <button
            onClick={() => setActiveTab('settings')}
            className="flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl text-[10px] font-bold transition-colors shrink-0 text-amber-400"
          >
            <Settings className="w-4 h-4" />
            Instellingen
          </button>
        )}

        <div className="flex flex-col items-center shrink-0">
          <PWAInstallButton />
        </div>
      </div>
    </header>
  );
};
