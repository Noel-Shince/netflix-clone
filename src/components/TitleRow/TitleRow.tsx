/**
 * One horizontally scrolling row of title cards. Shared by the home page and
 * the player's "More Like This" row, so it lives in components/.
 *
 * Renders all three states of its row's request: skeleton cards while
 * loading, a message with Retry on failure, and the cards once loaded. Each
 * row loads independently, so one failure never blanks the page.
 *
 * Hovering a card (or focusing inside it) reveals round Play and + My List
 * buttons over its artwork, after Netflix's hover card. They sit beside the
 * card's link, not inside it, because a button inside a link is invalid HTML.
 *
 * Deliberately uses native overflow scrolling (touch, trackpad, shift+wheel)
 * plus prev/next buttons, instead of the tutorial's wheel-hijacking listener,
 * which blocks vertical page scroll while the cursor is over a row.
 */
import { useRef } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '../icons/Icons.tsx';
import { tmdbErrorMessage } from '../../lib/tmdb.ts';
import type { MediaType } from '../../lib/media.ts';
import type { AsyncResult } from '../../lib/useAsync.ts';
import { TitleCard, TitleCardSkeleton } from '../TitleCard/TitleCard.tsx';
import './TitleRow.css';

/** What a card needs. Features map their own data onto this shape. */
export interface RowTitle {
  id: number;
  name: string;
  /** Full image URL, or null when there is no artwork (card shows a placeholder). */
  imageUrl: string | null;
  /** Defaults to 'movie' (recommendation rows are movie-only). */
  mediaType?: MediaType;
}

const SKELETON_CARDS = 8;

interface TitleRowProps {
  /** Stable key, used for the heading id. */
  id: string;
  heading: string;
  result: AsyncResult<RowTitle[]>;
  onRetry: () => void;
}

export function TitleRow({ id, heading, result, onRetry }: TitleRowProps) {
  const scrollerRef = useRef<HTMLUListElement>(null);
  const headingId = `title-row-${id}`;

  const scrollByPage = (direction: 1 | -1) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    scroller.scrollBy({ left: direction * scroller.clientWidth * 0.9, behavior: 'smooth' });
  };

  return (
    <section
      className="title-row"
      aria-labelledby={headingId}
      aria-busy={result.status === 'loading'}
    >
      <h2 id={headingId} className="title-row__heading">
        {heading}
      </h2>

      {result.status === 'loading' && (
        <ul className="title-row__list" aria-hidden="true">
          {Array.from({ length: SKELETON_CARDS }, (_, i) => (
            <li key={i} className="title-row__card">
              <TitleCardSkeleton />
            </li>
          ))}
        </ul>
      )}

      {result.status === 'error' && (
        <div className="title-row__message" role="alert">
          <p>{tmdbErrorMessage(result.error, 'Couldn’t load this row.')}</p>
          <button type="button" className="title-row__retry" onClick={onRetry}>
            Retry
          </button>
        </div>
      )}

      {result.status === 'success' && result.data.length === 0 && (
        <p className="title-row__message">Nothing to show here right now.</p>
      )}

      {result.status === 'success' && result.data.length > 0 && (
        <div className="title-row__viewport">
          <button
            type="button"
            className="title-row__arrow title-row__arrow--prev"
            aria-label={`Scroll ${heading} left`}
            onClick={() => scrollByPage(-1)}
          >
            <ChevronLeftIcon />
          </button>

          <ul ref={scrollerRef} className="title-row__list">
            {result.data.map((title) => (
              <li key={`${title.mediaType ?? 'movie'}-${title.id}`} className="title-row__card">
                <TitleCard title={title} />
              </li>
            ))}
          </ul>

          <button
            type="button"
            className="title-row__arrow title-row__arrow--next"
            aria-label={`Scroll ${heading} right`}
            onClick={() => scrollByPage(1)}
          >
            <ChevronRightIcon />
          </button>
        </div>
      )}
    </section>
  );
}
