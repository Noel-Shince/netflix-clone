# 14 — Rotating backdrop art

**Goal:** the home hero and the "Who's watching?" screen no longer sit on one title forever —
both rotate through a handful of trending titles' artwork on their own.

Owner request, 2026-11-18, with a reference screenshot of Netflix's own profile picker (full-bleed
backdrop behind the avatar grid). Follows [slice 11](11-profiles.md) (profiles) and
[slice 12](12-nav-pages.md) (the hero's current inset-card layout).

## Acceptance criteria

- [x] Every browse page's hero (Home, Shows, Movies, New & Popular) cycles through up to 5
      trending candidates, one every 8 seconds, each fading in. The title, synopsis, Play, My
      List and More Info button all change together.
- [x] The "Who's watching?", "Manage profiles" and add/edit screens show a full-bleed backdrop
      image behind them, darkened and tinted red so the avatar tiles and white text stay
      readable over any image. It rotates every 10 seconds.
- [x] Both keep working, just without the one that failed to load, if the backdrop fetch errors
      or is still loading — this is decoration, not the hero's own (still error-handled) request.
- [x] `prefers-reduced-motion: reduce` turns off the fade animation on both; the content still
      rotates, since that is the feature, not motion for its own sake.
- [x] No new CSP origins needed: both reuse `api.themoviedb.org` / `image.tmdb.org`, already
      allow-listed (slice 13).

## Out of scope for this slice

- Pausing rotation when the tab is hidden (`visibilitychange`). Minor battery/network cost;
  worth adding if it matters later.
- A manual "pause" or dot indicators, as some carousels have. Not asked for.
- Replicating Netflix's own profile-picker art (a grayscale actor cutout with a red key light).
  That is Netflix's specific marketing treatment; this uses TMDB backdrop photography instead,
  which gets the same "a movie behind the picker" effect without copying it.

## Notes / decisions

- **Where the code lives:**
  - `src/lib/useRotation.ts`: generic `useRotation(length, intervalMs)` hook, shared by both
    features. Lives in `lib/` since catalog and profiles may not import each other (ADR-2).
  - `src/features/catalog/api/catalogApi.ts`: `fetchFeaturedTitle` → `fetchFeaturedTitles(source,
count)`, returning several candidates instead of the first one. `BrowsePageConfig.loadFeatured`
    renamed `loadFeaturedTitles` to match.
  - `src/lib/backdrops.ts`: a thin, catalog-independent `fetchBackdropUrls(count)` for the
    profiles backdrop — it only needs image URLs, not full `FeaturedTitle` objects, so it talks
    to `lib/tmdb.ts` directly rather than importing catalog's types.
  - `src/features/profiles/components/ProfilesBackdrop.tsx`, rendered by `ProfilesShell` (so
    every profile screen gets it, not just the picker).
- **Fade mechanic:** each rotating element is keyed by its id/url, so React remounts it on
  change and a CSS `@keyframes` (opacity 0 → 1) plays automatically — no animation library,
  and it composes with `prefers-reduced-motion` through one more media query.
- **Failure is silent by design:** `ProfilesBackdrop` swallows its own fetch error (logs a
  warning) and renders nothing rather than showing an error state — it is decoration behind a
  page whose own loading/error states (profiles themselves) are what actually matter.
