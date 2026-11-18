# 09 — Movie recommendations

**Goal:** after opening a few titles, the home page shows rows picked for that user, and every
player page suggests related movies.

## Acceptance criteria

- [x] **Watch history:** opening a title on `/player/:id` records `{ id, name, watchedAt }`,
      newest first, deduplicated, capped at 20 (`src/lib/watchHistory.ts`). Stored in
      localStorage under the signed-in user's Firebase uid, so accounts on one browser stay
      separate. Corrupt or blocked storage behaves as "no history".
- [x] **More Like This (player):** a row under the title details lists TMDB's
      `/movie/{id}/recommendations`, falling back to `/movie/{id}/similar` when that is empty.
      The row is hidden when both are empty. Clicking a card opens that title at the top of the
      page.
- [x] **Top Picks for You (home):** shown only when the user has history. Blends the related
      lists of the 5 most recent watched titles (algorithm below), drops already-watched titles,
      shows up to 20.
- [x] **Because you watched _X_ (home):** related titles for the most recent watch, minus
      watched titles. Shown only with 2+ watched titles (with 1 it would repeat Top Picks).
- [x] **No fake personalisation:** with no history, neither personal row renders. The old
      "Top Picks for You" row, which was really TMDB's weekly trending list, is renamed
      **Trending This Week**.
- [x] **Failure handling:** each row loads and fails on its own with the usual Retry. In Top
      Picks, a seed whose request fails is skipped; the row only errors if every seed fails.
- [x] `TitleRow` moved to `src/components/` because two features now use it (ADR-2 rule).
- [x] `npm run lint`, `format:check`, `type-check` and `build` pass.

## The ranking (`blendRecommendations` in `src/lib/recommendations.ts`)

TMDB does item-to-item matching ("people who liked X also liked Y"). The app does the
per-user part: for the i-th most recent watched title (i = 0 is newest) and a candidate at
position p in that title's related list,

```
score += 0.75^i / (1 + p / 5)
```

summed over every seed that lists the candidate. A movie several of your titles point to beats
one a single title ranks first, and recent watches outweigh old ones. Ties go to titles with
artwork, then to the newest seed's order.

## Limitations (deliberate for this slice)

- "Watched" means "opened the player". TMDB only has trailers, so there is no watch time,
  completion or rating signal. A thumbs up/down would be a stronger signal and is a natural
  follow-up.
- History is per browser, not per account across devices. Moving it to Firestore fits with the
  profiles work, which needs a per-profile store anyway (and Firestore enabled in the Firebase
  console).
- No collaborative filtering across Noelflix users: there are too few users for it to beat
  TMDB's own recommendations, which already come from TMDB's user base.
- Up to 5 extra TMDB requests on the home page for Top Picks (cached for the session by
  `tmdbGet`), well inside TMDB's rate limit.

## How it was checked

Playwright against the dev server with Firebase Auth, TMDB and images mocked (the cloud sandbox
reaches none of them): sign in through the real form, confirm no personal rows with empty
history, open two titles, confirm both personal rows appear in the right order and history is
stored under the uid, check the player scrolls to top when a More Like This card is clicked,
and check for horizontal overflow at 390px. The ranking was checked with a scratch script
(shared seeds beat a single top rank, exclusion, recency order, dedupe, limit). Live TMDB data
was not verified from the sandbox.
