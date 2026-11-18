/**
 * Recommendation logic shared by the home page ("Top Picks for You",
 * "Because you watched ...") and the player ("More Like This").
 *
 * TMDB does the item-to-item part: `/movie/{id}/recommendations` lists movies
 * that TMDB users who liked `id` also liked. It is empty for some obscure
 * titles, so `/movie/{id}/similar` (genre and keyword overlap) is the fallback.
 *
 * `blendRecommendations` does the personal part: it merges the lists for
 * several watched titles into one ranking. See docs/slices/09-recommendations.md.
 */
import { tmdbGet, tmdbImageUrl } from './tmdb.ts';

export interface RecommendedTitle {
  id: number;
  name: string;
  imageUrl: string | null;
}

interface TmdbMovie {
  id: number;
  title: string;
  backdrop_path: string | null;
}

interface TmdbMovieList {
  results: TmdbMovie[];
}

function toRecommendedTitle(movie: TmdbMovie): RecommendedTitle {
  return {
    id: movie.id,
    name: movie.title,
    imageUrl: tmdbImageUrl(movie.backdrop_path, 'w300'),
  };
}

/**
 * Movies related to `id`, best match first: TMDB's recommendations, or its
 * similar-titles list when there are none. Never includes `id` itself.
 */
export async function fetchRelatedTitles(id: number): Promise<RecommendedTitle[]> {
  let list = await tmdbGet<TmdbMovieList>(`/movie/${id}/recommendations`);
  if (list.results.length === 0) {
    list = await tmdbGet<TmdbMovieList>(`/movie/${id}/similar`);
  }
  return list.results.filter((m) => m.id !== id).map(toRecommendedTitle);
}

/** How many of the most recent watched titles seed the blended row. */
export const MAX_SEEDS = 5;
/** Each older seed counts this much less than the one after it. */
const RECENCY_DECAY = 0.75;
const MAX_RESULTS = 20;

/**
 * Merges per-seed related lists into one ranking.
 *
 * `relatedBySeed[i]` is the related list for the i-th most recent watched
 * title. A candidate at position `p` (0-based) in seed `i`'s list scores
 * `RECENCY_DECAY^i / (1 + p / 5)`, and its scores add up across seeds. So a
 * movie that several of your titles point to beats one that a single title
 * ranks highly, and recent watches count more than old ones. Titles in
 * `exclude` (already watched) are dropped, and ties go to titles with artwork,
 * then to the more recent seed's order.
 */
export function blendRecommendations(
  relatedBySeed: RecommendedTitle[][],
  exclude: ReadonlySet<number>,
  limit = MAX_RESULTS,
): RecommendedTitle[] {
  const scored = new Map<number, { title: RecommendedTitle; score: number; firstSeen: number }>();
  let order = 0;

  relatedBySeed.forEach((list, seedIndex) => {
    const recency = RECENCY_DECAY ** seedIndex;
    list.forEach((title, position) => {
      if (exclude.has(title.id)) return;
      const points = recency / (1 + position / 5);
      const existing = scored.get(title.id);
      if (existing) existing.score += points;
      else scored.set(title.id, { title, score: points, firstSeen: order++ });
    });
  });

  return [...scored.values()]
    .sort(
      (a, b) =>
        b.score - a.score ||
        Number(b.title.imageUrl !== null) - Number(a.title.imageUrl !== null) ||
        a.firstSeen - b.firstSeen,
    )
    .slice(0, limit)
    .map((s) => s.title);
}

/**
 * Personal picks from watched title ids (newest first). One seed failing to
 * load is skipped; the row only errors when every seed fails.
 */
export async function fetchPicksFor(watchedIds: number[]): Promise<RecommendedTitle[]> {
  const seeds = watchedIds.slice(0, MAX_SEEDS);
  const settled = await Promise.allSettled(seeds.map(fetchRelatedTitles));
  const first = settled[0];
  if (first?.status === 'rejected' && settled.every((r) => r.status === 'rejected')) {
    throw first.reason;
  }
  // Keep each list at its seed's index, so a failed seed doesn't make older
  // seeds count as more recent than they are.
  const bySeed = settled.map((r) => (r.status === 'fulfilled' ? r.value : []));
  return blendRecommendations(bySeed, new Set(watchedIds));
}
