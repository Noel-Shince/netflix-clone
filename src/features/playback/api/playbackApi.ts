/**
 * Player data from TMDB: one movie- or TV-details request with its external
 * ids appended, mapped onto the playback types.
 *
 * The id TMDB returns here goes straight into vidsrc.sh's embed URL (slice
 * 18), which plays the actual title rather than a trailer.
 */
import type { MediaType } from '../../../lib/media.ts';
import { TmdbError, tmdbGet, tmdbImageUrl } from '../../../lib/tmdb.ts';
import type { PlayableTitle } from '../types.ts';

/**
 * The subset of TMDB's movie or TV details (with appended external ids) this
 * app reads. Movies have `title` / `release_date`; TV shows `name` / `first_air_date`.
 */
interface TmdbTitleDetails {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  release_date?: string;
  first_air_date?: string;
  backdrop_path: string | null;
  external_ids?: { imdb_id?: string | null };
}

export async function fetchPlayableTitle(id: number, mediaType: MediaType): Promise<PlayableTitle> {
  const details = await tmdbGet<TmdbTitleDetails>(`/${mediaType}/${id}`, {
    append_to_response: 'external_ids',
  });
  const date = details.release_date || details.first_air_date;
  return {
    id: details.id,
    mediaType,
    name: details.title ?? details.name ?? 'Untitled',
    synopsis: details.overview,
    year: date ? date.slice(0, 4) : null,
    imageUrl: tmdbImageUrl(details.backdrop_path, 'w1280'),
    cardImageUrl: tmdbImageUrl(details.backdrop_path, 'w300'),
    imdbId: details.external_ids?.imdb_id || null,
  };
}

/** True when TMDB has no title with the requested id. */
export function isNotFound(error: Error): boolean {
  return error instanceof TmdbError && error.status === 404;
}
