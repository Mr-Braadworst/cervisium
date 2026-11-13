import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePWAInstall } from '../hooks/usePWAInstall';
import {
  Download,
  ShieldCheck,
  Smartphone,
  RefreshCw,
  Check,
  Copy,
  X,
  PlusSquare,
  Beer,
  Sparkles,
} from 'lucide-react';

interface PWAInstallButtonProps {
  variant?: 'default' | 'compact' | 'landing';
}

/**
 * Apple iOS Share Icon (vierkantje met pijltje omhoog)
 */
const IOSShareIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 3v12" />
    <path d="m8 7 4-4 4 4" />
    <path d="M20 14v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-5" />
  </svg>
);

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'default' }) => {
  const {
    isInstallable,
    isInstalled,
    isIOS,
    isIOSChrome,
    isInAppBrowser,
    isAndroid,
    isSamsungBrowser,
    install,
  } = usePWAInstall();

  const [showGuide, setShowGuide] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<'ios' | 'android'>(
    isIOS ? 'ios' : 'android'
  );
  const [isRefreshingSw, setIsRefreshingSw] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [showIOSFloatingHint, setShowIOSFloatingHint] = useState(false);

  useEffect(() => {
    if (isIOS) {
      setSelectedPlatform('ios');
    } else if (isAndroid || isSamsungBrowser) {
      setSelectedPlatform('android');
    }
  }, [isIOS, isAndroid, isSamsungBrowser]);

  // Laat op iPhone eenmalig een subtiele installatie-balk onderin zien als de app nog niet op het beginscherm staat
  useEffect(() => {
    if (!isIOS || isInstalled || variant !== 'default') return;
    try {
      const dismissed = localStorage.getItem('cervisium_ios_install_hint_dismissed');
      if (!dismissed) {
        const timer = setTimeout(() => setShowIOSFloatingHint(true), 1200);
        return () => clearTimeout(timer);
      }
    } catch {
      // ignore storage errors
    }
  }, [isIOS, isInstalled, variant]);

  const dismissIOSHint = () => {
    setShowIOSFloatingHint(false);
    try {
      localStorage.setItem('cervisium_ios_install_hint_dismissed', 'true');
    } catch {
      // ignore
    }
  };

  // Verberg de installatieknop zodra de app al als geïnstalleerde app (standalone) draait
  if (isInstalled) {
    return null;
  }

  const handleForceManifestRefresh = async () => {
    setIsRefreshingSw(true);
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.update();
        }
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        for (const key of keys) {
          await caches.delete(key);
        }
      }
      window.location.reload();
    } catch {
      window.location.reload();
    } finally {
      setIsRefreshingSw(false);
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
    } catch {
      // fallback
    }
  };

  const handleButtonClick = async () => {
    if (isInstallable && !isIOS) {
      const accepted = await install();
      if (!accepted) {
        setSelectedPlatform('android');
        setShowGuide(true);
      }
      return;
    }
    setSelectedPlatform(isIOS || !isAndroid ? 'ios' : 'android');
    setShowGuide(true);
    if (showIOSFloatingHint) {
      dismissIOSHint();
    }
  };

  const modalContent =
    showGuide && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200"
            onClick={() => setShowGuide(false)}
          >
            <div
              className="w-full max-w-md rounded-3xl bg-zinc-900 border border-zinc-700 p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center text-zinc-950 shadow-lg shadow-amber-500/20 shrink-0">
                    <Beer className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-zinc-100 leading-tight">
                      Zet Cervisium als App op je telefoon
                    </h3>
                    <p className="text-xs text-emerald-400 flex items-center gap-1 font-medium mt-0.5">
                      <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                      Volledig scherm · Geen reclame · Direct vanuit je beginscherm
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGuide(false)}
                  className="p-1.5 rounded-xl bg-zinc-800/80 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 transition-colors cursor-pointer"
                  aria-label="Sluiten"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Platform Switcher: iPhone / iPad vs Android / Samsung */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-zinc-950 border border-zinc-800 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setSelectedPlatform('ios')}
                  className={`py-2 px-3 rounded-xl text-xs font-mono uppercase tracking-wider font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    selectedPlatform === 'ios'
                      ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  iPhone / iPad
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPlatform('android')}
                  className={`py-2 px-3 rounded-xl text-xs font-mono uppercase tracking-wider font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    selectedPlatform === 'android'
                      ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Download className="w-3.5 h-3.5" />
                  Android / Samsung
                </button>
              </div>

              {selectedPlatform === 'ios' ? (
                <div className="space-y-3.5 text-xs text-zinc-300 leading-relaxed">
                  {/* Waarschuwing bij in-app browsers zoals WhatsApp of Instagram */}
                  {isInAppBrowser && (
                    <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-200 space-y-2">
                      <p className="font-bold text-amber-300">
                        Let op: je hebt deze pagina geopend binnen een andere app (zoals WhatsApp of Instagram).
                      </p>
                      <p>
                        Open deze link eerst in <strong>Safari</strong> op je iPhone om de app op je beginscherm te kunnen zetten:
                      </p>
                      <button
                        type="button"
                        onClick={handleCopyUrl}
                        className="w-full py-2 px-3 rounded-xl bg-amber-500 text-zinc-950 font-bold flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {copiedUrl ? (
                          <>
                            <Check className="w-4 h-4" />
                            Link gekopieerd! Plak hem in Safari
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            Kopieer link voor Safari
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Visuele 3-stappen kaart voor iPhone */}
                  <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3.5">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                      <span className="font-mono text-[11px] uppercase tracking-wider text-amber-400 font-bold">
                        Zo zet je hem in 10 seconden op je iPhone
                      </span>
                      <span className="text-[11px] text-zinc-500 font-mono">
                        {isIOSChrome ? 'Chrome op iOS' : 'Safari op iOS'}
                      </span>
                    </div>

                    {/* Stap 1 */}
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 font-mono text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                        1
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <p className="text-zinc-200 font-medium">
                          Tik op de <strong className="text-amber-300">Deel-knop</strong>{' '}
                          {isIOSChrome
                            ? 'rechtsboven in de adresbalk van Chrome'
                            : 'midden onderin de balk van Safari'}
                          :
                        </p>
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-700 text-sky-400 font-medium text-xs">
                          <IOSShareIcon className="w-4 h-4 text-sky-400" />
                          <span>Deel-icoon (vierkantje met pijltje omhoog)</span>
                        </div>
                      </div>
                    </div>

                    {/* Stap 2 */}
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 font-mono text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                        2
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <p className="text-zinc-200 font-medium">
                          Scroll iets naar beneden in het menu en tik op:
                        </p>
                        <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 font-semibold text-xs">
                          <span>Zet op beginscherm</span>
                          <PlusSquare className="w-4 h-4 text-zinc-300" />
                        </div>
                      </div>
                    </div>

                    {/* Stap 3 */}
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 font-mono text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                        3
                      </div>
                      <div className="flex-1">
                        <p className="text-zinc-200 font-medium">
                          Tik rechtsboven op <strong className="text-sky-400">Voeg toe</strong>. De{' '}
                          <strong className="text-amber-300">Cervisium app</strong> staat nu met het
                          gouden bier-icoon tussen je andere apps!
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Handige kopieer-knop als iemand in een andere browser zit */}
                  {!isInAppBrowser && (
                    <div className="flex items-center justify-between gap-2 p-3 rounded-2xl bg-zinc-950/70 border border-zinc-800/80">
                      <span className="text-[11px] text-zinc-400">
                        Zie je geen &apos;Zet op beginscherm&apos;? Open de link in Safari:
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyUrl}
                        className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-[11px] cursor-pointer transition-colors"
                      >
                        {copiedUrl ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            Gekopieerd
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-amber-400" />
                            Kopieer link
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3 text-xs text-zinc-300 leading-relaxed">
                  {isInstallable && (
                    <button
                      type="button"
                      onClick={install}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-xs font-extrabold text-zinc-950 hover:bg-amber-400 transition-all cursor-pointer shadow-lg shadow-amber-500/20"
                    >
                      <Download className="w-4 h-4" />
                      Direct met 1 tik installeren
                    </button>
                  )}

                  <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2">
                    <p className="font-bold text-amber-300">
                      Installeren op Android / Samsung:
                    </p>
                    <p>
                      1. Tik in je browser rechtsboven (of rechtsonder) op het menu{' '}
                      <strong>(⋮ of ≡)</strong>.
                    </p>
                    <p>
                      2. Kies <strong>App installeren</strong> of{' '}
                      <strong>Toevoegen aan startscherm → Web-app</strong>.
                    </p>
                    <p className="text-zinc-400 text-[11px]">
                      Had je nog een oud icoon staan? Verwijder die eerst en klik hieronder op{' '}
                      <em>App-cache verversen</em>.
                    </p>
                  </div>

                  {isSamsungBrowser && (
                    <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200">
                      <strong>Samsung Internet Tip:</strong> Open <strong>cervisium.nl</strong> in{' '}
                      <strong>Google Chrome</strong> om met één tik direct te installeren, of kies in
                      Samsung Internet voor <em>&quot;Toevoegen aan startscherm&quot;</em>.
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleForceManifestRefresh}
                    disabled={isRefreshingSw}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 py-2.5 text-xs font-bold text-amber-300 transition-all cursor-pointer"
                  >
                    <RefreshCw className={`w-4 h-4 ${isRefreshingSw ? 'animate-spin' : ''}`} />
                    {isRefreshingSw ? 'Bezig met verversen...' : 'App-cache & Icoon verversen'}
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="w-full rounded-xl bg-zinc-800 py-2.5 text-xs font-bold text-zinc-200 hover:bg-zinc-700 transition-colors cursor-pointer"
              >
                Sluiten
              </button>
            </div>
          </div>,
          document.body
        )
      : null;

  // Subtiele zwevende iPhone installatie-balk onderin het scherm
  const iosFloatingBanner =
    showIOSFloatingHint && isIOS && !showGuide && typeof document !== 'undefined'
      ? createPortal(
          <div className="fixed bottom-16 left-3 right-3 z-50 sm:hidden animate-in slide-in-from-bottom-4 duration-300">
            <div className="rounded-2xl bg-zinc-900/95 backdrop-blur-md border border-amber-500/40 p-3.5 shadow-2xl flex items-center justify-between gap-3">
              <div
                onClick={() => {
                  setSelectedPlatform('ios');
                  setShowGuide(true);
                  dismissIOSHint();
                }}
                className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
              >
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center text-zinc-950 shadow-md shadow-amber-500/20 shrink-0">
                  <Beer className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-zinc-100 truncate">
                    Zet Cervisium als App op je iPhone
                  </div>
                  <div className="text-[11px] text-zinc-300 flex items-center gap-1 mt-0.5">
                    <span>Tik op</span>
                    <IOSShareIcon className="w-3.5 h-3.5 text-sky-400 inline shrink-0" />
                    <span>en kies</span>
                    <strong className="text-amber-400">&apos;Zet op beginscherm&apos;</strong>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPlatform('ios');
                    setShowGuide(true);
                    dismissIOSHint();
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-amber-500 text-zinc-950 font-bold text-[11px] cursor-pointer"
                >
                  Uitleg
                </button>
                <button
                  type="button"
                  onClick={dismissIOSHint}
                  className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-200 cursor-pointer"
                  aria-label="Melding sluiten"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  if (variant === 'compact') {
    return (
      <>
        <button
          type="button"
          onClick={handleButtonClick}
          className="flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl text-[10px] font-bold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer shrink-0"
          title="Installeer Cervisium als App op je iPhone of Android"
        >
          <Download className="w-4 h-4" />
          App
        </button>
        {modalContent}
      </>
    );
  }

  if (variant === 'landing') {
    return (
      <>
        <button
          type="button"
          onClick={handleButtonClick}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-amber-500/40 text-amber-400 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer shrink-0"
          title="Zet Cervisium als App op je iPhone of Android"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Zet als App op telefoon</span>
        </button>
        {modalContent}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handleButtonClick}
        className="flex items-center gap-1.5 sm:gap-2 rounded-xl bg-amber-500/15 border border-amber-500/40 px-2.5 sm:px-3 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/25 transition-all cursor-pointer shrink-0"
        title="Installeer Cervisium als App op je iPhone of Android"
      >
        <Download className="w-4 h-4 text-amber-400 shrink-0" />
        <span className="hidden lg:inline">App Installeren</span>
        <span className="lg:hidden">App</span>
      </button>
      {iosFloatingBanner}
      {modalContent}
    </>
  );
};
