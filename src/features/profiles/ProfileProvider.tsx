/**
 * Loads the signed-in account's profiles and tracks which one is watching
 * (slice 11). Mounted once in App, inside AuthProvider.
 *
 * - First visit (no profiles yet): creates one named after the account, so
 *   every account always has at least one profile.
 * - The chosen profile is remembered per account in localStorage, so a reload
 *   or a new tab does not ask "Who's watching?" again. Signing out forgets it,
 *   so the next sign-in shows the picker, like Netflix.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ProfileContext,
  type ProfilesState,
  type ProfilesStatus,
} from '../../lib/profileContext.ts';
import {
  createProfile as createProfileDoc,
  defaultProfileName,
  deleteProfile as deleteProfileDoc,
  getStoredActiveProfileId,
  listProfiles,
  profileErrorMessage,
  setStoredActiveProfileId,
  updateProfile as updateProfileDoc,
  type Profile,
  type ProfileInput,
  type ProfileSlot,
} from '../../lib/profiles.ts';
import { clearMyList } from '../../lib/myList.ts';
import { clearWatchHistory } from '../../lib/watchHistory.ts';

interface ProfileProviderProps {
  /** The signed-in account, or null while signed out or while sign-up is finishing. */
  account: { uid: string; displayName: string | null; email: string | null } | null;
  children: ReactNode;
}

const NO_PROFILES: Profile[] = [];

interface LoadState {
  /** Which load (`uid:reloadKey`) this result belongs to; a stale key means "loading". */
  key: string;
  status: 'ready' | 'error';
  profiles: Profile[];
  error: string | null;
}

export function ProfileProvider({ account, children }: ProfileProviderProps) {
  const uid = account?.uid ?? null;
  const [reloadKey, setReloadKey] = useState(0);
  const loadKey = uid ? `${uid}:${reloadKey}` : null;
  const [load, setLoad] = useState<LoadState | null>(null);
  // The profile picked in this tab. Until one is picked, fall back to the one
  // remembered for this account in localStorage.
  const [chosen, setChosen] = useState<{ uid: string; id: string | null } | null>(null);
  // A new sign-in starts fresh, even for the same account (React's
  // "adjust state when a prop changes" pattern, so no effect is needed).
  const [chosenForUid, setChosenForUid] = useState(uid);
  if (chosenForUid !== uid) {
    setChosenForUid(uid);
    setChosen(null);
  }
  const activeId = !uid ? null : chosen?.uid === uid ? chosen.id : getStoredActiveProfileId(uid);

  // The name for a first-visit profile is read when loading starts, not as an
  // effect dependency: it must not re-trigger a load.
  const accountRef = useRef(account);
  useEffect(() => {
    accountRef.current = account;
  });

  // Signing out (or switching account) forgets the previous account's choice.
  const previousUid = useRef<string | null>(null);
  useEffect(() => {
    if (previousUid.current && previousUid.current !== uid) {
      setStoredActiveProfileId(previousUid.current, null);
    }
    previousUid.current = uid;
  }, [uid]);

  useEffect(() => {
    if (!uid || !loadKey) return;
    let cancelled = false;

    (async () => {
      let profiles = await listProfiles(uid);
      if (profiles.length === 0) {
        const current = accountRef.current;
        const first = await createProfileDoc(uid, [], {
          name: defaultProfileName(current?.displayName ?? null, current?.email ?? null),
          avatar: 'red',
        });
        profiles = [first];
      }
      if (!cancelled) setLoad({ key: loadKey, status: 'ready', profiles, error: null });
    })().catch((error: unknown) => {
      console.error('Could not load profiles', error);
      if (!cancelled) {
        setLoad({ key: loadKey, status: 'error', profiles: [], error: profileErrorMessage(error) });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [uid, loadKey]);

  const current = load && load.key === loadKey ? load : null;
  const status: ProfilesStatus = !uid ? 'idle' : (current?.status ?? 'loading');
  const profiles = current?.profiles ?? NO_PROFILES;

  const selectProfile = useCallback(
    (id: ProfileSlot) => {
      if (!uid) return;
      setStoredActiveProfileId(uid, id);
      setChosen({ uid, id });
    },
    [uid],
  );

  const clearActiveProfile = useCallback(() => {
    if (!uid) return;
    setStoredActiveProfileId(uid, null);
    setChosen({ uid, id: null });
  }, [uid]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  /** Applies a confirmed change to the current load's profile list. */
  const editProfiles = useCallback((change: (list: Profile[]) => Profile[]) => {
    setLoad((state) => (state ? { ...state, profiles: change(state.profiles) } : state));
  }, []);

  // Mutations update local state only after Firestore confirms the write, so
  // the UI never shows a profile the server rejected.
  const createProfile = useCallback(
    async (input: ProfileInput) => {
      if (!uid) throw new Error('Not signed in.');
      const profile = await createProfileDoc(uid, profiles, input);
      editProfiles((list) => [...list, profile]);
      return profile;
    },
    [uid, profiles, editProfiles],
  );

  const updateProfile = useCallback(
    async (id: ProfileSlot, input: ProfileInput) => {
      if (!uid) throw new Error('Not signed in.');
      const saved = await updateProfileDoc(uid, id, input);
      editProfiles((list) => list.map((p) => (p.id === id ? { ...p, ...saved } : p)));
    },
    [uid, editProfiles],
  );

  const deleteProfile = useCallback(
    async (id: ProfileSlot) => {
      if (!uid) throw new Error('Not signed in.');
      if (profiles.length <= 1) throw new Error('An account needs at least one profile.');
      await deleteProfileDoc(uid, id);
      clearWatchHistory(uid, id);
      // Best effort: the profile is already gone, so a failure here only
      // leaves orphaned list docs, which the next profile in the slot would see.
      await clearMyList(`users/${uid}/profiles/${id}`).catch((error: unknown) =>
        console.warn('Could not clear My List for the deleted profile', error),
      );
      editProfiles((list) => list.filter((p) => p.id !== id));
      if (activeId === id) clearActiveProfile();
    },
    [uid, profiles.length, activeId, editProfiles, clearActiveProfile],
  );

  const value = useMemo<ProfilesState>(
    () => ({
      status,
      profiles,
      // A stored id for a profile that no longer exists counts as none.
      activeProfile: profiles.find((p) => p.id === activeId) ?? null,
      error: current?.error ?? null,
      reload,
      selectProfile,
      clearActiveProfile,
      createProfile,
      updateProfile,
      deleteProfile,
    }),
    [
      status,
      profiles,
      activeId,
      current,
      reload,
      selectProfile,
      clearActiveProfile,
      createProfile,
      updateProfile,
      deleteProfile,
    ],
  );

  return <ProfileContext value={value}>{children}</ProfileContext>;
}
