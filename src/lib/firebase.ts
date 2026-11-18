/**
 * Firebase client: the only module that imports the Firebase SDK.
 *
 * Initialises the app once from the VITE_FIREBASE_* variables (ADR-4) and
 * exposes the handful of auth operations the app needs as plain functions, so
 * components never touch `firebase/*` and swapping the provider stays a
 * one-file change. Added in slice 05. Slice 09 adds Firestore (`db`, lite SDK,
 * ADR-11); its queries live in modules under lib/ (e.g. profiles.ts).
 */
import { FirebaseError, initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  connectAuthEmulator,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore/lite';
import { envFlag, requireEnv } from './env.ts';

const app = initializeApp({
  apiKey: requireEnv('VITE_FIREBASE_API_KEY'),
  authDomain: requireEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: requireEnv('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: requireEnv('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: requireEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: requireEnv('VITE_FIREBASE_APP_ID'),
});

const auth = getAuth(app);
export const db = getFirestore(app);

// Local development against `firebase emulators:start` (ports in firebase.json).
// DEV-gated so a stray flag can never point a production build at localhost.
if (import.meta.env.DEV && envFlag('VITE_USE_FIREBASE_EMULATORS')) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}

export type AuthUser = User;

/**
 * "Remember me" maps to Firebase persistence: local survives browser restarts,
 * session ends with the tab. It must be set before the sign-in call it applies to.
 */
function applyPersistence(remember: boolean): Promise<void> {
  return setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
}

export async function signUp(
  name: string,
  email: string,
  password: string,
  remember: boolean,
): Promise<void> {
  await applyPersistence(remember);
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  try {
    await updateProfile(user, { displayName: name });
  } catch (error) {
    // The account exists and the user is signed in; a missing display name is
    // not worth failing sign-up over (nothing in v1 shows it yet).
    console.warn('Could not save display name', error);
  }
}

export async function signIn(email: string, password: string, remember: boolean): Promise<void> {
  await applyPersistence(remember);
  await signInWithEmailAndPassword(auth, email, password);
}

export function logOut(): Promise<void> {
  return signOut(auth);
}

/**
 * Calls `listener` with the current user (or null) once Firebase has restored
 * any saved session, and again on every sign-in / sign-out. Returns an unsubscribe.
 */
export function subscribeToAuth(listener: (user: AuthUser | null) => void): () => void {
  return onAuthStateChanged(auth, listener);
}

/** The Firebase error code (e.g. "auth/invalid-credential"), or null for non-Firebase errors. */
export function firebaseErrorCode(error: unknown): string | null {
  return error instanceof FirebaseError ? error.code : null;
}
