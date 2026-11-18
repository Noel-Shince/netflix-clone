/**
 * Shared frame for the browse pages (home and search): navbar, page, footer.
 *
 * A layout route instead of each page rendering its own Navbar, so moving
 * between `/` and `/search` keeps the same Navbar instance. That is what lets
 * the search box keep focus and its text while typing changes the URL.
 */
import { Outlet } from 'react-router';
import { Footer } from '../Footer/Footer.tsx';
import { Navbar } from '../Navbar/Navbar.tsx';

export function BrowseLayout() {
  return (
    <>
      <Navbar />
      <Outlet />
      <Footer />
    </>
  );
}
