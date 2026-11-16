/**
 * Player page (`/player/:id`): plays a movie's trailer in an embedded YouTube
 * player, with the title's details underneath.
 *
 * TMDB has no actual movie files, so the trailer stands in for playback (PRD
 * §4). When a title has no YouTube video, the stage shows its artwork and a
 * "No trailer available" message instead of an empty player.
 */
import { useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { ArrowLeftIcon } from '../../components/icons/Icons.tsx';
import { NotFoundPage } from '../../components/NotFound/NotFoundPage.tsx';
import { placeholderGradient } from '../../lib/placeholderArt.ts';
import { tmdbErrorMessage } from '../../lib/tmdb.ts';
import { useAsync } from '../../lib/useAsync.ts';
import { fetchPlayableTitle, isNotFound } from './api/playbackApi.ts';
import type { PlayableTitle } from './types.ts';
import './PlayerPage.css';

const APP_TITLE = 'Noelflix';

export function PlayerPage() {
  const { id = '' } = useParams();
  // Only plain positive integers are TMDB ids; anything else never hits the API.
  if (!/^[1-9]\d*$/.test(id)) return <NotFoundPage />;
  return <PlayerScreen key={id} id={Number(id)} />;
}

function PlayerScreen({ id }: { id: number }) {
  const load = useMemo(() => () => fetchPlayableTitle(id), [id]);
  const { result, retry } = useAsync(load);
  const title = result.status === 'success' ? result.data : null;

  useEffect(() => {
    if (!title) return;
    document.title = `${title.name} | ${APP_TITLE}`;
    return () => {
      document.title = APP_TITLE;
    };
  }, [title]);

  return (
    <main className="player" aria-busy={result.status === 'loading'}>
      <BackButton />

      {result.status === 'loading' && <LoadingState />}
      {result.status === 'error' && (
        <ErrorState notFound={isNotFound(result.error)} error={result.error} onRetry={retry} />
      )}
      {title && <TitleState title={title} />}
    </main>
  );
}

/** Goes back in history, or home when the player was opened directly. */
function BackButton() {
  const navigate = useNavigate();
  const location = useLocation();
  // 'default' is react-router's key for the first page of the session, i.e.
  // nothing in-app to go back to; navigate(-1) would leave the site.
  const hasHistory = location.key !== 'default';

  return (
    <button
      type="button"
      className="player__back"
      aria-label={hasHistory ? 'Back' : 'Back to home'}
      onClick={() => (hasHistory ? navigate(-1) : navigate('/'))}
    >
      <ArrowLeftIcon />
    </button>
  );
}

function TitleState({ title }: { title: PlayableTitle }) {
  const { trailer } = title;

  return (
    <>
      <div className="player__stage">
        {trailer ? (
          <iframe
            className="player__frame"
            // Privacy-enhanced embed: no YouTube cookies until the viewer plays.
            src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(
              trailer.youtubeKey,
            )}?autoplay=1&rel=0`}
            title={`${title.name}: ${trailer.name}`}
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <div
            className="player__poster"
            style={{
              backgroundImage: title.imageUrl
                ? `url(${title.imageUrl})`
                : placeholderGradient(title.id),
            }}
          >
            <div className="player__notice" role="status">
              <p className="player__notice-text">No trailer available for this title</p>
              <Link className="player__button" to="/">
                Back to home
              </Link>
            </div>
          </div>
        )}
      </div>

      <section className="player__info" aria-labelledby="player-title">
        <h1 id="player-title" className="player__title">
          {title.name}
          {title.year && <span className="player__year"> ({title.year})</span>}
        </h1>
        {trailer && (
          <p className="player__meta">
            {trailer.name} · {trailer.type}
          </p>
        )}
        {title.synopsis && <p className="player__synopsis">{title.synopsis}</p>}
      </section>
    </>
  );
}

function LoadingState() {
  return (
    <div aria-hidden="true">
      <div className="player__stage skeleton" />
      <div className="player__info">
        <div className="skeleton player__skeleton-title" />
        <div className="skeleton player__skeleton-line" />
        <div className="skeleton player__skeleton-line player__skeleton-line--short" />
      </div>
    </div>
  );
}

interface ErrorStateProps {
  notFound: boolean;
  error: Error;
  onRetry: () => void;
}

function ErrorState({ notFound, error, onRetry }: ErrorStateProps) {
  return (
    <div className="player__stage player__stage--message">
      <div className="player__notice" role="alert">
        <p className="player__notice-text">
          {notFound
            ? 'We couldn’t find this title.'
            : tmdbErrorMessage(error, 'Couldn’t load this title.')}
        </p>
        <div className="player__actions">
          {!notFound && (
            <button type="button" className="player__button" onClick={onRetry}>
              Retry
            </button>
          )}
          <Link className="player__button player__button--secondary" to="/">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
