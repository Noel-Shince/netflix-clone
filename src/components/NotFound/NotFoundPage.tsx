/**
 * Fallback for any route the app does not define.
 */
import { Link } from 'react-router';
import { Logo } from '../Logo/Logo.tsx';
import './NotFoundPage.css';

export function NotFoundPage() {
  return (
    <main className="not-found">
      <Logo />
      <h1 className="not-found__title">Lost your way?</h1>
      <p className="not-found__text">That page does not exist.</p>
      <Link className="not-found__link" to="/">
        Back to home
      </Link>
    </main>
  );
}
