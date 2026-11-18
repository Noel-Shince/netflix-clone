/**
 * Cycles through `length` items, one `intervalMs` apart, for anything that
 * should rotate on its own (the home hero, the profile picker backdrop).
 *
 * Restarts at 0 whenever `length` changes, so a fresh list of candidates
 * (new TMDB response) doesn't land on an out-of-range index. Stands still
 * for `length <= 1` — nothing to rotate to.
 */
import { useEffect, useState } from 'react';

export function useRotation(length: number, intervalMs = 8000): number {
  const [index, setIndex] = useState(0);
  // Resets to 0 as soon as `length` changes, without a render in between that
  // would show a stale index (React's "adjust state when a prop changes").
  const [lengthSeen, setLengthSeen] = useState(length);
  if (length !== lengthSeen) {
    setLengthSeen(length);
    setIndex(0);
  }

  useEffect(() => {
    if (length <= 1) return;
    const id = setInterval(() => setIndex((current) => (current + 1) % length), intervalMs);
    return () => clearInterval(id);
  }, [length, intervalMs]);

  return length <= 1 ? 0 : index;
}
