/**
 * Page frame shared by the profile screens: a rotating backdrop (slice 13),
 * wordmark header and a centred main area. No navbar, as on Netflix: nothing
 * else is reachable before a profile is chosen.
 */
import type { ReactNode } from 'react';
import { Logo } from '../../../components/Logo/Logo.tsx';
import '../Profiles.css';
import { ProfilesBackdrop } from './ProfilesBackdrop.tsx';

export function ProfilesShell({ children }: { children: ReactNode }) {
  return (
    <div className="profiles">
      <ProfilesBackdrop />
      <header className="profiles__header">
        <Logo />
      </header>
      <main className="profiles__main">{children}</main>
    </div>
  );
}
