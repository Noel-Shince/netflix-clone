/**
 * My List page (`/my-list`): every title the viewer saved, newest first, as a
 * grid of cards that open the player, each with a Remove button.
 *
 * Reads the live list from lib/myList.ts, so a title added from the hero or
 * player shows up here without a reload.
 */
import { useState } from 'react';
import { Link } from 'react-router';
import { XIcon } from '../../components/icons/Icons.tsx';
import type { TitleRef } from '../../lib/media.ts';
import { removeFromMyList, useMyList } from '../../lib/myList.ts';
import { placeholderGradient } from '../../lib/placeholderArt.ts';
import { playerPath, ROUTES } from '../../lib/routes.ts';
import './MyListPage.css';

export function MyListPage() {
  const list = useMyList();

  return (
    <>
      <main className="my-list" aria-busy={list.status === 'loading'}>
        <h1 className="my-list__heading">My List</h1>

        {list.status === 'loading' && (
          <ul className="my-list__grid" aria-hidden="true">
            {Array.from({ length: 6 }, (_, i) => (
              <li key={i}>
                <div className="skeleton my-list__art" />
              </li>
            ))}
          </ul>
        )}

        {list.status === 'error' && (
          <p className="my-list__message" role="alert">
            Couldn’t load your list. Check your connection and reload the page.
          </p>
        )}

        {list.status === 'ready' && list.items.length === 0 && (
          <div className="my-list__message">
            <p>Your list is empty. Use “+ My List” on any title to save it here.</p>
            <Link className="my-list__cta" to={ROUTES.home}>
              Browse titles
            </Link>
          </div>
        )}

        {list.status === 'ready' && list.items.length > 0 && (
          <ul className="my-list__grid">
            {list.items.map((title) => (
              <MyListCard key={`${title.mediaType}-${title.id}`} title={title} />
            ))}
          </ul>
        )}
      </main>
    </>
  );
}

function MyListCard({ title }: { title: TitleRef }) {
  const [removing, setRemoving] = useState(false);

  const remove = () => {
    setRemoving(true);
    removeFromMyList(title).catch((error: unknown) => {
      console.error('Could not remove from My List', error);
      setRemoving(false);
    });
  };

  return (
    <li className="my-list__card">
      <Link className="my-list__link" to={playerPath(title.id, title.mediaType)}>
        {title.imageUrl ? (
          // Empty alt: the title name is printed right below the image.
          <img className="my-list__art" src={title.imageUrl} alt="" loading="lazy" />
        ) : (
          <div
            className="my-list__art"
            style={{ backgroundImage: placeholderGradient(title.id) }}
          />
        )}
        <p className="my-list__name">
          {title.name}
          {title.mediaType === 'tv' && <span className="my-list__badge">TV</span>}
        </p>
      </Link>
      <button
        type="button"
        className="my-list__remove"
        aria-label={`Remove ${title.name} from My List`}
        disabled={removing}
        onClick={remove}
      >
        <XIcon />
      </button>
    </li>
  );
}
