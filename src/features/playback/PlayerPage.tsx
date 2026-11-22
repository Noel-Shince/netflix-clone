/**
 * Player page (`/player/:id`, `/player/tv/:id`): plays the movie or TV show
 * through the custom HLS.js player (`components/VideoPlayer`), using
 * streams from `services/streamResolver.ts` — resolved from the title's
 * IMDB id (`services/externalIds.ts`) and, for TV, the selected episode.
 *
 * Until a real resolver endpoint is configured (see the TODO in
 * streamResolver.ts), that always returns a small mock stream, so this page
 * works end to end out of the box. Whenever it instead returns no streams
 * — a misconfigured endpoint, a lookup failure, or simply before it has
 * answered — this falls back to the VidKing (vidking.net) iframe embed
 * (`vidking.ts`), the player from the previous slice, so a broken resolver
 * never breaks playback.
 *
 * TV shows get this app's own season/episode selector below the player
 * (fetched from TMDB's `/tv/{id}/season/{n}`); picking an episode re-resolves
 * streams for that episode. VidKing's own `nextEpisode=true` can still
 * auto-advance past the end of an episode when the VidKing fallback is what's
 * playing; the custom player has no equivalent yet (noted as a gap, not a
 * silent behaviour difference — see docs/slices/22-stream-resolver.md).
 *
 * Opening a title shows a "More Like This" row under the details (slice 09,
 * extended to TV in slice 17). Only the watch history behind the *home
 * page's* personalised rows stays movie-only (see watchHistory.ts): that is a
 * separate, bigger feature this slice doesn't touch.
 *
 * Resume position: the hover preview / hero banner can hand off an elapsed
 * trailer-preview time via the `t` query param (lib/routes.ts); this is
 * compared against any resume point previously saved for this title (to
 * Firestore, lib/watchProgress.ts) and the larger of the two is used as the
 * player's start position — but only when the episode actually playing
 * matches the one the saved progress was for, so jumping to a different
 * episode never starts mid-way through.
 */
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import { ArrowLeftIcon, CloseIcon, EpisodesIcon } from '../../components/icons/Icons.tsx';
import { MyListButton } from '../../components/MyListButton/MyListButton.tsx';
import { NotFoundPage } from '../../components/NotFound/NotFoundPage.tsx';
import { TitleRow } from '../../components/TitleRow/TitleRow.tsx';
import { VideoPlayer, type VideoPlayerEvent } from '../../components/VideoPlayer/VideoPlayer.tsx';
import { currentUserId } from '../../lib/firebase.ts';
import type { MediaType } from '../../lib/media.ts';
import { RESUME_PARAM } from '../../lib/routes.ts';
import { getStreamApiKey } from '../../lib/streamSettings.ts';
import { tmdbErrorMessage } from '../../lib/tmdb.ts';
import { fetchRelatedTitles } from '../../lib/recommendations.ts';
import { useAsync } from '../../lib/useAsync.ts';
import { recordWatch } from '../../lib/watchHistory.ts';
import { getWatchProgress, saveWatchProgress } from '../../lib/watchProgress.ts';
import { fetchImdbId } from '../../services/externalIds.ts';
import { resolveStreams, type StreamResult } from '../../services/streamResolver.ts';
import { fetchSeasonEpisodes, type Episode } from './api/episodesApi.ts';
import { fetchPlayableTitle, isNotFound } from './api/playbackApi.ts';
import type { PlayableTitle, SeasonSummary } from './types.ts';
import { parsePlayerEvent, vidkingEmbedUrl } from './vidking.ts';
import './PlayerPage.css';

const APP_TITLE = 'Noelflix';
/** Don't write every ~5s playback ping; a play/pause/seek/completion always writes immediately. */
const MIN_PROGRESS_SAVE_INTERVAL_MS = 10_000;

interface EpisodeRef {
  season: number;
  episode: number;
}

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

/** The larger of a hover-preview handoff and any previously saved resume point, plus which episode (TV) it was for. */
function useResumePoint(
  id: number,
  mediaType: MediaType,
  previewSeconds: number,
): { ready: boolean; seconds: number; hadSavedProgress: boolean; episode: EpisodeRef | null } {
  const [state, setState] = useState({
    ready: false,
    seconds: previewSeconds,
    hadSavedProgress: false,
    episode: null as EpisodeRef | null,
  });

  useEffect(() => {
    let cancelled = false;
    getWatchProgress(id, mediaType)
      .then((saved) => {
        if (cancelled) return;
        const seconds =
          saved && !saved.completed
            ? Math.max(previewSeconds, saved.progressSeconds)
            : previewSeconds;
        const episode =
          saved?.season != null && saved.episode != null
            ? { season: saved.season, episode: saved.episode }
            : null;
        setState({ ready: true, seconds, hadSavedProgress: saved != null, episode });
      })
      .catch(() => {
        if (!cancelled) {
          setState({
            ready: true,
            seconds: previewSeconds,
            hadSavedProgress: false,
            episode: null,
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id, mediaType, previewSeconds]);

  return state;
}

type StreamsState =
  | { status: 'loading' }
  | { status: 'ready'; streams: StreamResult[] }
  | { status: 'unavailable' };

/**
 * Resolves playable streams for the title (and, for TV, the episode
 * currently selected): TMDB id → IMDB id (services/externalIds.ts) → the
 * stream resolver (services/streamResolver.ts), using the viewer's own
 * resolver API key from Settings when they've saved one. `'unavailable'`
 * covers every reason there's nothing to play — no IMDB id, a resolver
 * error, or an empty response — so the caller has one fallback branch
 * instead of several.
 */
function useResolvedStreams(
  tmdbId: number | undefined,
  mediaType: MediaType,
  season: number,
  episode: number,
): StreamsState {
  const [state, setState] = useState<StreamsState>({ status: 'loading' });

  useEffect(() => {
    if (!tmdbId) return;
    let cancelled = false;
    setState({ status: 'loading' });

    (async () => {
      const imdbId = await fetchImdbId(tmdbId, mediaType).catch((error: unknown) => {
        console.error('Could not resolve IMDB id', error);
        return null;
      });
      if (!imdbId) {
        if (!cancelled) setState({ status: 'unavailable' });
        return;
      }

      const uid = currentUserId();
      const apiKey = uid ? await getStreamApiKey(uid) : '';
      const streams = await resolveStreams(
        imdbId,
        mediaType,
        mediaType === 'tv' ? season : undefined,
        mediaType === 'tv' ? episode : undefined,
        apiKey || null,
      );
      if (cancelled) return;
      setState(streams.length > 0 ? { status: 'ready', streams } : { status: 'unavailable' });
    })();

    return () => {
      cancelled = true;
    };
  }, [tmdbId, mediaType, season, episode]);

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

  // The episode actually loaded in the player right now (TV only). Seeded
  // from the saved resume point once that's known (defaulting to S1E1).
  const [playing, setPlaying] = useState<EpisodeRef>({ season: 1, episode: 1 });
  const seededRef = useRef(false);
  useEffect(() => {
    if (mediaType !== 'tv' || seededRef.current || !resumePoint.ready) return;
    seededRef.current = true;
    if (resumePoint.episode) setPlaying(resumePoint.episode);
  }, [mediaType, resumePoint.ready, resumePoint.episode]);

  const streamsState = useResolvedStreams(title?.id, mediaType, playing.season, playing.episode);

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

  // Marks the title as watched (Firestore `watchProgress`, which backs the
  // home page's "Shows You've Watched" row) as soon as it's opened. Only
  // fires once per title (`hadSavedProgress`): a title already resuming
  // from a previous watchProgress doc has already made it into the row.
  useEffect(() => {
    if (!title || !resumePoint.ready || resumePoint.hadSavedProgress) return;
    saveWatchProgress(
      { id: title.id, mediaType: title.mediaType, name: title.name },
      {
        progressSeconds: resumePoint.seconds,
        durationSeconds: null,
        completed: false,
        season: title.mediaType === 'tv' ? playing.season : null,
        episode: title.mediaType === 'tv' ? playing.episode : null,
      },
    );
  }, [title, resumePoint.ready, resumePoint.hadSavedProgress, resumePoint.seconds, playing]);

  // `playingRef` lets the progress-saving callbacks below read the current
  // episode without resubscribing every time it changes.
  const playingRef = useRef(playing);
  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  const lastSaveRef = useRef(0);
  useEffect(() => {
    lastSaveRef.current = 0;
  }, [title?.id, playing.season, playing.episode]);

  function persistProgress(
    currentTimeSeconds: number,
    durationSeconds: number | null,
    isMilestone: boolean,
    completed: boolean,
  ) {
    if (!title) return;
    const now = Date.now();
    if (!isMilestone && now - lastSaveRef.current < MIN_PROGRESS_SAVE_INTERVAL_MS) return;
    lastSaveRef.current = now;
    saveWatchProgress(
      { id: title.id, mediaType: title.mediaType, name: title.name },
      {
        progressSeconds: currentTimeSeconds,
        durationSeconds,
        completed,
        season: title.mediaType === 'tv' ? playingRef.current.season : null,
        episode: title.mediaType === 'tv' ? playingRef.current.episode : null,
      },
    );
  }

  function handleCustomPlayerProgress(event: VideoPlayerEvent) {
    persistProgress(
      event.currentTimeSeconds,
      event.durationSeconds,
      event.event !== 'timeupdate',
      event.event === 'ended',
    );
  }

  // VidKing (fallback iframe) reports playback position — and, for TV, its
  // own auto-advanced episode — by postMessage.
  const iframeRef = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    if (!title || streamsState.status !== 'unavailable') return;
    function handleMessage(event: MessageEvent) {
      const playerEvent = parsePlayerEvent(event, iframeRef.current?.contentWindow ?? null);
      if (!playerEvent) return;

      const current = playingRef.current;
      if (
        title!.mediaType === 'tv' &&
        playerEvent.season != null &&
        playerEvent.episode != null &&
        (playerEvent.season !== current.season || playerEvent.episode !== current.episode)
      ) {
        setPlaying({ season: playerEvent.season, episode: playerEvent.episode });
      }
      persistProgress(
        playerEvent.currentTimeSeconds,
        playerEvent.durationSeconds,
        playerEvent.event !== 'timeupdate',
        playerEvent.event === 'ended',
      );
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [title, streamsState.status]);

  const showLoading = result.status === 'loading' || (title != null && !resumePoint.ready);

  // Full-bleed black screen with nothing else on it (matches Netflix's own
  // loading screen) — no back button or page padding until there is
  // something to show.
  if (showLoading) {
    return (
      <main className="player player--loading" aria-busy="true">
        <LoadingState />
      </main>
    );
  }

  // Only honour the saved resume point when it's for the episode actually
  // about to play; switching episodes always starts from 0.
  const startAtSeconds =
    title?.mediaType === 'tv'
      ? resumePoint.episode?.season === playing.season &&
        resumePoint.episode?.episode === playing.episode
        ? resumePoint.seconds
        : 0
      : resumePoint.seconds;

  return (
    <main className="player">
      {result.status === 'error' && (
        <>
          <BackButton />
          <ErrorState notFound={isNotFound(result.error)} error={result.error} onRetry={retry} />
        </>
      )}
      {title && resumePoint.ready && (
        <TitleState
          title={title}
          startAtSeconds={startAtSeconds}
          playing={playing}
          onSelectEpisode={setPlaying}
          streamsState={streamsState}
          onCustomPlayerProgress={handleCustomPlayerProgress}
          iframeRef={iframeRef}
        />
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

/** Current episode's name, for the top bar subtitle (TV only). Reuses the TMDB season-request cache, so this is free once the episode panel has loaded the same season. */
function useCurrentEpisodeName(
  tvId: number,
  mediaType: MediaType,
  season: number,
  episodeNumber: number,
): string | null {
  const load = useMemo(
    () => () => (mediaType === 'tv' ? fetchSeasonEpisodes(tvId, season) : Promise.resolve([])),
    [tvId, mediaType, season],
  );
  const { result } = useAsync(load);
  if (result.status !== 'success') return null;
  return result.data.find((episode) => episode.episodeNumber === episodeNumber)?.name ?? null;
}

function TitleState({
  title,
  startAtSeconds,
  playing,
  onSelectEpisode,
  streamsState,
  onCustomPlayerProgress,
  iframeRef,
}: {
  title: PlayableTitle;
  startAtSeconds: number;
  playing: EpisodeRef;
  onSelectEpisode: (episode: EpisodeRef) => void;
  streamsState: StreamsState;
  onCustomPlayerProgress: (event: VideoPlayerEvent) => void;
  iframeRef: RefObject<HTMLIFrameElement | null>;
}) {
  const isTv = title.mediaType === 'tv';
  const hasEpisodes = isTv && !!title.seasons && title.seasons.length > 0;
  const episodeName = useCurrentEpisodeName(
    title.id,
    title.mediaType,
    playing.season,
    playing.episode,
  );
  const [panelOpen, setPanelOpen] = useState(false);

  return (
    <>
      <div className="player__hero">
        <div className="player__stage">
          {streamsState.status === 'ready' ? (
            <VideoPlayer
              key={isTv ? `${title.id}-${playing.season}-${playing.episode}` : String(title.id)}
              sources={streamsState.streams}
              startAtSeconds={startAtSeconds}
              title={title.name}
              onProgress={onCustomPlayerProgress}
            />
          ) : (
            <iframe
              ref={iframeRef}
              key={isTv ? `${title.id}-${playing.season}-${playing.episode}` : String(title.id)}
              className="player__frame"
              src={vidkingEmbedUrl(
                {
                  tmdbId: title.id,
                  mediaType: title.mediaType,
                  season: isTv ? playing.season : undefined,
                  episode: isTv ? playing.episode : undefined,
                },
                startAtSeconds,
              )}
              title={title.name}
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          )}
        </div>

        <div className="player__topbar">
          <div className="player__topbar-left">
            <BackButton />
            <div className="player__topbar-title">
              <h1 id="player-title" className="player__title">
                {title.name}
                {title.year && <span className="player__year"> ({title.year})</span>}
              </h1>
              {isTv && (
                <p className="player__topbar-subtitle">
                  {episodeName
                    ? `S${playing.season}:E${playing.episode} · ${episodeName}`
                    : `Season ${playing.season} · Episode ${playing.episode}`}
                </p>
              )}
            </div>
          </div>

          {hasEpisodes && (
            <button
              type="button"
              className="player__episodes-toggle"
              aria-haspopup="dialog"
              aria-expanded={panelOpen}
              onClick={() => setPanelOpen(true)}
            >
              <EpisodesIcon />
              Episodes
            </button>
          )}
        </div>
      </div>

      <section className="player__details" aria-labelledby="player-title">
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

      {hasEpisodes && (
        <>
          <div
            className={`player__panel-backdrop${panelOpen ? ' player__panel-backdrop--open' : ''}`}
            onClick={() => setPanelOpen(false)}
          />
          <div
            className={`player__panel${panelOpen ? ' player__panel--open' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-label="Episodes"
            inert={!panelOpen}
          >
            <div className="player__panel-header">
              <h2 className="player__panel-title">Episodes</h2>
              <button
                type="button"
                className="player__panel-close"
                aria-label="Close episodes"
                onClick={() => setPanelOpen(false)}
              >
                <CloseIcon />
              </button>
            </div>
            <div className="player__panel-body">
              <SeasonEpisodeSelector
                tvId={title.id}
                seasons={title.seasons!}
                current={playing}
                onSelect={(episode) => {
                  onSelectEpisode(episode);
                  setPanelOpen(false);
                }}
              />
            </div>
          </div>
        </>
      )}
    </>
  );
}

/**
 * TV season tabs + episode list. Browsing a season (to look at its episodes)
 * is independent from which episode is actually playing — only clicking an
 * episode changes that.
 */
function SeasonEpisodeSelector({
  tvId,
  seasons,
  current,
  onSelect,
}: {
  tvId: number;
  seasons: SeasonSummary[];
  current: EpisodeRef;
  onSelect: (episode: EpisodeRef) => void;
}) {
  const [browsingSeason, setBrowsingSeason] = useState(current.season);
  // Follow along if playback moves to a season the viewer hasn't manually browsed to.
  useEffect(() => setBrowsingSeason(current.season), [current.season]);

  const load = useMemo(
    () => () => fetchSeasonEpisodes(tvId, browsingSeason),
    [tvId, browsingSeason],
  );
  const { result, retry } = useAsync(load);

  return (
    <section className="player__episodes" aria-label="Episodes">
      <div className="player__season-tabs" role="tablist" aria-label="Seasons">
        {seasons.map((season) => (
          <button
            key={season.seasonNumber}
            type="button"
            role="tab"
            aria-selected={season.seasonNumber === browsingSeason}
            className={`player__season-tab${
              season.seasonNumber === browsingSeason ? ' player__season-tab--active' : ''
            }`}
            onClick={() => setBrowsingSeason(season.seasonNumber)}
          >
            {season.name}
          </button>
        ))}
      </div>

      {result.status === 'loading' && <p className="player__episodes-status">Loading episodes…</p>}
      {result.status === 'error' && (
        <p className="player__episodes-status">
          {tmdbErrorMessage(result.error, 'Couldn’t load episodes.')}{' '}
          <button type="button" className="player__episodes-retry" onClick={retry}>
            Retry
          </button>
        </p>
      )}
      {result.status === 'success' && (
        <EpisodeList
          episodes={result.data}
          isPlaying={(episode) => browsingSeason === current.season && episode === current.episode}
          onSelect={(episode) => onSelect({ season: browsingSeason, episode })}
        />
      )}
    </section>
  );
}

function EpisodeList({
  episodes,
  isPlaying,
  onSelect,
}: {
  episodes: Episode[];
  isPlaying: (episodeNumber: number) => boolean;
  onSelect: (episodeNumber: number) => void;
}) {
  if (episodes.length === 0) {
    return <p className="player__episodes-status">No episodes listed for this season yet.</p>;
  }
  return (
    <ul className="player__episode-list">
      {episodes.map((episode) => {
        const active = isPlaying(episode.episodeNumber);
        return (
          <li key={episode.episodeNumber}>
            <button
              type="button"
              className={`player__episode${active ? ' player__episode--active' : ''}`}
              aria-current={active ? 'true' : undefined}
              onClick={() => onSelect(episode.episodeNumber)}
            >
              <span className="player__episode-thumb">
                {episode.stillUrl ? (
                  <img src={episode.stillUrl} alt="" loading="lazy" />
                ) : (
                  <span className="player__episode-thumb-fallback">{episode.episodeNumber}</span>
                )}
              </span>
              <span className="player__episode-body">
                <span className="player__episode-heading">
                  <span className="player__episode-number">{episode.episodeNumber}.</span>
                  <span className="player__episode-name">{episode.name}</span>
                </span>
                {episode.overview && (
                  <span className="player__episode-overview">{episode.overview}</span>
                )}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
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
