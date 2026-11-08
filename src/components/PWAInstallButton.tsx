import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, ShieldCheck, Smartphone, RefreshCw } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, isAndroid, isSamsungBrowser, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);
  const [isRefreshingSw, setIsRefreshingSw] = useState(false);

  // Verberg de installatieknop zodra de app al als geïnstalleerde WebAPK draait
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

  // Directe 1-klik WebAPK installatie wanneer de browser de installatie-prompt klaar heeft staan
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-2 rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-zinc-950 shadow-md shadow-amber-500/20 hover:bg-amber-400 transition-all cursor-pointer"
      >
        <Download className="w-4 h-4" />
        App Installeren
      </button>
    );
  }

  // Mobiele apparaten (Samsung / Android / iOS) waarbij de directe prompt nog ververst kan worden of handmatig via het menu loopt
  if (isIOS || isAndroid || isSamsungBrowser) {
    return (
      <>
        <button
          onClick={() => setShowGuide(true)}
          className="flex items-center gap-2 rounded-lg bg-amber-500/15 border border-amber-500/40 px-3 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/25 transition-all cursor-pointer"
        >
          <Download className="w-4 h-4 text-amber-400" />
          App Installeren
        </button>

        {showGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl bg-zinc-900 border border-zinc-700 p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-100">
                    {isIOS ? 'Installeren op iPhone / iPad' : 'Installeren op Samsung / Android'}
                  </h3>
                  <p className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Android 14 / 15 &amp; One UI WebAPK Beveiligd
                  </p>
                </div>
              </div>

              {isIOS ? (
                <p className="text-sm text-zinc-300 leading-relaxed">
                  1. Tik op de <strong>Deel</strong>-knop in de Safari-balk onderaan.<br />
                  2. Scroll naar beneden en tik op <strong>Zet op beginscherm</strong>.
                </p>
              ) : (
                <div className="space-y-3 text-xs text-zinc-300 leading-relaxed">
                  <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1.5">
                    <p className="font-bold text-amber-300">
                      Stappen voor de nieuwste Android WebAPK:
                    </p>
                    <p>
                      1. <strong>Verwijder eerst een eventueel oud Cervisium-icoon</strong> van je startscherm of app-lijst (zodat je telefoon geen gecachete oude snelkoppeling gebruikt).
                    </p>
                    <p>
                      2. Klik hieronder op <strong>App-cache verversen</strong> om het nieuwe 512x512 WebAPK-manifest te laden.
                    </p>
                    <p>
                      3. Tik in het browsermenu rechtsboven (of rechtsonder) op <strong>App installeren</strong> of <strong>Toevoegen aan startscherm → Web-app</strong>.
                    </p>
                  </div>

                  {isSamsungBrowser && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200">
                      <strong>Samsung Internet Tip:</strong> Geeft Samsung Internet nog een melding van een oudere Android-versie? Als je op <em>&quot;Meer details → Toch installeren&quot;</em> tikt werkt de app 100% veilig, óf open <strong>cervisium.nl in Google Chrome</strong> om direct via Google Play WebAPK te installeren zonder melding.
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleForceManifestRefresh}
                    disabled={isRefreshingSw}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-2.5 text-xs font-extrabold text-zinc-950 hover:bg-amber-400 transition-all cursor-pointer"
                  >
                    <RefreshCw className={`w-4 h-4 ${isRefreshingSw ? 'animate-spin' : ''}`} />
                    {isRefreshingSw ? 'Bezig met verversen...' : 'App-cache & Manifest verversen'}
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
          </div>
        )}
      </>
    );
  }

  return null;
};
