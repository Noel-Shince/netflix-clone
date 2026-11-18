/**
 * Root component: auth and profile providers, and the route table.
 *
 * Browse pages, search and the player need a signed-in user (slice 05) and a
 * chosen profile (slice 11); the profile screens need only a signed-in user;
 * `/login` is for logged-out users only. Each rule is a layout route, so adding
 * a protected page is just nesting it in the right group.
 */
import { useEffect, type ReactNode } from 'react';
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
import { ProfileEditorPage } from './features/profiles/ProfileEditorPage.tsx';
import { ProfileProvider } from './features/profiles/ProfileProvider.tsx';
import { ProfilesPage } from './features/profiles/ProfilesPage.tsx';
import { RequireProfile } from './features/profiles/RequireProfile.tsx';
import { useProfiles } from './lib/profileContext.ts';
import { setMyListOwner } from './lib/myList.ts';
import { setWatchProgressOwner } from './lib/watchProgress.ts';
import { ROUTES, SEARCH_PATH } from './lib/routes.ts';

/**
 * Feeds the signed-in account to the profile provider. Features may not import
 * each other (ADR-2), so this glue lives at the root. The account is withheld
 * while a sign-up is still saving its display name, so the first profile is
 * named after the user rather than their email.
 */
function ProfilesForAccount({ children }: { children: ReactNode }) {
  const { user, authActionPending } = useAuth();
  const account =
    user && !authActionPending
      ? { uid: user.uid, displayName: user.displayName, email: user.email }
      : null;
  return <ProfileProvider account={account}>{children}</ProfileProvider>;
}

/** Tells lib/myList whose list to read: the active profile of the signed-in account. */
function MyListOwner() {
  const { user } = useAuth();
  const { activeProfile } = useProfiles();
  const owner = user && activeProfile ? `users/${user.uid}/profiles/${activeProfile.id}` : null;
  useEffect(() => {
    setMyListOwner(owner);
  }, [owner]);
  return null;
}

/** Tells lib/watchProgress whose resume points to read/write: same owner as My List. */
function WatchProgressOwner() {
  const { user } = useAuth();
  const { activeProfile } = useProfiles();
  const owner = user && activeProfile ? `users/${user.uid}/profiles/${activeProfile.id}` : null;
  useEffect(() => {
    setWatchProgressOwner(owner);
  }, [owner]);
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
      <ProfilesForAccount>
        <MyListOwner />
        <WatchProgressOwner />
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            <Route element={<RequireAuth />}>
              <Route element={<RequireProfile />}>
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
              <Route path="/profiles" element={<ProfilesPage />} />
              <Route path="/profiles/manage" element={<ProfilesPage manage />} />
              <Route path="/profiles/new" element={<ProfileEditorPage />} />
              <Route path="/profiles/:profileId/edit" element={<ProfileEditorPage />} />
            </Route>
            <Route element={<RedirectIfAuthed />}>
              <Route path="/login" element={<LoginPage />} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </ProfilesForAccount>
    </AuthProvider>
  );
}

export default App;
