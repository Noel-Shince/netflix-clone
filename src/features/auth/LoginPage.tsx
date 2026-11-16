/**
 * `/login` route: backdrop, wordmark and the sign-in / sign-up card.
 *
 * Slice 02 is UI only. `handleSubmit` is the single seam slice 05 replaces
 * with Firebase sign-in / sign-up calls; nothing else here should change.
 */
import { useState } from 'react';
import { Link } from 'react-router';
import { Logo } from '../../components/Logo/Logo.tsx';
import { placeholderGradient } from '../../lib/placeholderArt.ts';
import { LoginForm } from './components/LoginForm/LoginForm.tsx';
import type { LoginFormValues } from './types.ts';
import './LoginPage.css';

/** Enough tiles to fill a large desktop viewport at the grid's tile size. */
const BACKDROP_TILES = Array.from({ length: 48 }, (_, i) => i + 1);

export function LoginPage() {
  const [notice, setNotice] = useState<string | null>(null);

  function handleSubmit(values: LoginFormValues) {
    // Placeholder until Firebase Auth is wired in slice 05.
    const action = values.mode === 'signUp' ? 'Sign-up' : 'Sign-in';
    setNotice(`${action} is not connected yet. Authentication arrives in a later update.`);
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
        <LoginForm onSubmit={handleSubmit} notice={notice} />
      </main>
    </div>
  );
}
