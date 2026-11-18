/**
 * Watch history: the titles a user has opened in the player, newest first.
 *
 * It is the only signal the recommendation rows have about a user's taste
 * (slice 09). Stored in localStorage under the signed-in user's id and the
 * active profile (slice 11), so each profile gets its own history and
 * recommendations. It does not follow the user to another device; moving it
 * to Firestore (under users/{uid}/profiles/{slot}) is a later slice.
 *
 * "Watched" means "opened the player page": TMDB only has trailers, so there
 * is no real playback time to measure.
 */
import { currentUserId } from './firebase.ts';
import { getStoredActiveProfileId } from './profiles.ts';

export interface WatchedTitle {
  id: number;
  name: string;
  /** When the player was last opened for this title, in ms since epoch. */
  watchedAt: number;
}

/** Enough to seed recommendations; older entries are dropped. */
const MAX_ENTRIES = 20;
const KEY_PREFIX = 'noelflix:watch-history:';

function storageKey(): string | null {
  const uid = currentUserId();
  const profileId = uid ? getStoredActiveProfileId(uid) : null;
  return uid && profileId ? `${KEY_PREFIX}${uid}:${profileId}` : null;
}

function isWatchedTitle(value: unknown): value is WatchedTitle {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === 'number' && typeof v.name === 'string' && typeof v.watchedAt === 'number';
}

/** The signed-in user's history, newest first. Empty when signed out or unreadable. */
export function getWatchHistory(): WatchedTitle[] {
  const key = storageKey();
  if (!key) return [];
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter(isWatchedTitle) : [];
  } catch {
    // Corrupt JSON, or storage blocked (private mode): behave as "no history".
    return [];
  }
}

/** Moves (or adds) a title to the front of the signed-in user's history. */
export function recordWatch(title: { id: number; name: string }): void {
  const key = storageKey();
  if (!key) return;
  const entry: WatchedTitle = { id: title.id, name: title.name, watchedAt: Date.now() };
  const next = [entry, ...getWatchHistory().filter((t) => t.id !== title.id)].slice(0, MAX_ENTRIES);
  try {
    localStorage.setItem(key, JSON.stringify(next));
  } catch {
    // Quota or blocked storage: recommendations just stay unpersonalised.
  }
}

/**
 * Deletes one profile's history. Called when the profile is deleted, because
 * profile slots are reused and a new profile must not inherit the old history.
 */
export function clearWatchHistory(uid: string, profileId: string): void {
  try {
    localStorage.removeItem(`${KEY_PREFIX}${uid}:${profileId}`);
  } catch {
    // Blocked storage: nothing was stored either.
  }
}
