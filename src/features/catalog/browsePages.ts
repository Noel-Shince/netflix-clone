/**
 * Which TMDB lists feed which page and row: the only place that knows.
 *
 * Every loader is created once at module level, so its identity is stable
 * (useAsync refetches when the loader changes) and TMDB responses are shared
 * through lib/tmdb's cache when two pages show the same list.
 */
import type { CatalogTitle } from './types.ts';
import type { BrowsePageConfig } from './BrowsePage.tsx';
import { fetchFeaturedTitle, fetchTitleRow, type TitleSource } from './api/catalogApi.ts';

export interface RowConfig {
  id: string;
  heading: string;
  load: () => Promise<CatalogTitle[]>;
}

export function row(id: string, heading: string, source: TitleSource): RowConfig {
  return { id, heading, load: () => fetchTitleRow(source) };
}

const movie = (path: string, params?: Record<string, string>): TitleSource => ({
  path,
  mediaType: 'movie',
  params,
});
const tv = (path: string, params?: Record<string, string>): TitleSource => ({
  path,
  mediaType: 'tv',
  params,
});
const mixed = (path: string): TitleSource => ({ path, mediaType: 'mixed' });

function featured(source: TitleSource) {
  return () => fetchFeaturedTitle(source);
}

export const HOME_PAGE: BrowsePageConfig = {
  loadFeatured: featured(movie('/trending/movie/day')),
  heroRow: row('popular', 'Popular on Noelflix', movie('/movie/popular')),
  rows: [
    row('top-rated', 'Blockbuster Movies', movie('/movie/top_rated')),
    row('now-playing', 'Now Playing', movie('/movie/now_playing')),
    row('upcoming', 'Upcoming', movie('/movie/upcoming')),
    row('trending-week', 'Top Picks for You', movie('/trending/movie/week')),
  ],
};

export const TV_SHOWS_PAGE: BrowsePageConfig = {
  loadFeatured: featured(tv('/trending/tv/day')),
  heroRow: row('tv-popular', 'Popular TV Shows', tv('/tv/popular')),
  rows: [
    row('tv-trending', 'Trending This Week', tv('/trending/tv/week')),
    row('tv-top-rated', 'Critically Acclaimed', tv('/tv/top_rated')),
    row('tv-on-air', 'New Episodes This Week', tv('/tv/on_the_air')),
    row('tv-airing-today', 'Airing Today', tv('/tv/airing_today')),
  ],
};

export const MOVIES_PAGE: BrowsePageConfig = {
  loadFeatured: featured(movie('/movie/now_playing')),
  heroRow: row('movies-popular', 'Popular Movies', movie('/movie/popular')),
  rows: [
    row('movies-top-rated', 'Top Rated', movie('/movie/top_rated')),
    row('movies-action', 'Action', movie('/discover/movie', { with_genres: '28' })),
    row('movies-comedy', 'Comedy', movie('/discover/movie', { with_genres: '35' })),
    row('movies-horror', 'Horror', movie('/discover/movie', { with_genres: '27' })),
    row('movies-documentary', 'Documentaries', movie('/discover/movie', { with_genres: '99' })),
  ],
};

export const NEW_AND_POPULAR_PAGE: BrowsePageConfig = {
  loadFeatured: featured(mixed('/trending/all/day')),
  heroRow: row('new-trending-today', 'Trending Today', mixed('/trending/all/day')),
  rows: [
    row('new-trending-week', 'Trending This Week', mixed('/trending/all/week')),
    row('new-coming-soon', 'Coming Soon', movie('/movie/upcoming')),
    row('new-in-theatres', 'New in Theatres', movie('/movie/now_playing')),
    row('new-episodes', 'New Episodes', tv('/tv/on_the_air')),
  ],
};
