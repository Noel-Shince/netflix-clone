/**
 * Player data from TMDB: one movie- or TV-details request, mapped onto the
 * playback types. The id TMDB returns here goes straight into VidKing's
 * embed URL (vidking.ts), which plays the actual title rather than a trailer.
 */
import type { MediaType } from '../../../lib/media.ts';
import { TmdbError, tmdbGet, tmdbImageUrl } from '../../../lib/tmdb.ts';
import type { PlayableTitle, SeasonSummary } from '../types.ts';

/**
 * The subset of TMDB's movie or TV details this app reads. Movies have
 * `title` / `release_date`; TV shows `name` / `first_air_date` / `seasons`.
 */
interface TmdbTitleDetails {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  release_date?: string;
  first_air_date?: string;
  backdrop_path: string | null;
  seasons?: { season_number: number; name: string; episode_count: number }[];
}

export async function fetchPlayableTitle(id: number, mediaType: MediaType): Promise<PlayableTitle> {
  const details = await tmdbGet<TmdbTitleDetails>(`/${mediaType}/${id}`);
  const date = details.release_date || details.first_air_date;
  return {
    id: details.id,
    mediaType,
    name: details.title ?? details.name ?? 'Untitled',
    synopsis: details.overview,
    year: date ? date.slice(0, 4) : null,
    imageUrl: tmdbImageUrl(details.backdrop_path, 'w1280'),
    cardImageUrl: tmdbImageUrl(details.backdrop_path, 'w300'),
    seasons: mediaType === 'tv' ? toSeasonSummaries(details.seasons) : null,
  };
}

/** Drops "Specials" (season 0) and any season TMDB lists with no episodes yet. */
function toSeasonSummaries(seasons: TmdbTitleDetails['seasons']): SeasonSummary[] {
  return (seasons ?? [])
    .filter((season) => season.season_number > 0 && season.episode_count > 0)
    .map((season) => ({
      seasonNumber: season.season_number,
      name: season.name,
      episodeCount: season.episode_count,
    }));
}

/** True when TMDB has no title with the requested id. */
export function isNotFound(error: Error): boolean {
  return error instanceof TmdbError && error.status === 404;
}
