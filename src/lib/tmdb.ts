/**
 * Minimal client for The Movie Database (TMDB) REST API.
 *
 * The only module that talks to TMDB. It authenticates with the v4 "API Read
 * Access Token" sent as a Bearer header on v3 endpoints (TMDB's recommended
 * approach; see ADR-9), retries once on rate limits and server errors, times
 * out slow requests, and caches successful responses for the page session.
 *
 * Callers get typed JSON or a `TmdbError`; they never see `fetch` details.
 */
import { requireEnv } from './env.ts';

const API_BASE = 'https://api.themoviedb.org/3';
const IMAGE_BASE = 'https://image.tmdb.org/t/p';
const TIMEOUT_MS = 10_000;
/** Longest we will wait on TMDB's Retry-After before giving up and showing an error. */
const MAX_RETRY_WAIT_MS = 5_000;
const DEFAULT_RETRY_WAIT_MS = 1_000;

/** Backdrop widths TMDB serves. Cards use w300, the hero w1280. */
export type BackdropSize = 'w300' | 'w780' | 'w1280' | 'original';

export type TmdbErrorKind = 'config' | 'network' | 'timeout' | 'rate-limit' | 'http';

export class TmdbError extends Error {
  readonly kind: TmdbErrorKind;
  readonly status: number | undefined;

  constructor(kind: TmdbErrorKind, message: string, status?: number) {
    super(message);
    this.name = 'TmdbError';
    this.kind = kind;
    this.status = status;
  }
}

/** Full image URL for a TMDB image path, or null when TMDB has no image. */
export function tmdbImageUrl(path: string | null | undefined, size: BackdropSize): string | null {
  return path ? `${IMAGE_BASE}/${size}${path}` : null;
}

// Keyed by full URL. Holds in-flight promises too, so two components asking for
// the same list (or React StrictMode's double effect) share one request.
const cache = new Map<string, Promise<unknown>>();

/**
 * GET a TMDB v3 endpoint, e.g. `tmdbGet<MovieList>('/movie/popular')`.
 * Failed requests are not cached, so calling again after an error retries.
 */
export function tmdbGet<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const query = new URLSearchParams({ language: 'en-US', ...params });
  const url = `${API_BASE}${path}?${query}`;

  const cached = cache.get(url);
  if (cached) return cached as Promise<T>;

  const request = fetchWithRetry<T>(url);
  cache.set(url, request);
  request.catch(() => cache.delete(url));
  return request;
}

async function fetchWithRetry<T>(url: string): Promise<T> {
  let token: string;
  try {
    token = requireEnv('VITE_TMDB_READ_TOKEN');
  } catch (error) {
    throw new TmdbError('config', (error as Error).message);
  }

  const response = await send(url, token);
  if (!isRetryable(response.status)) return parse<T>(response);

  await wait(retryDelay(response));
  return parse<T>(await send(url, token));
}

async function send(url: string, token: string): Promise<Response> {
  try {
    return await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      throw new TmdbError('timeout', `TMDB did not respond within ${TIMEOUT_MS / 1000}s.`);
    }
    throw new TmdbError('network', 'Could not reach TMDB. Check your connection.');
  }
}

async function parse<T>(response: Response): Promise<T> {
  if (response.ok) return (await response.json()) as T;

  if (response.status === 429) {
    throw new TmdbError('rate-limit', 'TMDB rate limit reached. Try again shortly.', 429);
  }
  if (response.status === 401) {
    throw new TmdbError(
      'config',
      'TMDB rejected the access token. Check VITE_TMDB_READ_TOKEN in .env.local.',
      401,
    );
  }
  throw new TmdbError('http', `TMDB request failed (HTTP ${response.status}).`, response.status);
}

function isRetryable(status: number): boolean {
  return status === 429 || status >= 500;
}

/** Honours Retry-After (seconds) when TMDB sends it, capped so the UI never hangs. */
function retryDelay(response: Response): number {
  const seconds = Number(response.headers.get('Retry-After'));
  const ms = Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : DEFAULT_RETRY_WAIT_MS;
  return Math.min(ms, MAX_RETRY_WAIT_MS);
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Message to show in the UI for a failed TMDB call. Configuration problems
 * (missing or rejected token) get the specific fix in development; everything
 * else, and every error in production, gets the caller's generic fallback.
 */
export function tmdbErrorMessage(error: Error, fallback: string): string {
  if (import.meta.env.DEV && error instanceof TmdbError && error.kind === 'config') {
    return error.message;
  }
  return fallback;
}
