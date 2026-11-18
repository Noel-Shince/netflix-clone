/**
 * "My List": titles a viewer saved, stored in Firestore and kept live.
 *
 * Data lives at `{ownerPath}/myList/{mediaType}-{tmdbId}`, one small document
 * per title (id, mediaType, name, imageUrl, addedAt). The owner path is set
 * from outside (`setMyListOwner`, called by App) rather than built here, so
 * scoping the list to a profile instead of an account is a one-line change.
 *
 * One Firestore listener is shared by every component that reads the list
 * (hero button, player button, My List page) through a tiny external store,
 * so toggling a title anywhere updates it everywhere without extra reads.
 */
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { useSyncExternalStore } from 'react';
import { db } from './firebase.ts';
import type { MediaType, TitleRef } from './media.ts';

export type MyListState =
  | { status: 'loading' }
  | { status: 'error'; error: Error }
  | { status: 'ready'; items: TitleRef[] };

const LOADING: MyListState = { status: 'loading' };

let ownerPath: string | null = null;
let state: MyListState = LOADING;
let stopListening: (() => void) | null = null;
const listeners = new Set<() => void>();

function emit(next: MyListState) {
  state = next;
  listeners.forEach((listener) => listener());
}

function titleKey(title: Pick<TitleRef, 'id' | 'mediaType'>): string {
  return `${title.mediaType}-${title.id}`;
}

function isMediaType(value: unknown): value is MediaType {
  return value === 'movie' || value === 'tv';
}

/** Starts the Firestore listener for the current owner, if anyone is reading. */
function startListening() {
  stopListening?.();
  stopListening = null;
  if (!ownerPath || listeners.size === 0) return;

  const listQuery = query(collection(db, ownerPath, 'myList'), orderBy('addedAt', 'desc'));
  stopListening = onSnapshot(
    listQuery,
    // Pending local writes have a null server timestamp until confirmed;
    // 'estimate' keeps a just-added title at the top instead of the bottom.
    (snapshot) => {
      const items: TitleRef[] = [];
      for (const entry of snapshot.docs) {
        const data = entry.data({ serverTimestamps: 'estimate' });
        if (typeof data.id !== 'number' || !isMediaType(data.mediaType)) continue;
        items.push({
          id: data.id,
          mediaType: data.mediaType,
          name: typeof data.name === 'string' ? data.name : '',
          imageUrl: typeof data.imageUrl === 'string' ? data.imageUrl : null,
        });
      }
      emit({ status: 'ready', items });
    },
    (error) => {
      console.error('My List failed to load', error);
      emit({ status: 'error', error });
    },
  );
}

/**
 * Whose list to show: a Firestore document path such as `users/{uid}`, or
 * null when nobody is signed in.
 */
export function setMyListOwner(path: string | null) {
  if (path === ownerPath) return;
  ownerPath = path;
  emit(LOADING);
  startListening();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1) startListening();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      stopListening?.();
      stopListening = null;
      // The next reader re-reads from Firestore's cache, so don't show stale data meanwhile.
      state = LOADING;
    }
  };
}

function getSnapshot(): MyListState {
  return state;
}

/** The signed-in viewer's list, live. */
export function useMyList(): MyListState {
  return useSyncExternalStore(subscribe, getSnapshot);
}

export function isInMyList(list: MyListState, title: Pick<TitleRef, 'id' | 'mediaType'>): boolean {
  return (
    list.status === 'ready' &&
    list.items.some((item) => item.id === title.id && item.mediaType === title.mediaType)
  );
}

function titleDoc(title: Pick<TitleRef, 'id' | 'mediaType'>) {
  if (!ownerPath) throw new Error('Sign in to use My List.');
  return doc(db, ownerPath, 'myList', titleKey(title));
}

export async function addToMyList(title: TitleRef): Promise<void> {
  await setDoc(titleDoc(title), {
    id: title.id,
    mediaType: title.mediaType,
    name: title.name,
    imageUrl: title.imageUrl,
    addedAt: serverTimestamp(),
  });
}

export async function removeFromMyList(title: Pick<TitleRef, 'id' | 'mediaType'>): Promise<void> {
  await deleteDoc(titleDoc(title));
}
