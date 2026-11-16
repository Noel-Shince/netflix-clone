/**
 * Route guards, used as layout routes in App.
 *
 * Deciding before render (instead of navigating from an effect, as the
 * tutorial does) means a logged-out visitor never sees a flash of the catalog,
 * and the page they asked for is remembered so sign-in can return them to it.
 */
import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from './AuthContext.ts';

/** Location state `/login` reads to send the user back after signing in. */
export interface LoginRedirectState {
  from?: string;
}

/** Shown while Firebase restores a saved session: a blank page in the app's background colour. */
function AuthPending() {
  return <div aria-busy="true" />;
}

/** Signed-in users only; everyone else goes to /login. */
export function RequireAuth() {
  const { user } = useAuth();
  const location = useLocation();

  if (user === undefined) return <AuthPending />;
  if (!user) {
    const state: LoginRedirectState = {
      from: location.pathname + location.search + location.hash,
    };
    return <Navigate to="/login" replace state={state} />;
  }
  return <Outlet />;
}

/**
 * Logged-out users only (the login page); signed-in users go where they were headed, or home.
 *
 * While a sign-in / sign-up is still running the redirect waits: Firebase reports
 * a new account before its display name is saved, and leaving early would let a
 * reload lose the name (slice 06).
 */
export function RedirectIfAuthed() {
  const { user, authActionPending } = useAuth();
  const location = useLocation();

  if (user === undefined) return <AuthPending />;
  if (user && !authActionPending) {
    const from = (location.state as LoginRedirectState | null)?.from;
    return <Navigate to={from ?? '/'} replace />;
  }
  return <Outlet />;
}
