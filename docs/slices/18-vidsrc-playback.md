# 18 — Real playback via vidsrc.sh

The player page played a title's **YouTube trailer** (TMDB has no movie files; see the original
PRD note in the old `PlayerPage.tsx` header). This slice swaps that stage for an actual
movie/TV embed from [vidsrc.sh](https://vidsrc.sh/vidsrc/docs/), which needs no API key.

## What changed

- `api/playbackApi.ts` now fetches TMDB's `external_ids` (instead of `videos`) alongside the
  title details, to get an IMDB id — vidsrc.sh's own examples embed by IMDB id
  (`/embed/movie/tt1300854`), with the numeric TMDB id as a documented fallback when TMDB has
  none. `PlayableTitle.imdbId` replaces the old `trailer` field.
- `vidsrc.ts` (new): builds the embed URL (`vidsrcEmbedUrl`) and parses the player's
  `postMessage` events (`parsePlayerEvent`), per the vidsrc.sh docs:
  - Movie: `/embed/movie/{imdbId|tmdbId}`.
  - TV: `/embed/tv/{imdbId|tmdbId}` with no season/episode — this app has no episode picker UI
    yet, so vidsrc.sh's own picker takes over, and it resumes the viewer's last-watched episode
    itself. `autonext=1` is set so an episode auto-advances to the next.
  - `startAt=<seconds>` seeds the resume point (see below).
  - Player events arrive as `{ type: 'PLAYER_EVENT', data: { player_status, player_progress,
player_duration, ... } }` from origin `https://vidsrc.sh`; anything else is ignored.
- `lib/watchProgress.ts` (new): one Firestore doc per title under the active profile
  (`users/{uid}/profiles/{slot}/watchProgress/{mediaType}-{tmdbId}`), mirroring `myList.ts`'s
  owner-set-from-outside pattern. `PlayerPage` listens for `PLAYER_EVENT` and saves progress —
  throttled to at most one write per 15s for routine "still playing" pings (vidsrc.sh fires one
  roughly every 5s), but every pause/seek/completion saves immediately.
- Resume point on open: the larger of (a) the hover-preview handoff already wired up in slice 16
  (`?t=` query param, elapsed trailer-preview time) and (b) any saved Firestore progress for that
  title — so switching devices mid-movie still resumes correctly. A completed title always
  starts over rather than reopening at the end.
- `firebase.json`: CSP `frame-src` now allows `https://vidsrc.sh` and `https://*.vidsrc.sh`.
- `firestore.rules`: added a `watchProgress` block (owner-only, same validation style as
  `myList`'s). `ProfileProvider.deleteProfile` now also clears a deleted profile's progress docs
  (new `clearWatchProgress`), so a reused profile slot doesn't inherit stale resume points.
- Loading state redesigned to match Noel's real-Netflix reference screenshot: plain black stage
  with a centered red spinner, replacing the old skeleton placeholder.

## Deliberately left alone

- **YouTube trailers elsewhere are untouched** — the hover-preview popup and hero banner
  (`lib/trailerUtils.ts`) still autoplay a muted YouTube trailer; only the full player page's
  main stage changed.
- **No in-app episode picker.** vidsrc.sh's own TV picker (and its own remembered position per
  episode, separate from this app's Firestore progress doc) stands in until a slice adds one.
- **The player's on-screen controls (play/pause, seek, volume, captions, fullscreen) are
  vidsrc.sh's own**, rendered inside a cross-origin `<iframe>` — this app has no DOM access into
  it and cannot restyle them to match Netflix's own control bar. Only the app-level loading
  spinner (shown before the iframe is even requested) and the page chrome around the stage
  (back button, title, synopsis, My List button, "More Like This") are this app's to style.
- Not verified against a live vidsrc.sh/TMDB request in this sandbox (outbound network is
  blocked here, same constraint noted in slices 15–17) — only type-check/lint/format/build ran.
  Noel should confirm actual playback on the live site after merge.
