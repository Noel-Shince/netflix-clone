/**
 * `/profiles` ("Who's watching?") and `/profiles/manage` (slice 09).
 *
 * Both show the same grid. Picking a profile makes it active and continues to
 * the page the user originally asked for; in manage mode each tile opens its
 * editor instead. Location state (`from`) is passed along every link here, so
 * a detour through manage / add still ends on the requested page.
 */
import { Link, useLocation, useNavigate } from 'react-router';
import { PencilIcon, PlusIcon } from '../../components/icons/Icons.tsx';
import { ProfileAvatar } from '../../components/ProfileAvatar/ProfileAvatar.tsx';
import { useProfiles } from '../../lib/profileContext.ts';
import { MAX_PROFILES } from '../../lib/profiles.ts';
import { ProfilesGate } from './components/ProfilesGate.tsx';
import { ProfilesShell } from './components/ProfilesShell.tsx';
import type { ProfileNavState } from './types.ts';

export function ProfilesPage({ manage = false }: { manage?: boolean }) {
  return (
    <ProfilesGate>
      <ProfileGrid manage={manage} />
    </ProfilesGate>
  );
}

function ProfileGrid({ manage }: { manage: boolean }) {
  const { profiles, selectProfile } = useProfiles();
  const navigate = useNavigate();
  const location = useLocation();
  const navState = (location.state as ProfileNavState | null) ?? {};
  const here = manage ? '/profiles/manage' : '/profiles';
  const linkState: ProfileNavState = { from: navState.from, returnTo: here };

  return (
    <ProfilesShell>
      <div className="profiles__center">
        <h1 className="profiles__heading">{manage ? 'Manage profiles' : "Who's watching?"}</h1>

        <ul className="profiles__grid">
          {profiles.map((profile) => (
            <li key={profile.id}>
              {manage ? (
                <Link
                  to={`/profiles/${profile.id}/edit`}
                  state={linkState}
                  className="profiles__tile profiles__tile--manage"
                  aria-label={`Edit ${profile.name}`}
                >
                  <span className="profiles__avatar-frame">
                    <ProfileAvatar
                      avatar={profile.avatar}
                      size={140}
                      className="profiles__avatar"
                    />
                    <span className="profiles__edit-badge" aria-hidden="true">
                      <PencilIcon />
                    </span>
                  </span>
                  <span className="profiles__name">{profile.name}</span>
                </Link>
              ) : (
                <button
                  type="button"
                  className="profiles__tile"
                  onClick={() => {
                    selectProfile(profile.id);
                    navigate(navState.from ?? '/', { replace: true });
                  }}
                >
                  <span className="profiles__avatar-frame">
                    <ProfileAvatar
                      avatar={profile.avatar}
                      size={140}
                      className="profiles__avatar"
                    />
                  </span>
                  <span className="profiles__name">{profile.name}</span>
                </button>
              )}
            </li>
          ))}

          {profiles.length < MAX_PROFILES && (
            <li>
              <Link to="/profiles/new" state={linkState} className="profiles__tile">
                <span className="profiles__avatar-frame profiles__add" aria-hidden="true">
                  <PlusIcon />
                </span>
                <span className="profiles__name">Add profile</span>
              </Link>
            </li>
          )}
        </ul>

        {manage ? (
          <Link
            to="/profiles"
            state={{ from: navState.from } satisfies ProfileNavState}
            className="profiles__button profiles__button--primary"
          >
            Done
          </Link>
        ) : (
          <Link
            to="/profiles/manage"
            state={{ from: navState.from } satisfies ProfileNavState}
            className="profiles__button"
          >
            Manage profiles
          </Link>
        )}
      </div>
    </ProfilesShell>
  );
}
