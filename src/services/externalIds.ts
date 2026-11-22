/**
 * TMDB → IMDB id conversion, for the stream resolver (services/streamResolver.ts),
 * which — unlike VidKing — takes an IMDB id (`tt…`), not a TMDB id.
 *
 * TMDB's `/movie/{id}/external_ids` and `/tv/{id}/external_ids` endpoints return it. Results are
 * cached in Firestore at `externalIdsCache/{mediaType}-{tmdbId}` (shared across every viewer, not
 * per-account — it's just a cache of TMDB's own public data, the same title always maps to the
 * same IMDB id) so repeat opens of the same title skip the extra TMDB request. `firestore.rules`
 * allows any signed-in user to read/write this collection, validated by shape.
 */
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore/lite';
import { db } from '../lib/firebase.ts';
import type { MediaType } from '../lib/media.ts';
import { tmdbGet } from '../lib/tmdb.ts';

interface TmdbExternalIds {
  imdb_id?: string | null;
}

function cacheDocId(tmdbId: number, mediaType: MediaType): string {
  return `${mediaType}-${tmdbId}`;
}

async function readCache(tmdbId: number, mediaType: MediaType): Promise<string | null | undefined> {
  try {
    const snapshot = await getDoc(doc(db, 'externalIdsCache', cacheDocId(tmdbId, mediaType)));
    if (!snapshot.exists()) return undefined;
    const value = snapshot.data().imdbId;
    return typeof value === 'string' ? value : null;
  } catch (error) {
    // A cache miss (including a denied/offline read) just means "ask TMDB"; never fail the lookup over it.
    console.error('Could not read external-id cache', error);
    return undefined;
  }
}

function writeCache(tmdbId: number, mediaType: MediaType, imdbId: string | null): void {
  void setDoc(doc(db, 'externalIdsCache', cacheDocId(tmdbId, mediaType)), {
    tmdbId,
    mediaType,
    imdbId,
    cachedAt: serverTimestamp(),
  }).catch((error) => console.error('Could not save external-id cache', error));
}

/**
 * The IMDB id (`tt…`) for a TMDB title, or null when TMDB has none for it
 * (rare, but not every title is cross-listed). Cached, so calling again for
 * the same title is usually a single Firestore read instead of a TMDB call.
 */
export async function fetchImdbId(tmdbId: number, mediaType: MediaType): Promise<string | null> {
  const cached = await readCache(tmdbId, mediaType);
  if (cached !== undefined) return cached;

  const details = await tmdbGet<TmdbExternalIds>(`/${mediaType}/${tmdbId}/external_ids`);
  const imdbId = details.imdb_id || null;
  writeCache(tmdbId, mediaType, imdbId);
  return imdbId;
}
