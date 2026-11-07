import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-2 rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-zinc-950 shadow-md shadow-amber-500/20 hover:bg-amber-400 transition-all"
      >
        <Download className="w-4 h-4" />
        App Installeren
      </button>
    );
  }

  // iOS Safari flow (beforeinstallprompt is not supported by WebKit)
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition-all"
        >
          <Download className="w-4 h-4" />
          Installeren (iOS)
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl bg-zinc-900 border border-zinc-700 p-6 shadow-xl">
              <h3 className="text-lg font-bold text-zinc-100">Installeren op iPhone / iPad</h3>
              <p className="mt-3 text-sm text-zinc-400">
                1. Tik op de <strong>Deel</strong>-knop in de Safari-balk onderaan.<br />
                2. Scroll naar beneden en tik op <strong>Zet op beginscherm</strong>.
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-6 w-full rounded-lg bg-zinc-800 py-2.5 text-sm font-bold text-zinc-100 hover:bg-zinc-700"
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
