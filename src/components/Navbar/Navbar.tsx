/**
 * Top navigation bar shared by logged-in pages.
 *
 * Transparent over the hero, solid once the page scrolls. "Home" and search
 * work; the other links and icons are still visual only (notifications,
 * profiles and My List are out of scope — PRD §4).
 *
 * Search: the icon opens a text box, and typing updates `/search?q=` after a
 * short pause (search as you type). While on the results page each change
 * replaces the history entry, so Back leaves search in one step instead of
 * one character at a time. Clearing the box or pressing Escape leaves search.
 *
 * The account menu opens on click / tap (and on hover with a mouse), so it
 * works on touch screens, where buttons do not take focus on tap (slice 07).
 *
 * Sign out only calls Firebase; the route guard then sends the user to /login,
 * so this shared component needs no knowledge of the auth feature (ADR-2).
 */
import { useEffect, useId, useRef, useState, type RefObject } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router';
import { logOut } from '../../lib/firebase.ts';
import { SEARCH_PARAM, SEARCH_PATH, searchPath } from '../../lib/routes.ts';
import { Logo } from '../Logo/Logo.tsx';
import { BellIcon, CaretDownIcon, CloseIcon, SearchIcon } from '../icons/Icons.tsx';
import './Navbar.css';

const VISUAL_ONLY_LINKS = ['TV Shows', 'Movies', 'New & Popular', 'My List', 'Browse by Languages'];

/** Scroll distance (px) after which the bar switches to its solid background. */
const SOLID_AFTER_PX = 80;

/** Pause in typing (ms) before the results page updates. */
const SEARCH_DEBOUNCE_MS = 300;

export function Navbar() {
  const [isSolid, setIsSolid] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const search = useSearchBox(searchInputRef);

  useEffect(() => {
    const onScroll = () => setIsSolid(window.scrollY > SOLID_AFTER_PX);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // While the menu is open, a tap / click outside or Escape closes it.
  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!profileRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setMenuOpen(false);
      menuButtonRef.current?.focus();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  return (
    <header className={`navbar${isSolid ? ' navbar--solid' : ''}`}>
      <nav className="navbar__left" aria-label="Primary">
        <NavLink to="/" aria-label="Home" className="navbar__logo">
          <Logo />
        </NavLink>
        <ul className="navbar__links">
          <li>
            <NavLink to="/" end className="navbar__link">
              Home
            </NavLink>
          </li>
          {VISUAL_ONLY_LINKS.map((label) => (
            <li key={label}>
              <span className="navbar__link navbar__link--inert">{label}</span>
            </li>
          ))}
        </ul>
      </nav>

      <div className="navbar__right">
        <form
          role="search"
          className={`navbar__search${search.open ? ' navbar__search--open' : ''}`}
          onSubmit={(event) => {
            event.preventDefault();
            search.submit();
          }}
        >
          <button
            type="button"
            className="navbar__icon-button navbar__search-toggle"
            aria-label="Search"
            aria-expanded={search.open}
            onClick={search.openBox}
          >
            <SearchIcon />
          </button>
          {search.open && (
            <>
              <input
                ref={searchInputRef}
                className="navbar__search-input"
                type="search"
                placeholder="Titles"
                aria-label="Search movies by title"
                autoComplete="off"
                enterKeyHint="search"
                value={search.query}
                onChange={(event) => search.setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') search.clear();
                }}
                onBlur={search.closeIfEmpty}
              />
              {search.query && (
                <button
                  type="button"
                  className="navbar__icon-button navbar__search-clear"
                  aria-label="Clear search"
                  // Keep focus in the input, so blur does not close the box first.
                  onPointerDown={(event) => event.preventDefault()}
                  onClick={search.clear}
                >
                  <CloseIcon />
                </button>
              )}
            </>
          )}
        </form>
        <span className="navbar__kids">Children</span>
        <button type="button" className="navbar__icon-button" aria-label="Notifications">
          <BellIcon />
        </button>

        <div
          ref={profileRef}
          className={`navbar__profile${menuOpen ? ' navbar__profile--open' : ''}`}
          onBlur={(event) => {
            // Close when keyboard focus moves somewhere outside the menu.
            if (!event.currentTarget.contains(event.relatedTarget)) setMenuOpen(false);
          }}
        >
          <button
            ref={menuButtonRef}
            type="button"
            className="navbar__profile-button"
            aria-label="Account menu"
            aria-haspopup="true"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="navbar__avatar" aria-hidden="true" />
            <CaretDownIcon className="navbar__caret" />
          </button>
          <div id={menuId} className="navbar__dropdown">
            <button
              type="button"
              className="navbar__dropdown-item"
              onClick={() => {
                logOut().catch((error: unknown) => console.error('Sign out failed', error));
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

/**
 * State for the navbar search box, kept in step with the URL: the URL is the
 * source of truth for what the results page shows, the box is what the user is
 * typing right now.
 */
function useSearchBox(inputRef: RefObject<HTMLInputElement | null>) {
  const location = useLocation();
  const navigate = useNavigate();

  const onSearchPage = location.pathname === SEARCH_PATH;
  const urlQuery = onSearchPage
    ? (new URLSearchParams(location.search).get(SEARCH_PARAM) ?? '').trim()
    : '';

  const [query, setQuery] = useState(urlQuery);
  const [open, setOpen] = useState(onSearchPage);

  // When the URL changes under us (Back / Forward, the Home link), adopt it:
  // on the results page the box shows its query, anywhere else it closes.
  // Adjusting state during render, not in an effect, avoids a stale frame.
  const urlKey = `${onSearchPage}|${urlQuery}`;
  const [seenUrlKey, setSeenUrlKey] = useState(urlKey);
  if (urlKey !== seenUrlKey) {
    setSeenUrlKey(urlKey);
    if (urlQuery !== query.trim()) setQuery(urlQuery);
    setOpen(onSearchPage);
  }

  const leaveSearch = () => {
    if (!onSearchPage) return;
    // Back to wherever search started from, if that was inside the app;
    // a results page opened directly (shared link, reload) goes home instead.
    if (location.key !== 'default') navigate(-1);
    else navigate('/', { replace: true });
  };

  const goTo = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      leaveSearch();
      return;
    }
    if (onSearchPage && trimmed === urlQuery) return;
    navigate(searchPath(trimmed), { replace: onSearchPage });
  };

  // Search as you type, once typing pauses.
  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (trimmed === urlQuery) return;
    if (!trimmed && !onSearchPage) return;
    const timer = setTimeout(() => goTo(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // goTo is rebuilt every render; these are the values it reads.
  }, [open, query, urlQuery, onSearchPage]); // oxlint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open, inputRef]);

  return {
    open,
    query,
    setQuery,
    openBox: () => {
      if (open) inputRef.current?.focus();
      else setOpen(true);
    },
    submit: () => goTo(query),
    clear: () => {
      setQuery('');
      if (onSearchPage) leaveSearch();
      else setOpen(false);
    },
    closeIfEmpty: () => {
      if (!query.trim() && !onSearchPage) setOpen(false);
    },
  };
}
