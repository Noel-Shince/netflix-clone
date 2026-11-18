/**
 * Data for the navbar's notifications bell: new and upcoming releases.
 *
 * The app has no backend to push real notifications from (ADR-5), so the bell
 * shows TMDB's upcoming-movies list as "new arrival" / "coming soon" alerts.
 * Which ones the viewer has already seen is remembered per browser in
 * localStorage; that is a convenience, so storage failures are ignored.
 */
import { playerPath } from '../../lib/routes.ts';
import { tmdbGet, tmdbImageUrl } from '../../lib/tmdb.ts';

export interface Notification {
  id: number;
  name: string;
  imageUrl: string | null;
  href: string;
  /** e.g. "Coming Dec 5" or "New arrival". */
  label: string;
}

interface TmdbUpcoming {
  results: { id: number; title: string; release_date: string; backdrop_path: string | null }[];
}

const MAX_NOTIFICATIONS = 6;
const SEEN_KEY = 'noelflix:seen-notifications';

function localIsoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function labelFor(releaseDate: string, today: string): string {
  if (!releaseDate || releaseDate <= today) return 'New arrival';
  const [year, month, day] = releaseDate.split('-').map(Number);
  const formatted = new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
  return `Coming ${formatted}`;
}

export async function fetchNotifications(): Promise<Notification[]> {
  const list = await tmdbGet<TmdbUpcoming>('/movie/upcoming');
  const today = localIsoDate(new Date());
  return list.results
    .filter((movie) => movie.backdrop_path)
    .slice(0, MAX_NOTIFICATIONS)
    .map((movie) => ({
      id: movie.id,
      name: movie.title,
      imageUrl: tmdbImageUrl(movie.backdrop_path, 'w300'),
      href: playerPath(movie.id, 'movie'),
      label: labelFor(movie.release_date, today),
    }));
}

export function readSeenIds(): Set<number> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]');
    return new Set(Array.isArray(parsed) ? parsed.filter((n) => typeof n === 'number') : []);
  } catch {
    return new Set();
  }
}

export function writeSeenIds(ids: number[]) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(ids));
  } catch {
    // Private mode or blocked storage: the badge just reappears next visit.
  }
}
