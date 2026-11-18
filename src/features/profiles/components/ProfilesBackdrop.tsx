/**
 * Full-bleed backdrop behind the profile screens (slice 13): a trending
 * title's artwork, darkened and tinted red, rotating every few seconds
 * (`useRotation`) instead of staying on one image. Purely decorative — a
 * failed or still-loading fetch just leaves the plain background, so this
 * never blocks or errors the page it sits behind.
 */
import { useEffect, useState } from 'react';
import { fetchBackdropUrls } from '../../../lib/backdrops.ts';
import { useRotation } from '../../../lib/useRotation.ts';

const BACKDROP_COUNT = 6;
const ROTATION_MS = 10000;

export function ProfilesBackdrop() {
  const [urls, setUrls] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchBackdropUrls(BACKDROP_COUNT).then(
      (fetched) => {
        if (!cancelled) setUrls(fetched);
      },
      (error: unknown) => console.warn('Could not load profile backdrop art', error),
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const index = useRotation(urls.length, ROTATION_MS);
  const url = urls[index];
  if (!url) return null;

  return (
    <div className="profiles__backdrop" aria-hidden="true">
      <div
        key={url}
        className="profiles__backdrop-image"
        style={{ backgroundImage: `url(${url})` }}
      />
    </div>
  );
}
