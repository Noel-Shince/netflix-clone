/**
 * Turns Firebase auth errors into messages a user can act on.
 *
 * Raw codes ("auth/invalid-credential") are never shown. Unknown errors get a
 * generic message and are logged so they can still be debugged.
 */
import { firebaseErrorCode } from '../../../lib/firebase.ts';

const MESSAGES: Record<string, string> = {
  // Projects with email enumeration protection (the default since 2023) return
  // invalid-credential for both cases, so the message cannot say which it was.
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/wrong-password': 'Incorrect email or password.',
  'auth/user-not-found': 'Incorrect email or password.',
  'auth/email-already-in-use': 'An account with this email already exists. Sign in instead.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/missing-password': 'Enter your password.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/too-many-requests': 'Too many attempts. Please wait a few minutes and try again.',
  'auth/network-request-failed': "Can't reach the server. Check your connection and try again.",
  // Setup problems on the Firebase project, not the user's fault.
  'auth/operation-not-allowed': 'Email sign-in is not enabled for this app yet.',
  'auth/configuration-not-found': 'Sign-in is not set up for this app yet.',
  'auth/invalid-api-key': 'Sign-in is not set up for this app yet.',
  'auth/api-key-not-valid.-please-pass-a-valid-api-key.': 'Sign-in is not set up for this app yet.',
};

const FALLBACK = 'Something went wrong. Please try again.';

export function authErrorMessage(error: unknown): string {
  const code = firebaseErrorCode(error);
  const message = code ? MESSAGES[code] : undefined;
  if (!message) console.error('Unhandled auth error', error);
  return message ?? FALLBACK;
}
