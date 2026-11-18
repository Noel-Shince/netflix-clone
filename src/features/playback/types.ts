/**
 * Playback data contract: what the player page renders. TMDB field names are
 * mapped away in api/playbackApi.ts.
 */
import type { MediaType } from '../../lib/media.ts';

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
  /** IMDB id (e.g. "tt1300854"), or null when TMDB has none for this title. */
  imdbId: string | null;
}
