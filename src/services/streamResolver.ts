/**
 * Stream resolver client: turns a title's IMDB id into a list of playable
 * stream URLs. This is the piece Noel's own resolver API plugs into — see
 * the placeholder block below for exactly what to paste and where.
 *
 * Until a real endpoint is configured, `resolveStreams` returns mock data
 * pointing at a public test HLS stream, so the custom player
 * (`components/VideoPlayer/VideoPlayer.tsx`) works end to end immediately —
 * play/pause, seek, quality switching, the lot — without waiting on a real
 * resolver. `PlayerPage.tsx` falls back to the vidsrc.to iframe embed
 * (`features/playback/vidsrc.ts`) whenever this returns no streams and no
 * auth error, so a broken or rate-limited resolver never breaks playback.
 *
 * A 401/403 from the resolver means the configured debrid token (Real-Debrid
 * / TorBox, see `lib/streamSettings.ts`) is missing, invalid, or expired —
 * that's a subscription problem, not a transient resolver failure, so it's
 * reported back distinctly (`status: 'auth-error'`) instead of silently
 * falling back to the iframe embed, which would just as silently play a
 * worse (ad-supported, no resume tracking) source for no visible reason.
 */
import type { MediaType } from '../lib/media.ts';

/** One playable source the resolver found for a title (or one episode). */
export interface StreamResult {
  /** Direct HLS (.m3u8) URL. */
  url: string;
  /** Label for the quality/source selector, e.g. "Server 1 — 1080p". */
  name: string;
  quality: '4K' | '1080p' | '720p' | '480p';
  /** Audio language labels this specific stream offers, if the resolver reports them. */
  audioTracks?: string[];
}

export type ResolveStreamsResult =
  | { status: 'ok'; streams: StreamResult[] }
  /** Debrid token missing/invalid/expired (resolver returned 401/403). */
  | { status: 'auth-error' }
  /** Any other failure, or simply no streams found — safe to fall back silently. */
  | { status: 'error' };

// ─────────────────────────────────────────────────────────────────────────
// STREAM RESOLVER PLACEHOLDER
// File: src/services/streamResolver.ts
// Line: ~30 (the RESOLVER_BASE_URL assignment right below this block)
//
// Replace RESOLVER_BASE_URL with your API endpoint's base URL (no trailing
// slash), e.g. 'https://your-resolver.example.com'. Leaving it empty keeps
// the app on the mock stream below.
//
// Expected response format: a JSON array of StreamResult objects (the type
// above) — the player accepts any subset of entries, but needs at least one
// with a valid `url` to play anything.
//
// The endpoint will be called as:
//   GET {RESOLVER_BASE_URL}/stream/{type}/{imdbId}.json
// For TV:
//   GET {RESOLVER_BASE_URL}/stream/{type}/{imdbId}:{season}:{episode}.json
//
// Config token (pasted by the viewer into Settings → Streaming, stored at
// `users/{uid}/settings/preferences.streamApiKey`, see lib/streamSettings.ts)
// is passed as a query param: ?config={userToken}
// ─────────────────────────────────────────────────────────────────────────
const RESOLVER_BASE_URL = 'https://comet.elfhosted.com';

const RESOLVER_TIMEOUT_MS = 10_000;

const MOCK_STREAM_URL = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';

/** Three labelled entries over the same public test stream, so the quality selector has something to switch between before a real resolver is wired up. */
const MOCK_STREAMS: StreamResult[] = [
  { url: MOCK_STREAM_URL, name: 'Test stream — 1080p', quality: '1080p', audioTracks: ['English'] },
  { url: MOCK_STREAM_URL, name: 'Test stream — 720p', quality: '720p', audioTracks: ['English'] },
  { url: MOCK_STREAM_URL, name: 'Test stream — 480p', quality: '480p', audioTracks: ['English'] },
];

function isStreamResult(value: unknown): value is StreamResult {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.url === 'string' &&
    candidate.url.length > 0 &&
    typeof candidate.name === 'string' &&
    (candidate.quality === '4K' ||
      candidate.quality === '1080p' ||
      candidate.quality === '720p' ||
      candidate.quality === '480p') &&
    (candidate.audioTracks === undefined ||
      (Array.isArray(candidate.audioTracks) &&
        candidate.audioTracks.every((track) => typeof track === 'string')))
  );
}

/**
 * Looks up playable streams for a title (or, for TV, one specific episode).
 * Distinguishes an auth/subscription failure (401/403 — bad or expired
 * debrid token) from every other failure (network error, timeout, bad
 * response shape, or just no streams found), since only the latter is safe
 * to fall back from silently.
 */
export async function resolveStreams(
  imdbId: string,
  type: MediaType,
  season?: number,
  episode?: number,
  configToken?: string | null,
): Promise<ResolveStreamsResult> {
  if (!RESOLVER_BASE_URL) return { status: 'ok', streams: MOCK_STREAMS };

  const path =
    type === 'tv'
      ? `/stream/tv/${imdbId}:${season ?? 1}:${episode ?? 1}.json`
      : `/stream/movie/${imdbId}.json`;
  const query = configToken ? `?${new URLSearchParams({ config: configToken })}` : '';
  const url = `${RESOLVER_BASE_URL}${path}${query}`;

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(RESOLVER_TIMEOUT_MS) });
    if (response.status === 401 || response.status === 403) return { status: 'auth-error' };
    if (!response.ok) throw new Error(`Stream resolver returned HTTP ${response.status}`);
    const data: unknown = await response.json();
    if (!Array.isArray(data)) return { status: 'error' };
    const streams = data.filter(isStreamResult);
    return streams.length > 0 ? { status: 'ok', streams } : { status: 'error' };
  } catch (error) {
    console.error('Stream resolver request failed', error);
    return { status: 'error' };
  }
}
