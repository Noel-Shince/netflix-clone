/**
 * Root component: route table.
 *
 * `/player/:id` (slice 04) plays a title's trailer. Route protection (redirecting
 * logged-out users to `/login`) arrives with Firebase Auth in slice 05.
 */
import { BrowserRouter, Route, Routes } from 'react-router';
import { NotFoundPage } from './components/NotFound/NotFoundPage.tsx';
import { LoginPage } from './features/auth/LoginPage.tsx';
import { HomePage } from './features/catalog/HomePage.tsx';
import { PlayerPage } from './features/playback/PlayerPage.tsx';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/player/:id" element={<PlayerPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
