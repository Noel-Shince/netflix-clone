/**
 * Path builders for routes that one feature links to from another.
 *
 * Features never import each other (ADR-2), so e.g. catalog cards link to the
 * player through this helper instead of reaching into features/playback.
 */
export function playerPath(id: number): string {
  return `/player/${id}`;
}

/** The search results page. The query lives in the URL so results survive reloads and Back. */
export const SEARCH_PATH = '/search';
export const SEARCH_PARAM = 'q';

export function searchPath(query: string): string {
  return `${SEARCH_PATH}?${new URLSearchParams({ [SEARCH_PARAM]: query })}`;
}
