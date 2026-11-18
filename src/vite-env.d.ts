/// <reference types="vite/client" />

/**
 * Typed shape of import.meta.env. Each feature slice that introduces a new
 * VITE_ variable (TMDB, Firebase, ...) adds it here so a typo at the call
 * site is a compile error instead of a silent undefined at runtime.
 */
interface ImportMetaEnv {
  readonly VITE_TMDB_READ_TOKEN: string;
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  /** Dev only: "true" points Auth and Firestore at the local Firebase emulators. */
  readonly VITE_USE_FIREBASE_EMULATORS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
