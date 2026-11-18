/**
 * "+ My List" / "✓ My List" toggle, shared by the hero and the player page.
 *
 * Shared UI rather than part of a feature because two features render it
 * (ADR-2). The button is disabled until the list has loaded, so it never
 * claims a title is missing from a list it has not read yet. A failed write
 * is shown inline instead of silently flipping back.
 */
import { useState } from 'react';
import type { TitleRef } from '../../lib/media.ts';
import { addToMyList, isInMyList, removeFromMyList, useMyList } from '../../lib/myList.ts';
import { CheckIcon, PlusIcon } from '../icons/Icons.tsx';
import './MyListButton.css';

interface MyListButtonProps {
  title: TitleRef;
  /** Styling hook for the surrounding page's button look. */
  className?: string;
  /** Round icon-only version for title cards; the name moves to aria-label. */
  iconOnly?: boolean;
}

export function MyListButton({ title, className = '', iconOnly = false }: MyListButtonProps) {
  const list = useMyList();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const saved = isInMyList(list, title);

  const toggle = async () => {
    setBusy(true);
    setFailed(false);
    try {
      await (saved ? removeFromMyList(title) : addToMyList(title));
    } catch (error) {
      console.error('My List update failed', error);
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="my-list-button">
      <button
        type="button"
        className={className}
        aria-pressed={saved}
        aria-label={iconOnly ? `${title.name}: My List` : undefined}
        title={iconOnly ? (saved ? 'Remove from My List' : 'Add to My List') : undefined}
        disabled={list.status !== 'ready' || busy}
        onClick={toggle}
      >
        {saved ? <CheckIcon /> : <PlusIcon />}
        {!iconOnly && ' My List'}
      </button>
      {failed && !iconOnly && (
        <span className="my-list-button__error" role="alert">
          Couldn’t update My List. Try again.
        </span>
      )}
    </span>
  );
}
