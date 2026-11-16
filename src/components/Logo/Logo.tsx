/**
 * Text wordmark.
 *
 * A styled text logo instead of the tutorial's Netflix PNG, so the repo ships
 * no trademarked image. Branding is an open owner decision (PRD §6, Q3); if it
 * changes, this is the only file to edit.
 */
import './Logo.css';

interface LogoProps {
  className?: string;
}

export function Logo({ className }: LogoProps) {
  return <span className={['logo', className].filter(Boolean).join(' ')}>NETFLIX</span>;
}
