/**
 * Renders its children only once profiles have loaded; shows a spinner while
 * loading and the load error with Retry if it failed.
 */
import type { ReactNode } from 'react';
import { Spinner } from '../../../components/Spinner/Spinner.tsx';
import { useProfiles } from '../../../lib/profileContext.ts';
import { ProfilesLoadError } from './ProfilesLoadError.tsx';
import { ProfilesShell } from './ProfilesShell.tsx';

export function ProfilesGate({ children }: { children: ReactNode }) {
  const { status } = useProfiles();
  if (status === 'ready') return children;
  if (status === 'error') return <ProfilesLoadError />;
  return (
    <ProfilesShell>
      <div className="profiles__center" aria-busy="true">
        <Spinner size={48} />
        <span className="visually-hidden">Loading profiles…</span>
      </div>
    </ProfilesShell>
  );
}
