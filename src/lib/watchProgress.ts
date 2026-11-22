/**
 * Playback resume position, in Firestore under the viewing profile:
 * `{ownerPath}/watchProgress/{mediaType}-{tmdbId}` (slice 18; season/episode
 * added when the player gained a TV episode selector).
 *
 * The player page reports position via VidKing's postMessage events while
 * playing; this persists it so the page can resume a title where a previous
 * session left off, even from another device. For TV, `season`/`episode`
 * say which episode the saved `progressSeconds` belongs to, so reopening the
 * show resumes the right episode, not just S1E1. Owner is set from outside
 * (`setWatchProgressOwner`, mirroring myList.ts), so this module knows
 * nothing of auth or profiles.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit as fsLimit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore/lite';
import { db } from './firebase.ts';
import type { MediaType } from './media.ts';

let ownerPath: string | null = null;

/** Whose progress to read/write: a Firestore document path, or null when signed out. */
export function setWatchProgressOwner(path: string | null) {
  ownerPath = path;
}

function progressDoc(id: number, mediaType: MediaType) {
  return ownerPath ? doc(db, ownerPath, 'watchProgress', `${mediaType}-${id}`) : null;
}

export interface WatchProgress {
  progressSeconds: number;
  durationSeconds: number | null;
  completed: boolean;
  /** TV only: the episode `progressSeconds` belongs to. Null for movies. */
  season?: number | null;
  episode?: number | null;
}

/** The saved resume point for a title, or null when signed out, unsaved, or unreadable. */
export async function getWatchProgress(
  id: number,
  mediaType: MediaType,
): Promise<WatchProgress | null> {
  const ref = progressDoc(id, mediaType);
  if (!ref) return null;
  try {
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) return null;
    const data = snapshot.data();
    if (typeof data.progressSeconds !== 'number') return null;
    return {
      progressSeconds: data.progressSeconds,
      durationSeconds: typeof data.durationSeconds === 'number' ? data.durationSeconds : null,
      completed: data.completed === true,
      season: typeof data.season === 'number' ? data.season : null,
      episode: typeof data.episode === 'number' ? data.episode : null,
    };
  } catch (error) {
    console.error('Could not read watch progress', error);
    return null;
  }
}

/** Fire-and-forget: a failed save just means resume won't work next time. */
export function saveWatchProgress(
  title: { id: number; mediaType: MediaType; name: string },
  progress: WatchProgress,
): void {
  const ref = progressDoc(title.id, title.mediaType);
  if (!ref) return;
  void setDoc(ref, {
    id: title.id,
    mediaType: title.mediaType,
    name: title.name,
    progressSeconds: Math.floor(progress.progressSeconds),
    durationSeconds: progress.durationSeconds != null ? Math.floor(progress.durationSeconds) : null,
    completed: progress.completed,
    season: progress.season ?? null,
    episode: progress.episode ?? null,
    updatedAt: serverTimestamp(),
  }).catch((error) => console.error('Could not save watch progress', error));
}

export interface RecentlyWatched {
  id: number;
  mediaType: MediaType;
  name: string;
}

/**
 * The viewing profile's most recently played titles, newest first (the
 * "Shows You've Watched" home row). Empty when signed out or nothing has
 * been played yet — there is nothing honest to show otherwise.
 */
export async function listRecentlyWatched(max: number): Promise<RecentlyWatched[]> {
  if (!ownerPath) return [];
  try {
    const snapshot = await getDocs(
      query(collection(db, ownerPath, 'watchProgress'), orderBy('updatedAt', 'desc'), fsLimit(max)),
    );
    const titles: RecentlyWatched[] = [];
    for (const entry of snapshot.docs) {
      const data = entry.data();
      if (typeof data.id !== 'number') continue;
      if (data.mediaType !== 'movie' && data.mediaType !== 'tv') continue;
      titles.push({
        id: data.id,
        mediaType: data.mediaType,
        name: typeof data.name === 'string' ? data.name : '',
      });
    }
    return titles;
  } catch (error) {
    console.error('Could not read recently watched titles', error);
    return [];
  }
}

/**
 * Deletes every saved resume point under `owner` (a profile's document
 * path). Called when the profile is deleted, because profile slots are
 * reused and a new profile must not inherit the old one's progress.
 */
export async function clearWatchProgress(owner: string): Promise<void> {
  const snapshot = await getDocs(collection(db, owner, 'watchProgress'));
  // A batch holds at most 500 writes.
  for (let i = 0; i < snapshot.docs.length; i += 500) {
    const batch = writeBatch(db);
    snapshot.docs.slice(i, i + 500).forEach((entry) => batch.delete(entry.ref));
    await batch.commit();
  }
}
