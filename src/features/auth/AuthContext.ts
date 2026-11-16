/**
 * Auth state shared through React context.
 *
 * `user` is `undefined` until Firebase has restored any saved session on page
 * load, then the signed-in user or `null`. Route guards use the `undefined`
 * phase to avoid flashing the wrong page.
 *
 * `authActionPending` is true while a sign-in / sign-up started through
 * `runAuthAction` is still running (slice 06). The login page shows it as a busy
 * button, and `RedirectIfAuthed` waits for it so follow-up work (saving the
 * display name) finishes before the app navigates away.
 */
import { createContext, useContext } from 'react';
import type { AuthUser } from '../../lib/firebase.ts';

export interface AuthState {
  user: AuthUser | null | undefined;
  authActionPending: boolean;
  /**
   * Runs `action` with `authActionPending` set. Resolves or rejects with the
   * action; a call made while another is pending is ignored.
   */
  runAuthAction: (action: () => Promise<void>) => Promise<void>;
}

export const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const state = useContext(AuthContext);
  if (!state) throw new Error('useAuth must be used inside <AuthProvider>.');
  return state;
}
