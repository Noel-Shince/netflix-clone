/**
 * Catalog data contract: the shapes the home page components render.
 *
 * Defined in slice 01 against placeholder data; slice 03 maps TMDB results
 * onto the same shapes (see api/catalogApi.ts), so components never see
 * TMDB's field names.
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
