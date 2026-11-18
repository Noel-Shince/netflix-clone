# 15 — Hover-to-play preview

**Goal:** hovering a title card plays a muted preview, after Netflix's own hover card; the hero
banner does the same for its featured title.

Owner request, 2026-11-18, with a reference screenshot of Netflix's own hover card (scaled-up
popup with a playing clip, Play/+/thumbs/chevron buttons, title and episode info below).

## Acceptance criteria

- [x] Hovering a TitleCard for ~500ms (mouse only) opens a larger popup with a muted, looping,
      chromeless YouTube trailer for that title, or its poster art while the trailer loads or if
      none exists.
- [x] The popup shows Play, + My List, thumbs up, thumbs down, and a "more info" chevron, plus
      the title's name and Movie/Series label.
- [x] Moving the pointer from the card onto the (larger) popup doesn't flicker it closed; leaving
      both closes it after a short grace period.
- [x] The home hero (and every browse page's hero) fades in a muted autoplaying trailer over its
      backdrop image a moment after a title becomes featured, and swaps to the next title's own
      trailer (or the image, if it fetches slower) when the hero rotates.
- [x] No new CSP origins: both reuse `https://www.youtube-nocookie.com`, already allow-listed in
      `frame-src` for the player page.

## Notes / decisions

- **Where the code lives:**
  - `src/lib/trailerUtils.ts`: `fetchTrailerKey(id, mediaType)` and `trailerEmbedUrl(key)`.
    Duplicates `playbackApi.ts`'s small trailer-ranking rule rather than importing across the
    features boundary (ADR-2) — two different call sites need it: a shared component
    (`TitleCard`'s hover card) and a different feature (`catalog`'s `Hero`).
  - `src/components/HoverCard/HoverCard.tsx`: the popup itself, rendered through a
    `createPortal` to `document.body` so it can grow past its `TitleRow`'s
    `overflow-x: auto` clip. Positioned with `position: fixed` from the card's own
    `getBoundingClientRect()`, captured by `TitleCard` at the moment the open delay elapses.
  - `TitleCard.tsx` owns the open/close timers (500ms open, 250ms close) and shares them with
    the popup's own hover handlers, so moving the pointer from the card onto the larger popup
    doesn't flicker it shut.
  - `Hero.tsx` fetches a trailer for whichever title is currently featured and fades it in over
    the existing backdrop `<div>`; the backdrop image is the fallback while that fetch is in
    flight or comes back empty.
- Reuses `tmdb.ts`'s in-memory request cache: hovering a title the player page already fetched
  (or vice versa) costs nothing extra.
- Not done (out of scope for this slice): episode info / progress bars for TV titles (TMDB's
  video metadata doesn't carry episode numbers for a show's trailer), and a real thumbs up/down
  signal (the buttons are presentational, matching Netflix's layout, with no backing store yet).
