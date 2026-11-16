/**
 * Full-width banner for one featured title, with an optional row of titles
 * overlapping its lower edge (the tutorial's layout).
 *
 * Play and More Info are visual until the player exists (slice 04).
 */
import type { ReactNode } from 'react';
import { InfoIcon, PlayIcon } from '../../../../components/icons/Icons.tsx';
import type { FeaturedTitle } from '../../data/mockTitles.ts';
import { placeholderGradient } from '../../lib/placeholderArt.ts';
import './Hero.css';

interface HeroProps {
  title: FeaturedTitle;
  /** Rendered at the bottom of the banner, over the fade. */
  children?: ReactNode;
}

export function Hero({ title, children }: HeroProps) {
  const backgroundImage = title.imageUrl
    ? `url(${title.imageUrl})`
    : `radial-gradient(ellipse at 75% 30%, rgba(229, 9, 20, 0.35), transparent 60%), ${placeholderGradient(title.id)}`;

  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero__backdrop" style={{ backgroundImage }} />

      <div className="hero__caption">
        <h1 id="hero-title" className="hero__title">
          {title.name}
        </h1>
        <p className="hero__synopsis">{title.synopsis}</p>
        <div className="hero__actions">
          <button type="button" className="hero__button hero__button--play">
            <PlayIcon /> Play
          </button>
          <button type="button" className="hero__button hero__button--info">
            <InfoIcon /> More Info
          </button>
        </div>
      </div>

      {children && <div className="hero__row">{children}</div>}
    </section>
  );
}
