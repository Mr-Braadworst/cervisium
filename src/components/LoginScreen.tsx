import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UserAccount } from '../types';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  getActiveFirebaseProjectId,
  syncFirebaseConfigFromServer,
  applyRuntimeFirebaseConfig,
} from '../firebase';
import {
  loginUser,
  syncUserWithServerDatabase,
} from '../services/storage';
import { getCanonicalUserIdForEmail } from '../utils/security';
import { APP_VERSION, getFormattedVersionDate } from '../version';
import {
  Beer,
  Trophy,
  ShieldCheck,
  Sparkles,
  Lock,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Clock,
  Mail,
  KeyRound,
  User,
  LogIn,
  UserPlus,
} from 'lucide-react';

interface LoginScreenProps {
  onLogin: (user: UserAccount) => void;
  recentUsers: UserAccount[];
}

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minuten blokkade bij 5 pogingen
const RATE_LIMIT_STORAGE_KEY = 'bierlog_login_rate_limit';

interface RateLimitData {
  attempts: number;
  lockedUntil: number | null;
}

function getStoredRateLimit(): RateLimitData {
  try {
    const raw = localStorage.getItem(RATE_LIMIT_STORAGE_KEY);
    if (!raw) return { attempts: 0, lockedUntil: null };
    const parsed = JSON.parse(raw);
    return {
      attempts: typeof parsed.attempts === 'number' ? parsed.attempts : 0,
      lockedUntil: typeof parsed.lockedUntil === 'number' ? parsed.lockedUntil : null,
    };
  } catch {
    return { attempts: 0, lockedUntil: null };
  }
}

function saveRateLimit(data: RateLimitData) {
  try {
    localStorage.setItem(RATE_LIMIT_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage errors
  }
}

function clearRateLimit() {
  try {
    localStorage.removeItem(RATE_LIMIT_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

const STANDALONE_GOOGLE_CLIENT_ID = (
  ((import.meta as unknown as { env?: Record<string, string | undefined> }).env
    ?.VITE_GOOGLE_CLIENT_ID || '') as string
).trim();

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  const [rateLimit, setRateLimit] = useState<RateLimitData>(getStoredRateLimit);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);
  const [showFirebaseConfigSetup, setShowFirebaseConfigSetup] = useState(false);
  const [firebasePasteInput, setFirebasePasteInput] = useState('');
  const [isSavingFirebaseConfig, setIsSavingFirebaseConfig] = useState(false);
  const googleGsiButtonRef = useRef<HTMLDivElement>(null);

  const isLocked = secondsRemaining > 0;
  const attemptsRemaining = Math.max(0, MAX_LOGIN_ATTEMPTS - rateLimit.attempts);

  const formatCountdown = (totalSec: number) => {
    const minutes = Math.floor(totalSec / 60);
    const seconds = totalSec % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const registerFailedAttempt = (customMessage: string) => {
    const newAttempts = rateLimit.attempts + 1;
    if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
      const newLockedUntil = Date.now() + LOCKOUT_DURATION_MS;
      const newLimit: RateLimitData = { attempts: newAttempts, lockedUntil: newLockedUntil };
      saveRateLimit(newLimit);
      setRateLimit(newLimit);
      setSecondsRemaining(Math.ceil(LOCKOUT_DURATION_MS / 1000));
      setAuthError(
        `Maximaal aantal inlogpogingen (${MAX_LOGIN_ATTEMPTS}) bereikt! Je account is voor 15 minuten tijdelijk vergrendeld ter beveiliging.`
      );
    } else {
      const newLimit: RateLimitData = { attempts: newAttempts, lockedUntil: null };
      saveRateLimit(newLimit);
      setRateLimit(newLimit);
      const remaining = MAX_LOGIN_ATTEMPTS - newAttempts;
      setAuthError(`${customMessage} (Nog ${remaining} poging${remaining === 1 ? '' : 'en'} over)`);
    }
  };

  const verifyAndSyncWithBackend = useCallback(
    async (
      idToken: string,
      fallbackAccount?: UserAccount,
      plainPassword?: string
    ): Promise<UserAccount> => {
      try {
        const res = await fetch('/api/auth/google', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            credential: idToken,
            ...(plainPassword ? { password: plainPassword } : {}),
          }),
        });

        if (res.ok) {
          const data = (await res.json()) as {
            user: UserAccount;
            records?: {
              categories?: any[];
              beers?: any[];
              tastings?: any[];
              glasses?: any[];
            };
          };

          const serverUser: UserAccount = {
            id: data.user.id,
            name: fallbackAccount?.name || data.user.name,
            googleName: data.user.googleName || fallbackAccount?.name,
            email: data.user.email,
            role: data.user.role,
            avatarUrl: data.user.avatarUrl,
            createdAt: data.user.createdAt || new Date().toISOString(),
          };

          loginUser(serverUser);
          await syncUserWithServerDatabase(serverUser);

          return serverUser;
        }
      } catch {
        // Fallback indien nodig
      }

      if (fallbackAccount) {
        loginUser(fallbackAccount);
        await syncUserWithServerDatabase(fallbackAccount);
        return fallbackAccount;
      }
      throw new Error('Kon account niet verifiëren.');
    },
    []
  );

  // Check lockout status and update countdown timer
  useEffect(() => {
    const checkLockout = () => {
      const current = getStoredRateLimit();
      if (current.lockedUntil) {
        const remainingMs = current.lockedUntil - Date.now();
        if (remainingMs > 0) {
          setSecondsRemaining(Math.ceil(remainingMs / 1000));
          setRateLimit(current);
        } else {
          clearRateLimit();
          setRateLimit({ attempts: 0, lockedUntil: null });
          setSecondsRemaining(0);
          setAuthError(null);
        }
      } else {
        setRateLimit(current);
        setSecondsRemaining(0);
      }
    };

    checkLockout();
    const interval = setInterval(checkLockout, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (
      !STANDALONE_GOOGLE_CLIENT_ID ||
      STANDALONE_GOOGLE_CLIENT_ID === 'YOUR_GOOGLE_OAUTH_CLIENT_ID' ||
      isLocked
    ) {
      return;
    }

    const scriptId = 'google-gsi-client-script';
    const initGsi = () => {
      const g = (window as unknown as { google?: any }).google;
      if (!g?.accounts?.id || !googleGsiButtonRef.current) return;
      g.accounts.id.initialize({
        client_id: STANDALONE_GOOGLE_CLIENT_ID,
        callback: async (response: { credential?: string }) => {
          if (!response?.credential) return;
          setIsSigningIn(true);
          setAuthError(null);
          try {
            const account = await verifyAndSyncWithBackend(response.credential);
            clearRateLimit();
            setRateLimit({ attempts: 0, lockedUntil: null });
            onLogin(account);
          } catch (err) {
            setAuthError(
              err instanceof Error ? err.message : 'Google login verificatie mislukt.'
            );
          } finally {
            setIsSigningIn(false);
          }
        },
      });
      g.accounts.id.renderButton(googleGsiButtonRef.current, {
        theme: 'outline',
        size: 'large',
        width: 340,
        text: 'signin_with',
        shape: 'pill',
      });
    };

    if (document.getElementById(scriptId)) {
      initGsi();
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = initGsi;
    document.head.appendChild(script);
  }, [isLocked, onLogin, verifyAndSyncWithBackend]);

  // Firebase Email / Wachtwoord Inloggen of Account Aanmaken
  const handleFirebaseEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) {
      setAuthError(
        `Toegang tijdelijk vergrendeld wegens te veel mislukte inlogpogingen. Wacht nog ${formatCountdown(secondsRemaining)}.`
      );
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setAuthError('Vul een geldig e-mailadres in.');
      return;
    }

    if (password.length < 6) {
      setAuthError('Wachtwoord moet minimaal 6 tekens bevatten.');
      return;
    }

    setAuthError(null);
    setResetSuccessMessage(null);
    setIsSigningIn(true);

    const tryDirectDatabaseAuth = async (): Promise<boolean> => {
      try {
        const res = await fetch('/api/auth/account', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: cleanEmail,
            password,
            name: displayName.trim() || undefined,
          }),
        });

        if (res.ok) {
          const data = (await res.json()) as {
            user: UserAccount;
            records?: {
              categories?: unknown[];
              beers?: unknown[];
              tastings?: unknown[];
              glasses?: unknown[];
            };
          };

          const serverUser: UserAccount = {
            id: data.user.id,
            name: data.user.name,
            googleName: data.user.googleName,
            email: data.user.email,
            role: data.user.role,
            avatarUrl: data.user.avatarUrl,
            createdAt: data.user.createdAt || new Date().toISOString(),
          };

          clearRateLimit();
          setRateLimit({ attempts: 0, lockedUntil: null });
          loginUser(serverUser);
          await syncUserWithServerDatabase(serverUser);
          onLogin(serverUser);
          return true;
        }

        const errData = (await res.json().catch(() => ({}))) as { error?: string };
        if (errData?.error && (res.status === 401 || res.status === 403)) {
          registerFailedAttempt(errData.error);
          return true;
        }
      } catch {
        // Direct database endpoint offline
      }
      return false;
    };

    try {
      let userCredential;
      if (authMode === 'register') {
        userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        const chosenName =
          displayName.trim() ||
          cleanEmail
            .split('@')[0]
            .replace(/[._-]+/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase()) ||
          'Bierliefhebber';

        try {
          await updateProfile(userCredential.user, { displayName: chosenName });
        } catch {
          // Negeer optionele profiel-update fout
        }
      } else {
        userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
      }

      const user = userCredential.user;
      const idToken = await user.getIdToken(true);

      clearRateLimit();
      setRateLimit({ attempts: 0, lockedUntil: null });

      const resolvedName =
        (authMode === 'register' && displayName.trim()) ||
        user.displayName ||
        cleanEmail
          .split('@')[0]
          .replace(/[._-]+/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase()) ||
        'Bierliefhebber';

      const canonicalId = getCanonicalUserIdForEmail(cleanEmail) || user.uid;
      const fallbackAccount: UserAccount = {
        id: canonicalId,
        name: resolvedName,
        googleName: resolvedName,
        email: user.email || cleanEmail,
        avatarUrl: user.photoURL || undefined,
        createdAt: new Date().toISOString(),
      };

      const verifiedAccount = await verifyAndSyncWithBackend(idToken, fallbackAccount, password);
      onLogin(verifiedAccount);
    } catch (err: unknown) {
      // Probeer directe inlog op de centrale server-database (werkt op elk IP en poort)
      const directHandled = await tryDirectDatabaseAuth();
      if (directHandled) {
        return;
      }

      const msg = err instanceof Error ? err.message : String(err);

      if (msg.includes('operation-not-allowed')) {
        setAuthError(
          'Zet eerst "Email/Password" aan in jouw Firebase Console (Authentication → Sign-in method → Email/Password).'
        );
        return;
      }

      if (msg.includes('email-already-in-use')) {
        setAuthError(
          'Er bestaat al een account met dit e-mailadres. Kies hierboven "Inloggen" om in te loggen.'
        );
        return;
      }

      if (msg.includes('weak-password')) {
        setAuthError('Kies een sterker wachtwoord van minimaal 6 tekens.');
        return;
      }

      if (msg.includes('invalid-email')) {
        setAuthError('Het ingevulde e-mailadres is niet geldig.');
        return;
      }

      if (msg.includes('too-many-requests')) {
        setAuthError(
          'Te veel pogingen achter elkaar. Wacht een paar minuten of klik op "Wachtwoord vergeten?".'
        );
        return;
      }

      if (
        msg.includes('user-not-found') ||
        msg.includes('wrong-password') ||
        msg.includes('invalid-credential')
      ) {
        registerFailedAttempt(
          'Onjuist e-mailadres of wachtwoord. Heb je nog geen account? Kies dan "Account aanmaken".'
        );
        return;
      }

      registerFailedAttempt('Inloggen mislukt. Controleer je gegevens en probeer het opnieuw.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handlePasswordReset = async () => {
    const cleanEmail = email.trim().toLowerCase();
    setAuthError(null);
    setResetSuccessMessage(null);

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setAuthError('Vul eerst je e-mailadres in het veld hierboven in om je wachtwoord te herstellen.');
      return;
    }

    setIsSigningIn(true);
    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      setResetSuccessMessage(
        `Er is een e-mail met een herstellink verstuurd naar ${cleanEmail}. Controleer ook je ongewenste e-mail (spam).`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('user-not-found')) {
        setAuthError('Er is geen account gevonden met dit e-mailadres.');
      } else {
        setAuthError('Kon geen herstelmail versturen. Controleer het ingevulde e-mailadres.');
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSaveCustomFirebaseConfig = async () => {
    const raw = firebasePasteInput.trim();
    if (!raw) {
      setAuthError('Plak eerst je firebaseConfig (of apiKey en projectId) uit je Firebase Console.');
      return;
    }

    const extractField = (key: string): string => {
      const regex = new RegExp(`["']?${key}["']?\\s*[:=]\\s*["']([^"'\\s,]+)["']`, 'i');
      const match = raw.match(regex);
      return match ? match[1].trim() : '';
    };

    let apiKey = extractField('apiKey') || extractField('FIREBASE_API_KEY') || extractField('VITE_FIREBASE_API_KEY');
    let projectId =
      extractField('projectId') || extractField('FIREBASE_PROJECT_ID') || extractField('VITE_FIREBASE_PROJECT_ID');
    const authDomain =
      extractField('authDomain') || extractField('FIREBASE_AUTH_DOMAIN') || extractField('VITE_FIREBASE_AUTH_DOMAIN');
    const storageBucket =
      extractField('storageBucket') ||
      extractField('FIREBASE_STORAGE_BUCKET') ||
      extractField('VITE_FIREBASE_STORAGE_BUCKET');
    const messagingSenderId =
      extractField('messagingSenderId') ||
      extractField('FIREBASE_MESSAGING_SENDER_ID') ||
      extractField('VITE_FIREBASE_MESSAGING_SENDER_ID');
    const appId = extractField('appId') || extractField('FIREBASE_APP_ID') || extractField('VITE_FIREBASE_APP_ID');

    if (!apiKey) {
      const keyMatch = raw.match(/AIza[0-9A-Za-z_-]{30,45}/);
      if (keyMatch) apiKey = keyMatch[0];
    }

    if (!apiKey || !projectId) {
      setAuthError(
        'Kon apiKey (begint met AIza...) of projectId niet vinden in de geplakte tekst. Kopieer het volledige firebaseConfig-blok uit Firebase Console → Project Settings → General.'
      );
      return;
    }

    setIsSavingFirebaseConfig(true);
    try {
      const res = await fetch('/api/firebase-config', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey,
          projectId,
          authDomain: authDomain || `${projectId}.firebaseapp.com`,
          storageBucket: storageBucket || `${projectId}.firebasestorage.app`,
          messagingSenderId,
          appId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAuthError(data?.error || 'Kon Firebase-configuratie niet opslaan op de server.');
        return;
      }
      if (data?.config) {
        applyRuntimeFirebaseConfig(data.config);
      }
      setShowFirebaseConfigSetup(false);
      setFirebasePasteInput('');
      setAuthError(null);
      setResetSuccessMessage(
        `Jouw Firebase-project (${projectId}) is permanent gekoppeld en opgeslagen in /data! Klik nu nogmaals op "Inloggen met Google".`
      );
    } catch {
      setAuthError('Netwerkfout bij het opslaan van de Firebase-configuratie.');
    } finally {
      setIsSavingFirebaseConfig(false);
    }
  };

  const handleFirebaseGoogleSignIn = async () => {
    if (isLocked) {
      setAuthError(
        `Toegang tijdelijk vergrendeld wegens te veel mislukte inlogpogingen. Wacht nog ${formatCountdown(secondsRemaining)}.`
      );
      return;
    }

    setAuthError(null);
    setResetSuccessMessage(null);
    setIsSigningIn(true);

    try {
      const activeAuth = await syncFirebaseConfigFromServer();
      const result = await signInWithPopup(activeAuth, googleProvider);
      const user = result.user;
      const idToken = await user.getIdToken();

      clearRateLimit();
      setRateLimit({ attempts: 0, lockedUntil: null });

      const cleanEmail = (user.email || '').trim().toLowerCase();
      const canonicalId = (cleanEmail && getCanonicalUserIdForEmail(cleanEmail)) || user.uid;
      const fallbackAccount: UserAccount = {
        id: canonicalId,
        name: user.displayName || cleanEmail.split('@')[0] || 'Bierliefhebber',
        email: cleanEmail || 'gebruiker@bierlog.nl',
        avatarUrl: user.photoURL || undefined,
        createdAt: new Date().toISOString(),
      };

      const verifiedAccount = await verifyAndSyncWithBackend(idToken, fallbackAccount);
      onLogin(verifiedAccount);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);

      if (msg.includes('popup-closed-by-user')) {
        setAuthError('Het Google inlogvenster is gesloten voordat het inloggen was voltooid.');
        return;
      }

      if (msg.includes('unauthorized-domain')) {
        const activeProj = getActiveFirebaseProjectId();
        if (activeProj === 'rosy-logic-ckpr3') {
          setShowFirebaseConfigSetup(true);
          setAuthError(
            `De server gebruikt momenteel nog het standaard AI Studio project (${activeProj}) in plaats van jouw eigen Firebase Console project waarin je ${window.location.hostname} hebt toegevoegd. Plak hieronder eenmalig jouw eigen firebaseConfig uit Firebase Console om die blijvend in /data op te slaan.`
          );
        } else {
          setAuthError(
            `Dit adres (${window.location.hostname}) staat nog niet bij Geautoriseerde domeinen in jouw Firebase Console voor project "${activeProj}" (Authentication → Settings → Authorized domains). Gebruik hierboven E-mail & Wachtwoord of voeg het adres toe.`
          );
        }
        return;
      }

      if (msg.includes('operation-not-allowed')) {
        setAuthError(
          'Google Sign-In staat nog niet aan in jouw Firebase Console (Authentication → Sign-in method → Google).'
        );
        return;
      }

      if (msg.includes('popup-blocked')) {
        registerFailedAttempt('Pop-up geblokkeerd door browser. Sta pop-ups toe.');
      } else {
        registerFailedAttempt('Google login mislukt.');
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden font-sans selection:bg-amber-500 selection:text-zinc-950">
      {/* Background glow & craft atmosphere */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[32rem] h-[32rem] bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-zinc-950 shadow-xl shadow-amber-500/25 ring-4 ring-amber-500/20 mb-1">
            <Beer className="w-8 h-8 stroke-[2.5]" />
          </div>
          <div>
            <h1
              translate="no"
              data-no-translate="true"
              className="notranslate text-3xl font-extrabold tracking-tight text-zinc-100"
            >
              Cervisium
            </h1>
            <p className="text-xs font-semibold text-amber-400 tracking-wider uppercase mt-0.5">
              Persoonlijke Bier Collectie &amp; Proefnotities
            </p>
          </div>
          <p className="text-sm text-zinc-400 max-w-xs mx-auto leading-relaxed">
            Log veilig in met je e-mailadres of je gekoppelde account.
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-zinc-900/95 border border-zinc-800 rounded-3xl p-6 sm:p-7 shadow-2xl backdrop-blur-xl space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
            <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              Account Toegang
            </span>
            <span className="text-[11px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Beveiligd
            </span>
          </div>

          {/* Mode Toggle: Inloggen vs Account aanmaken */}
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-zinc-950 border border-zinc-800/90">
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setAuthError(null);
                setResetSuccessMessage(null);
              }}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                authMode === 'login'
                  ? 'bg-amber-500 text-zinc-950 shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Inloggen</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('register');
                setAuthError(null);
                setResetSuccessMessage(null);
              }}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                authMode === 'register'
                  ? 'bg-amber-500 text-zinc-950 shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Account aanmaken</span>
            </button>
          </div>

          {/* Security & Attempt Status Indicator */}
          <div
            className={`p-3 rounded-2xl border text-xs transition-colors ${
              isLocked
                ? 'bg-rose-500/15 border-rose-500/40 text-rose-200'
                : rateLimit.attempts > 0
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                : 'bg-zinc-950/70 border-zinc-800/90 text-zinc-400'
            }`}
          >
            {isLocked ? (
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-rose-300">Tijdelijk vergrendeld (5/5 pogingen)</div>
                  <div className="flex items-center gap-1.5 text-rose-200 font-mono text-[11px]">
                    <Clock className="w-3.5 h-3.5 text-rose-400" />
                    Opnieuw proberen over:{' '}
                    <strong className="text-rose-100">{formatCountdown(secondsRemaining)}</strong>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>Beveiliging: Max. 5 inlogpogingen</span>
                </div>
                <span
                  className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded-md ${
                    rateLimit.attempts > 2
                      ? 'bg-rose-500/20 text-rose-300'
                      : rateLimit.attempts > 0
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-zinc-800 text-zinc-300'
                  }`}
                >
                  {attemptsRemaining} / {MAX_LOGIN_ATTEMPTS} over
                </span>
              </div>
            )}
          </div>

          {/* Error Message if present */}
          {authError && (
            <div
              className={`p-3.5 rounded-2xl border text-xs space-y-3 leading-relaxed ${
                isLocked
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle
                  className={`w-4 h-4 shrink-0 mt-0.5 ${isLocked ? 'text-rose-400' : 'text-amber-400'}`}
                />
                <span>{authError}</span>
              </div>

              {showFirebaseConfigSetup && (
                <div className="pt-2 border-t border-amber-500/20 space-y-2.5">
                  <p className="text-[11px] text-zinc-300">
                    Ga in je{' '}
                    <strong className="text-amber-300">
                      Firebase Console → Project Settings (tandwiel) → General → Your apps
                    </strong>
                    , kopieer het <code className="text-amber-300">firebaseConfig</code> blok en
                    plak het hieronder (wordt blijvend bewaard in <code className="text-amber-300">/data/.firebase_env</code>):
                  </p>
                  <textarea
                    rows={4}
                    value={firebasePasteInput}
                    onChange={(e) => setFirebasePasteInput(e.target.value)}
                    placeholder={`apiKey: "AIzaSy...",\nauthDomain: "jouw-project.firebaseapp.com",\nprojectId: "jouw-project"`}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-[11px] font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={handleSaveCustomFirebaseConfig}
                    disabled={isSavingFirebaseConfig}
                    className="w-full py-2.5 px-3 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-400 text-zinc-950 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isSavingFirebaseConfig
                      ? 'Opslaan op server...'
                      : 'Koppel mijn Firebase Project & Bewaar in /data'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Password Reset Success Message */}
          {resetSuccessMessage && (
            <div className="p-3.5 rounded-2xl border bg-emerald-500/10 border-emerald-500/30 text-emerald-200 text-xs flex items-start gap-2.5 leading-relaxed">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              <span>{resetSuccessMessage}</span>
            </div>
          )}

          {/* Firebase Email & Password Form */}
          <form onSubmit={handleFirebaseEmailSubmit} className="space-y-3.5">
            {authMode === 'register' && (
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
                  Weergavenaam
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Jouw naam"
                    disabled={isSigningIn || isLocked}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
                E-mailadres
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="naam@voorbeeld.nl"
                  disabled={isSigningIn || isLocked}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
                  Wachtwoord
                </label>
                {authMode === 'login' && (
                  <button
                    type="button"
                    onClick={handlePasswordReset}
                    disabled={isSigningIn || isLocked}
                    className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 hover:underline cursor-pointer"
                  >
                    Wachtwoord vergeten?
                  </button>
                )}
              </div>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="password"
                  required
                  minLength={6}
                  autoComplete={authMode === 'register' ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isSigningIn || isLocked}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSigningIn || isLocked}
              className={`w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl font-extrabold text-sm shadow-lg transition-all ${
                isLocked
                  ? 'bg-zinc-800 text-zinc-500 border border-zinc-700/60 cursor-not-allowed opacity-60'
                  : 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-zinc-950 cursor-pointer shadow-amber-500/20'
              }`}
            >
              {authMode === 'register' ? (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>{isSigningIn ? 'Account aanmaken...' : 'Account aanmaken'}</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>{isSigningIn ? 'Bezig met inloggen...' : 'Inloggen met e-mail'}</span>
                </>
              )}
            </button>
          </form>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-zinc-800" />
            <span className="flex-shrink mx-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              Of
            </span>
            <div className="flex-grow border-t border-zinc-800" />
          </div>

          {STANDALONE_GOOGLE_CLIENT_ID &&
            STANDALONE_GOOGLE_CLIENT_ID !== 'YOUR_GOOGLE_OAUTH_CLIENT_ID' && (
              <div className="flex justify-center pt-1" ref={googleGsiButtonRef} />
            )}

          {/* Official Google Sign-In Button */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleFirebaseGoogleSignIn}
              disabled={isSigningIn || isLocked}
              className={`w-full flex items-center justify-center gap-3 px-5 py-3 rounded-2xl font-bold text-sm shadow-lg transition-all ${
                isLocked
                  ? 'bg-zinc-800 text-zinc-500 border border-zinc-700/60 cursor-not-allowed opacity-60'
                  : 'bg-white hover:bg-zinc-100 active:bg-zinc-200 text-zinc-900 cursor-pointer shadow-amber-500/5 hover:shadow-amber-500/10'
              }`}
            >
              {isLocked ? (
                <>
                  <Lock className="w-4 h-4 text-zinc-500" />
                  <span>Vergrendeld ({formatCountdown(secondsRemaining)})</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Inloggen met Google</span>
                </>
              )}
            </button>
          </div>

          {/* Privacy & data scoping guarantee */}
          <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 text-[11px] text-zinc-400 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-zinc-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              Persoonlijke Data Isolatie
            </div>
            <p className="leading-relaxed text-zinc-400">
              Al jouw bieren, cijfers, foto&apos;s en zelfgemaakte categorieën worden strikt
              gekoppeld aan jouw persoonlijke account en zijn nooit zichtbaar voor anderen.
            </p>
          </div>
        </div>

        {/* Feature bullets preview */}
        <div className="grid grid-cols-3 gap-2 text-center pt-2">
          <div className="p-2.5 rounded-xl bg-zinc-900/40 border border-zinc-800/60">
            <Trophy className="w-4 h-4 text-amber-400 mx-auto mb-1" />
            <span className="text-[11px] font-bold text-zinc-300 block">Top Bieren</span>
            <span className="text-[10px] text-zinc-500">Cijfers 1 t/m 10</span>
          </div>
          <div className="p-2.5 rounded-xl bg-zinc-900/40 border border-zinc-800/60">
            <Sparkles className="w-4 h-4 text-amber-400 mx-auto mb-1" />
            <span className="text-[11px] font-bold text-zinc-300 block">Dynamisch</span>
            <span className="text-[10px] text-zinc-500">Eigen categorieën</span>
          </div>
          <div className="p-2.5 rounded-xl bg-zinc-900/40 border border-zinc-800/60">
            <ShieldCheck className="w-4 h-4 text-amber-400 mx-auto mb-1" />
            <span className="text-[11px] font-bold text-zinc-300 block">Max 5 Pogingen</span>
            <span className="text-[10px] text-zinc-500">Beveiligde login</span>
          </div>
        </div>

        {/* Version Number Footer */}
        <div
          translate="no"
          data-no-translate="true"
          className="notranslate text-center pt-1 text-[11px] font-mono text-zinc-500"
        >
          Cervisium v{APP_VERSION}
          {getFormattedVersionDate() ? ` • ${getFormattedVersionDate()}` : ''}
        </div>
      </div>
    </div>
  );
};
