/**
 * Search: free-text title matching, plus genre, language and person
 * detection on the same query, merged into labelled sections.
 *
 * TMDB's `/search/multi` (movies + TV, ranked by TMDB) is the primary path
 * and always runs. In parallel, the same query is checked against TMDB's
 * genre names (`/genre/movie/list`, `/genre/tv/list`), a fixed language/
 * demonym table (`with_original_language`), and `/search/person` (top match,
 * then `with_cast` on `/discover/movie` and `/discover/tv`). Each extra path
 * is independent and silently contributes nothing on failure or no match, so
 * one slow or wrong lookup never blocks the others or the primary results.
 */
import type { MediaType } from '../../../lib/media.ts';
import { tmdbGet, tmdbImageUrl } from '../../../lib/tmdb.ts';
import type { CatalogTitle } from '../types.ts';

interface TmdbSearchItem {
  id: number;
  media_type?: string;
  title?: string;
  name?: string;
  backdrop_path: string | null;
}

interface TmdbSearchList {
  results: TmdbSearchItem[];
}

interface TmdbGenre {
  id: number;
  name: string;
}

interface TmdbGenreList {
  genres: TmdbGenre[];
}

interface TmdbPerson {
  id: number;
  name: string;
}

interface TmdbPersonList {
  results: TmdbPerson[];
}

export interface SearchSection {
  id: string;
  heading: string;
  titles: CatalogTitle[];
}

function toTitle(item: TmdbSearchItem, mediaType: MediaType): CatalogTitle {
  return {
    id: item.id,
    mediaType,
    name: item.title ?? item.name ?? 'Untitled',
    imageUrl: tmdbImageUrl(item.backdrop_path, 'w300'),
  };
}

function dedupe(titles: CatalogTitle[]): CatalogTitle[] {
  const seen = new Set<string>();
  return titles.filter((title) => {
    const key = `${title.mediaType}-${title.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** The free-text title match: movies and TV shows, TMDB's own ranking. */
async function searchTitles(query: string): Promise<CatalogTitle[]> {
  const list = await tmdbGet<TmdbSearchList>('/search/multi', {
    query,
    include_adult: 'false',
  });
  const titles = list.results
    .filter((item) => item.media_type === 'movie' || item.media_type === 'tv')
    .map((item) => toTitle(item, item.media_type as MediaType));
  return dedupe(titles);
}

// Genre lists rarely change; fetched once per page session and shared by
// every search, same as lib/tmdb's response cache for list endpoints.
let genreMaps: Promise<{ movie: Map<string, number>; tv: Map<string, number> }> | null = null;

function loadGenreMaps() {
  if (!genreMaps) {
    genreMaps = Promise.all([
      tmdbGet<TmdbGenreList>('/genre/movie/list'),
      tmdbGet<TmdbGenreList>('/genre/tv/list'),
    ]).then(([movieList, tvList]) => ({
      movie: new Map(movieList.genres.map((g) => [g.name.toLowerCase(), g.id])),
      tv: new Map(tvList.genres.map((g) => [g.name.toLowerCase(), g.id])),
    }));
  }
  return genreMaps;
}

/**
 * Demonym/language name (as someone would type it) to the ISO 639-1 code
 * TMDB's `with_original_language` takes. Not exhaustive, just the languages
 * with enough original-language TMDB content to make a useful row.
 */
const LANGUAGE_CODES: Record<string, string> = {
  english: 'en',
  malayalam: 'ml',
  hindi: 'hi',
  tamil: 'ta',
  telugu: 'te',
  kannada: 'kn',
  korean: 'ko',
  japanese: 'ja',
  chinese: 'zh',
  mandarin: 'zh',
  cantonese: 'zh',
  french: 'fr',
  spanish: 'es',
  german: 'de',
  italian: 'it',
  portuguese: 'pt',
  russian: 'ru',
  arabic: 'ar',
  turkish: 'tr',
  thai: 'th',
  vietnamese: 'vi',
  indonesian: 'id',
  punjabi: 'pa',
  bengali: 'bn',
  marathi: 'mr',
  gujarati: 'gu',
  urdu: 'ur',
  polish: 'pl',
  dutch: 'nl',
  swedish: 'sv',
  norwegian: 'no',
  danish: 'da',
  finnish: 'fi',
  greek: 'el',
  hebrew: 'he',
  persian: 'fa',
  filipino: 'tl',
  tagalog: 'tl',
};

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

async function discoverBoth(params: Record<string, string>): Promise<CatalogTitle[]> {
  const [movies, shows] = await Promise.all([
    tmdbGet<TmdbSearchList>('/discover/movie', { sort_by: 'popularity.desc', ...params }),
    tmdbGet<TmdbSearchList>('/discover/tv', { sort_by: 'popularity.desc', ...params }),
  ]);
  return dedupe([
    ...movies.results.map((item) => toTitle(item, 'movie')),
    ...shows.results.map((item) => toTitle(item, 'tv')),
  ]);
}

/** A genre section when the whole query names a TMDB genre (movie, TV, or both). */
async function searchByGenre(normalized: string): Promise<SearchSection | null> {
  const { movie, tv } = await loadGenreMaps();
  const movieGenreId = movie.get(normalized);
  const tvGenreId = tv.get(normalized);
  if (movieGenreId == null && tvGenreId == null) return null;

  const [movies, shows] = await Promise.all([
    movieGenreId != null
      ? tmdbGet<TmdbSearchList>('/discover/movie', {
          with_genres: String(movieGenreId),
          sort_by: 'popularity.desc',
        })
      : null,
    tvGenreId != null
      ? tmdbGet<TmdbSearchList>('/discover/tv', {
          with_genres: String(tvGenreId),
          sort_by: 'popularity.desc',
        })
      : null,
  ]);
  const titles = dedupe([
    ...(movies?.results.map((item) => toTitle(item, 'movie')) ?? []),
    ...(shows?.results.map((item) => toTitle(item, 'tv')) ?? []),
  ]);
  if (titles.length === 0) return null;
  return { id: 'genre', heading: `${capitalize(normalized)} Titles`, titles };
}

/** A language section when the whole query names a language this table knows. */
async function searchByLanguage(normalized: string): Promise<SearchSection | null> {
  const code = LANGUAGE_CODES[normalized];
  if (!code) return null;
  const titles = await discoverBoth({ with_original_language: code });
  if (titles.length === 0) return null;
  return { id: 'language', heading: `${capitalize(normalized)} Titles`, titles };
}

/** A "Starring X" section from the best-matching person for the query, if any. */
async function searchByPerson(query: string): Promise<SearchSection | null> {
  const list = await tmdbGet<TmdbPersonList>('/search/person', {
    query,
    include_adult: 'false',
  });
  const person = list.results[0];
  if (!person) return null;
  const titles = await discoverBoth({ with_cast: String(person.id) });
  if (titles.length === 0) return null;
  return { id: 'person', heading: `Starring ${person.name}`, titles };
}

/**
 * All sections for `query`, in display order: title matches first, then
 * genre, language and person matches (each only when it found something).
 * A section that errors or finds nothing is dropped rather than failing the
 * whole search; only `searchTitles` failing surfaces as an error, since it
 * is the path every query goes through.
 */
export async function searchAll(query: string): Promise<SearchSection[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const normalized = trimmed.toLowerCase();

  const [titles, genre, language, person] = await Promise.all([
    searchTitles(trimmed),
    searchByGenre(normalized).catch(() => null),
    searchByLanguage(normalized).catch(() => null),
    searchByPerson(trimmed).catch(() => null),
  ]);

  const sections: SearchSection[] = [];
  if (titles.length > 0) sections.push({ id: 'titles', heading: 'Titles', titles });
  if (language) sections.push(language);
  if (genre) sections.push(genre);
  if (person) sections.push(person);
  return sections;
}
