/**
 * Top navigation bar shared by logged-in pages.
 *
 * Transparent over the hero, solid once the page scrolls. Every link routes to
 * a browse page (slice 09); below 900px they collapse into a "Browse" menu.
 * The bell opens NotificationsMenu.
 *
 * The account menu opens on click / tap (and on hover with a mouse), so it
 * works on touch screens, where buttons do not take focus on tap (slice 07).
 *
 * Sign out only calls Firebase; the route guard then sends the user to /login,
 * so this shared component needs no knowledge of the auth feature (ADR-2).
 */
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router';
import { logOut } from '../../lib/firebase.ts';
import { ROUTES } from '../../lib/routes.ts';
import { Logo } from '../Logo/Logo.tsx';
import { CaretDownIcon, SearchIcon } from '../icons/Icons.tsx';
import { NotificationsMenu } from './NotificationsMenu.tsx';
import { useDismiss } from './useDismiss.ts';
import './Navbar.css';

const NAV_LINKS = [
  { to: ROUTES.home, label: 'Home' },
  { to: ROUTES.tvShows, label: 'Shows' },
  { to: ROUTES.movies, label: 'Movies' },
  { to: ROUTES.newAndPopular, label: 'New & Popular' },
  { to: ROUTES.myList, label: 'My List' },
  { to: ROUTES.languages, label: 'Browse by Languages' },
];

/** Phone / tablet replacement for the link list: one "Browse" button and a dropdown. */
function BrowseMenu() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, close, containerRef, buttonRef);
  const { pathname } = useLocation();
  const current = NAV_LINKS.find((link) => link.to === pathname)?.label ?? 'Browse';

  return (
    <div
      ref={containerRef}
      className={`navbar__menu navbar__browse${open ? ' navbar__menu--open' : ''}`}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        className="navbar__browse-button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen(!open)}
      >
        {current} <CaretDownIcon className="navbar__caret" />
      </button>
      <ul id={menuId} className="navbar__popup navbar__browse-popup">
        {NAV_LINKS.map((link) => (
          <li key={link.to}>
            <NavLink to={link.to} end className="navbar__browse-link" onClick={close}>
              {link.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Scroll distance (px) after which the bar switches to its solid background. */
const SOLID_AFTER_PX = 80;

export function Navbar() {
  const [isSolid, setIsSolid] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

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
          {NAV_LINKS.map((link) => (
            <li key={link.to}>
              <NavLink to={link.to} end className="navbar__link">
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>
        <BrowseMenu />
      </nav>

      <div className="navbar__right">
        <button type="button" className="navbar__icon-button" aria-label="Search">
          <SearchIcon />
        </button>
        <span className="navbar__kids">Children</span>
        <NotificationsMenu />

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
