/**
 * One title: artwork (or a placeholder gradient) with its name below, linking
 * to the player. Shared by the home page rows and the search results grid;
 * the parent decides the card's width.
 */
import { Link } from 'react-router';
import { placeholderGradient } from '../../../../lib/placeholderArt.ts';
import { playerPath } from '../../../../lib/routes.ts';
import type { CatalogTitle } from '../../types.ts';
import './TitleCard.css';

export function TitleCard({ title }: { title: CatalogTitle }) {
  return (
    <Link className="title-card" to={playerPath(title.id)}>
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
