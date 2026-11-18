/**
 * Expanded preview shown when a TitleCard is hovered for ~500ms, after
 * Netflix's hover card: a muted autoplaying trailer (or poster fallback)
 * with Play, + My List, thumbs up/down, and a "more info" chevron.
 *
 * Rendered through a portal at document.body so it can grow past its
 * TitleRow's `overflow-x: auto` clip and sit above everything else.
 * Positioned with `position: fixed` from the card's own viewport rect,
 * captured by the caller at the moment hover was confirmed.
 *
 * Clicking anywhere on the popup opens the player — not just the Play
 * button — and resumes the trailer from however much of it has already
 * played here, muted, since the preview opened. A transparent link sits
 * over the video itself for this: a click inside an <iframe> never bubbles
 * to this component's own click handler (different document), so the
 * video needs its own hit target, not just the surrounding panel's.
 */
import { createPortal } from 'react-dom';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
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
  const navigate = useNavigate();
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  // When the preview's trailer started autoplaying, so a click can resume
  // the full player from roughly how much of it has played since. Not a
  // real playback position (no YouTube JS API wired in here) — just how
  // long this muted preview has been on screen, which is the same thing
  // while it autoplays uninterrupted with no controls to pause or seek it.
  const startedAtRef = useRef<number | null>(null);

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

  useEffect(() => {
    startedAtRef.current = trailerKey ? Date.now() : null;
  }, [trailerKey]);

  const resumeSeconds = () =>
    startedAtRef.current ? Math.max(0, Math.floor((Date.now() - startedAtRef.current) / 1000)) : 0;

  /** Shared by every click target in the popup: opens the player, resuming where this preview got to. */
  const goToPlayer = (event: React.MouseEvent) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return; // Let modified/middle clicks behave as a normal link (e.g. open in a new tab).
    }
    event.preventDefault();
    event.stopPropagation();
    navigate(playerPath(title.id, mediaType, resumeSeconds()));
  };

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
      onClick={goToPlayer}
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
        {/* A click inside the iframe never reaches this component (cross-document),
            so this transparent link is what actually catches a click on the video. */}
        <Link
          className="hover-card__media-link"
          to={href}
          onClick={goToPlayer}
          aria-label={`Play ${title.name}`}
        />
      </div>

      <div className="hover-card__panel">
        <div className="hover-card__actions">
          <Link
            className="hover-card__btn hover-card__btn--play"
            to={href}
            onClick={goToPlayer}
            aria-label={`Play ${title.name}`}
          >
            <PlayIcon />
          </Link>
          <span onClick={(e) => e.stopPropagation()}>
            <MyListButton className="hover-card__btn" title={{ ...title, mediaType }} iconOnly />
          </span>
          <button
            className="hover-card__btn"
            type="button"
            aria-label={`Like ${title.name}`}
            onClick={(e) => e.stopPropagation()}
          >
            <ThumbsUpIcon />
          </button>
          <button
            className="hover-card__btn"
            type="button"
            aria-label={`Dislike ${title.name}`}
            onClick={(e) => e.stopPropagation()}
          >
            <ThumbsDownIcon />
          </button>
          <Link
            className="hover-card__btn hover-card__btn--expand"
            to={href}
            onClick={goToPlayer}
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
