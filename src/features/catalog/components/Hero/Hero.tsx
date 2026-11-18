/**
 * Banner for one featured title, drawn as an inset card with rounded corners
 * (Netflix's current web layout, slice 10), with an optional row of titles
 * right below it.
 *
 * Renders all three states of the featured-title request: a skeleton while
 * loading, a message with Retry on failure, and the title once loaded.
 * Play opens the player (slice 04). My List saves the title (slice 10); More
 * Info opens the same page as Play, whose details section is the only title
 * detail view the app has.
 */
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { InfoIcon, PlayIcon } from '../../../../components/icons/Icons.tsx';
import { MyListButton } from '../../../../components/MyListButton/MyListButton.tsx';
import { placeholderGradient } from '../../../../lib/placeholderArt.ts';
import { playerPath } from '../../../../lib/routes.ts';
import { tmdbErrorMessage } from '../../../../lib/tmdb.ts';
import type { AsyncResult } from '../../../../lib/useAsync.ts';
import type { FeaturedTitle } from '../../types.ts';
import './Hero.css';

interface HeroProps {
  result: AsyncResult<FeaturedTitle>;
  onRetry: () => void;
  /** Rendered at the bottom of the banner, over the fade. */
  children?: ReactNode;
}

export function Hero({ result, onRetry, children }: HeroProps) {
  const title = result.status === 'success' ? result.data : null;
  const backgroundImage = title?.backdropUrl
    ? `url(${title.backdropUrl})`
    : `radial-gradient(ellipse at 75% 30%, rgba(229, 9, 20, 0.25), transparent 60%), ${placeholderGradient(0)}`;

  return (
    <section
      className="hero"
      aria-labelledby={title ? 'hero-title' : undefined}
      aria-label={title ? undefined : 'Featured title'}
      aria-busy={result.status === 'loading'}
    >
      <div className="hero__card">
        <div className="hero__backdrop" style={{ backgroundImage }} />

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
            <>
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
                >
                  <InfoIcon /> More Info
                </Link>
              </div>
            </>
          )}
        </div>
      </div>

      {children && <div className="hero__row">{children}</div>}
    </section>
  );
}
