/**
 * Home / browse page: navbar, hero with an overlapping row, more rows, footer.
 *
 * The only place that knows which TMDB list feeds which row. Each section
 * fetches on its own, so rows appear as they arrive and fail independently.
 */
import { Footer } from '../../components/Footer/Footer.tsx';
import { Navbar } from '../../components/Navbar/Navbar.tsx';
import { useAsync } from '../../lib/useAsync.ts';
import { fetchFeaturedTitle, fetchMovieRow, type MovieListPath } from './api/catalogApi.ts';
import { Hero } from './components/Hero/Hero.tsx';
import { TitleRow } from './components/TitleRow/TitleRow.tsx';
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
const HERO_ROW = row('popular', 'Popular on Netflix', '/movie/popular');

const ROWS: RowConfig[] = [
  row('top-rated', 'Blockbuster Movies', '/movie/top_rated'),
  row('now-playing', 'Now Playing', '/movie/now_playing'),
  row('upcoming', 'Upcoming', '/movie/upcoming'),
  row('trending-week', 'Top Picks for You', '/trending/movie/week'),
];

function CatalogRow({ config }: { config: RowConfig }) {
  const { result, retry } = useAsync(config.load);
  return <TitleRow id={config.id} heading={config.heading} result={result} onRetry={retry} />;
}

export function HomePage() {
  const featured = useAsync(fetchFeaturedTitle);

  return (
    <>
      <Navbar />
      <main className="home">
        <Hero result={featured.result} onRetry={featured.retry}>
          <CatalogRow config={HERO_ROW} />
        </Hero>
        <div className="home__rows">
          {ROWS.map((config) => (
            <CatalogRow key={config.id} config={config} />
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
