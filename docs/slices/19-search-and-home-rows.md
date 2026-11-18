# 19 — Smarter search and more home rows

**Goal:** the search bar finds titles by genre, language or actor, not just by name, and the
home page shows the viewer's own watch history and a few more category rows.

## What changed

- `features/catalog/api/searchApi.ts` (new): `searchAll(query)` runs TMDB's `/search/multi`
  (titles, the primary and only path a blank result relies on) alongside three independent
  lookups, all in parallel:
  - **Genre** — matches the whole query against TMDB's own genre names
    (`/genre/movie/list`, `/genre/tv/list`, cached once per page session), then
    `/discover/movie` / `/discover/tv` with `with_genres`.
  - **Language** — matches the query against a fixed table of language/demonym names
    (`LANGUAGE_CODES`, e.g. "Malayalam" → `ml`, "Korean" → `ko`) and discovers with
    `with_original_language`.
  - **Person** — `/search/person`'s top match, then `with_cast` on `/discover/movie` and
    `/discover/tv`.
    Each extra lookup contributes a labelled section ("Action Titles", "Malayalam Titles",
    "Starring Chris Hemsworth") only when it actually finds something, and a failure in one
    (caught individually) never blocks the others or the title search.
- `SearchPage.tsx` now renders a list of sections instead of one grid, each with its own
  heading; the stale-while-loading and empty-query/no-results behaviour from slice 10 is
  unchanged, just applied to the whole section list.
- `catalogApi.ts`: `searchMovies` (TMDB `/search/movie`, title-only, movie-only) is gone,
  replaced by `searchAll`. New `fetchTitlesByRefs(refs)` looks up specific titles by id/mediaType
  (one TMDB detail request each) — used below, since watch progress docs don't store artwork.
- `lib/watchProgress.ts`: new `listRecentlyWatched(max)` queries the viewing profile's
  `watchProgress` subcollection (slice 18) ordered by `updatedAt` descending, for the home row.
- `browsePages.ts`: `HOME_PAGE.rows` gains:
  - **"Shows You've Watched"** (first row) — `listRecentlyWatched` + `fetchTitlesByRefs`, newest
    play first. Empty for a profile that hasn't played anything yet; shown anyway (TitleRow's own
    "Nothing to show here right now" is an honest answer here, unlike the algorithmic
    `personalRows` above it, which stay hidden with no watch history).
  - **"Popular on TV"** (`/tv/popular`) and **"Action & Adventure"** (`/discover/movie` with
    genre 28) — the two categories the home page didn't already have. "Top Rated Movies" and
    "Trending This Week" were already covered (`top-rated` / "Blockbuster Movies" and
    `trending-week`), so nothing was added for those.

## Deliberately left alone

- Genre/language detection only matches when the **whole query** is one known name (no fuzzy or
  partial matching) — "korean drama" won't split into a language and a genre hit, just whichever
  whole-string match (if any) exists elsewhere in the lookup table.
- The language table is a fixed list of common languages, not every ISO 639-1 code TMDB knows.
- Not verified against a live TMDB request in this sandbox (outbound network is blocked here,
  same constraint noted in slices 15–18) — only type-check/lint/format/build ran. Noel should
  confirm actual search and row results on the live site after merge.
