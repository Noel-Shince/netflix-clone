/**
 * Layout route for pages that need a chosen profile (browse, player). Nested
 * inside `RequireAuth`, so the user is always signed in here.
 *
 * Without a chosen profile it sends the user to "Who's watching?", remembering
 * the page they asked for, the same way `RequireAuth` does for /login.
 */
import { Navigate, Outlet, useLocation } from 'react-router';
import { useProfiles } from '../../lib/profileContext.ts';
import { ProfilesLoadError } from './components/ProfilesLoadError.tsx';

/** Location state `/profiles` reads to continue to the requested page. */
export interface ProfileRedirectState {
  from?: string;
}

export function RequireProfile() {
  const { status, activeProfile } = useProfiles();
  const location = useLocation();

  if (status === 'idle' || status === 'loading') return <div aria-busy="true" />;
  if (status === 'error') return <ProfilesLoadError />;
  if (!activeProfile) {
    const state: ProfileRedirectState = {
      from: location.pathname + location.search + location.hash,
    };
    return <Navigate to="/profiles" replace state={state} />;
  }
  // Keyed by profile, so switching profiles remounts the page and anything it
  // read for the previous profile (e.g. recommendation rows) is read again.
  return <Outlet key={activeProfile.id} />;
}
