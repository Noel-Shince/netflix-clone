/**
 * Browse page layout: navbar, hero with an overlapping row, more rows, footer.
 *
 * Home, TV Shows, Movies and New & Popular are all this layout with different
 * TMDB sources (see browsePages.ts). Each section fetches on its own, so rows
 * appear as they arrive and fail independently.
 */
import { Footer } from '../../components/Footer/Footer.tsx';
import { Navbar } from '../../components/Navbar/Navbar.tsx';
import { useAsync } from '../../lib/useAsync.ts';
import type { RowConfig } from './browsePages.ts';
import type { FeaturedTitle } from './types.ts';
import { Hero } from './components/Hero/Hero.tsx';
import { TitleRow } from './components/TitleRow/TitleRow.tsx';
import './HomePage.css';

export interface BrowsePageConfig {
  /** Module-level loader, so its identity is stable for useAsync. */
  loadFeatured: () => Promise<FeaturedTitle>;
  /** Row shown overlapping the bottom of the hero. */
  heroRow: RowConfig;
  rows: RowConfig[];
}

export function CatalogRow({ config }: { config: RowConfig }) {
  const { result, retry } = useAsync(config.load);
  return <TitleRow id={config.id} heading={config.heading} result={result} onRetry={retry} />;
}

export function BrowsePage({ config }: { config: BrowsePageConfig }) {
  const featured = useAsync(config.loadFeatured);

  return (
    <>
      <Navbar />
      <main className="home">
        <Hero result={featured.result} onRetry={featured.retry}>
          <CatalogRow config={config.heroRow} />
        </Hero>
        <div className="home__rows">
          {config.rows.map((row) => (
            <CatalogRow key={row.id} config={row} />
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
