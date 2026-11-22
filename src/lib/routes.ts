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
  settings: '/settings',
} as const;

/** The player page reads this to resume a trailer where a preview left off. */
export const RESUME_PARAM = 't';

/**
 * Movies keep the original `/player/:id`; TV shows use `/player/tv/:id`.
 *
 * `resumeSeconds`, when positive, is appended as `?t=<seconds>` so the player
 * can seek there instead of starting over — used when the hover preview or
 * hero banner already played some of the trailer before the title was opened.
 */
export function playerPath(
  id: number,
  mediaType: MediaType = 'movie',
  resumeSeconds?: number,
): string {
  const base = mediaType === 'tv' ? `/player/tv/${id}` : `/player/${id}`;
  if (!resumeSeconds || resumeSeconds <= 0) return base;
  return `${base}?${new URLSearchParams({ [RESUME_PARAM]: String(Math.floor(resumeSeconds)) })}`;
}

/** The search results page. The query lives in the URL so results survive reloads and Back. */
export const SEARCH_PATH = '/search';
export const SEARCH_PARAM = 'q';

export function searchPath(query: string): string {
  return `${SEARCH_PATH}?${new URLSearchParams({ [SEARCH_PARAM]: query })}`;
}
