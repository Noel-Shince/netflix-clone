/**
 * Expanded preview shown when a TitleCard is hovered for ~500ms, after
 * Netflix's hover card: a muted autoplaying trailer (or poster fallback)
 * with Play, + My List, thumbs up/down, and a "more info" chevron.
 *
 * Rendered through a portal at document.body so it can grow past its
 * TitleRow's `overflow-x: auto` clip and sit above everything else.
 * Positioned with `position: fixed` from the card's own viewport rect,
 * captured by the caller at the moment hover was confirmed.
 */
import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { CaretDownIcon, PlayIcon, ThumbsDownIcon, ThumbsUpIcon } from '../icons/Icons.tsx';
import { MyListButton } from '../MyListButton/MyListButton.tsx';
import type { MediaType } from '../../lib/media.ts';
import { placeholderGradient } from '../../lib/placeholderArt.ts';
import { playerPath } from '../../lib/routes.ts';
import { fetchTrailerKey, trailerEmbedUrl } from '../../lib/trailerUtils.ts';
import type { RowTitle } from '../TitleRow/TitleRow.tsx';
import './HoverCard.css';

/** How much wider the popup is than the card it grew from. */
const SCALE = 1.6;
/** Minimum gap kept between the popup and the viewport edge. */
const MARGIN = 10;
/** Approximate height of the panel below the video (buttons + title + meta). */
const PANEL_HEIGHT = 96;

export interface HoverCardProps {
  title: RowTitle;
  /** The card wrapper's getBoundingClientRect() at the moment hover opened. */
  anchor: DOMRect;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export function HoverCard({ title, anchor, onMouseEnter, onMouseLeave }: HoverCardProps) {
  const mediaType: MediaType = title.mediaType ?? 'movie';
  const href = playerPath(title.id, mediaType);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);

  useEffect(() => {
    // Each HoverCard instance is mounted fresh for one title and unmounts
    // when the popup closes, so there is no earlier title's key to clear.
    let alive = true;
    fetchTrailerKey(title.id, mediaType)
      .then((key) => {
        if (alive) setTrailerKey(key);
      })
      .catch(() => {
        // No trailer: the poster fallback below is enough.
      });
    return () => {
      alive = false;
    };
  }, [title.id, mediaType]);

  const popupWidth = anchor.width * SCALE;
  const videoHeight = (popupWidth * 9) / 16;

  let left = anchor.left + anchor.width / 2 - popupWidth / 2;
  left = Math.max(MARGIN, Math.min(left, window.innerWidth - popupWidth - MARGIN));

  let top = anchor.top + anchor.height / 2 - videoHeight / 2;
  top = Math.max(MARGIN, top);
  if (top + videoHeight + PANEL_HEIGHT > window.innerHeight - MARGIN) {
    top = Math.max(MARGIN, window.innerHeight - videoHeight - PANEL_HEIGHT - MARGIN);
  }

  return createPortal(
    <div
      className="hover-card"
      style={{ left, top, width: popupWidth }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      role="region"
      aria-label={`Preview: ${title.name}`}
    >
      <div className="hover-card__media" style={{ height: videoHeight }}>
        {trailerKey ? (
          <iframe
            className="hover-card__frame"
            src={trailerEmbedUrl(trailerKey)}
            title={`${title.name} preview`}
            allow="autoplay; encrypted-media"
            aria-hidden="true"
          />
        ) : (
          <div
            className="hover-card__poster"
            style={{
              backgroundImage: title.imageUrl
                ? `url(${title.imageUrl})`
                : placeholderGradient(title.id),
            }}
            aria-hidden="true"
          />
        )}
      </div>

      <div className="hover-card__panel">
        <div className="hover-card__actions">
          <Link
            className="hover-card__btn hover-card__btn--play"
            to={href}
            aria-label={`Play ${title.name}`}
          >
            <PlayIcon />
          </Link>
          <MyListButton className="hover-card__btn" title={{ ...title, mediaType }} iconOnly />
          <button className="hover-card__btn" type="button" aria-label={`Like ${title.name}`}>
            <ThumbsUpIcon />
          </button>
          <button className="hover-card__btn" type="button" aria-label={`Dislike ${title.name}`}>
            <ThumbsDownIcon />
          </button>
          <Link
            className="hover-card__btn hover-card__btn--expand"
            to={href}
            aria-label={`More about ${title.name}`}
          >
            <CaretDownIcon />
          </Link>
        </div>
        <p className="hover-card__name">{title.name}</p>
        <p className="hover-card__meta">{mediaType === 'tv' ? 'Series' : 'Movie'}</p>
      </div>
    </div>,
    document.body,
  );
}
