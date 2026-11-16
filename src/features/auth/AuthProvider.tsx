/**
 * Subscribes to Firebase auth once for the whole app and provides the current
 * user to `useAuth()`. Mounted at the root in App.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { subscribeToAuth, type AuthUser } from '../../lib/firebase.ts';
import { AuthContext } from './AuthContext.ts';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined);

  useEffect(() => subscribeToAuth(setUser), []);

  return <AuthContext value={{ user }}>{children}</AuthContext>;
}
