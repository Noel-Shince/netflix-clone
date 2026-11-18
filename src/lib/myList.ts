/**
 * "My List": titles a viewer saved, stored in Firestore and kept live.
 *
 * Data lives at `{ownerPath}/myList/{mediaType}-{tmdbId}`, one small document
 * per title (id, mediaType, name, imageUrl, addedAt). The owner path is set
 * from outside (`setMyListOwner`, called by App) rather than built here, so
 * scoping the list to a profile instead of an account is a one-line change.
 *
 * Uses Firestore Lite (no live listeners, about 110 KB gzipped smaller than
 * the full SDK). The list is read once per owner into a tiny external store
 * shared by every reader (hero button, card buttons, player, My List page);
 * each add / remove updates that store after its write succeeds, so toggling
 * a title anywhere updates it everywhere without re-reading. Changes made on
 * another device show up on the next page load.
 */
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore/lite';
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
/** Bumped on every owner change, so a slow read for a previous owner is dropped. */
let generation = 0;
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

async function load() {
  const current = ++generation;
  if (!ownerPath) return;
  try {
    const snapshot = await getDocs(
      query(collection(db, ownerPath, 'myList'), orderBy('addedAt', 'desc')),
    );
    const items: TitleRef[] = [];
    for (const entry of snapshot.docs) {
      const data = entry.data();
      if (typeof data.id !== 'number' || !isMediaType(data.mediaType)) continue;
      items.push({
        id: data.id,
        mediaType: data.mediaType,
        name: typeof data.name === 'string' ? data.name : '',
        imageUrl: typeof data.imageUrl === 'string' ? data.imageUrl : null,
      });
    }
    if (current === generation) emit({ status: 'ready', items });
  } catch (error) {
    console.error('My List failed to load', error);
    if (current === generation) {
      emit({ status: 'error', error: error instanceof Error ? error : new Error(String(error)) });
    }
  }
}

/**
 * Whose list to show: a Firestore document path such as `users/{uid}`, or
 * null when nobody is signed in.
 */
export function setMyListOwner(path: string | null) {
  if (path === ownerPath) return;
  ownerPath = path;
  emit(LOADING);
  void load();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): MyListState {
  return state;
}

/** The signed-in viewer's list, kept current with this tab's changes. */
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

function withoutTitle(items: TitleRef[], title: Pick<TitleRef, 'id' | 'mediaType'>) {
  return items.filter((item) => titleKey(item) !== titleKey(title));
}

export async function addToMyList(title: TitleRef): Promise<void> {
  const owner = ownerPath;
  await setDoc(titleDoc(title), {
    id: title.id,
    mediaType: title.mediaType,
    name: title.name,
    imageUrl: title.imageUrl,
    addedAt: serverTimestamp(),
  });
  if (owner === ownerPath && state.status === 'ready') {
    emit({ status: 'ready', items: [title, ...withoutTitle(state.items, title)] });
  }
}

export async function removeFromMyList(title: Pick<TitleRef, 'id' | 'mediaType'>): Promise<void> {
  const owner = ownerPath;
  await deleteDoc(titleDoc(title));
  if (owner === ownerPath && state.status === 'ready') {
    emit({ status: 'ready', items: withoutTitle(state.items, title) });
  }
}
