/**
 * Site footer: social icons, link grid, copyright, and the TMDB attribution
 * and non-affiliation notice the PRD requires (§4).
 *
 * Links are visual only — there are no help/legal pages in v1.
 */
import type { ComponentType, SVGProps } from 'react';
import { FacebookIcon, InstagramIcon, XIcon, YouTubeIcon } from '../icons/Icons.tsx';
import './Footer.css';

const SOCIAL: { label: string; Icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  { label: 'Facebook', Icon: FacebookIcon },
  { label: 'Instagram', Icon: InstagramIcon },
  { label: 'X', Icon: XIcon },
  { label: 'YouTube', Icon: YouTubeIcon },
];

const LINKS = [
  'Audio Description',
  'Help Centre',
  'Gift Cards',
  'Media Centre',
  'Investor Relations',
  'Jobs',
  'Terms of Use',
  'Privacy',
  'Legal Notices',
  'Cookie Preferences',
  'Corporate Information',
  'Contact Us',
];

/** Read once at load; a re-render must not change it (and lint flags Date in render). */
const CURRENT_YEAR = new Date().getFullYear();

export function Footer() {
  return (
    <footer className="footer">
      <ul className="footer__social" aria-label="Social media">
        {SOCIAL.map(({ label, Icon }) => (
          <li key={label} className="footer__social-item" title={label}>
            <Icon />
            <span className="visually-hidden">{label}</span>
          </li>
        ))}
      </ul>

      <ul className="footer__links">
        {LINKS.map((label) => (
          <li key={label}>{label}</li>
        ))}
      </ul>

      <p className="footer__small">© {CURRENT_YEAR} Noelflix, a Netflix-style portfolio project.</p>
      <p className="footer__small">
        This product uses the TMDB API but is not endorsed or certified by TMDB.
      </p>
      <p className="footer__small">
        A learning project. Not affiliated with, endorsed by, or connected to Netflix.
      </p>
    </footer>
  );
}
