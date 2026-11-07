import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UserAccount } from '../types';
import { auth, googleProvider, signInWithPopup } from '../firebase';
import {
  saveCategories,
  saveBeers,
  saveTastings,
  saveGlasses,
} from '../services/storage';
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

// Optionele standalone Google OAuth Client ID (werkt 100% zonder Google/Firebase database!)
const STANDALONE_GOOGLE_CLIENT_ID = (
  ((import.meta as unknown as { env?: Record<string, string | undefined> }).env
    ?.VITE_GOOGLE_CLIENT_ID || '') as string
).trim();

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [rateLimit, setRateLimit] = useState<RateLimitData>(getStoredRateLimit);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const googleGsiButtonRef = useRef<HTMLDivElement>(null);

  const isLocked = secondsRemaining > 0;
  const attemptsRemaining = Math.max(0, MAX_LOGIN_ATTEMPTS - rateLimit.attempts);

  const formatCountdown = (totalSec: number) => {
    const minutes = Math.floor(totalSec / 60);
    const seconds = totalSec % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  // Verifieer een Google ID Token op onze eigen Docker/Express server (/api/auth/google)
  // en sla het account + sessie-cookie direct op in de eigen Docker PostgreSQL database.
  const verifyAndSyncWithDockerBackend = useCallback(
    async (idToken: string, fallbackAccount?: UserAccount): Promise<UserAccount> => {
      try {
        const res = await fetch('/api/auth/google', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credential: idToken }),
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
            name: data.user.name,
            googleName: data.user.googleName,
            email: data.user.email,
            avatarUrl: data.user.avatarUrl,
            createdAt: data.user.createdAt || new Date().toISOString(),
          };

          // Laad eventuele collecties vanuit de eigen Docker PostgreSQL database
          if (data.records) {
            if (Array.isArray(data.records.categories) && data.records.categories.length > 0) {
              saveCategories(serverUser.id, data.records.categories);
            }
            if (Array.isArray(data.records.beers) && data.records.beers.length > 0) {
              saveBeers(serverUser.id, data.records.beers);
            }
            if (Array.isArray(data.records.tastings) && data.records.tastings.length > 0) {
              saveTastings(serverUser.id, data.records.tastings);
            }
            if (Array.isArray(data.records.glasses) && data.records.glasses.length > 0) {
              saveGlasses(serverUser.id, data.records.glasses);
            }
          }

          return serverUser;
        }
      } catch {
        // Gebruik fallback wanneer server nog aan het opstarten is
      }

      if (fallbackAccount) return fallbackAccount;
      throw new Error('Kon Google-account niet verifiëren bij de server.');
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

  // Laad automatisch Google Identity Services (100% zonder Google Firestore database!)
  // wanneer VITE_GOOGLE_CLIENT_ID is ingesteld in Docker / .env
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
            const account = await verifyAndSyncWithDockerBackend(response.credential);
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
  }, [isLocked, onLogin, verifyAndSyncWithDockerBackend]);

  const handleFirebaseGoogleSignIn = async () => {
    if (isLocked) {
      setAuthError(
        `Toegang tijdelijk vergrendeld wegens te veel mislukte inlogpogingen. Wacht nog ${formatCountdown(secondsRemaining)}.`
      );
      return;
    }

    setIsSigningIn(true);
    setAuthError(null);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const idToken = await user.getIdToken();

      // Geslaagd: reset inlogpogingen
      clearRateLimit();
      setRateLimit({ attempts: 0, lockedUntil: null });

      const fallbackAccount: UserAccount = {
        id: user.uid,
        name: user.displayName || user.email?.split('@')[0] || 'Bierliefhebber',
        email: user.email || 'google-user@bierlog.nl',
        avatarUrl: user.photoURL || undefined,
        createdAt: new Date().toISOString(),
      };

      // Synchroniseer direct met de eigen Docker PostgreSQL database
      const verifiedAccount = await verifyAndSyncWithDockerBackend(idToken, fallbackAccount);
      onLogin(verifiedAccount);
    } catch (err: unknown) {
      console.warn('Google Sign-In notice:', err);

      const newAttempts = rateLimit.attempts + 1;
      let newLockedUntil: number | null = null;

      if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
        newLockedUntil = Date.now() + LOCKOUT_DURATION_MS;
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
        const msg = err instanceof Error ? err.message : String(err);

        if (msg.includes('popup-closed-by-user')) {
          setAuthError(
            `Inloggen geannuleerd. Nog ${remaining} van de ${MAX_LOGIN_ATTEMPTS} inlogpogingen over.`
          );
        } else if (msg.includes('popup-blocked')) {
          setAuthError(
            `Pop-up geblokkeerd door browser. Sta pop-ups toe. Nog ${remaining} inlogpoging(en) over.`
          );
        } else {
          setAuthError(
            `Google login mislukt. Poging ${newAttempts} van ${MAX_LOGIN_ATTEMPTS}. Nog ${remaining} poging(en) over.`
          );
        }
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
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-100">BierLog</h1>
            <p className="text-xs font-semibold text-amber-400 tracking-wider uppercase mt-0.5">
              Persoonlijke Bier Collectie &amp; Proefnotities
            </p>
          </div>
          <p className="text-sm text-zinc-400 max-w-xs mx-auto leading-relaxed">
            Veilig inloggen via jouw geverifieerde Google-account.
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-zinc-900/95 border border-zinc-800 rounded-3xl p-6 sm:p-7 shadow-2xl backdrop-blur-xl space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
            <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              Alleen Google Login
            </span>
            <span className="text-[11px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Beveiligd
            </span>
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
              className={`p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 leading-relaxed ${
                isLocked
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
              }`}
            >
              <AlertCircle
                className={`w-4 h-4 shrink-0 mt-0.5 ${isLocked ? 'text-rose-400' : 'text-amber-400'}`}
              />
              <span>{authError}</span>
            </div>
          )}

          {/* Standalone Google Identity Services (wanneer VITE_GOOGLE_CLIENT_ID is ingesteld) */}
          {STANDALONE_GOOGLE_CLIENT_ID &&
            STANDALONE_GOOGLE_CLIENT_ID !== 'YOUR_GOOGLE_OAUTH_CLIENT_ID' && (
              <div className="flex justify-center pt-1" ref={googleGsiButtonRef} />
            )}

          {/* Official Google Sign-In Button */}
          <div className="space-y-2 pt-1">
            <button
              onClick={handleFirebaseGoogleSignIn}
              disabled={isSigningIn || isLocked}
              className={`w-full flex items-center justify-center gap-3 px-5 py-3.5 rounded-2xl font-bold text-sm shadow-lg transition-all ${
                isLocked
                  ? 'bg-zinc-800 text-zinc-500 border border-zinc-700/60 cursor-not-allowed opacity-60'
                  : 'bg-white hover:bg-zinc-100 active:bg-zinc-200 text-zinc-900 cursor-pointer shadow-amber-500/5 hover:shadow-amber-500/10 hover:scale-[1.01]'
              }`}
            >
              {isLocked ? (
                <>
                  <Lock className="w-5 h-5 text-zinc-500" />
                  <span>Vergrendeld ({formatCountdown(secondsRemaining)})</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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
                  <span>{isSigningIn ? 'Inloggen bij Google...' : 'Inloggen met Google'}</span>
                </>
              )}
            </button>

            <p className="text-[11px] text-zinc-500 text-center pt-1">
              Handmatige e-mailinvoer is uitgeschakeld. Alleen geverifieerde Google-authenticatie is
              toegestaan.
            </p>
          </div>

          {/* Privacy & data scoping guarantee */}
          <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 text-[11px] text-zinc-400 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-zinc-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              Persoonlijke Data Isolatie
            </div>
            <p className="leading-relaxed text-zinc-400">
              Al jouw bieren, cijfers, foto&apos;s en zelfgemaakte categorieën worden strikt
              gekoppeld aan jouw unieke Google-account en zijn nooit zichtbaar voor anderen.
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
      </div>
    </div>
  );
};
