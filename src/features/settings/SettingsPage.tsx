/**
 * `/settings`: account-level settings. Currently just the "Streaming"
 * section — where the viewer pastes the API key/token for their own stream
 * resolver (see services/streamResolver.ts), saved to
 * `users/{uid}/settings/preferences.streamApiKey` (lib/streamSettings.ts).
 *
 * Uses `currentUserId()` from lib/firebase.ts rather than the auth feature's
 * context, because features may not import each other (ADR-2) and this page
 * only ever renders behind `RequireAuth`, so a signed-in uid is guaranteed.
 */
import { useEffect, useState, type FormEvent } from 'react';
import { currentUserId } from '../../lib/firebase.ts';
import { getStreamApiKey, saveStreamApiKey } from '../../lib/streamSettings.ts';
import './SettingsPage.css';

type SaveStatus = 'loading' | 'idle' | 'saving' | 'saved' | 'error';

export function SettingsPage() {
  const uid = currentUserId();
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState<SaveStatus>('loading');

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    getStreamApiKey(uid).then((value) => {
      if (cancelled) return;
      setApiKey(value);
      setStatus('idle');
    });
    return () => {
      cancelled = true;
    };
  }, [uid]);

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (!uid) return;
    setStatus('saving');
    try {
      await saveStreamApiKey(uid, apiKey);
      setStatus('saved');
    } catch (error) {
      console.error('Could not save streaming settings', error);
      setStatus('error');
    }
  }

  return (
    <main className="settings">
      <h1 className="settings__title">Settings</h1>

      <section className="settings__section" aria-labelledby="settings-streaming-heading">
        <h2 id="settings-streaming-heading" className="settings__section-title">
          Streaming
        </h2>
        <p className="settings__section-hint">
          Paste your stream resolver's API key or token here. It's sent as the{' '}
          <code>config</code> query parameter on every stream lookup — see{' '}
          <code>src/services/streamResolver.ts</code> for where that endpoint is configured.
        </p>
        <form className="settings__form" onSubmit={handleSave}>
          <label className="settings__label" htmlFor="stream-api-key">
            Stream resolver API key
          </label>
          <input
            id="stream-api-key"
            className="settings__input"
            type="text"
            autoComplete="off"
            spellCheck={false}
            placeholder="Paste your API key or token"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            disabled={status === 'loading'}
          />
          <div className="settings__form-footer">
            <button
              type="submit"
              className="settings__save"
              disabled={status === 'loading' || status === 'saving'}
            >
              {status === 'saving' ? 'Saving…' : 'Save'}
            </button>
            {status === 'saved' && (
              <span className="settings__status settings__status--ok" role="status">
                Saved.
              </span>
            )}
            {status === 'error' && (
              <span className="settings__status settings__status--error" role="alert">
                Couldn’t save. Try again.
              </span>
            )}
          </div>
        </form>
      </section>
    </main>
  );
}
