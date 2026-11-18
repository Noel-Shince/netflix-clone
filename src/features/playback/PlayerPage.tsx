/**
 * Player page (`/player/:id`, `/player/tv/:id`): plays a title's trailer in an embedded YouTube
 * player, with the title's details underneath.
 *
 * TMDB has no actual movie files, so the trailer stands in for playback (PRD
 * §4). When a title has no YouTube video, the stage shows its artwork and a
 * "No trailer available" message instead of an empty player.
 *
 * Opening a title shows a "More Like This" row under the details (slice 09,
 * extended to TV in slice 17 — a movie or TV title both get recommendations,
 * since TMDB's own recommendations/similar endpoints exist for both). Only
 * the watch history behind the *home page's* personalised rows stays
 * movie-only (see watchHistory.ts): that is a separate, bigger feature this
 * slice doesn't touch.
 */
import { useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import { ArrowLeftIcon } from '../../components/icons/Icons.tsx';
import { MyListButton } from '../../components/MyListButton/MyListButton.tsx';
import { NotFoundPage } from '../../components/NotFound/NotFoundPage.tsx';
import { TitleRow } from '../../components/TitleRow/TitleRow.tsx';
import type { MediaType } from '../../lib/media.ts';
import { placeholderGradient } from '../../lib/placeholderArt.ts';
import { RESUME_PARAM } from '../../lib/routes.ts';
import { tmdbErrorMessage } from '../../lib/tmdb.ts';
import { fetchRelatedTitles } from '../../lib/recommendations.ts';
import { useAsync } from '../../lib/useAsync.ts';
import { recordWatch } from '../../lib/watchHistory.ts';
import { fetchPlayableTitle, isNotFound } from './api/playbackApi.ts';
import type { PlayableTitle } from './types.ts';
import './PlayerPage.css';

const APP_TITLE = 'Noelflix';

/** `/player/:id` is a movie, `/player/tv/:id` a TV show (see lib/routes.ts). */
export function PlayerPage({ mediaType = 'movie' }: { mediaType?: MediaType }) {
  const { id = '' } = useParams();
  const [searchParams] = useSearchParams();
  // Only plain positive integers are TMDB ids; anything else never hits the API.
  if (!/^[1-9]\d*$/.test(id)) return <NotFoundPage />;
  // Set by the hover preview / hero banner (lib/routes.ts playerPath) when the
  // trailer already played a bit before the title was opened from there.
  const resumeSeconds = Number(searchParams.get(RESUME_PARAM));
  return (
    <PlayerScreen
      key={`${mediaType}-${id}`}
      id={Number(id)}
      mediaType={mediaType}
      resumeSeconds={Number.isFinite(resumeSeconds) && resumeSeconds > 0 ? resumeSeconds : 0}
    />
  );
}

function PlayerScreen({
  id,
  mediaType,
  resumeSeconds,
}: {
  id: number;
  mediaType: MediaType;
  resumeSeconds: number;
}) {
  const load = useMemo(() => () => fetchPlayableTitle(id, mediaType), [id, mediaType]);
  const { result, retry } = useAsync(load);
  const title = result.status === 'success' ? result.data : null;

  // A "More Like This" card swaps the id without leaving the page.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!title) return;
    // Watch history (home page personalisation only, not this page's own
    // "More Like This") stays movie-only — see recommendations.ts.
    if (title.mediaType === 'movie') recordWatch({ id: title.id, name: title.name });
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
      {title && <TitleState title={title} resumeSeconds={resumeSeconds} />}
      {title && <MoreLikeThis id={title.id} mediaType={title.mediaType} />}
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

function TitleState({ title, resumeSeconds }: { title: PlayableTitle; resumeSeconds: number }) {
  const { trailer } = title;

  return (
    <>
      <div className="player__stage">
        {trailer ? (
          <iframe
            className="player__frame"
            // Privacy-enhanced embed: no YouTube cookies until the viewer plays.
            // `start` seeks to where a hover preview or hero banner left off.
            src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(
              trailer.youtubeKey,
            )}?autoplay=1&rel=0${resumeSeconds > 0 ? `&start=${resumeSeconds}` : ''}`}
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
        <div className="player__info-actions">
          <MyListButton
            className="player__button player__button--secondary"
            title={{
              id: title.id,
              mediaType: title.mediaType,
              name: title.name,
              imageUrl: title.cardImageUrl,
            }}
          />
        </div>
        {title.synopsis && <p className="player__synopsis">{title.synopsis}</p>}
      </section>
    </>
  );
}

/** Related titles (movies or TV). Hidden when TMDB has none, rather than showing an empty row. */
function MoreLikeThis({ id, mediaType }: { id: number; mediaType: MediaType }) {
  const load = useMemo(() => () => fetchRelatedTitles(id, mediaType), [id, mediaType]);
  const { result, retry } = useAsync(load);
  if (result.status === 'success' && result.data.length === 0) return null;
  return (
    <div className="player__more">
      <TitleRow id="more-like-this" heading="More Like This" result={result} onRetry={retry} />
    </div>
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
