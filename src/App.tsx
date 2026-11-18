/**
 * Root component: auth state provider and route table.
 *
 * `/`, `/search` and `/player/:id` need a signed-in user; `/login` is for logged-out users
 * only (slice 05). Both rules are layout routes, so adding a protected page is
 * just nesting it under `RequireAuth`.
 */
import { BrowserRouter, Route, Routes } from 'react-router';
import { BrowseLayout } from './components/BrowseLayout/BrowseLayout.tsx';
import { NotFoundPage } from './components/NotFound/NotFoundPage.tsx';
import { AuthProvider } from './features/auth/AuthProvider.tsx';
import { LoginPage } from './features/auth/LoginPage.tsx';
import { RedirectIfAuthed, RequireAuth } from './features/auth/RouteGuards.tsx';
import { HomePage } from './features/catalog/HomePage.tsx';
import { SearchPage } from './features/catalog/SearchPage.tsx';
import { PlayerPage } from './features/playback/PlayerPage.tsx';
import { SEARCH_PATH } from './lib/routes.ts';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<RequireAuth />}>
            <Route element={<BrowseLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path={SEARCH_PATH} element={<SearchPage />} />
            </Route>
            <Route path="/player/:id" element={<PlayerPage />} />
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
