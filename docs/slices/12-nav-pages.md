# 12 — Working nav: browse pages, My List, languages, notifications

**Goal:** every item in the top nav does something. A signed-in user can browse TV shows, movies
and what's new, save titles to My List, browse by original language, and open a notifications
menu.

## Acceptance criteria

- [x] **Shows** (`/tv`), **Movies** (`/movies`) and **New & Popular** (`/latest`) are browse pages
      with their own hero and rows, sharing the home page layout (`BrowsePage`).
- [x] TV shows play: cards link to `/player/tv/:id`, which loads `/tv/{id}` details and trailer.
      Movie URLs (`/player/:id`) are unchanged.
- [x] **My List** (`/my-list`): "+ My List" on the hero, the player page and every card (hover on
      desktop, always visible on touch) saves to Firestore (Lite SDK, see ADR-12); the page shows a grid, newest first,
      with Remove buttons and an empty state.
- [x] **Browse by Languages** (`/languages?lang=ko`): picker of 12 original languages; four rows
      (popular / top-rated movies and TV) from TMDB `discover`. The choice is in the URL.
- [x] **Bell**: dropdown of new and upcoming releases (TMDB `/movie/upcoming`) linking to the player,
      with an unread badge cleared on open (seen ids in `localStorage`).
- [x] Below 1100px the links collapse into a **Browse** dropdown, so every page is reachable on
      phones and tablets (before this, links were simply hidden under 900px).
- [x] New page navigation starts at the top of the page.
- [x] Design pass after Netflix's current web UI (owner's reference screenshots): pill nav links with
      a filled pill for the current page; inset, rounded hero card with a "Movie / Series • year"
      line; pill-shaped hero buttons; rounder cards with hover Play / + actions.

## Out of scope for this slice

- **Search** (separate thread), **profiles** (separate thread; My List moves under the active profile
  once both merge, see Notes), and "Continue Watching" (needs watch history).
- A real "More Info" modal: More Info opens the player page, which holds the title details.
- Muted autoplay trailer in the hero, Teleparty, Games, Top 10 / "New Episode" badges.
- Real push notifications: there is no backend (ADR-5).

## Notes / decisions

- **Firestore, not localStorage, for My List,** so the list follows the account across devices.
  This reverses ADR-10's "no Firestore" now that the PRD scope grew; see ADR-12.
- **Owner setup (one-time):** Firebase console → Build → Firestore Database → Create database
  (production mode, any region), then Rules → paste `firestore.rules` → Publish. Until then, My
  List buttons stay disabled and the page says it couldn't load. The deploy workflow only deploys
  Hosting, so rule changes are published by hand (or `firebase deploy --only firestore:rules`).
- **Per profile:** `lib/myList.ts` takes an owner document path. `App`'s `MyListOwner` sets it to
  the active profile, `users/{uid}/profiles/{slot}`, so each profile has its own list. Deleting a
  profile clears its list (`clearMyList`), because slots are reused.
- **Language means original language** (`with_original_language`), not available dubs or
  subtitles, which TMDB does not expose per region.
- Top-rated language rows require 200+ votes, so a title with three 10/10 votes doesn't top the row.
