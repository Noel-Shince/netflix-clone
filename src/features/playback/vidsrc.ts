/**
 * vidsrc.to embed URL building and postMessage player-event parsing.
 * Replaces the vidking.net embed (vidking.net's DNS no longer resolves —
 * the domain is dead): vidsrc.to takes the title's IMDB id and, for TV, a
 * season/episode in the URL path, matching this app's own season/episode
 * selector (`PlayerPage.tsx`) the same way the vidking integration did.
 *
 * vidsrc.to has no public docs page, and unlike vidking's, its postMessage
 * event shape hasn't been confirmed (fetching the embed page here found no
 * inline reference to a message schema — it's bundled in JS this sandbox
 * can't execute). `parsePlayerEvent` is written defensively: it returns
 * null for anything that isn't the specific shape it expects, so an
 * unrecognised message is silently ignored rather than breaking playback —
 * this may mean the fallback iframe simply never contributes progress
 * updates, a known gap rather than a crash. Confirm against the live embed
 * after merge and adjust the parsed shape if needed.
 */
import type { MediaType } from '../../lib/media.ts';

const VIDSRC_ORIGIN = 'https://vidsrc.to';

export interface VidsrcTarget {
  /** vidsrc.to addresses titles by IMDB id. */
  imdbId: string;
  mediaType: MediaType;
  /** TV only; ignored for movies. */
  season?: number;
  episode?: number;
}

/** Movie: `/embed/movie/{imdbId}`. TV: `/embed/tv/{imdbId}/{season}/{episode}`. */
export function vidsrcEmbedUrl(target: VidsrcTarget, startAtSeconds = 0): string {
  const path =
    target.mediaType === 'tv'
      ? `/embed/tv/${target.imdbId}/${target.season ?? 1}/${target.episode ?? 1}`
      : `/embed/movie/${target.imdbId}`;
  const params = new URLSearchParams({ autoplay: '1' });
  if (startAtSeconds > 0) params.set('startAt', String(Math.floor(startAtSeconds)));
  return `${VIDSRC_ORIGIN}${path}?${params}`;
}

export interface VidsrcPlayerEvent {
  event: 'play' | 'pause' | 'ended' | 'timeupdate' | 'seeked' | (string & {});
  currentTimeSeconds: number;
  durationSeconds: number | null;
  /** TV only: which episode this event is for, when vidsrc.to reports it. */
  season: number | null;
  episode: number | null;
}

/**
 * Parses a `window` "message" event into a vidsrc.to `PLAYER_EVENT`, or null
 * for anything else — including messages from any other iframe on the page.
 * `iframeWindow` is the player iframe's own `contentWindow`, so events are
 * matched by `event.source` rather than an origin string (can't be spoofed
 * by a same-origin-but-wrong window, and doesn't depend on guessing the
 * right origin).
 */
export function parsePlayerEvent(
  event: MessageEvent,
  iframeWindow: Window | null,
): VidsrcPlayerEvent | null {
  if (!iframeWindow || event.source !== iframeWindow) return null;
  const message = event.data as { type?: unknown; data?: unknown } | null;
  if (!message || message.type !== 'PLAYER_EVENT') return null;
  if (typeof message.data !== 'object' || message.data === null) return null;

  const data = message.data as Record<string, unknown>;
  if (typeof data.event !== 'string' || typeof data.currentTime !== 'number') return null;
  return {
    event: data.event as VidsrcPlayerEvent['event'],
    currentTimeSeconds: data.currentTime,
    durationSeconds: typeof data.duration === 'number' ? data.duration : null,
    season: typeof data.season === 'number' ? data.season : null,
    episode: typeof data.episode === 'number' ? data.episode : null,
  };
}
