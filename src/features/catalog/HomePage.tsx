/**
 * Home / browse page: navbar, hero with an overlapping row, more rows, footer.
 *
 * The only place that knows which TMDB list feeds which row. Each section
 * fetches on its own, so rows appear as they arrive and fail independently.
 *
 * The personal rows (slice 09) only appear once the user has opened at least
 * one title: with no watch history there is nothing honest to personalise on.
 */
import { Footer } from '../../components/Footer/Footer.tsx';
import { Navbar } from '../../components/Navbar/Navbar.tsx';
import { useState } from 'react';
import { fetchPicksFor, fetchRelatedTitles } from '../../lib/recommendations.ts';
import { useAsync } from '../../lib/useAsync.ts';
import { getWatchHistory, type WatchedTitle } from '../../lib/watchHistory.ts';
import { fetchFeaturedTitle, fetchMovieRow, type MovieListPath } from './api/catalogApi.ts';
import { Hero } from './components/Hero/Hero.tsx';
import { TitleRow } from '../../components/TitleRow/TitleRow.tsx';
import './HomePage.css';

interface RowConfig {
  id: string;
  heading: string;
  /** Module-level loader, so its identity is stable for useAsync. */
  load: () => ReturnType<typeof fetchMovieRow>;
}

function row(id: string, heading: string, path: MovieListPath): RowConfig {
  return { id, heading, load: () => fetchMovieRow(path) };
}

/** Row shown overlapping the bottom of the hero. */
const HERO_ROW = row('popular', 'Popular on Noelflix', '/movie/popular');

const ROWS: RowConfig[] = [
  row('top-rated', 'Blockbuster Movies', '/movie/top_rated'),
  row('now-playing', 'Now Playing', '/movie/now_playing'),
  row('upcoming', 'Upcoming', '/movie/upcoming'),
  row('trending-week', 'Trending This Week', '/trending/movie/week'),
];

/**
 * Rows built from the user's watch history, newest watch first. Built once
 * per visit to the home page, so loaders stay stable for useAsync.
 */
function personalRows(history: WatchedTitle[]): RowConfig[] {
  if (history.length === 0) return [];
  const watchedIds = history.map((t) => t.id);
  const rows: RowConfig[] = [
    { id: 'top-picks', heading: 'Top Picks for You', load: () => fetchPicksFor(watchedIds) },
  ];
  // With a single watched title, this row would repeat Top Picks exactly.
  if (history.length > 1) {
    const latest = history[0];
    const watched = new Set(watchedIds);
    rows.push({
      id: 'because-you-watched',
      heading: `Because you watched ${latest.name}`,
      load: async () => (await fetchRelatedTitles(latest.id)).filter((t) => !watched.has(t.id)),
    });
  }
  return rows;
}

function CatalogRow({ config }: { config: RowConfig }) {
  const { result, retry } = useAsync(config.load);
  return <TitleRow id={config.id} heading={config.heading} result={result} onRetry={retry} />;
}

export function HomePage() {
  const featured = useAsync(fetchFeaturedTitle);
  const [rows] = useState(() => [...personalRows(getWatchHistory()), ...ROWS]);

  return (
    <>
      <Navbar />
      <main className="home">
        <Hero result={featured.result} onRetry={featured.retry}>
          <CatalogRow config={HERO_ROW} />
        </Hero>
        <div className="home__rows">
          {rows.map((config) => (
            <CatalogRow key={config.id} config={config} />
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
