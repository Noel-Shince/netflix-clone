# 04 — Video player page

**Goal:** clicking any title on the home page (a row card or the hero's Play button) opens
`/player/:id`, which plays that movie's trailer in an embedded YouTube player, and shows a clear
"no trailer" screen when TMDB has none.

## Acceptance criteria

- [ ] **Route:** `/player/:id` renders `PlayerPage` from `src/features/playback`. A non-numeric
      or non-positive `:id` renders the existing not-found page without calling TMDB.
- [ ] **Entry points:** every title card in every row is a link to `/player/:id` (keyboard
      focusable, visible focus ring). The hero's **Play** button becomes a link to the featured
      title's player page. **More Info** stays visual (no detail modal in v1).
- [ ] **One request per title:** the page loads `/movie/{id}?append_to_response=videos`
      through the existing `tmdbGet` in `src/lib/tmdb.ts` (same auth, retry, timeout and cache).
      No second TMDB client and no direct `fetch`.
- [ ] **Video choice:** from the YouTube videos only, prefer an official Trailer, then any
      Trailer, then a Teaser, then any other YouTube video (clip, featurette). English and
      no-language videos are requested (`include_video_language=en,null`). Non-YouTube sites
      (Vimeo) are ignored.
- [ ] **Player:** a 16:9 `<iframe>` on `youtube-nocookie.com` (privacy-enhanced mode) with
      `autoplay=1`, `rel=0` (related videos from the same channel only), fullscreen allowed and a
      descriptive `title` attribute. It fills the width on phones and is capped so it fits the
      viewport height on desktop.
- [ ] **Info under the player:** movie title, release year, and the video's name and type
      (e.g. "Official Trailer · Trailer"), plus the synopsis.
- [ ] **No trailer fallback:** if TMDB returns the movie but no usable YouTube video, the page
      shows the movie's backdrop (or the gradient placeholder), title, synopsis and the message
      "No trailer available for this title", with a link back to home. No broken or empty
      iframe is rendered.
- [ ] **Errors:** TMDB `404` shows "We couldn't find this title" with a link home. Any other
      failure (network, timeout, rate limit, missing token) shows the standard message with
      **Retry** and a link home. A loading skeleton shows while the request is in flight.
- [ ] **Back button:** a back arrow returns to the previous page; when the player was opened
      directly (no in-app history), it goes to `/` instead of leaving the site.
- [ ] Browser tab title shows the movie name while on the player page.
- [ ] `npm run lint`, `format:check`, `type-check` and `build` pass in CI.

## Out of scope for this slice

- Real movie streaming. TMDB has no video files; trailers via YouTube are the PRD's stated
  substitute (PRD §4).
- Route protection: logged-out users can still open `/player/:id`. That is slice 05.
- A "More Info" modal or a separate detail page.
- TV shows (rows only contain movies).
- Choosing between several trailers, captions/language selection, or a custom player UI over
  YouTube's controls.
- Automated tests (no test runner yet; same as slice 03).

## Notes / decisions

- **Tutorial comparison.** The tutorial's player calls `/movie/{id}/videos`, takes
  `results[0]` and embeds `youtube.com/embed/{key}` with a back arrow and the video's name,
  type and publish date. `results[0]` is often a featurette or behind-the-scenes clip, and it
  crashes or shows a blank frame when the list is empty. Here the trailer is picked
  deliberately and the empty case has its own screen.
- **`append_to_response=videos` instead of `/movie/{id}/videos`.** The videos endpoint does not
  return the movie's title, synopsis or artwork, which the fallback screen needs. Appending
  videos to the movie-details call gets everything in one request instead of two.
- **`youtube-nocookie.com`.** YouTube's privacy-enhanced embed domain: no tracking cookies
  until the viewer presses play. Same player, same API.
- **Autoplay.** Requested, but browsers may block autoplay with sound. When blocked, YouTube
  shows its normal play button; nothing breaks.
- **Endpoint knowledge lives in the feature.** `tmdb.ts` stays a generic client; the movie
  details call and its mapping live in `features/playback/api/playbackApi.ts`, mirroring
  `features/catalog/api/catalogApi.ts` from slice 03.
- **Route path helper.** `catalog` links to `playback` through `playerPath(id)` in
  `src/lib/routes.ts`, so features do not import each other (ADR-2).
