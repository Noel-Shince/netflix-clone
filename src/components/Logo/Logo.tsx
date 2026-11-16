/**
 * Text wordmark.
 *
 * A styled text logo instead of the tutorial's Netflix PNG, so the repo ships
 * no trademarked image. The app is branded "Noelflix" rather than "Netflix"
 * (PRD §6, Q3) so the public demo, which has a login form, is not mistaken for
 * the real service or flagged as phishing.
 */
import './Logo.css';

interface LogoProps {
  className?: string;
}

export function Logo({ className }: LogoProps) {
  return <span className={['logo', className].filter(Boolean).join(' ')}>NOELFLIX</span>;
}
