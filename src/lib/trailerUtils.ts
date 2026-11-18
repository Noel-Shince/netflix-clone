/**
 * Lightweight trailer-key fetcher shared by the hover preview card and the
 * hero banner.
 *
 * Lives in lib/ rather than features/playback: both a shared component
 * (TitleCard's hover card) and a different feature (catalog's Hero) need
 * it, and features may not import each other (ADR-2). Duplicates
 * playbackApi.ts's small trailer-ranking rule rather than importing across
 * that boundary.
 *
 * Re-uses tmdb.ts's in-memory request cache, so hovering a title that the
 * player page already fetched (or vice versa) is free.
 */
import type { MediaType } from './media.ts';
import { tmdbGet } from './tmdb.ts';

interface TmdbVideo {
  key: string;
  site: string;
  type: string;
  official: boolean;
}

/** Lower is better. Prefers an official trailer over a teaser or clip. */
function rank(video: TmdbVideo): number {
  if (video.type === 'Trailer') return video.official ? 0 : 1;
  if (video.type === 'Teaser') return 2;
  return 3;
}

/** Best YouTube video key for a title, or null when TMDB has none. */
export async function fetchTrailerKey(id: number, mediaType: MediaType): Promise<string | null> {
  const { results } = await tmdbGet<{ results: TmdbVideo[] }>(`/${mediaType}/${id}/videos`, {
    include_video_language: 'en,null',
  });
  const best = results
    .filter((v) => v.site === 'YouTube' && v.key)
    .reduce<TmdbVideo | null>((top, v) => (!top || rank(v) < rank(top) ? v : top), null);
  return best?.key ?? null;
}

/** Muted, autoplaying, chromeless YouTube-nocookie embed URL for a preview. */
export function trailerEmbedUrl(key: string, loop = true): string {
  const params = new URLSearchParams({
    autoplay: '1',
    mute: '1',
    controls: '0',
    rel: '0',
    modestbranding: '1',
    playsinline: '1',
  });
  if (loop) {
    params.set('loop', '1');
    // A single video only loops when `playlist` repeats its own key.
    params.set('playlist', key);
  }
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(key)}?${params.toString()}`;
}
