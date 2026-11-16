/**
 * Path builders for routes that one feature links to from another.
 *
 * Features never import each other (ADR-2), so e.g. catalog cards link to the
 * player through this helper instead of reaching into features/playback.
 */
export function playerPath(id: number): string {
  return `/player/${id}`;
}
