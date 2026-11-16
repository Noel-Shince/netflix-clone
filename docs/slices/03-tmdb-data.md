# 03 — TMDB movie data

**Goal:** the home page's hero banner and title rows show real movies from The Movie Database
(TMDB) instead of placeholder data, and the page stays usable while data loads or when TMDB is
slow, rate-limited, unreachable or misconfigured.

## Acceptance criteria

- [ ] A single TMDB client, `src/lib/tmdb.ts`, is the only code that talks to TMDB. It sends the
      v4 **API Read Access Token as a Bearer header** on v3 endpoints (ADR-9), reads the token
      through `src/lib/env.ts`, and builds image URLs from TMDB's image CDN.
- [ ] `src/features/catalog/api/catalogApi.ts` maps TMDB responses onto the existing
      `CatalogTitle` / `FeaturedTitle` contract from slice 01. Components do not know TMDB's
      field names.
- [ ] **Hero:** the first trending-today movie that has both a backdrop image and a synopsis.
- [ ] **Rows** (one TMDB list each):

      | Row heading        | TMDB endpoint                |
      | ------------------ | ---------------------------- |
      | Popular on Netflix | `/movie/popular` (hero row)  |
      | Blockbuster Movies | `/movie/top_rated`           |
      | Now Playing        | `/movie/now_playing`         |
      | Upcoming           | `/movie/upcoming`            |
      | Top Picks for You  | `/trending/movie/week`       |

- [ ] Cards show TMDB backdrop art (16:9) as lazy-loaded `<img>` elements; a title with no
      backdrop keeps the slice 01 gradient placeholder.
- [ ] **Loading:** each row shows skeleton cards and the hero shows a skeleton caption until its
      own request finishes. Rows load independently; one slow row does not hold up the others.
- [ ] **Errors:** a failed request affects only its own section. A failed row shows "Couldn't
      load this row" with a **Retry** button; a failed hero shows a short message with Retry. The
      navbar, footer and other rows keep working. A missing token shows a message pointing to
      `.env.local` (in development) instead of crashing the app.
- [ ] **Rate limits / flaky network:** a `429` or `5xx` response is retried once automatically,
      honouring TMDB's `Retry-After` header (capped at 5 s). Requests time out after 10 s.
      Successful responses are cached in memory for the page session, so returning to `/` does
      not refetch.
- [ ] `src/features/catalog/data/mockTitles.ts` is removed; the types move to
      `src/features/catalog/types.ts`.
- [ ] `.env.local` is never committed. CI builds without a token.
- [ ] `npm run lint`, `format:check`, `type-check` and `build` pass in CI.

## Out of scope for this slice

- Search, genres, TV shows, "My List" — out of v1 (PRD §4). Slice 01 had no search either.
- Clicking a card or Play opening a player (slice 04). Cards are still not links.
- Hiding the token behind a server proxy (ADR-4 limitation stands).
- Pagination / infinite rows. Each row shows TMDB's first page (20 titles).
- Automated tests. The repo has no test runner yet; adding one is a separate decision.

## Notes / decisions

- **Row headings.** Slice 01's "Only on Netflix" heading is replaced by "Now Playing", because
  it would otherwise label cinema releases as Netflix originals. "Popular on Netflix" and "Top
  Picks for You" keep the tutorial's wording; they are flavour text, decided with branding (PRD
  Q3). "Top Picks for You" is not personalised.
- **Tutorial deviation.** The tutorial fetches inside each card component with a bare
  `fetch(...).then(...)` and no error handling, and hardcodes its hero. Here, fetching sits in one
  client + one API module, the hero comes from TMDB, and every section has loading and error
  states.
- **Cache is per page load**, not persistent. TMDB lists change daily at most; a reload fetches
  fresh data. No extra library (React Query etc.) for six GET requests.
