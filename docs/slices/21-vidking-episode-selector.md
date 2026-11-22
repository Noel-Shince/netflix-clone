# 21 — VidKing player with a season/episode selector

**Goal:** the player plays through [VidKing](https://www.vidking.net) instead of vidsrc.sh, and
TV shows get an in-app season/episode picker instead of relying on the embed's own.

## What changed

- `vidking.ts` (new, replaces `vidsrc.ts`): builds the embed URL and parses the player's
  `postMessage` events.
  - Movie: `/embed/movie/{tmdbId}`. TV: `/embed/tv/{tmdbId}/{season}/{episode}` — VidKing takes
    the TMDB id directly, so the IMDB lookup slice 18 added (`PlayableTitle.imdbId`,
    `external_ids`) is gone.
  - Query params: `color=e50914` (brand match), `autoPlay=true`, and for TV `nextEpisode=true`
    (lets VidKing auto-advance past an episode's end) and `episodeSelector=false` (this app's own
    selector is the picker now, so VidKing's own stays off to avoid two pickers on screen).
    `progress=<seconds>` seeds the resume point, same role as vidsrc.sh's `startAt`.
  - Player events arrive as `{ type: 'PLAYER_EVENT', data: { event, currentTime, duration,
    season, episode, ... } }`. VidKing has no public docs; this shape is taken from a third-party
    integration write-up (BismayDey/BLACKSTREAM) and isn't independently confirmed — see the
    caveat in `vidking.ts`'s header. Notably that write-up never states the postMessage origin, so
    `parsePlayerEvent` matches by `event.source` (the iframe's own `contentWindow`) instead, which
    needs no origin string and can't be spoofed by another frame.
- `api/episodesApi.ts` (new): one TV season's episode list from TMDB's
  `/tv/{id}/season/{season_number}` (no API covers "every season at once").
  `api/playbackApi.ts`'s `fetchPlayableTitle` now also returns `seasons` (season number, name,
  episode count) for TV, filtered to seasons with at least one episode (so "Specials" with none
  don't show an empty tab).
- `PlayerPage.tsx`: TV shows now render a `SeasonEpisodeSelector` below the title info — season
  tabs, then an episode list (thumbnail, number, name, synopsis). Clicking an episode reloads the
  player at that episode (new iframe `key`, so the embed gets a clean start rather than trying to
  navigate in place). Browsing a season to look at its episodes doesn't change playback; only
  clicking one does.
  - The episode actually playing is tracked in `playing` state, seeded once from the saved resume
    point (defaulting to S1E1), and kept in sync when VidKing's own `nextEpisode` auto-advances
    past an episode's end — its postMessage events report the new season/episode, and the
    selector highlight follows along.
- `lib/watchProgress.ts`: the per-title Firestore doc gained `season`/`episode` (nullable, always
  written — `null` for movies) so a show resumes at the episode it was actually paused on, not
  always S1E1. The saved resume seconds are only applied when the episode about to load matches
  the one they were saved for; switching to a different episode always starts from 0.
- `firestore.rules`: `watchProgress`'s field allow-list and validation extended for `season` /
  `episode`.
- `firebase.json`: CSP `frame-src` now allows `https://www.vidking.net` (and the bare
  `vidking.net`) instead of `vidsrc.sh`.

## Deliberately left alone

- **YouTube trailers elsewhere are untouched** (hover preview, hero banner) — only the full
  player page's main stage changed.
- **The player's on-screen controls are VidKing's own**, inside a cross-origin `<iframe>` — same
  constraint as vidsrc.sh in slice 18. Only the app-level loading spinner, the page chrome, and
  the new season/episode selector are this app's to style.
- Not verified against a live VidKing/TMDB request in this sandbox (outbound network is blocked
  here, same constraint noted since slice 15) — only type-check/lint/format/build ran, plus a web
  fetch of the third-party VidKing write-up for the URL/postMessage shape. Noel should confirm
  actual playback, episode switching, and auto-advance on the live site after merge, since the
  postMessage field names in particular are unverified against VidKing itself.
