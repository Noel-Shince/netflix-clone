/**
 * Catalog data contract: the shapes the browse pages render.
 *
 * Defined in slice 01 against placeholder data; slice 03 maps TMDB results
 * onto the same shapes (see api/catalogApi.ts), so components never see
 * TMDB's field names. Slice 11 adds TV shows, so every title carries its
 * media type (see lib/media.ts).
 */
import type { TitleRef } from '../../lib/media.ts';

export type CatalogTitle = TitleRef;

export interface FeaturedTitle extends CatalogTitle {
  synopsis: string;
  /** Large banner image; `imageUrl` stays card-sized (that is what My List saves). */
  backdropUrl: string | null;
  /** First release / air year, or null when TMDB has no date. */
  year: string | null;
}
