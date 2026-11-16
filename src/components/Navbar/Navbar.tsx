/**
 * Top navigation bar shared by logged-in pages.
 *
 * Transparent over the hero, solid once the page scrolls. Only "Home" routes
 * anywhere in v1; the other links and icons are visual (search, notifications,
 * profiles and My List are out of scope — PRD §4). Sign-out is wired in slice 05.
 */
import { useEffect, useState } from 'react';
import { NavLink } from 'react-router';
import { Logo } from '../Logo/Logo.tsx';
import { BellIcon, CaretDownIcon, SearchIcon } from '../icons/Icons.tsx';
import './Navbar.css';

const VISUAL_ONLY_LINKS = ['TV Shows', 'Movies', 'New & Popular', 'My List', 'Browse by Languages'];

/** Scroll distance (px) after which the bar switches to its solid background. */
const SOLID_AFTER_PX = 80;

export function Navbar() {
  const [isSolid, setIsSolid] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsSolid(window.scrollY > SOLID_AFTER_PX);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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

        <div className="navbar__profile">
          <button
            type="button"
            className="navbar__profile-button"
            aria-label="Account menu"
            aria-haspopup="true"
          >
            <span className="navbar__avatar" aria-hidden="true" />
            <CaretDownIcon className="navbar__caret" />
          </button>
          <div className="navbar__dropdown">
            <button
              type="button"
              className="navbar__dropdown-item"
              disabled
              title="Available once login is added"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
