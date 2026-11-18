/**
 * Backdrop art for the "Who's watching?" screen (slice 13): a handful of
 * trending backdrop images to rotate behind the profile picker. Deliberately
 * thin and decoupled from `features/catalog/api/catalogApi.ts` (its types are
 * catalog-specific), so the profiles feature can use it without importing
 * another feature (ADR-2) — both lean on the shared `lib/tmdb.ts` client.
 */
import { tmdbGet, tmdbImageUrl } from './tmdb.ts';

interface TmdbListItem {
  backdrop_path: string | null;
}

interface TmdbList {
  results: TmdbListItem[];
}

/** Up to `count` backdrop image URLs from this week's trending titles. */
export async function fetchBackdropUrls(count: number): Promise<string[]> {
  const list = await tmdbGet<TmdbList>('/trending/all/week');
  const urls: string[] = [];
  for (const item of list.results) {
    if (urls.length >= count) break;
    const url = tmdbImageUrl(item.backdrop_path, 'w1280');
    if (url) urls.push(url);
  }
  return urls;
}
