/**
 * One TV season's episode list, for the player page's season/episode
 * selector. TMDB has no "all seasons at once" endpoint, so this is a
 * separate request per season: `/tv/{id}/season/{season_number}`.
 */
import { tmdbGet, tmdbImageUrl } from '../../../lib/tmdb.ts';

export interface Episode {
  episodeNumber: number;
  name: string;
  overview: string;
  /** Episode still image, or null (UI shows the episode number instead). */
  stillUrl: string | null;
}

interface TmdbEpisode {
  episode_number: number;
  name: string;
  overview: string;
  still_path: string | null;
}

interface TmdbSeasonDetails {
  episodes: TmdbEpisode[];
}

export async function fetchSeasonEpisodes(tvId: number, seasonNumber: number): Promise<Episode[]> {
  const details = await tmdbGet<TmdbSeasonDetails>(`/tv/${tvId}/season/${seasonNumber}`);
  return details.episodes.map((episode) => ({
    episodeNumber: episode.episode_number,
    name: episode.name,
    overview: episode.overview,
    stillUrl: tmdbImageUrl(episode.still_path, 'w300'),
  }));
}
