/**
 * Root component: auth state provider and route table.
 *
 * Every browse page, search and the player need a signed-in user; `/login` is
 * for logged-out users only (slice 05). Both rules are layout routes, so adding
 * a protected page is just nesting it under `RequireAuth`.
 */
import { useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router';
import { BrowseLayout } from './components/BrowseLayout/BrowseLayout.tsx';
import { NotFoundPage } from './components/NotFound/NotFoundPage.tsx';
import { useAuth } from './features/auth/AuthContext.ts';
import { AuthProvider } from './features/auth/AuthProvider.tsx';
import { LoginPage } from './features/auth/LoginPage.tsx';
import { RedirectIfAuthed, RequireAuth } from './features/auth/RouteGuards.tsx';
import {
  HomePage,
  MoviesPage,
  NewAndPopularPage,
  TvShowsPage,
} from './features/catalog/HomePage.tsx';
import { SearchPage } from './features/catalog/SearchPage.tsx';
import { LanguagesPage } from './features/catalog/LanguagesPage.tsx';
import { MyListPage } from './features/myList/MyListPage.tsx';
import { PlayerPage } from './features/playback/PlayerPage.tsx';
import { setMyListOwner } from './lib/myList.ts';
import { ROUTES, SEARCH_PATH } from './lib/routes.ts';

/**
 * Tells lib/myList whose list to read: the signed-in account. The one place
 * to change when lists become per profile (owner `users/{uid}/profiles/{id}`).
 */
function MyListOwner() {
  const { user } = useAuth();
  useEffect(() => {
    setMyListOwner(user ? `users/${user.uid}` : null);
  }, [user]);
  return null;
}

/**
 * Starts each new page at the top. BrowserRouter keeps the old scroll offset
 * otherwise, so going from a scrolled home page to My List lands mid-page.
 */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function App() {
  return (
    <AuthProvider>
      <MyListOwner />
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route element={<RequireAuth />}>
            <Route element={<BrowseLayout />}>
              <Route path={ROUTES.home} element={<HomePage />} />
              <Route path={ROUTES.tvShows} element={<TvShowsPage />} />
              <Route path={ROUTES.movies} element={<MoviesPage />} />
              <Route path={ROUTES.newAndPopular} element={<NewAndPopularPage />} />
              <Route path={ROUTES.myList} element={<MyListPage />} />
              <Route path={ROUTES.languages} element={<LanguagesPage />} />
              <Route path={SEARCH_PATH} element={<SearchPage />} />
            </Route>
            <Route path="/player/:id" element={<PlayerPage />} />
            <Route path="/player/tv/:id" element={<PlayerPage mediaType="tv" />} />
          </Route>
          <Route element={<RedirectIfAuthed />}>
            <Route path="/login" element={<LoginPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
