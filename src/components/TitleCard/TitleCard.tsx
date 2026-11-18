/**
 * One title: artwork (or a placeholder gradient) with its name below, linking
 * to the player. Shared by TitleRow (home rows, "More Like This") and the
 * search results grid; the parent decides the card's width.
 *
 * Round Play and + My List buttons sit over the artwork (slice 12). They are
 * siblings of the card's link, not inside it: a button inside a link is
 * invalid HTML.
 *
 * Hovering for ~500ms (mouse only; touch has no hover) opens a HoverCard: a
 * larger popup with a muted autoplaying trailer and more actions, after
 * Netflix's own hover card. The delay avoids popping it open on every
 * passing cursor; the open/close timers are shared with the popup itself so
 * moving the pointer from the card onto the (larger) popup doesn't flicker.
 */
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { PlayIcon } from '../icons/Icons.tsx';
import { HoverCard } from '../HoverCard/HoverCard.tsx';
import { MyListButton } from '../MyListButton/MyListButton.tsx';
import { placeholderGradient } from '../../lib/placeholderArt.ts';
import { playerPath } from '../../lib/routes.ts';
import type { RowTitle } from '../TitleRow/TitleRow.tsx';
import './TitleCard.css';

/** Hover must hold this long before the preview opens. */
const OPEN_DELAY_MS = 500;
/** Grace period before closing, so moving onto the (larger) popup doesn't flicker it shut. */
const CLOSE_DELAY_MS = 250;

export function TitleCard({ title: row }: { title: RowTitle }) {
  const title = { ...row, mediaType: row.mediaType ?? 'movie' };
  const href = playerPath(title.id, title.mediaType);

  const wrapRef = useRef<HTMLDivElement>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);

  const clearTimers = () => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };

  const keepOpen = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };

  const scheduleClose = () => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setAnchor(null), CLOSE_DELAY_MS);
  };

  const scheduleOpen = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    openTimer.current = setTimeout(() => {
      if (wrapRef.current) setAnchor(wrapRef.current.getBoundingClientRect());
    }, OPEN_DELAY_MS);
  };

  // Closing (not opening) on scroll/resize, since the captured anchor rect
  // would otherwise drift out from under the popup.
  useEffect(() => {
    if (!anchor) return;
    const close = () => setAnchor(null);
    window.addEventListener('scroll', close, { capture: true, passive: true });
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [anchor]);

  useEffect(() => clearTimers, []);

  return (
    <div
      className="title-card-wrap"
      ref={wrapRef}
      onMouseEnter={scheduleOpen}
      onMouseLeave={scheduleClose}
    >
      <Link className="title-card" to={href}>
        {title.imageUrl ? (
          // Empty alt: the title name is printed right below the image.
          <img
            className="title-card__art"
            src={title.imageUrl}
            alt=""
            width={300}
            height={169}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div
            className="title-card__art"
            style={{ backgroundImage: placeholderGradient(title.id) }}
          />
        )}
        <p className="title-card__name">{title.name}</p>
      </Link>
      <div className="title-card__actions">
        <Link
          className="title-card__action title-card__action--play"
          to={href}
          aria-label={`Play ${title.name}`}
          tabIndex={-1}
        >
          <PlayIcon />
        </Link>
        <MyListButton className="title-card__action" title={title} iconOnly />
      </div>
      {anchor && (
        <HoverCard
          title={title}
          anchor={anchor}
          onMouseEnter={keepOpen}
          onMouseLeave={scheduleClose}
        />
      )}
    </div>
  );
}

/** Loading placeholder with the same footprint as a card. */
export function TitleCardSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="skeleton title-card__art" />
      <div className="skeleton title-card__skeleton-name" />
    </div>
  );
}
