/**
 * Browse routes: Home, TV Shows, Movies and New & Popular share one layout
 * (BrowsePage) and differ only in their TMDB sources (browsePages.ts). Each is
 * its own component, so switching pages remounts and starts from loading.
 */
import { BrowsePage } from './BrowsePage.tsx';
import { HOME_PAGE, MOVIES_PAGE, NEW_AND_POPULAR_PAGE, TV_SHOWS_PAGE } from './browsePages.ts';

export function HomePage() {
  return <BrowsePage config={HOME_PAGE} />;
}

export function TvShowsPage() {
  return <BrowsePage config={TV_SHOWS_PAGE} />;
}

export function MoviesPage() {
  return <BrowsePage config={MOVIES_PAGE} />;
}

export function NewAndPopularPage() {
  return <BrowsePage config={NEW_AND_POPULAR_PAGE} />;
}
