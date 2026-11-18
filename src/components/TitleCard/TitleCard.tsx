/**
 * One title: artwork (or a placeholder gradient) with its name below, linking
 * to the player. Shared by TitleRow (home rows, "More Like This") and the
 * search results grid; the parent decides the card's width.
 *
 * Round Play and + My List buttons sit over the artwork (slice 11). They are
 * siblings of the card's link, not inside it: a button inside a link is
 * invalid HTML.
 */
import { Link } from 'react-router';
import { PlayIcon } from '../icons/Icons.tsx';
import { MyListButton } from '../MyListButton/MyListButton.tsx';
import { placeholderGradient } from '../../lib/placeholderArt.ts';
import { playerPath } from '../../lib/routes.ts';
import type { RowTitle } from '../TitleRow/TitleRow.tsx';
import './TitleCard.css';

export function TitleCard({ title: row }: { title: RowTitle }) {
  const title = { ...row, mediaType: row.mediaType ?? 'movie' };
  const href = playerPath(title.id, title.mediaType);
  return (
    <div className="title-card-wrap">
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
