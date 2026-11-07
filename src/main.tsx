import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initBrowserLanguageSync } from './utils/i18n';

initBrowserLanguageSync();

createRoot(document.getElementById('root')!).render(<App />);

