/**
 * Top navigation bar shared by logged-in pages.
 *
 * Transparent over the hero, solid once the page scrolls. Only "Home" routes
 * anywhere in v1; the other links and icons are visual (search, notifications,
 * profiles and My List are out of scope — PRD §4).
 *
 * The account menu opens on click / tap (and on hover with a mouse), so it
 * works on touch screens, where buttons do not take focus on tap (slice 07).
 *
 * Sign out only calls Firebase; the route guard then sends the user to /login,
 * so this shared component needs no knowledge of the auth feature (ADR-2).
 */
import { useEffect, useId, useRef, useState } from 'react';
import { NavLink } from 'react-router';
import { logOut } from '../../lib/firebase.ts';
import { Logo } from '../Logo/Logo.tsx';
import { BellIcon, CaretDownIcon, SearchIcon } from '../icons/Icons.tsx';
import './Navbar.css';

const VISUAL_ONLY_LINKS = ['TV Shows', 'Movies', 'New & Popular', 'My List', 'Browse by Languages'];

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
        <button type="button" className="navbar__icon-button" aria-label="Search">
          <SearchIcon />
        </button>
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
