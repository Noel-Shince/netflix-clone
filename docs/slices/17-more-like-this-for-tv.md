# 17 — "More Like This" for TV shows

**Bug report, 2026-11-18:** opening the player from the hero banner or a card plays the trailer
fine, but "the movie recommendations below is not present now as it was before."

## Root cause

Not a regression in [slice 16](16-hover-preview-click-resume.md)'s click/resume work — the
player's "More Like This" row has been movie-only since [slice 09](09-recommendations.md):

```tsx
{title?.mediaType === 'movie' && <MoreLikeThis id={title.id} />}
```

Slices 15–16 made the hero banner and every card's hover popup clickable as a whole, which made
it far easier to open a **TV** title than before (the TV Shows page's own hero is TV-only, and
New & Popular's hero and several of its rows are mixed movie/TV) — surfacing a gap that was
always there, just rarely hit by click.

## Fix

Extended `fetchRelatedTitles` (`lib/recommendations.ts`) to take a `mediaType`, so "More Like
This" now works for TV using `/tv/{id}/recommendations` → `/tv/{id}/similar`, the same pattern
the movie path already used. `PlayerPage.tsx` passes `title.mediaType` through and drops the
movie-only condition entirely — the row now renders (and hides on an empty result, same as
before) for either media type.

**Deliberately left alone:** the home page's own personalised rows ("Because you watched...",
blended picks) stay movie-only. Those read `watchHistory.ts`, which only ever records movies
(TMDB ids are per media type, and that store was never designed to hold a mix) — extending that
is a bigger, separate change than this bug report asked for.

**A sharp edge caught while making this change:** `fetchPicksFor` used to call
`seeds.map(fetchRelatedTitles)` directly. With `fetchRelatedTitles` now taking a second
parameter, `Array.prototype.map`'s own `(value, index, array)` callback shape would have passed
each seed's *array index* as `mediaType` — wrong value, and TypeScript catches the type
mismatch. Changed to an explicit `seeds.map((id) => fetchRelatedTitles(id, 'movie'))`.
