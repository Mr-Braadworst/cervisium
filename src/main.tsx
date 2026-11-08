import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';
import { initBrowserLanguageSync } from './utils/i18n';

initBrowserLanguageSync();

// Registreer de Service Worker direct voor volledige Android 14+ / WebAPK ondersteuning & automatische updates
registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    if (registration) {
      setInterval(() => {
        registration.update().catch(() => {});
      }, 60 * 60 * 1000);
    }
  },
});

createRoot(document.getElementById('root')!).render(<App />);
