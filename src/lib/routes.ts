/**
 * Route paths, and path builders for routes that one feature links to from another.
 *
 * Features never import each other (ADR-2), so e.g. catalog cards link to the
 * player through this module instead of reaching into features/playback, and
 * the shared navbar links to every browse page from here.
 */
import type { MediaType } from './media.ts';

export const ROUTES = {
  home: '/',
  tvShows: '/tv',
  movies: '/movies',
  newAndPopular: '/latest',
  myList: '/my-list',
  languages: '/languages',
} as const;

/** Movies keep the original `/player/:id`; TV shows use `/player/tv/:id`. */
export function playerPath(id: number, mediaType: MediaType = 'movie'): string {
  return mediaType === 'tv' ? `/player/tv/${id}` : `/player/${id}`;
}

/** The search results page. The query lives in the URL so results survive reloads and Back. */
export const SEARCH_PATH = '/search';
export const SEARCH_PARAM = 'q';

export function searchPath(query: string): string {
  return `${SEARCH_PATH}?${new URLSearchParams({ [SEARCH_PARAM]: query })}`;
}
