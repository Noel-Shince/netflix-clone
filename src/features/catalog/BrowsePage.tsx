/**
 * Browse page layout: hero, then rows. Navbar and footer come from BrowseLayout.
 *
 * Home, TV Shows, Movies and New & Popular are all this layout with different
 * TMDB sources (see browsePages.ts). Each section fetches on its own, so rows
 * appear as they arrive and fail independently.
 */
import { useState } from 'react';
import { TitleRow } from '../../components/TitleRow/TitleRow.tsx';
import { useAsync } from '../../lib/useAsync.ts';
import { getWatchHistory, type WatchedTitle } from '../../lib/watchHistory.ts';
import type { RowConfig } from './browsePages.ts';
import type { FeaturedTitle } from './types.ts';
import { Hero } from './components/Hero/Hero.tsx';
import './HomePage.css';

export interface BrowsePageConfig {
  /** Module-level loader, so its identity is stable for useAsync. Resolves to
   * several candidates: the hero rotates through them (slice 13). */
  loadFeaturedTitles: () => Promise<FeaturedTitle[]>;
  /** Row shown overlapping the bottom of the hero. */
  heroRow: RowConfig;
  rows: RowConfig[];
  /** Rows from the user's watch history, shown above `rows` (home page only). */
  personalRows?: (history: WatchedTitle[]) => RowConfig[];
}

export function CatalogRow({ config }: { config: RowConfig }) {
  const { result, retry } = useAsync(config.load);
  return <TitleRow id={config.id} heading={config.heading} result={result} onRetry={retry} />;
}

export function BrowsePage({ config }: { config: BrowsePageConfig }) {
  const featured = useAsync(config.loadFeaturedTitles);
  // Built once per visit, so the personal rows' loaders stay stable for useAsync.
  const [rows] = useState(() => [
    ...(config.personalRows?.(getWatchHistory()) ?? []),
    ...config.rows,
  ]);

  return (
    <>
      <main className="home">
        <Hero result={featured.result} onRetry={featured.retry}>
          <CatalogRow config={config.heroRow} />
        </Hero>
        <div className="home__rows">
          {rows.map((row) => (
            <CatalogRow key={row.id} config={row} />
          ))}
        </div>
      </main>
    </>
  );
}
