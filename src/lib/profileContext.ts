/**
 * Profile state shared through React context (slice 11).
 *
 * Lives in lib/, not in features/profiles, because the shared Navbar (avatar,
 * profile switcher) and other features (per-profile data such as My List)
 * read it, and features may not import each other (ADR-2). The provider that
 * fills it is `features/profiles/ProfileProvider.tsx`.
 */
import { createContext, useContext } from 'react';
import type { Profile, ProfileInput, ProfileSlot } from './profiles.ts';

export type ProfilesStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface ProfilesState {
  /** `idle` while signed out; `loading` until the first read finishes. */
  status: ProfilesStatus;
  profiles: Profile[];
  /** The profile chosen on "Who's watching?", or null until one is picked. */
  activeProfile: Profile | null;
  /** Message for a failed load (status `error`). */
  error: string | null;
  reload: () => void;
  selectProfile: (id: ProfileSlot) => void;
  /** Forgets the active profile, so the next protected page shows the picker. */
  clearActiveProfile: () => void;
  createProfile: (input: ProfileInput) => Promise<Profile>;
  updateProfile: (id: ProfileSlot, input: ProfileInput) => Promise<void>;
  deleteProfile: (id: ProfileSlot) => Promise<void>;
}

export const ProfileContext = createContext<ProfilesState | null>(null);

export function useProfiles(): ProfilesState {
  const state = useContext(ProfileContext);
  if (!state) throw new Error('useProfiles must be used inside <ProfileProvider>.');
  return state;
}
