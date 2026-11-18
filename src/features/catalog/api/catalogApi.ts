/**
 * Catalog data from TMDB, mapped onto the catalog's own types.
 *
 * A `TitleSource` names one TMDB list (endpoint, query params, and whether it
 * returns movies, TV shows or both). The browse pages only deal with headings
 * and sources; this module owns TMDB's field names, which differ between
 * movies (`title`) and TV shows (`name`).
 */
import type { MediaType } from '../../../lib/media.ts';
import { tmdbGet, tmdbImageUrl } from '../../../lib/tmdb.ts';
import type { CatalogTitle, FeaturedTitle } from '../types.ts';

/** The subset of a TMDB list item (movie, TV show or mixed trending) this app reads. */
interface TmdbListItem {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  backdrop_path: string | null;
  /** Only present on mixed lists such as /trending/all; can also be "person". */
  media_type?: string;
  release_date?: string;
  first_air_date?: string;
}

interface TmdbList {
  results: TmdbListItem[];
}

export interface TitleSource {
  path: string;
  /** What the endpoint returns; 'mixed' lists tag each item with its own type. */
  mediaType: MediaType | 'mixed';
  params?: Record<string, string>;
}

function itemMediaType(item: TmdbListItem, source: TitleSource): MediaType | null {
  if (source.mediaType !== 'mixed') return source.mediaType;
  return item.media_type === 'movie' || item.media_type === 'tv' ? item.media_type : null;
}

function toTitle(item: TmdbListItem, mediaType: MediaType): CatalogTitle {
  return {
    id: item.id,
    mediaType,
    name: item.title ?? item.name ?? 'Untitled',
    imageUrl: tmdbImageUrl(item.backdrop_path, 'w300'),
  };
}

export async function fetchTitleRow(source: TitleSource): Promise<CatalogTitle[]> {
  const list = await tmdbGet<TmdbList>(source.path, source.params);
  return list.results.flatMap((item) => {
    const mediaType = itemMediaType(item, source);
    return mediaType ? [toTitle(item, mediaType)] : [];
  });
}

/**
 * The hero title: the first title in `source` that has both artwork and a
 * synopsis, so the banner never renders half-empty.
 */
export async function fetchFeaturedTitle(source: TitleSource): Promise<FeaturedTitle> {
  const list = await tmdbGet<TmdbList>(source.path, source.params);
  for (const item of list.results) {
    const mediaType = itemMediaType(item, source);
    if (mediaType && item.backdrop_path && item.overview.trim()) {
      return {
        ...toTitle(item, mediaType),
        synopsis: item.overview,
        backdropUrl: tmdbImageUrl(item.backdrop_path, 'w1280'),
        year: (item.release_date || item.first_air_date)?.slice(0, 4) || null,
      };
    }
  }
  throw new Error('TMDB returned no title with artwork for the banner.');
}
