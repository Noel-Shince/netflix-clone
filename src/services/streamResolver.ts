/**
 * Stream resolver client: turns a title's IMDB id into a list of playable
 * stream URLs. This is the piece Noel's own resolver API plugs into — see
 * the placeholder block below for exactly what to paste and where.
 *
 * Until a real endpoint is configured, `resolveStreams` returns mock data
 * pointing at a public test HLS stream, so the custom player
 * (`components/VideoPlayer/VideoPlayer.tsx`) works end to end immediately —
 * play/pause, seek, quality switching, the lot — without waiting on a real
 * resolver. `PlayerPage.tsx` falls back to the VidKing iframe embed
 * (`features/playback/vidking.ts`) whenever this returns an empty array or
 * throws, so a broken or rate-limited resolver never breaks playback.
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
const RESOLVER_BASE_URL = ''; // TODO: paste your stream resolver's base URL here.

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
 * Returns `[]` on any failure — a non-2xx response, a timeout, or a reply
 * that isn't the expected JSON array — so callers only need to handle "got
 * streams" vs. "didn't", never a thrown error.
 */
export async function resolveStreams(
  imdbId: string,
  type: MediaType,
  season?: number,
  episode?: number,
  configToken?: string | null,
): Promise<StreamResult[]> {
  if (!RESOLVER_BASE_URL) return MOCK_STREAMS;

  const path =
    type === 'tv'
      ? `/stream/tv/${imdbId}:${season ?? 1}:${episode ?? 1}.json`
      : `/stream/movie/${imdbId}.json`;
  const query = configToken ? `?${new URLSearchParams({ config: configToken })}` : '';
  const url = `${RESOLVER_BASE_URL}${path}${query}`;

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(RESOLVER_TIMEOUT_MS) });
    if (!response.ok) throw new Error(`Stream resolver returned HTTP ${response.status}`);
    const data: unknown = await response.json();
    if (!Array.isArray(data)) return [];
    return data.filter(isStreamResult);
  } catch (error) {
    console.error('Stream resolver request failed', error);
    return [];
  }
}
