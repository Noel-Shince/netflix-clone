/**
 * Bell button with an unread badge and a dropdown of new / upcoming releases
 * (see notifications.ts for where they come from).
 *
 * Opening the menu marks everything in it as seen. If TMDB fails, the bell
 * still opens and says so, rather than doing nothing.
 */
import { useCallback, useId, useRef, useState } from 'react';
import { Link } from 'react-router';
import { placeholderGradient } from '../../lib/placeholderArt.ts';
import { useAsync } from '../../lib/useAsync.ts';
import { BellIcon } from '../icons/Icons.tsx';
import { fetchNotifications, readSeenIds, writeSeenIds } from './notifications.ts';
import { useDismiss } from './useDismiss.ts';

export function NotificationsMenu() {
  const { result, retry } = useAsync(fetchNotifications);
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(readSeenIds);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, close, containerRef, buttonRef);

  const items = result.status === 'success' ? result.data : [];
  const unread = items.filter((item) => !seen.has(item.id)).length;

  const toggle = () => {
    if (!open && unread > 0) {
      const ids = items.map((item) => item.id);
      writeSeenIds(ids);
      setSeen(new Set(ids));
    }
    setOpen(!open);
  };

  return (
    <div
      ref={containerRef}
      className={`navbar__menu navbar__notifications${open ? ' navbar__menu--open' : ''}`}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        className="navbar__icon-button"
        aria-label={unread > 0 ? `Notifications, ${unread} new` : 'Notifications'}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={toggle}
      >
        <BellIcon />
        {unread > 0 && (
          <span className="navbar__badge" aria-hidden="true">
            {unread}
          </span>
        )}
      </button>

      <div id={menuId} className="navbar__popup navbar__notifications-popup">
        {result.status === 'loading' && <p className="navbar__popup-message">Loading…</p>}
        {result.status === 'error' && (
          <p className="navbar__popup-message">
            Couldn’t load notifications.{' '}
            <button type="button" className="navbar__text-button" onClick={retry}>
              Retry
            </button>
          </p>
        )}
        {result.status === 'success' && items.length === 0 && (
          <p className="navbar__popup-message">No new notifications.</p>
        )}
        {items.length > 0 && (
          <ul className="navbar__notification-list">
            {items.map((item) => (
              <li key={item.id}>
                <Link className="navbar__notification" to={item.href} onClick={close}>
                  {item.imageUrl ? (
                    <img className="navbar__notification-art" src={item.imageUrl} alt="" />
                  ) : (
                    <span
                      className="navbar__notification-art"
                      style={{ backgroundImage: placeholderGradient(item.id) }}
                    />
                  )}
                  <span>
                    <span className="navbar__notification-label">{item.label}</span>
                    <span className="navbar__notification-name">{item.name}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
