/**
 * Player page (`/player/:id`, `/player/tv/:id`): plays the actual movie or
 * TV show via vidsrc.sh (slice 18), with the title's details underneath.
 *
 * vidsrc.sh needs no API key and resolves either an IMDB or TMDB id
 * (api/playbackApi.ts fetches TMDB's external_ids for the IMDB one, falling
 * back to the TMDB id when TMDB has none). TV shows have no episode picker in
 * this app yet, so the TV embed omits season/episode: vidsrc.sh shows its own
 * picker and resumes the last episode it saw for this viewer.
 *
 * Opening a title shows a "More Like This" row under the details (slice 09,
 * extended to TV in slice 17). Only the watch history behind the *home
 * page's* personalised rows stays movie-only (see watchHistory.ts): that is a
 * separate, bigger feature this slice doesn't touch.
 *
 * Resume position: the hover preview / hero banner can hand off an elapsed
 * trailer-preview time via the `t` query param (lib/routes.ts); this is
 * compared against any resume point vidsrc.sh previously reported for this
 * title (saved to Firestore, lib/watchProgress.ts) and the larger of the two
 * is used as `startAt`, so switching devices still resumes correctly.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import { ArrowLeftIcon } from '../../components/icons/Icons.tsx';
import { MyListButton } from '../../components/MyListButton/MyListButton.tsx';
import { NotFoundPage } from '../../components/NotFound/NotFoundPage.tsx';
import { TitleRow } from '../../components/TitleRow/TitleRow.tsx';
import type { MediaType } from '../../lib/media.ts';
import { RESUME_PARAM } from '../../lib/routes.ts';
import { tmdbErrorMessage } from '../../lib/tmdb.ts';
import { fetchRelatedTitles } from '../../lib/recommendations.ts';
import { useAsync } from '../../lib/useAsync.ts';
import { recordWatch } from '../../lib/watchHistory.ts';
import { getWatchProgress, saveWatchProgress } from '../../lib/watchProgress.ts';
import { fetchPlayableTitle, isNotFound } from './api/playbackApi.ts';
import type { PlayableTitle } from './types.ts';
import { parsePlayerEvent, vidsrcEmbedUrl } from './vidsrc.ts';
import './PlayerPage.css';

const APP_TITLE = 'Noelflix';
/** Don't write every ~5s "playing" ping; a pause/seek/completion always writes immediately. */
const MIN_PROGRESS_SAVE_INTERVAL_MS = 15_000;

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
      previewSeconds={Number.isFinite(resumeSeconds) && resumeSeconds > 0 ? resumeSeconds : 0}
    />
  );
}

/** The larger of a hover-preview handoff and any previously saved resume point. */
function useResumePoint(
  id: number,
  mediaType: MediaType,
  previewSeconds: number,
): { ready: boolean; seconds: number } {
  const [state, setState] = useState({ ready: false, seconds: previewSeconds });

  useEffect(() => {
    let cancelled = false;
    getWatchProgress(id, mediaType)
      .then((saved) => {
        if (cancelled) return;
        const seconds =
          saved && !saved.completed
            ? Math.max(previewSeconds, saved.progressSeconds)
            : previewSeconds;
        setState({ ready: true, seconds });
      })
      .catch(() => {
        if (!cancelled) setState({ ready: true, seconds: previewSeconds });
      });
    return () => {
      cancelled = true;
    };
  }, [id, mediaType, previewSeconds]);

  return state;
}

function PlayerScreen({
  id,
  mediaType,
  previewSeconds,
}: {
  id: number;
  mediaType: MediaType;
  previewSeconds: number;
}) {
  const load = useMemo(() => () => fetchPlayableTitle(id, mediaType), [id, mediaType]);
  const { result, retry } = useAsync(load);
  const title = result.status === 'success' ? result.data : null;
  const resumePoint = useResumePoint(id, mediaType, previewSeconds);

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

  // vidsrc.sh reports playback position by postMessage; persist it so the
  // title resumes correctly next time (see lib/watchProgress.ts).
  const lastSaveRef = useRef(0);
  useEffect(() => {
    if (!title) return;
    lastSaveRef.current = 0;
    function handleMessage(event: MessageEvent) {
      const playerEvent = parsePlayerEvent(event);
      if (!playerEvent || !title) return;
      const now = Date.now();
      const isMilestone = playerEvent.status !== 'playing';
      if (!isMilestone && now - lastSaveRef.current < MIN_PROGRESS_SAVE_INTERVAL_MS) return;
      lastSaveRef.current = now;
      saveWatchProgress(
        { id: title.id, mediaType: title.mediaType, name: title.name },
        {
          progressSeconds: playerEvent.progressSeconds,
          durationSeconds: playerEvent.durationSeconds,
          completed: playerEvent.status === 'completed',
        },
      );
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [title]);

  const showLoading = result.status === 'loading' || (title != null && !resumePoint.ready);

  // Full-bleed black screen with nothing else on it (matches Netflix's own
  // loading screen, see docs/slices/18-vidsrc-playback.md) — no back button
  // or page padding until there is something to show.
  if (showLoading) {
    return (
      <main className="player player--loading" aria-busy="true">
        <LoadingState />
      </main>
    );
  }

  return (
    <main className="player">
      <BackButton />

      {result.status === 'error' && (
        <ErrorState notFound={isNotFound(result.error)} error={result.error} onRetry={retry} />
      )}
      {title && resumePoint.ready && (
        <TitleState title={title} startAtSeconds={resumePoint.seconds} />
      )}
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

function TitleState({ title, startAtSeconds }: { title: PlayableTitle; startAtSeconds: number }) {
  return (
    <>
      <div className="player__stage">
        <iframe
          className="player__frame"
          src={vidsrcEmbedUrl(
            { imdbId: title.imdbId, tmdbId: title.id, mediaType: title.mediaType },
            startAtSeconds,
          )}
          title={title.name}
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>

      <section className="player__info" aria-labelledby="player-title">
        <h1 id="player-title" className="player__title">
          {title.name}
          {title.year && <span className="player__year"> ({title.year})</span>}
        </h1>
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

/** Plain black, centered red spinner — see `.player--loading` in PlayerPage.css. */
function LoadingState() {
  return <span className="player__spinner" aria-hidden="true" />;
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
