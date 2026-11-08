import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  collection,
  collectionGroup,
  getDocs,
  setDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
} from 'firebase/firestore';
import defaultFirebaseConfig from '../firebase-applet-config.json';

export interface RuntimeFirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  firestoreDatabaseId?: string;
}

/**
 * Ondersteunt zowel zelfstandige hosting (via omgevingsvariabelen op een eigen server)
 * als de bestaande configuratie in firebase-applet-config.json.
 */
function resolveFirebaseConfig(): RuntimeFirebaseConfig {
  if (typeof window !== 'undefined') {
    const winConfig = (
      window as unknown as {
        __BIERLOG_FIREBASE_CONFIG__?: Partial<RuntimeFirebaseConfig>;
      }
    ).__BIERLOG_FIREBASE_CONFIG__;

    if (winConfig?.apiKey && winConfig?.projectId) {
      return {
        apiKey: winConfig.apiKey,
        authDomain: winConfig.authDomain || `${winConfig.projectId}.firebaseapp.com`,
        projectId: winConfig.projectId,
        storageBucket: winConfig.storageBucket || `${winConfig.projectId}.firebasestorage.app`,
        messagingSenderId: winConfig.messagingSenderId || '',
        appId: winConfig.appId || '',
        firestoreDatabaseId: winConfig.firestoreDatabaseId || '(default)',
      };
    }
  }

  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env || {};
  const hasCustomEnv =
    env.VITE_FIREBASE_API_KEY &&
    env.VITE_FIREBASE_API_KEY !== 'YOUR_FIREBASE_WEB_API_KEY' &&
    env.VITE_FIREBASE_PROJECT_ID &&
    env.VITE_FIREBASE_PROJECT_ID !== 'your-project-id';

  if (hasCustomEnv) {
    return {
      apiKey: env.VITE_FIREBASE_API_KEY!,
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || `${env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
      projectId: env.VITE_FIREBASE_PROJECT_ID!,
      storageBucket:
        env.VITE_FIREBASE_STORAGE_BUCKET || `${env.VITE_FIREBASE_PROJECT_ID}.firebasestorage.app`,
      messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: env.VITE_FIREBASE_APP_ID || '',
      firestoreDatabaseId: env.VITE_FIREBASE_DATABASE_ID || '(default)',
    };
  }

  return defaultFirebaseConfig;
}

let currentConfig: RuntimeFirebaseConfig = resolveFirebaseConfig();
const app = initializeApp(currentConfig);
export let auth: Auth = getAuth(app);
export const db =
  currentConfig.firestoreDatabaseId && currentConfig.firestoreDatabaseId !== '(default)'
    ? getFirestore(app, currentConfig.firestoreDatabaseId)
    : getFirestore(app, defaultFirebaseConfig.firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export function getActiveFirebaseProjectId(): string {
  return currentConfig.projectId || defaultFirebaseConfig.projectId;
}

export function applyRuntimeFirebaseConfig(newConfig: RuntimeFirebaseConfig): Auth {
  if (!newConfig?.apiKey || !newConfig?.projectId) {
    return auth;
  }
  currentConfig = {
    apiKey: newConfig.apiKey,
    authDomain: newConfig.authDomain || `${newConfig.projectId}.firebaseapp.com`,
    projectId: newConfig.projectId,
    storageBucket: newConfig.storageBucket || `${newConfig.projectId}.firebasestorage.app`,
    messagingSenderId: newConfig.messagingSenderId || '',
    appId: newConfig.appId || '',
    firestoreDatabaseId: newConfig.firestoreDatabaseId || '(default)',
  };
  if (typeof window !== 'undefined') {
    (
      window as unknown as {
        __BIERLOG_FIREBASE_CONFIG__?: RuntimeFirebaseConfig;
      }
    ).__BIERLOG_FIREBASE_CONFIG__ = currentConfig;
  }
  const appName = `cervisium-runtime-${currentConfig.projectId}`;
  const existingApp: FirebaseApp | undefined = getApps().find((a) => a.name === appName);
  const runtimeApp = existingApp || initializeApp(currentConfig, appName);
  auth = getAuth(runtimeApp);
  return auth;
}

export async function syncFirebaseConfigFromServer(): Promise<Auth> {
  try {
    const res = await fetch('/api/firebase-config', {
      method: 'GET',
      cache: 'no-store',
    });
    if (res.ok) {
      const data = (await res.json()) as {
        configured?: boolean;
        config?: RuntimeFirebaseConfig | null;
      };
      if (data?.configured && data.config?.apiKey && data.config?.projectId) {
        return applyRuntimeFirebaseConfig(data.config);
      }
    }
  } catch {
    // Negeer netwerkfout
  }
  return auth;
}

// OperationType & FirestoreErrorInfo conforming strictly to skill requirements
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: boolean | string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const currentUser = auth.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid,
      email: currentUser?.email,
      emailVerified: currentUser?.emailVerified,
      isAnonymous: currentUser?.isAnonymous,
      tenantId: currentUser?.tenantId,
      providerInfo:
        currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function isClientFirestoreEnabled(): boolean {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env || {};
  return env.VITE_USE_FIRESTORE === 'true';
}

export async function testConnection() {
  if (!isClientFirestoreEnabled()) {
    return;
  }
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client appears offline, will retry when network connects.');
    }
  }
}

export {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signOut,
  onAuthStateChanged,
  collection,
  collectionGroup,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  doc,
};
export type { FirebaseUser };
