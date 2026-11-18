/**
 * Add / edit form for one profile: name field, avatar picker (radio group),
 * Save / Cancel, and Delete with an inline confirmation (no browser dialog).
 */
import { useId, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { ProfileAvatar } from '../../../components/ProfileAvatar/ProfileAvatar.tsx';
import { Spinner } from '../../../components/Spinner/Spinner.tsx';
import { useProfiles } from '../../../lib/profileContext.ts';
import {
  AVATARS,
  MAX_PROFILE_NAME_LENGTH,
  profileErrorMessage,
  profileNameError,
  type AvatarId,
  type Profile,
} from '../../../lib/profiles.ts';
import type { ProfileNavState } from '../types.ts';
import { ProfilesShell } from './ProfilesShell.tsx';

interface ProfileFormProps {
  /** The profile being edited; undefined when adding one. */
  profile?: Profile;
  navState: ProfileNavState;
}

type Busy = null | 'save' | 'delete';

export function ProfileForm({ profile, navState }: ProfileFormProps) {
  const { profiles, createProfile, updateProfile, deleteProfile } = useProfiles();
  const navigate = useNavigate();
  const nameId = useId();
  const errorId = useId();

  const [name, setName] = useState(profile?.name ?? '');
  const [avatar, setAvatar] = useState<AvatarId>(profile?.avatar ?? firstUnusedAvatar(profiles));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const isEdit = Boolean(profile);
  const canDelete = isEdit && profiles.length > 1;
  const returnTo = navState.returnTo ?? (isEdit ? '/profiles/manage' : '/profiles');

  function leave() {
    navigate(returnTo, { replace: true, state: { from: navState.from } satisfies ProfileNavState });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const nameError = profileNameError(name, profiles, profile?.id);
    if (nameError) {
      setError(nameError);
      return;
    }
    setError(null);
    setBusy('save');
    try {
      if (profile) await updateProfile(profile.id, { name, avatar });
      else await createProfile({ name, avatar });
      leave();
    } catch (caught) {
      setError(profileErrorMessage(caught));
      setBusy(null);
    }
  }

  async function handleDelete() {
    if (!profile || busy) return;
    setError(null);
    setBusy('delete');
    try {
      await deleteProfile(profile.id);
      leave();
    } catch (caught) {
      setError(profileErrorMessage(caught));
      setBusy(null);
      setConfirmingDelete(false);
    }
  }

  return (
    <ProfilesShell>
      <form className="profile-form" onSubmit={handleSubmit} noValidate aria-busy={busy !== null}>
        <h1 className="profiles__heading profile-form__heading">
          {isEdit ? 'Edit profile' : 'Add profile'}
        </h1>

        <div className="profile-form__body">
          <ProfileAvatar avatar={avatar} size={120} className="profile-form__preview" />

          <div className="profile-form__fields">
            <label className="profile-form__label" htmlFor={nameId}>
              Name
            </label>
            <input
              id={nameId}
              className="profile-form__input"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (error) setError(null);
              }}
              maxLength={MAX_PROFILE_NAME_LENGTH}
              autoComplete="off"
              autoFocus={!isEdit}
              required
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
            />

            <fieldset className="profile-form__avatars">
              <legend className="profile-form__label">Avatar</legend>
              <div className="profile-form__avatar-grid">
                {AVATARS.map((option) => (
                  <label key={option.id} className="profile-form__avatar-option">
                    <input
                      type="radio"
                      name="avatar"
                      value={option.id}
                      checked={avatar === option.id}
                      onChange={() => setAvatar(option.id)}
                      className="visually-hidden"
                    />
                    <ProfileAvatar avatar={option.id} size={56} />
                    <span className="visually-hidden">{`${option.id} avatar`}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {error && (
              <p id={errorId} className="profile-form__error" role="alert">
                {error}
              </p>
            )}
          </div>
        </div>

        {confirmingDelete ? (
          <div className="profile-form__confirm" role="group" aria-label="Confirm delete">
            <p className="profile-form__confirm-text">
              Delete {profile?.name}? This cannot be undone.
            </p>
            <div className="profiles__actions">
              <button
                type="button"
                className="profiles__button profiles__button--danger"
                onClick={handleDelete}
                disabled={busy !== null}
              >
                {busy === 'delete' ? <Spinner size={18} /> : null}
                Delete profile
              </button>
              <button
                type="button"
                className="profiles__button"
                onClick={() => setConfirmingDelete(false)}
                disabled={busy !== null}
              >
                Keep it
              </button>
            </div>
          </div>
        ) : (
          <div className="profiles__actions">
            <button
              type="submit"
              className="profiles__button profiles__button--primary"
              disabled={busy !== null}
            >
              {busy === 'save' ? <Spinner size={18} /> : null}
              Save
            </button>
            <button
              type="button"
              className="profiles__button"
              onClick={leave}
              disabled={busy !== null}
            >
              Cancel
            </button>
            {canDelete && (
              <button
                type="button"
                className="profiles__button"
                onClick={() => setConfirmingDelete(true)}
                disabled={busy !== null}
              >
                Delete profile
              </button>
            )}
          </div>
        )}
      </form>
    </ProfilesShell>
  );
}

/** New profiles start on a colour nobody else on the account uses, if any is left. */
function firstUnusedAvatar(profiles: readonly Profile[]): AvatarId {
  const used = new Set(profiles.map((p) => p.avatar));
  return (AVATARS.find((option) => !used.has(option.id)) ?? AVATARS[0]).id;
}
