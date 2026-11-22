/**
 * Playback data contract: what the player page renders. TMDB field names are
 * mapped away in api/playbackApi.ts.
 */
import type { MediaType } from '../../lib/media.ts';

/** One TV season, for the season/episode selector. Movies have none. */
export interface SeasonSummary {
  seasonNumber: number;
  name: string;
  episodeCount: number;
}

export interface PlayableTitle {
  id: number;
  mediaType: MediaType;
  name: string;
  synopsis: string;
  /** Release year, or null when TMDB has no release date. */
  year: string | null;
  /** Large backdrop image URL, or null (UI shows a gradient placeholder). */
  imageUrl: string | null;
  /** Card-sized backdrop, what My List saves. */
  cardImageUrl: string | null;
  /** TV only: seasons with at least one aired episode. Null for movies. */
  seasons: SeasonSummary[] | null;
}
