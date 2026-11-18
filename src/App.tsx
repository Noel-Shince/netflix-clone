/**
 * Root component: auth and profile providers, and the route table.
 *
 * `/` and `/player/:id` need a signed-in user (slice 05) and a chosen profile
 * (slice 09); the profile screens need only a signed-in user; `/login` is for
 * logged-out users only. Each rule is a layout route, so adding a protected
 * page is just nesting it in the right group.
 */
import { BrowserRouter, Route, Routes } from 'react-router';
import type { ReactNode } from 'react';
import { NotFoundPage } from './components/NotFound/NotFoundPage.tsx';
import { useAuth } from './features/auth/AuthContext.ts';
import { AuthProvider } from './features/auth/AuthProvider.tsx';
import { LoginPage } from './features/auth/LoginPage.tsx';
import { RedirectIfAuthed, RequireAuth } from './features/auth/RouteGuards.tsx';
import { HomePage } from './features/catalog/HomePage.tsx';
import { PlayerPage } from './features/playback/PlayerPage.tsx';
import { ProfileEditorPage } from './features/profiles/ProfileEditorPage.tsx';
import { ProfileProvider } from './features/profiles/ProfileProvider.tsx';
import { ProfilesPage } from './features/profiles/ProfilesPage.tsx';
import { RequireProfile } from './features/profiles/RequireProfile.tsx';

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

function App() {
  return (
    <AuthProvider>
      <ProfilesForAccount>
        <BrowserRouter>
          <Routes>
            <Route element={<RequireAuth />}>
              <Route element={<RequireProfile />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/player/:id" element={<PlayerPage />} />
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
