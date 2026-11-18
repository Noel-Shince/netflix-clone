/**
 * Full-page error for a failed profile load, with Retry and Sign out (a user
 * stuck here must still be able to leave).
 */
import { logOut } from '../../../lib/firebase.ts';
import { useProfiles } from '../../../lib/profileContext.ts';
import { ProfilesShell } from './ProfilesShell.tsx';

export function ProfilesLoadError() {
  const { error, reload } = useProfiles();
  return (
    <ProfilesShell>
      <div className="profiles__center" role="alert">
        <h1 className="profiles__heading">Could not load your profiles</h1>
        <p className="profiles__message">{error}</p>
        <div className="profiles__actions">
          <button
            type="button"
            className="profiles__button profiles__button--primary"
            onClick={reload}
          >
            Retry
          </button>
          <button
            type="button"
            className="profiles__button"
            onClick={() => {
              logOut().catch((caught: unknown) => console.error('Sign out failed', caught));
            }}
          >
            Sign out
          </button>
        </div>
      </div>
    </ProfilesShell>
  );
}
