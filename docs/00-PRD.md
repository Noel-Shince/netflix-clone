# 00 — Product Requirements (PRD)

|                     |                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------- |
| **Status**          | Approved                                                                                          |
| **Owner**           | Noel (product, scope, review)                                                                     |
| **Implementer**     | AI threads, one per slice                                                                         |
| **Source material** | ["Full Stack Netflix Clone using React JS & Firebase" — GreatStack](https://youtu.be/YQQD67N5pi0) |
| **Last updated**    | 2026-11-16                                                                                        |

## 1. Problem and goal

This is a portfolio project. It has two goals, in this order:

1. **Show the process.** Demonstrate that a developer with fair coding knowledge can direct an AI to
   build a clean, documented full-stack app, owning scope, architecture and review rather than
   typing the code. The repo history (specs → small PRs → merges) is part of the deliverable.
2. **Ship a convincing product.** A Netflix-style browsing UI where a user can sign up, log in,
   browse real movie data in rows, and play a title's trailer.

Success means a reviewer can open the repo, understand what was built and why within five
minutes, run it locally in under ten, and see a working app.

## 2. Users

- **Portfolio reviewers** (recruiters, engineers): skim the README, docs and PR history.
- **Demo user**: signs up with email/password, browses, plays trailers.

## 3. Features (in the tutorial's build order)

Each row becomes one vertical slice: one spec in `docs/slices/`, one branch, one PR.

| #   | Slice                      | What the user gets                                                                                  | Feature folder |
| --- | -------------------------- | --------------------------------------------------------------------------------------------------- | -------------- |
| 01  | Home page UI               | Routing, navbar, hero banner, footer, title rows with placeholder data                              | `catalog`      |
| 02  | Login page UI              | Sign-in / sign-up form (UI only, toggles between the two modes)                                     | `auth`         |
| 03  | TMDB movie data            | Title rows show real movies by category (now playing, popular, top rated, upcoming)                 | `catalog`      |
| 04  | Video player page          | Clicking a title opens `/player/:id` and plays its trailer from TMDB's video list                   | `playback`     |
| 05  | Firebase login/register    | Real sign up, log in, log out; logged-out users are redirected to `/login`; readable error messages | `auth`         |
| 06  | Login loading state        | Spinner/disabled button while auth requests are in flight                                           | `auth`         |
| 07  | Responsive pass            | Audit and fix layouts at phone, tablet and desktop widths                                           | all            |
| 08  | Deploy to Firebase Hosting | Live, linkable demo URL; deploy documented in the README                                            | —              |

Note on slice 07: in the tutorial, responsive styling comes last. Here each slice is expected to be
reasonably responsive when it merges (otherwise `main` is not really "working"); slice 07 is a
final audit, not the first time mobile is considered.

Note on slice 08: added after owner approval (see §5) — not in the original tutorial. Comes last
because it deploys whatever is on `main` once slices 01–07 are merged.

## 4. Scope

**In scope**

- Email/password authentication with Firebase Auth.
- Read-only movie data from the TMDB API.
- Trailer playback via TMDB's video metadata (YouTube embeds). Not real streaming.
- Responsive layout down to 360px wide.
- TMDB attribution in the footer/README, which TMDB's API terms require.
- A "not affiliated with Netflix" disclaimer in the README and footer.

**Out of scope (explicitly)**

- Real video streaming, DRM, or hosting any video content.
- Payments, subscriptions, plans.
- Multiple profiles, "My List", watch history, recommendations.
- Search.
- Social login (Google, etc.), password reset, email verification.
- A custom backend server. Firebase and TMDB are called from the browser.
- Automated end-to-end tests. (Lint, format and build checks run in CI.)

Anything above can be proposed later as a new slice, but it is not part of v1.

## 5. How this project differs from the tutorial

The aim is "same product, better engineering", not a 1:1 copy.

**Decided (in the scaffold):**

1. **Vite instead of Create React App.** CRA was officially deprecated by the React team in
   February 2025. Vite is the current default. If the tutorial uses CRA, this is a deliberate
   deviation; if it already uses Vite, nothing changes. Either way the React code is the same.
2. **Feature-based folders** (`features/auth`, `features/catalog`, `features/playback`) instead of
   a flat `components/` + `pages/` layout. Scales better and makes each slice's diff self-contained.
3. **TypeScript instead of JavaScript** (owner decision, 2026-11-16). See ADR-7 in
   [`01-ARCHITECTURE.md`](01-ARCHITECTURE.md).
4. **No keys in source code.** All TMDB and Firebase config comes from `.env.local` through one
   module (`src/lib/env.ts`). Tutorials commonly paste keys directly into components; that is the
   single most common red flag in portfolio repos.
5. **One API layer.** TMDB and Firebase calls live in `src/lib/` (or a feature's `api/` file), not
   inline in components, so components stay presentational and calls are easy to change.
6. **CI on every PR** (lint, format check, type-check, build) so `main` provably stays working.
7. **Deployed to Firebase Hosting** (owner decision, 2026-11-16), as slice 08 — see §3. Every
   merge to `main` redeploys automatically through GitHub Actions.
8. **Branded "Noelflix", not "Netflix"** (owner decision, 2026-11-16, Q3), with no Netflix
   logo, images or GIFs anywhere in the repo.

## 6. Decisions log

| #   | Question                              | Decision                                                                                                                                                                                       |
| --- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q1  | Use TypeScript?                       | **Yes** (2026-11-16). Scaffold converted; see ADR-7.                                                                                                                                           |
| Q2  | Deploy a live demo?                   | **Yes** (2026-11-16). Added as slice 08, Firebase Hosting.                                                                                                                                     |
| Q3  | Keep the "Netflix" name and red logo? | **No** (2026-11-16). Renamed **"Noelflix"** in slice 08, before the public deploy: a live login page branded "Netflix" risks being flagged as phishing. Red text wordmark and disclaimer kept. |

## 7. Prerequisites the owner must provide

The first two block slices 03 and 05; the third blocks slice 08.

- **TMDB API Read Access Token** — free account at themoviedb.org → Settings → API.
- **Firebase project** with a Web app registered and **Email/Password** sign-in enabled under
  Authentication → Sign-in method. Copy the web config into `.env.local`.
- **Deploy secrets in GitHub** (slice 08) — a Hosting-only service account key plus the
  `.env.local` values as repository secrets. Steps in [`slices/08-deploy.md`](slices/08-deploy.md).

## 8. Acceptance for v1

- All slices 01–08 merged; CI green on `main`.
- The live demo URL works: sign up, browse real TMDB data, play a trailer.
- Fresh clone + `npm install` + filled `.env.local` + `npm run dev` works with no other steps.
- README explains the project, the process, setup, and links each slice spec.
