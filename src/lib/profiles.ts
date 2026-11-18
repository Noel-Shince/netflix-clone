/**
 * Viewing profiles: data model and Firestore access (slice 09).
 *
 * Each account has up to five profiles at `users/{uid}/profiles/{slot}`, where
 * the document id is a fixed slot id ("p1"–"p5"). Fixed ids let the security
 * rules enforce the five-profile cap, which a counter or query cannot do.
 * Per-profile data (My List, watch history) belongs in subcollections of the
 * profile document.
 *
 * Plain functions only: React state lives in features/profiles, and the shared
 * context type lives in profileContext.ts. Uses the Firestore lite SDK; see ADR-11.
 */
import { FirebaseError } from 'firebase/app';
import { collection, deleteDoc, doc, getDocs, setDoc, updateDoc } from 'firebase/firestore/lite';
import { db } from './firebase.ts';

export const PROFILE_SLOTS = ['p1', 'p2', 'p3', 'p4', 'p5'] as const;
export type ProfileSlot = (typeof PROFILE_SLOTS)[number];
export const MAX_PROFILES = PROFILE_SLOTS.length;
export const MAX_PROFILE_NAME_LENGTH = 20;

/**
 * The fixed avatar set: a colour and a face. Stored by id, so colours can be
 * restyled later without migrating any data. Must match `firestore.rules`.
 */
export const AVATARS = [
  { id: 'red', color: '#e50914', face: 'smile' },
  { id: 'blue', color: '#2b7fff', face: 'grin' },
  { id: 'yellow', color: '#f5b400', face: 'wink' },
  { id: 'green', color: '#1db954', face: 'smile' },
  { id: 'purple', color: '#7c3aed', face: 'grin' },
  { id: 'teal', color: '#0fa5a5', face: 'wink' },
  { id: 'orange', color: '#f06a1d', face: 'grin' },
  { id: 'pink', color: '#e0458f', face: 'smile' },
] as const;
export type AvatarId = (typeof AVATARS)[number]['id'];
export type Avatar = (typeof AVATARS)[number];

export interface Profile {
  id: ProfileSlot;
  name: string;
  avatar: AvatarId;
  /** Milliseconds since epoch; profiles are shown oldest first. */
  createdAt: number;
}

export interface ProfileInput {
  name: string;
  avatar: AvatarId;
}

export function avatarById(id: string): Avatar {
  return AVATARS.find((avatar) => avatar.id === id) ?? AVATARS[0];
}

function isProfileSlot(id: string): id is ProfileSlot {
  return (PROFILE_SLOTS as readonly string[]).includes(id);
}

function profilesCollection(uid: string) {
  return collection(db, 'users', uid, 'profiles');
}

/** Reads the account's profiles, oldest first. (The lite SDK always reads from the server.) */
export async function listProfiles(uid: string): Promise<Profile[]> {
  const snapshot = await getDocs(profilesCollection(uid));
  const profiles: Profile[] = [];
  for (const document of snapshot.docs) {
    if (!isProfileSlot(document.id)) continue;
    const data = document.data();
    profiles.push({
      id: document.id,
      name: String(data.name ?? ''),
      avatar: avatarById(String(data.avatar)).id,
      createdAt: typeof data.createdAt === 'number' ? data.createdAt : 0,
    });
  }
  return profiles.sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
}

/** Creates a profile in the first free slot. Throws if all slots are taken. */
export async function createProfile(
  uid: string,
  existing: readonly Profile[],
  input: ProfileInput,
): Promise<Profile> {
  const taken = new Set(existing.map((profile) => profile.id));
  const slot = PROFILE_SLOTS.find((id) => !taken.has(id));
  if (!slot) throw new ProfileLimitError();
  const profile: Profile = { id: slot, ...cleanInput(input), createdAt: Date.now() };
  await setDoc(doc(profilesCollection(uid), slot), {
    name: profile.name,
    avatar: profile.avatar,
    createdAt: profile.createdAt,
  });
  return profile;
}

export async function updateProfile(
  uid: string,
  id: ProfileSlot,
  input: ProfileInput,
): Promise<ProfileInput> {
  const clean = cleanInput(input);
  await updateDoc(doc(profilesCollection(uid), id), { ...clean });
  return clean;
}

/**
 * Deletes the profile document. Subcollections are not deleted with it in
 * Firestore; once profiles own data (e.g. My List), that data's module must
 * delete it here first.
 */
export function deleteProfile(uid: string, id: ProfileSlot): Promise<void> {
  return deleteDoc(doc(profilesCollection(uid), id));
}

function cleanInput({ name, avatar }: ProfileInput): ProfileInput {
  return { name: name.trim().slice(0, MAX_PROFILE_NAME_LENGTH), avatar };
}

/**
 * Validates a profile name against the rules and the account's other profiles.
 * Returns an error message, or null when the name is fine.
 */
export function profileNameError(
  name: string,
  profiles: readonly Profile[],
  ignoreId?: ProfileSlot,
): string | null {
  const trimmed = name.trim();
  if (!trimmed) return 'Enter a name.';
  if (trimmed.length > MAX_PROFILE_NAME_LENGTH) {
    return `Use ${MAX_PROFILE_NAME_LENGTH} characters or fewer.`;
  }
  const lower = trimmed.toLowerCase();
  if (profiles.some((p) => p.id !== ignoreId && p.name.toLowerCase() === lower)) {
    return 'Another profile already has this name.';
  }
  return null;
}

/** Name for the profile created automatically on an account's first visit. */
export function defaultProfileName(displayName: string | null, email: string | null): string {
  const fromAccount = displayName?.trim() || email?.split('@')[0]?.trim() || '';
  return fromAccount.slice(0, MAX_PROFILE_NAME_LENGTH) || 'Me';
}

export class ProfileLimitError extends Error {
  constructor() {
    super(`An account can have up to ${MAX_PROFILES} profiles.`);
    this.name = 'ProfileLimitError';
  }
}

/** A short, user-facing message for a failed profile read or write. */
export function profileErrorMessage(error: unknown): string {
  if (error instanceof ProfileLimitError) return error.message;
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'permission-denied':
      case 'unauthenticated':
        return 'Your account is not allowed to do that. Try signing out and in again.';
      case 'unavailable':
      case 'deadline-exceeded':
        return 'Could not reach the server. Check your connection and try again.';
      case 'not-found':
      case 'failed-precondition':
        return 'Profiles are not set up on the server yet.';
    }
  }
  return 'Something went wrong with your profiles. Please try again.';
}
