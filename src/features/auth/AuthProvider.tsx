/**
 * Subscribes to Firebase auth once for the whole app and provides the current
 * user to `useAuth()`. Mounted at the root in App.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { subscribeToAuth, type AuthUser } from '../../lib/firebase.ts';
import { AuthContext } from './AuthContext.ts';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined);
  const [authActionPending, setAuthActionPending] = useState(false);
  // State updates are async, so a ref is what actually blocks a second call
  // fired in the same tick (e.g. a double click).
  const pendingRef = useRef(false);

  useEffect(() => subscribeToAuth(setUser), []);

  const runAuthAction = useCallback(async (action: () => Promise<void>) => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setAuthActionPending(true);
    try {
      await action();
    } finally {
      pendingRef.current = false;
      setAuthActionPending(false);
    }
  }, []);

  return <AuthContext value={{ user, authActionPending, runAuthAction }}>{children}</AuthContext>;
}
