/**
 * The viewer's own stream resolver API key/token (Settings → Streaming),
 * stored at `users/{uid}/settings/preferences.streamApiKey`.
 *
 * Account-wide, not per-profile like myList.ts / watchProgress.ts: the
 * resolver key belongs to whoever owns the account, not to one viewing
 * profile. Read directly with the signed-in uid (`lib/firebase.ts`'s
 * `currentUserId()`) rather than through a profile owner path, so this has
 * nothing to do with which profile is active.
 */
import { doc, getDoc, setDoc } from 'firebase/firestore/lite';
import { db } from './firebase.ts';

function settingsDoc(uid: string) {
  return doc(db, 'users', uid, 'settings', 'preferences');
}

/** The saved key, or '' when signed out, unset, or unreadable. */
export async function getStreamApiKey(uid: string): Promise<string> {
  try {
    const snapshot = await getDoc(settingsDoc(uid));
    const value = snapshot.data()?.streamApiKey;
    return typeof value === 'string' ? value : '';
  } catch (error) {
    console.error('Could not read streaming settings', error);
    return '';
  }
}

/** Saves the key (an empty string clears it). */
export function saveStreamApiKey(uid: string, apiKey: string): Promise<void> {
  return setDoc(settingsDoc(uid), { streamApiKey: apiKey.trim() || null }, { merge: true });
}
