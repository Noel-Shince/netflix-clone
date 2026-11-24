# 23 — Dead VidKing fallback + silent Comet 403s

**Goal:** fix two things Noel hit live: the VidKing iframe fallback is dead (`www.vidking.net`
doesn't resolve), and a Comet resolver 403 (expired/invalid debrid token) silently fell through to
that dead fallback instead of telling the viewer what's wrong.

## What changed

- **`vidsrc.ts` replaces `vidking.ts`.** The fallback iframe now embeds
  [vidsrc.to](https://vidsrc.to), which was live at the time of writing (`vidsrc.sh` also still
  resolves and was used before slice 21, but vidsrc.to's URL pattern — IMDB id plus
  `/season/episode` in the path — matches this app's own episode selector the same way VidKing's
  did, where vidsrc.sh's doesn't take season/episode at all). Movie: `/embed/movie/{imdbId}`. TV:
  `/embed/tv/{imdbId}/{season}/{episode}`.
  - Unlike VidKing's (documented in a third-party write-up), vidsrc.to's postMessage event shape
    is unconfirmed — its embed page loads the player from a bundled script this sandbox couldn't
    execute to inspect. `parsePlayerEvent` stays defensive (returns `null` for anything that
    doesn't match the expected shape), so an unrecognised message is silently ignored rather than
    breaking playback; this may mean the fallback iframe just doesn't contribute progress updates
    until the real shape is confirmed against the live embed and the parser is adjusted.
  - Needs the title's **IMDB id**, not the TMDB id VidKing took — `useResolvedStreams` already
    looked this up (`services/externalIds.ts`) to call the stream resolver, so it's now threaded
    out through `StreamsState` instead of being resolved a second time.
- **`services/streamResolver.ts`: `resolveStreams` returns a tagged result**
  (`{ status: 'ok' | 'auth-error' | 'error' }`) instead of a bare array. A 401/403 from Comet means
  the configured Real-Debrid/TorBox token is missing, invalid, or expired — a subscription
  problem, not a transient resolver failure — so it's reported as `'auth-error'` instead of being
  folded into the same "no streams" bucket as a timeout or an empty response.
- **`PlayerPage.tsx`: `StreamsState` gets an `'auth-error'` branch**, shown as its own notice
  ("Streaming requires an active Real-Debrid or TorBox subscription. Please check your settings."
  with a link to `/settings`) instead of falling back to the iframe. The existing `'unavailable'`
  branch now carries the IMDB id (or `null`, when TMDB has none for the title) needed to build the
  vidsrc.to URL; with no IMDB id, there's truly nothing to fall back to, so that shows a plain
  "not available to stream right now" notice instead of an iframe with a broken `src`.
- `firebase.json`: CSP `frame-src` swaps `vidking.net` for `vidsrc.to`.
- `e2e/journey.spec.ts`: the one assertion on the fallback iframe's `src` now expects `vidsrc.to`.

## Deliberately left alone

- **No new free/no-debrid resolver was wired up as a second fallback tier.** The brief considered
  it, but every no-auth embed source (vidsrc.to included) is itself a third-party aggregator of
  unknown provenance, same trust level as VidKing was — swapping the dead one for a live one is
  the actual fix; stacking more of them doesn't add reliability, just more CSP surface and more
  domains to keep re-verifying as they inevitably die too.
- **Comet's own cause of the 403 (Noel's Real-Debrid account being non-premium) is out of scope**
  — that's an account the app can't fix from here. The message points at Settings, where the token
  is pasted (`lib/streamSettings.ts`).
