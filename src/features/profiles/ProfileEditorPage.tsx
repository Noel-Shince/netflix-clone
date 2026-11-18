/**
 * `/profiles/new` and `/profiles/:profileId/edit` (slice 11): name, avatar,
 * and (when editing) delete.
 */
import { useState } from 'react';
import { Navigate, useLocation, useParams } from 'react-router';
import { useProfiles } from '../../lib/profileContext.ts';
import { MAX_PROFILES } from '../../lib/profiles.ts';
import { ProfileForm } from './components/ProfileForm.tsx';
import { ProfilesGate } from './components/ProfilesGate.tsx';
import type { ProfileNavState } from './types.ts';

export function ProfileEditorPage() {
  const { profileId } = useParams();
  return (
    <ProfilesGate>
      <Editor key={profileId ?? 'new'} profileId={profileId} />
    </ProfilesGate>
  );
}

function Editor({ profileId }: { profileId: string | undefined }) {
  const { profiles } = useProfiles();
  const location = useLocation();
  const navState = (location.state as ProfileNavState | null) ?? {};

  // Decided once, on arrival: saving the fifth profile or deleting this one
  // changes `profiles`, and must not bounce the user away before the form
  // navigates to where they came from.
  const [{ existing, unavailable }] = useState(() => {
    const found = profileId ? profiles.find((p) => p.id === profileId) : undefined;
    return {
      existing: found,
      // Unknown id, or "add" with every slot taken (e.g. a stale bookmark).
      unavailable: profileId ? !found : profiles.length >= MAX_PROFILES,
    };
  });

  if (unavailable) {
    return <Navigate to="/profiles/manage" replace state={{ from: navState.from }} />;
  }
  return <ProfileForm profile={existing} navState={navState} />;
}
