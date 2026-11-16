/**
 * `/login` route: backdrop, wordmark and the sign-in / sign-up card.
 *
 * `handleSubmit` is the seam between the presentational form (slice 02) and
 * Firebase (slice 05). Redirecting after success is not done here: once
 * Firebase reports a user, the `RedirectIfAuthed` guard around this route
 * sends them on.
 */
import { useState } from 'react';
import { Link } from 'react-router';
import { Logo } from '../../components/Logo/Logo.tsx';
import { signIn, signUp } from '../../lib/firebase.ts';
import { placeholderGradient } from '../../lib/placeholderArt.ts';
import { authErrorMessage } from './api/authErrors.ts';
import { LoginForm } from './components/LoginForm/LoginForm.tsx';
import type { LoginFormValues } from './types.ts';
import './LoginPage.css';

/** Enough tiles to fill a large desktop viewport at the grid's tile size. */
const BACKDROP_TILES = Array.from({ length: 48 }, (_, i) => i + 1);

export function LoginPage() {
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit({ mode, name, email, password, rememberMe }: LoginFormValues) {
    setError(null);
    try {
      if (mode === 'signUp') {
        await signUp(name, email, password, rememberMe);
      } else {
        await signIn(email, password, rememberMe);
      }
    } catch (caught) {
      setError(authErrorMessage(caught));
    }
  }

  return (
    <div className="login-page">
      {/* Decorative poster wall standing in for the tutorial's background still. */}
      <div className="login-page__backdrop" aria-hidden="true">
        {BACKDROP_TILES.map((id) => (
          <span
            key={id}
            className="login-page__tile"
            style={{ backgroundImage: placeholderGradient(id) }}
          />
        ))}
      </div>

      <header className="login-page__header">
        <Link to="/" aria-label="Home" className="login-page__logo">
          <Logo />
        </Link>
      </header>

      <main className="login-page__main">
        <LoginForm onSubmit={handleSubmit} error={error} onModeChange={() => setError(null)} />
      </main>
    </div>
  );
}
