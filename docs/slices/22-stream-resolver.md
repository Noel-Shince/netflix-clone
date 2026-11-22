# 22 — Stream resolver infrastructure

**Goal:** the player plays through a custom HLS.js player backed by a pluggable stream resolver,
with a documented placeholder for Noel's own resolver API, instead of only the VidKing iframe.

## Acceptance criteria

- [x] `src/services/externalIds.ts`: TMDB id → IMDB id, cached in Firestore (`externalIdsCache`).
- [x] `src/services/streamResolver.ts`: `resolveStreams(imdbId, type, season?, episode?, configToken?)`,
      with a clearly marked placeholder for `RESOLVER_BASE_URL` and mock data (a public test HLS
      stream) until it's set, so the player works end to end immediately.
- [x] Settings → Streaming (`/settings`): paste a resolver API key/token, saved to
      `users/{uid}/settings/preferences.streamApiKey`.
- [x] `src/components/VideoPlayer`: custom HLS.js player — play/pause, seek with a buffered
      indicator, time display, volume/mute, playback speed, quality selector (from the resolver's
      response), audio track selector (when the stream has more than one), captions toggle,
      fullscreen, auto-hiding controls.
- [x] `PlayerPage.tsx` uses the resolver + custom player when it returns streams, and falls back to
      the existing VidKing iframe (slice 21) when it returns none — a broken or empty resolver
      response never breaks playback.
- [x] TV season/episode selector (slice 21) carried over unchanged; picking an episode re-resolves
      streams for it.
- [x] Progress tracking (`lib/watchProgress.ts`, unchanged) now also saves from the custom player's
      native `<video>` events, same throttling (~every 10s, immediate on play/pause/seek/end).

## Out of scope for this slice

- A real resolver endpoint — `RESOLVER_BASE_URL` in `streamResolver.ts` ships empty; Noel pastes
  his own there (see the comment block at the top of that file for the exact contract).
- Auto-advance to the next episode on the custom player when one ends (VidKing's fallback iframe
  still does this on its own; the custom player doesn't yet, since the resolver can't know what
  the "next" episode's streams are without being asked again).
- Per-stream subtitle files uploaded by the resolver (captions only come from the HLS manifest's
  own subtitle tracks, via hls.js).

## Notes / decisions

- **Why a separate `src/services/` directory, not `lib/`:** these two modules are the pluggable,
  user-configured half of playback — IMDB-id lookup and the resolver — as opposed to `lib/`'s
  app-wide infrastructure (Firebase, TMDB, env). Keeping them apart makes it obvious which file to
  hand Noel's resolver code to. Both still follow ADR-2 (a feature may import `lib/`, never
  another feature); `services/` is the same kind of shared, non-UI, non-feature code.
- **`externalIdsCache` is a shared collection, not per-account:** a TMDB id's IMDB id never
  depends on who's asking, so caching it once for everyone (instead of once per account) avoids
  thousands of accounts duplicating the same lookup. `firestore.rules` only requires the reader/
  writer be signed in, not that they own the doc.
- **Stream resolver response shape:** a flat JSON array of `{ url, name, quality, audioTracks? }`
  (see the type in `streamResolver.ts`). Each entry is validated field-by-field before use —
  external HTTP responses are not trusted blindly.
- **Why quality switching swaps the whole stream, not an HLS level:** the resolver's response is a
  list of *separate* stream URLs (e.g. different mirrors/qualities), not one adaptive manifest
  with multiple renditions, so "quality" in the UI re-attaches a new Hls instance to a different
  `StreamResult`, preserving the current position and play state (`VideoPlayer.tsx`,
  `pendingResumeRef`/`wasPlayingRef`).
- **CSP:** `connect-src` and `media-src` now include `https://test-streams.mux.dev` for the mock
  stream. **When Noel points `RESOLVER_BASE_URL` at a real endpoint, its domain (and whatever
  domain actually serves the `.m3u8`/segment files, if different) must be added to both
  directives in `firebase.json`, or the browser's CSP will silently block every request to it.**
