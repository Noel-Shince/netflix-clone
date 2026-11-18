# 10 — Movie search

**Goal:** a signed-in user can search for a movie by title from the navbar and see matching
results, using the same catalog data pipeline as the home page.

## Acceptance criteria

- [ ] A search icon in the navbar opens a text box (`src/components/Navbar/Navbar.tsx`). Typing
      navigates to `/search?q=<query>` after a short debounce (search as you type), so the query
      lives in the URL and survives reload / Back.
- [ ] `src/features/catalog/SearchPage.tsx` renders the matches as a responsive grid, reusing
      `TitleCard` (extracted from `TitleRow` in this slice so home rows and search share one card).
- [ ] `searchMovies` in `catalogApi.ts` calls TMDB's `/search/movie`, excludes adult results,
      de-duplicates, and maps onto the existing `CatalogTitle` contract — no new data shape for
      components to learn.
- [ ] Loading, empty-query, no-results and error states are each handled, consistent with the
      home page rows (skeletons, retry button, friendly message).
- [ ] `/` and `/search` share one `Navbar`/`Footer` instance via a new `BrowseLayout` layout
      route, so the search box keeps focus and state across that navigation.
- [ ] Still a signed-in-only page (nested under the existing `RequireAuth` layout route).

## Out of scope for this slice

- Search suggestions / autocomplete while typing (only the debounced navigation).
- Searching TV shows, people, or anything beyond `/movie/*`.
- A recommendation algorithm, profiles, or making the other nav links functional — separate work
  the owner asked for alongside this slice.

## Notes / decisions

- TMDB's `/search/movie` already does relevance ranking (title + alternative titles, weighted by
  popularity); this slice adds de-duplication and pushes titles with no backdrop art to the end,
  rather than re-implementing ranking.
- The results page keeps showing the previous query's results (dimmed) while the next query
  loads, instead of flashing skeletons on every keystroke.
