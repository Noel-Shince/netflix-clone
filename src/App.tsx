/**
 * Root component: route table.
 *
 * `/login` (slice 02) and `/player/:id` (slice 04) are added by their slices.
 */
import { BrowserRouter, Route, Routes } from 'react-router';
import { NotFoundPage } from './components/NotFound/NotFoundPage.tsx';
import { HomePage } from './features/catalog/HomePage.tsx';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
