/**
 * vidsrc.sh embed URL building and postMessage player-event parsing (slice
 * 18). Docs: https://vidsrc.sh/vidsrc/docs/. This is what actually plays a
 * movie or TV episode on the player page; YouTube trailers elsewhere (hover
 * preview, hero banner) are untouched (see lib/trailerUtils.ts).
 */
import type { MediaType } from '../../lib/media.ts';

const VIDSRC_ORIGIN = 'https://vidsrc.sh';

export interface VidsrcTarget {
  /** Preferred: vidsrc.sh's own examples use the IMDB id. */
  imdbId: string | null;
  tmdbId: number;
  mediaType: MediaType;
}

/**
 * Movies always address one title. TV omits season/episode (no episode
 * picker exists in this app yet): vidsrc.sh then shows its own picker and
 * resumes the last episode it saw for this viewer.
 */
export function vidsrcEmbedUrl(target: VidsrcTarget, startAtSeconds = 0): string {
  const id = target.imdbId ?? String(target.tmdbId);
  const path = target.mediaType === 'tv' ? `/embed/tv/${id}` : `/embed/movie/${id}`;
  const params = new URLSearchParams({ autoplay: '1' });
  if (target.mediaType === 'tv') params.set('autonext', '1');
  if (startAtSeconds > 0) params.set('startAt', String(Math.floor(startAtSeconds)));
  return `${VIDSRC_ORIGIN}${path}?${params}`;
}

export interface VidsrcPlayerEvent {
  status: 'playing' | 'paused' | 'completed' | 'seeked' | (string & {});
  progressSeconds: number;
  durationSeconds: number | null;
}

/** Parses a `window` "message" event into a vidsrc.sh PLAYER_EVENT, or null for anything else. */
export function parsePlayerEvent(event: MessageEvent): VidsrcPlayerEvent | null {
  if (event.origin !== VIDSRC_ORIGIN) return null;
  const message = event.data as { type?: unknown; data?: unknown } | null;
  if (!message || message.type !== 'PLAYER_EVENT') return null;
  if (typeof message.data !== 'object' || message.data === null) return null;

  const data = message.data as Record<string, unknown>;
  if (typeof data.player_status !== 'string' || typeof data.player_progress !== 'number') {
    return null;
  }
  return {
    status: data.player_status as VidsrcPlayerEvent['status'],
    progressSeconds: data.player_progress,
    durationSeconds: typeof data.player_duration === 'number' ? data.player_duration : null,
  };
}
