/**
 * Player data from TMDB: one movie-details request with its videos appended,
 * mapped onto the playback types.
 *
 * Uses `/movie/{id}?append_to_response=videos` rather than the tutorial's
 * `/movie/{id}/videos`, because the videos endpoint alone has no title,
 * synopsis or artwork, which the "no trailer" screen needs.
 */
import { TmdbError, tmdbGet, tmdbImageUrl } from '../../../lib/tmdb.ts';
import type { PlayableTitle, Trailer } from '../types.ts';

/** The subset of a TMDB video entry this app reads. */
interface TmdbVideo {
  key: string;
  site: string;
  type: string;
  name: string;
  official: boolean;
}

/** The subset of TMDB's movie details (with appended videos) this app reads. */
interface TmdbMovieDetails {
  id: number;
  title: string;
  overview: string;
  release_date: string;
  backdrop_path: string | null;
  videos?: { results: TmdbVideo[] };
}

/**
 * Lower is better. The tutorial plays `results[0]`, which is often a
 * featurette or behind-the-scenes clip; this prefers a real trailer.
 */
function rank(video: TmdbVideo): number {
  if (video.type === 'Trailer') return video.official ? 0 : 1;
  if (video.type === 'Teaser') return 2;
  return 3;
}

/** Best YouTube video for a title, or null. Only YouTube can be embedded. */
export function pickTrailer(videos: TmdbVideo[]): Trailer | null {
  const best = videos
    .filter((v) => v.site === 'YouTube' && v.key)
    .reduce<TmdbVideo | null>((top, v) => (top === null || rank(v) < rank(top) ? v : top), null);
  return best ? { youtubeKey: best.key, name: best.name, type: best.type } : null;
}

export async function fetchPlayableTitle(id: number): Promise<PlayableTitle> {
  const movie = await tmdbGet<TmdbMovieDetails>(`/movie/${id}`, {
    append_to_response: 'videos',
    // Without this, TMDB returns only videos tagged with the request language,
    // which hides trailers that have no language set.
    include_video_language: 'en,null',
  });
  return {
    id: movie.id,
    name: movie.title,
    synopsis: movie.overview,
    year: movie.release_date ? movie.release_date.slice(0, 4) : null,
    imageUrl: tmdbImageUrl(movie.backdrop_path, 'w1280'),
    trailer: pickTrailer(movie.videos?.results ?? []),
  };
}

/** True when TMDB has no movie with the requested id. */
export function isNotFound(error: Error): boolean {
  return error instanceof TmdbError && error.status === 404;
}
