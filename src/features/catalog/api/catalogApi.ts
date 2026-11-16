/**
 * Catalog data from TMDB, mapped onto the catalog's own types.
 *
 * Which TMDB list feeds which row lives here (ROW_SOURCES), so the home page
 * only deals with headings and `CatalogTitle`s.
 */
import { tmdbGet, tmdbImageUrl } from '../../../lib/tmdb.ts';
import type { CatalogTitle, FeaturedTitle } from '../types.ts';

/** The subset of TMDB's movie list item this app reads. */
interface TmdbMovie {
  id: number;
  title: string;
  overview: string;
  backdrop_path: string | null;
}

interface TmdbMovieList {
  results: TmdbMovie[];
}

/** TMDB list endpoints used by the home page rows. */
export type MovieListPath =
  | '/movie/popular'
  | '/movie/top_rated'
  | '/movie/now_playing'
  | '/movie/upcoming'
  | '/trending/movie/week';

function toCatalogTitle(movie: TmdbMovie): CatalogTitle {
  return {
    id: movie.id,
    name: movie.title,
    imageUrl: tmdbImageUrl(movie.backdrop_path, 'w300'),
  };
}

export async function fetchMovieRow(path: MovieListPath): Promise<CatalogTitle[]> {
  const list = await tmdbGet<TmdbMovieList>(path);
  return list.results.map(toCatalogTitle);
}

/**
 * The hero title: today's top trending movie that has both artwork and a
 * synopsis, so the banner never renders half-empty.
 */
export async function fetchFeaturedTitle(): Promise<FeaturedTitle> {
  const list = await tmdbGet<TmdbMovieList>('/trending/movie/day');
  const movie = list.results.find((m) => m.backdrop_path && m.overview.trim());
  if (!movie) throw new Error('TMDB returned no trending movie with artwork.');
  return {
    id: movie.id,
    name: movie.title,
    synopsis: movie.overview,
    imageUrl: tmdbImageUrl(movie.backdrop_path, 'w1280'),
  };
}
