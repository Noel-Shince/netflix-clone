/**
 * VidKing (vidking.net) embed URL building and postMessage player-event
 * parsing. Replaces the vidsrc.sh embed from slice 18: VidKing takes the
 * TMDB id directly (no IMDB lookup needed) and, for TV, a season/episode in
 * the URL path — this app's own season/episode selector (`PlayerPage.tsx`)
 * drives that, with VidKing's built-in picker (`episodeSelector`) turned off
 * so there is only one picker on screen.
 *
 * VidKing has no public docs page; the URL shape, query params and
 * postMessage event shape below are taken from a third-party integration
 * write-up (BismayDey/BLACKSTREAM's VIDKING_INTEGRATION.md) and haven't been
 * independently re-verified against the live player. In particular, that
 * write-up never states the postMessage origin, so events are matched by
 * `event.source` (the specific iframe window) instead of an origin string —
 * which is actually the stronger check, since it can't be spoofed by a
 * same-origin-but-wrong window and doesn't depend on guessing right.
 */
import type { MediaType } from '../../lib/media.ts';

const VIDKING_ORIGIN = 'https://www.vidking.net';
/** Netflix red, passed as VidKing's `color` param so the player chrome matches the app. */
const BRAND_COLOR = 'e50914';

export interface VidkingTarget {
  tmdbId: number;
  mediaType: MediaType;
  /** TV only; ignored for movies. */
  season?: number;
  episode?: number;
}

/** Movie: `/embed/movie/{tmdbId}`. TV: `/embed/tv/{tmdbId}/{season}/{episode}`. */
export function vidkingEmbedUrl(target: VidkingTarget, startAtSeconds = 0): string {
  const path =
    target.mediaType === 'tv'
      ? `/embed/tv/${target.tmdbId}/${target.season ?? 1}/${target.episode ?? 1}`
      : `/embed/movie/${target.tmdbId}`;
  const params = new URLSearchParams({ color: BRAND_COLOR, autoPlay: 'true' });
  if (target.mediaType === 'tv') {
    params.set('nextEpisode', 'true');
    params.set('episodeSelector', 'false');
  }
  if (startAtSeconds > 0) params.set('progress', String(Math.floor(startAtSeconds)));
  return `${VIDKING_ORIGIN}${path}?${params}`;
}

export interface VidkingPlayerEvent {
  event: 'play' | 'pause' | 'ended' | 'timeupdate' | 'seeked' | (string & {});
  currentTimeSeconds: number;
  durationSeconds: number | null;
  /** TV only: which episode this event is for, when VidKing reports it. */
  season: number | null;
  episode: number | null;
}

/**
 * Parses a `window` "message" event into a VidKing `PLAYER_EVENT`, or null
 * for anything else — including messages from any other iframe on the page.
 * `iframeWindow` is the player iframe's own `contentWindow` (see module doc
 * on why this checks `event.source` rather than `event.origin`).
 */
export function parsePlayerEvent(
  event: MessageEvent,
  iframeWindow: Window | null,
): VidkingPlayerEvent | null {
  if (!iframeWindow || event.source !== iframeWindow) return null;
  const message = event.data as { type?: unknown; data?: unknown } | null;
  if (!message || message.type !== 'PLAYER_EVENT') return null;
  if (typeof message.data !== 'object' || message.data === null) return null;

  const data = message.data as Record<string, unknown>;
  if (typeof data.event !== 'string' || typeof data.currentTime !== 'number') return null;
  return {
    event: data.event as VidkingPlayerEvent['event'],
    currentTimeSeconds: data.currentTime,
    durationSeconds: typeof data.duration === 'number' ? data.duration : null,
    season: typeof data.season === 'number' ? data.season : null,
    episode: typeof data.episode === 'number' ? data.episode : null,
  };
}
