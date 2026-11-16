/**
 * Root component: route table.
 *
 * `/player/:id` is added by slice 04. Route protection (redirecting
 * logged-out users to `/login`) arrives with Firebase Auth in slice 05.
 */
import { BrowserRouter, Route, Routes } from 'react-router';
import { NotFoundPage } from './components/NotFound/NotFoundPage.tsx';
import { LoginPage } from './features/auth/LoginPage.tsx';
import { HomePage } from './features/catalog/HomePage.tsx';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
