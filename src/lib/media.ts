/**
 * Media types shared across features. TMDB keeps movies and TV shows in
 * separate endpoints with different field names, so every title the app
 * passes around carries which one it is.
 */
export type MediaType = 'movie' | 'tv';

/** The minimum needed to show a title as a card and open it in the player. */
export interface TitleRef {
  id: number;
  mediaType: MediaType;
  name: string;
  /** Backdrop image URL, or null (UI shows a gradient placeholder). */
  imageUrl: string | null;
}
