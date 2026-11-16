/**
 * Placeholder catalog data for slice 01.
 *
 * `CatalogTitle` is the contract the UI renders. Slice 03 replaces this module
 * with a TMDB client that maps API results onto the same shape, so the
 * components do not change when real data arrives.
 */

export interface CatalogTitle {
  id: number;
  name: string;
  /** Full image URL, or null when there is no artwork (UI shows a placeholder). */
  imageUrl: string | null;
}

export interface FeaturedTitle extends CatalogTitle {
  synopsis: string;
}

export interface CatalogRow {
  /** Stable key; becomes the TMDB category (e.g. "popular") in slice 03. */
  id: string;
  heading: string;
  titles: CatalogTitle[];
}

const NAMES = [
  'Midnight Signal',
  'The Last Harbor',
  'Paper Kingdoms',
  'Glass Orchard',
  'Northbound',
  'Silent Frequency',
  'Ember & Ash',
  'Low Tide',
  'The Cartographer',
  'Hollow Crown City',
  'Static Bloom',
  'Second Sunrise',
];

/** Builds a row of fictional titles; ids are offset per row so React keys stay unique. */
function makeTitles(offset: number, count = NAMES.length): CatalogTitle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: offset + i,
    name: NAMES[(i + offset) % NAMES.length] ?? 'Untitled',
    imageUrl: null,
  }));
}

export const featuredTitle: FeaturedTitle = {
  id: 1,
  name: 'Midnight Signal',
  imageUrl: null,
  synopsis:
    'A late-night radio host starts receiving calls from a listener who knows things that have not happened yet, and has one night to work out who is on the other end of the line.',
};

/** Row shown overlapping the bottom of the hero. */
export const heroRow: CatalogRow = {
  id: 'popular-on-netflix',
  heading: 'Popular on Netflix',
  titles: makeTitles(100),
};

export const catalogRows: CatalogRow[] = [
  { id: 'blockbuster', heading: 'Blockbuster Movies', titles: makeTitles(200) },
  { id: 'only-on-netflix', heading: 'Only on Netflix', titles: makeTitles(300) },
  { id: 'upcoming', heading: 'Upcoming', titles: makeTitles(400) },
  { id: 'top-picks', heading: 'Top Picks for You', titles: makeTitles(500) },
];
