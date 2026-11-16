# 01 — Home page UI

**Goal:** a visitor opening `/` sees a Netflix-style browse page (navbar, hero banner, rows of
titles, footer) built from typed placeholder data, so slice 03 only has to swap the data source.

## Acceptance criteria

- [ ] React Router is installed and `/` renders the home page; any unknown path shows a simple
      "page not found" screen with a link home.
- [ ] **Navbar** (shared, `src/components/Navbar`): wordmark, primary links (Home, TV Shows,
      Movies, New & Popular, My List, Browse by Languages), search / notifications / profile icons
      on the right, and a profile menu that opens on hover _and_ keyboard focus. The bar is
      transparent over the hero and turns solid once the page is scrolled.
- [ ] **Hero** (`features/catalog`): full-width banner with a featured title, a short synopsis, and
      Play / More Info buttons. Text stays readable over the background (gradient overlay).
- [ ] **Title rows** (`features/catalog`): one row overlapping the bottom of the hero plus four
      rows below it (Blockbuster Movies, Only on Netflix, Upcoming, Top Picks for You). Each row
      scrolls horizontally with touch / trackpad / shift+wheel, and on pointer devices also with
      previous / next buttons.
- [ ] **Footer** (shared, `src/components/Footer`): social icons, link grid, copyright line, a
      TMDB attribution line and a "not affiliated with Netflix" disclaimer (PRD §4).
- [ ] Placeholder data lives in one typed module (`features/catalog/data/mockTitles.ts`) whose
      `CatalogTitle` type is the contract slice 03 will map TMDB results onto. Components never
      import mock data directly except through the home page.
- [ ] Nothing overflows horizontally at 360px wide; the navbar collapses its text links below
      900px (a proper mobile menu is slice 07's call).
- [ ] Interactive elements are real `<button>` / `<a>` elements with accessible names; icons are
      `aria-hidden`.
- [ ] `npm run lint`, `format:check`, `type-check` and `build` pass in CI.

## Out of scope for this slice

- Real movie data or any network call (slice 03).
- Clicking a card or Play opening a player (slice 04). Cards are not links yet.
- Login page, auth, sign-out, route protection (slices 02 and 05). The "Sign out" menu item is
  rendered but disabled.
- Search, notifications, profiles, "My List" — out of scope for v1 entirely (PRD §4). Their icons
  and links are visual only.
- Final mobile navigation (hamburger menu) — slice 07.

## Notes / decisions

- **No copyrighted image assets.** The tutorial uses a Netflix logo PNG, a hero still and card
  thumbnails from its asset pack. This slice uses a text wordmark (`src/components/Logo`) and
  generated gradient placeholders instead. Real artwork arrives with TMDB images in slice 03; the
  logo is a one-file swap once PRD Q3 (branding) is decided.
- **Deliberate deviation — row scrolling.** The tutorial converts vertical mouse-wheel movement into
  horizontal row scrolling with `preventDefault()`. That hijacks page scroll whenever the cursor is
  over a row (most of the page), and needs a non-passive listener. This slice uses native
  horizontal overflow with scroll-snap plus explicit prev / next buttons instead.
- **Navbar and Footer live in `src/components/`**, not `features/catalog`, because the player
  and other logged-in pages will reuse them (ADR-2). Hero and title rows are catalog-only.
- Router: `react-router` (v8). Declarative `<BrowserRouter>` / `<Routes>`, which is all this app
  needs; no data-router loaders. `/login` and `/player/:id` are added by their own slices.
