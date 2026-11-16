/**
 * Small CSS-only loading ring, shared UI (ADR-2). Added in slice 06 for the
 * login button; it inherits `currentColor`, so it fits any surface.
 *
 * Decorative by default: the surrounding control should say what is loading
 * (e.g. visually hidden "Signing in…"), since a spinning shape alone says nothing.
 */
import './Spinner.css';

interface SpinnerProps {
  /** Diameter in pixels. */
  size?: number;
}

export function Spinner({ size = 24 }: SpinnerProps) {
  return <span className="spinner" style={{ width: size, height: size }} aria-hidden="true" />;
}
