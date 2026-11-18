# 16 — Whole-card click + resume from the preview

**Goal:** two follow-ups to [slice 15](15-hover-preview.md)'s hover preview, from owner review.

Owner feedback, 2026-11-18:

1. Clicking anywhere on a hovered card or the hero banner should open the player — not just the
   small Play icon.
2. If the muted preview has already been playing (5 seconds, 10 seconds, however long), opening
   the full player from there should resume at that point rather than restarting from 0:00.

## Acceptance criteria

- [x] Clicking anywhere on an open HoverCard popup — the trailer/poster, the title text, the
      panel background — opens the player, the same as clicking Play. The Play icon's own
      behaviour is unchanged. + My List and the thumbs buttons keep their own click instead of
      also navigating.
- [x] Clicking the hero banner's backdrop (including the autoplaying trailer) opens the player,
      the same as Play / More Info. The caption's own buttons and links still take any click
      that lands on them first.
- [x] Opening the player from either place resumes the trailer at roughly how long the muted
      preview had been playing, instead of restarting at 0:00.
- [x] Opening the player any other way (search results, "More Like This", My List, a direct
      link) still starts at 0:00, unaffected.

## Notes / decisions

- **The iframe problem:** a click on an `<iframe>` never bubbles to the parent document's own
  click handlers — it's a different document. A plain "put an onClick on the wrapping div"
  wouldn't fire for clicks on the trailer itself, only on whatever (if anything) isn't covered
  by it. Both HoverCard and Hero instead lay a transparent `<Link>` over the trailer area as a
  sibling painted after the iframe, so it physically receives that click. The resulting hit-test
  order (backdrop/iframe → transparent overlay → the caption's own buttons, each layer painted
  after — and so on top of — the one before it) needs no z-index: plain DOM order already gives
  the caption's buttons first claim on their own area, and the overlay the rest.
- **No real playback position:** neither preview wires in the YouTube IFrame JS API (would need
  `enablejsapi=1` plus a new CSP `script-src` origin for `www.youtube.com`, just to read back a
  timestamp). Since the preview is muted, chromeless (`controls=0`) and autoplaying with nothing
  to pause or seek it, "how long has this preview been on screen" and "how far into the trailer
  is it" are the same number — tracked with a plain `Date.now()` captured when the trailer key
  resolves (`HoverCard`'s `startedAtRef`, `Hero`'s `trailerStartedAtRef`), read back on click.
- **Plumbing:** `lib/routes.ts`'s `playerPath()` gained an optional third `resumeSeconds` arg,
  appended as `?t=<seconds>` (`RESUME_PARAM`). `PlayerPage` reads it via `useSearchParams` and
  adds `&start=<seconds>` to its own YouTube embed — a standard embed parameter, no API needed
  on that side either. Every other caller of `playerPath()` is unaffected (the arg is optional).
- Modified clicks (ctrl/cmd/shift/alt, or anything but the primary button) fall through to the
  link's own default navigation instead of the resume-aware one, so "open in new tab" still
  works — just without the resume offset, which is an acceptable trade _only_ visible on a
  deliberately-modified click.
