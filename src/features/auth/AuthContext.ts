/**
 * Auth state shared through React context.
 *
 * `user` is `undefined` until Firebase has restored any saved session on page
 * load, then the signed-in user or `null`. Route guards use the `undefined`
 * phase to avoid flashing the wrong page.
 */
import { createContext, useContext } from 'react';
import type { AuthUser } from '../../lib/firebase.ts';

export interface AuthState {
  user: AuthUser | null | undefined;
}

export const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const state = useContext(AuthContext);
  if (!state) throw new Error('useAuth must be used inside <AuthProvider>.');
  return state;
}
