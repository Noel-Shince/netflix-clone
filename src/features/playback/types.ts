/**
 * Playback data contract: what the player page renders. TMDB field names are
 * mapped away in api/playbackApi.ts.
 */
import type { MediaType } from '../../lib/media.ts';

export interface Trailer {
  /** YouTube video id, e.g. "dQw4w9WgXcQ". */
  youtubeKey: string;
  /** TMDB's name for the video, e.g. "Official Trailer". */
  name: string;
  /** TMDB's video type: Trailer, Teaser, Clip, Featurette, ... */
  type: string;
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
  /** Best YouTube video for the title, or null when there is none. */
  trailer: Trailer | null;
}
