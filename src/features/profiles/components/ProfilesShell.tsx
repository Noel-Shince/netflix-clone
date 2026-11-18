/**
 * Page frame shared by the profile screens: wordmark header and a centred
 * main area. No navbar, as on Netflix: nothing else is reachable before a
 * profile is chosen.
 */
import type { ReactNode } from 'react';
import { Logo } from '../../../components/Logo/Logo.tsx';
import '../Profiles.css';

export function ProfilesShell({ children }: { children: ReactNode }) {
  return (
    <div className="profiles">
      <header className="profiles__header">
        <Logo />
      </header>
      <main className="profiles__main">{children}</main>
    </div>
  );
}
