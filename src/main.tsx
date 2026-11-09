import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { syncFirebaseConfigFromServer } from './firebase';
import { initBrowserLanguageSync } from './utils/i18n';
import { APP_VERSION } from './version';

// Als een oude Service Worker de gebruiker op www.cervisium.nl heeft vastgehouden,
// verwijder dan direct die Service Worker en stuur door naar het hoofddomein cervisium.nl
if (typeof window !== 'undefined' && window.location.hostname.toLowerCase() === 'www.cervisium.nl') {
  const targetUrl = `https://cervisium.nl${window.location.pathname}${window.location.search}${window.location.hash}`;
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => Promise.all(regs.map((r) => r.unregister())))
      .finally(() => {
        window.location.replace(targetUrl);
      });
  } else {
    window.location.replace(targetUrl);
  }
}

initBrowserLanguageSync();
void syncFirebaseConfigFromServer();

// Registreer de Service Worker direct via de standaard browser-API en verwijder verouderde caches
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  const activeCacheName = `cervisium-pwa-v${APP_VERSION}`;
  if ('caches' in window) {
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== activeCacheName)
            .map((k) => caches.delete(k))
        )
      )
      .catch(() => {});
  }
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        registration.update().catch(() => {});
        setInterval(() => {
          registration.update().catch(() => {});
        }, 60 * 60 * 1000);
      })
      .catch(() => {});
  });
}

createRoot(document.getElementById('root')!).render(<App />);

