/**
 * Banner for one featured title, drawn as an inset card with rounded corners
 * (Netflix's current web layout, slice 12), with an optional row of titles
 * right below it.
 *
 * Renders all three states of the featured-title request: a skeleton while
 * loading, a message with Retry on failure, and the title once loaded. On
 * success the banner rotates through several candidates (slice 13, see
 * `useRotation`) instead of showing one title forever; each one fades in,
 * keyed by its id so the fade restarts on every change. Play opens the
 * player (slice 04). My List saves the title (slice 12); More Info opens the
 * same page as Play, whose details section is the only title detail view the
 * app has.
 *
 * Once a title's backdrop has had a moment on screen, a muted YouTube
 * trailer fades in over it and autoplays (Netflix's own hero behaviour).
 * The backdrop image stays underneath as the immediate, decoration-only
 * fallback while the trailer is still fetching, erroring, or simply has
 * none for that title.
 *
 * Clicking the backdrop (not just the Play button) opens the player too,
 * resuming from however much of the muted trailer has played since it
 * started — a transparent link laid over the backdrop, under the caption's
 * own buttons, catches that click (the trailer itself is an <iframe>, whose
 * clicks never bubble to this component's own handlers).
 */
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { InfoIcon, PlayIcon } from '../../../../components/icons/Icons.tsx';
import { MyListButton } from '../../../../components/MyListButton/MyListButton.tsx';
import { placeholderGradient } from '../../../../lib/placeholderArt.ts';
import { playerPath } from '../../../../lib/routes.ts';
import { tmdbErrorMessage } from '../../../../lib/tmdb.ts';
import { fetchTrailerKey, trailerEmbedUrl } from '../../../../lib/trailerUtils.ts';
import type { AsyncResult } from '../../../../lib/useAsync.ts';
import { useRotation } from '../../../../lib/useRotation.ts';
import type { FeaturedTitle } from '../../types.ts';
import './Hero.css';

/** How long each title stays on screen before the hero rotates to the next. */
const ROTATION_MS = 8000;

interface HeroProps {
  result: AsyncResult<FeaturedTitle[]>;
  onRetry: () => void;
  /** Rendered at the bottom of the banner, over the fade. */
  children?: ReactNode;
}

export function Hero({ result, onRetry, children }: HeroProps) {
  const titles = result.status === 'success' ? result.data : [];
  const index = useRotation(titles.length, ROTATION_MS);
  const title = titles[index] ?? null;
  const backgroundImage = title?.backdropUrl
    ? `url(${title.backdropUrl})`
    : `radial-gradient(ellipse at 75% 30%, rgba(229, 9, 20, 0.25), transparent 60%), ${placeholderGradient(0)}`;

  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  // Resets during render (not in the effect below) when the rotation moves
  // to a new title, so the old title's key never flashes over the new
  // backdrop — the same "adjust state when a prop changes" shape useRotation
  // uses for its own index.
  const [trailerTitleId, setTrailerTitleId] = useState(title?.id ?? null);
  if ((title?.id ?? null) !== trailerTitleId) {
    setTrailerTitleId(title?.id ?? null);
    setTrailerKey(null);
  }

  useEffect(() => {
    if (!title) return;
    let alive = true;
    fetchTrailerKey(title.id, title.mediaType)
      .then((key) => {
        if (alive) setTrailerKey(key);
      })
      .catch(() => {
        // No trailer: the backdrop image stays as the hero's art.
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-fetch only when the title itself changes, not on every render of the same title.
  }, [title?.id, title?.mediaType]);

  const navigate = useNavigate();
  // When this title's trailer started autoplaying, so a click can resume the
  // full player from roughly how far the muted preview has gotten — see the
  // matching note in HoverCard, which this mirrors.
  const trailerStartedAtRef = useRef<number | null>(null);
  useEffect(() => {
    trailerStartedAtRef.current = trailerKey ? Date.now() : null;
  }, [trailerKey]);

  const goToPlayer = (event: React.MouseEvent) => {
    if (!title) return;
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    const resumeSeconds = trailerStartedAtRef.current
      ? Math.max(0, Math.floor((Date.now() - trailerStartedAtRef.current) / 1000))
      : 0;
    navigate(playerPath(title.id, title.mediaType, resumeSeconds));
  };

  return (
    <section
      className="hero"
      aria-labelledby={title ? 'hero-title' : undefined}
      aria-label={title ? undefined : 'Featured title'}
      aria-busy={result.status === 'loading'}
    >
      <div className="hero__card">
        <div key={title?.id ?? 'none'} className="hero__backdrop" style={{ backgroundImage }}>
          {title && trailerKey && (
            <iframe
              key={trailerKey}
              className="hero__trailer"
              src={trailerEmbedUrl(trailerKey)}
              title={`${title.name} trailer`}
              allow="autoplay; encrypted-media"
              aria-hidden="true"
            />
          )}
        </div>

        {/* Below the caption in paint order (next sibling, same stacking
            context, no z-index), so the caption's own buttons still get
            first claim on their own area; this only catches the rest of
            the banner, including clicks on the trailer iframe itself. */}
        {title && (
          <Link
            className="hero__play-overlay"
            to={playerPath(title.id, title.mediaType)}
            onClick={goToPlayer}
            aria-label={`Play ${title.name}`}
          />
        )}

        <div className="hero__caption">
          {result.status === 'loading' && (
            <div aria-hidden="true">
              <div className="skeleton hero__skeleton-title" />
              <div className="skeleton hero__skeleton-line" />
              <div className="skeleton hero__skeleton-line hero__skeleton-line--short" />
            </div>
          )}

          {result.status === 'error' && (
            <div role="alert">
              <p className="hero__error">
                {tmdbErrorMessage(result.error, 'Couldn’t load today’s featured title.')}
              </p>
              <button type="button" className="hero__button hero__button--info" onClick={onRetry}>
                Retry
              </button>
            </div>
          )}

          {title && (
            <div key={title.id} className="hero__fade">
              <h1 id="hero-title" className="hero__title">
                {title.name}
              </h1>
              <p className="hero__meta">
                <span>{title.mediaType === 'tv' ? 'Series' : 'Movie'}</span>
                {title.year && <span>{title.year}</span>}
              </p>
              <p className="hero__synopsis">{title.synopsis}</p>
              <div className="hero__actions">
                <Link
                  className="hero__button hero__button--play"
                  to={playerPath(title.id, title.mediaType)}
                  onClick={goToPlayer}
                >
                  <PlayIcon /> Play
                </Link>
                <MyListButton
                  className="hero__button hero__button--info"
                  title={{
                    id: title.id,
                    mediaType: title.mediaType,
                    name: title.name,
                    imageUrl: title.imageUrl,
                  }}
                />
                <Link
                  className="hero__button hero__button--info"
                  to={playerPath(title.id, title.mediaType)}
                  onClick={goToPlayer}
                >
                  <InfoIcon /> More Info
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {children && <div className="hero__row">{children}</div>}
    </section>
  );
}
