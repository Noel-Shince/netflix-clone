# 01 — Architecture

|                  |            |
| ---------------- | ---------- |
| **Status**       | Approved   |
| **Last updated** | 2026-11-16 |

Short decision records. Each one says what was chosen, why, and what it costs.

## Overview

A single-page React app with no backend of its own. The browser talks directly to two hosted
services:

```
            ┌──────────────────────────── Browser (React SPA) ───────────────────────────┐
            │                                                                             │
            │  features/auth  ──►  lib/firebase.ts  ──►  Firebase Auth   (sign up / in)   │
            │  features/catalog ─► lib/tmdb.ts      ──►  TMDB REST API   (movie lists)    │
            │  features/playback ► lib/tmdb.ts      ──►  TMDB videos  ──► YouTube embed   │
            │                                                                             │
            └─────────────────────────────────────────────────────────────────────────────┘
```

`lib/tmdb.ts` was added in slice 03 (see ADR-9); `lib/firebase.ts` in slice 05 (see ADR-10).
The compiled app is served from Firebase Hosting and redeployed by GitHub Actions on every
merge to `main` (slice 08, ADR-8).

## Stack

| Concern                 | Choice                                                                      | Version at scaffold |
| ----------------------- | --------------------------------------------------------------------------- | ------------------- |
| UI library              | React                                                                       | 19                  |
| Build tool / dev server | Vite (`@vitejs/plugin-react`)                                               | 8                   |
| Routing                 | React Router (`react-router`, added in slice 01)                            | 8                   |
| Auth                    | Firebase Authentication, email/password (slice 05)                          | —                   |
| Movie data              | TMDB API v3 endpoints, v4 bearer token (slice 03)                           | —                   |
| Styling                 | Plain CSS, one file per component, global tokens in `src/styles/global.css` | —                   |
| Lint                    | oxlint (Vite's current template default) with React rules                   | 1.x                 |
| Format                  | Prettier                                                                    | 3.x                 |
| CI / CD                 | GitHub Actions: lint, format check, type-check, build; deploy on `main`     | —                   |
| Language                | TypeScript, strict mode                                                     | 7.x                 |
| Hosting                 | Firebase Hosting (slice 08)                                                 | —                   |

## ADR-1: Vite over Create React App

- **Decision:** Vite.
- **Why:** CRA was deprecated by the React team in February 2025 and no longer receives updates.
  Vite starts in milliseconds, has first-class env-variable handling, and is what new React
  projects use.
- **Cost:** If the tutorial uses CRA, a few details differ: env vars use the `VITE_` prefix and
  `import.meta.env` instead of `REACT_APP_` and `process.env`; the entry file is `src/main.tsx`.
  Component code is unaffected.

## ADR-2: Feature-based folder structure

```
src/
  components/      Shared, reusable UI used by 2+ features (Navbar, Footer, Spinner)
  features/
    auth/          Login page, auth hooks, auth-specific components
    catalog/       Home page, hero, title rows
    playback/      Player page
  lib/             Non-UI modules: env access, TMDB client, Firebase client
  styles/          Global CSS: reset and design tokens
  assets/          Images and icons imported by code
docs/
  00-PRD.md
  01-ARCHITECTURE.md
  slices/          One spec per vertical slice (01-home-page.md, ...)
public/            Static files served as-is (favicon)
```

- **Decision:** group by feature, not by file type.
- **Why:** each vertical slice then touches mostly one folder, which keeps PRs small and easy to
  review. A new reader finds "everything about login" in one place.
- **Rule:** a feature may import from `components/` and `lib/`, never from another feature. Shared
  code gets promoted.
- **Cost:** slightly more structure than a project this size strictly needs. Accepted, because the
  point of the repo is to demonstrate a structure that scales.

## ADR-3: Plain CSS per component

- **Decision:** plain CSS files co-located with components, plus global custom properties
  (`--color-brand`, etc.) for shared values.
- **Why:** matches the tutorial, so its styling can be followed directly; zero extra dependencies;
  easy for anyone to read.
- **Cost:** no scoping, so class names can collide. Mitigation: prefix classes with the component
  name (`.title-cards__row`). CSS Modules is a one-line switch later if collisions become a problem.
- **Rejected:** Tailwind (would make the code diverge heavily from the tutorial and add a learning
  curve for review).

## ADR-4: Secrets and API keys

- **Decision:** all config is read from `.env.local` (git-ignored) via `src/lib/env.ts`.
  `.env.example` documents every variable with empty values.
- **Honest limitation:** in a browser-only app, every `VITE_` variable is compiled into the
  JavaScript bundle and is readable by anyone who opens DevTools. `.env` keeps keys **out of the
  git history**; it does not make them secret at runtime.
  - Firebase web config is designed to be public. Protection comes from Firebase Auth itself and,
    if Firestore is ever added, security rules.
  - The TMDB read token is a real credential that will be visible in the deployed bundle. The
    realistic risk is someone using your TMDB quota. Acceptable for a free-tier demo. The proper
    fix is a small serverless proxy (e.g. a Firebase Cloud Function) that holds the token; out of
    scope for v1, noted as a possible later slice.

## ADR-5: No custom backend

- **Decision:** Firebase (auth) and TMDB (data) are called directly from the client.
- **Why:** the tutorial does this, and it keeps the project small. "Full stack" here means managed
  backend services, not a hand-written server.
- **Cost:** see ADR-4 for the key-exposure tradeoff. Also, nothing to show for server-side skills;
  that is a goal for other projects in the series, not this one.

## ADR-6: Lint, format and CI

- **Decision:** oxlint (Vite's template default since Vite 8) + Prettier, both enforced in CI.
- **Why:** oxlint is much faster than ESLint and ships the React hooks rules that matter. Prettier
  ends formatting debates and keeps AI-generated diffs consistent.
- **Cost:** oxlint has a smaller rule/plugin ecosystem than ESLint. If a specific ESLint plugin is
  ever needed, switching is a contained change.

## ADR-7: TypeScript instead of JavaScript

- **Decision:** TypeScript, `strict: true`, no `any` without a comment explaining why. Owner
  decision, 2026-11-16 (PRD §6, Q1).
- **Why:** catches the class of bug AI-written code is most prone to — a renamed or mistyped field
  on a TMDB/Firebase response compiles to `undefined` in JS and breaks silently at runtime; in TS
  it's a build error. Also reads as more professional for a portfolio piece.
- **Cost:** the code diverges further from the (presumably JS) tutorial, so following the video
  line-by-line is no longer possible — each slice adapts the tutorial's JS to typed equivalents.
  Converting at scaffold time (now) cost about 15 minutes; converting after several slices existed
  would have cost much more, which is why this was decided before slice 01.
- **Mechanics:** `tsconfig.app.json` / `tsconfig.node.json` (project references via `tsconfig.json`),
  `vite-env.d.ts` typing `import.meta.env`, `npm run type-check` (`tsc -b --noEmit`) added to CI
  ahead of the build step. oxlint lints `.ts`/`.tsx` with no extra config.

## ADR-8: Deploy to Firebase Hosting

- **Decision:** deploy the production build to Firebase Hosting as the final slice (08), once
  slices 01–07 are merged. Owner decision, 2026-11-16 (PRD §6, Q2).
- **Why:** a portfolio project with no live link loses most reviewers, who won't clone and run it
  locally. Firebase Hosting is free at this scale and Firebase is already in the stack for auth, so
  no new provider or account is introduced.
- **Cost:** one more slice, and the owner needs the Firebase CLI authenticated locally (or a CI
  deploy token) to ship updates after v1. Static hosting only — fine, since there is no server.
- **Note:** this does not change ADR-4's key-exposure tradeoff. The deployed bundle still contains
  the TMDB token and Firebase web config, same as any local build.
- **Slice 08 addendum — how it ships:** `.github/workflows/deploy.yml` builds `main` with the
  `VITE_` values from GitHub repository secrets and deploys to the `live` channel with
  `FirebaseExtended/action-hosting-deploy`, authenticated by a service account limited to
  Hosting. Chosen over manual `firebase deploy` from a laptop so that `main` is always exactly
  what is live and no credential sits on a personal machine. `firebase.json` rewrites every
  route except `/assets/**` to `index.html` (client-side routing), caches hashed assets for a
  year and forces `index.html` to revalidate. Rejected for now: PR preview channels (preview
  domains are not Auth-authorised, so login breaks there) and keyless Workload Identity
  Federation (more setup than one repo justifies). Details: `docs/slices/08-deploy.md`.

## ADR-9: TMDB access — bearer token, one client, per-section loading

- **Decision:** all TMDB calls go through `src/lib/tmdb.ts`, authenticated with the v4 **API Read
  Access Token** in an `Authorization: Bearer` header on v3 endpoints. The short v3 `api_key`
  query parameter is not used. Added in slice 03.
- **Why bearer over `api_key`:** it is TMDB's documented default, works on both v3 and v4
  endpoints, and keeps the credential out of URLs, which end up in browser history, proxy logs
  and `Referer`-style leaks. It does **not** hide the token from the browser: ADR-4 still applies.
- **Failure handling:** `429` and `5xx` responses are retried once, waiting for TMDB's
  `Retry-After` (capped at 5 s); requests time out after 10 s; failures surface as a typed
  `TmdbError`. Each home-page section (hero and every row) loads through its own `useAsync`
  call, so one failure shows a local Retry instead of blanking the page.
- **Caching:** successful responses (and in-flight requests) are cached in memory, keyed by URL,
  for the life of the page. This dedupes React StrictMode's double effect and avoids refetching
  when returning to `/`.
- **Cost / rejected:** no data-fetching library (TanStack Query, SWR). Six GET requests on one
  page do not justify a dependency; if later slices add mutations, pagination or background
  refresh, TanStack Query is the upgrade path and `useAsync` is the only thing it replaces.

## ADR-10: Auth state and route protection

- **Decision:** `src/lib/firebase.ts` is the only module importing the Firebase SDK and exposes
  `signUp` / `signIn` / `logOut` / `subscribeToAuth`. `features/auth` holds an `AuthProvider`
  (context fed by `onAuthStateChanged`) and two layout-route guards, `RequireAuth` and
  `RedirectIfAuthed`, which `App` wraps around the protected and login routes. Added in slice 05.
- **Why guards over an effect:** the tutorial navigates from an `onAuthStateChanged` effect, which
  renders the wrong page first and then jumps. A guard decides before rendering, shows a blank
  screen while Firebase restores the session, and remembers the requested URL for after sign-in.
- **Why no Firestore (v1):** the tutorial stores each user's name in a Firestore `users` collection.
  The Auth profile's `displayName` holds the same data with no database or security rules, so
  the PRD's "auth only" scope holds.
- **Cost:** Firebase Auth adds about 32 KB gzipped to the JS bundle (87 KB → 120 KB). Everything
  ships in one chunk today; route-level code splitting is an option in slice 07/08 if load time
  matters. The shared navbar imports `logOut` from `lib/`, not from the auth feature, to respect
  ADR-2.
- **Slice 06 addendum:** `AuthProvider` also exposes `authActionPending` and
  `runAuthAction(fn)`. `RedirectIfAuthed` holds its redirect while an action is pending, because
  Firebase reports a new user before `updateProfile(displayName)` finishes; the same flag drives
  the login button's busy state.

## ADR-11: Firestore (lite SDK) for profiles and per-user data

- **Decision:** add Cloud Firestore, accessed through the **lite** SDK
  (`firebase/firestore/lite`), for viewing profiles (slice 09) and later per-profile data. `db` is
  created in `src/lib/firebase.ts`; each data area gets its own module in `lib/` (`profiles.ts`).
  Security rules live in `firestore.rules` at the repo root. Supersedes ADR-10's "no Firestore".
- **Data shape:** `users/{uid}/profiles/{slot}`, slot ids `p1`–`p5`, so the rules can cap an
  account at five profiles. Per-profile data goes in subcollections of the profile document
  (e.g. `.../profiles/{slot}/myList/{id}`), so one rule per path keeps it owner-only.
- **Why lite:** measured on this branch, the full SDK takes the main bundle from 120 KB to
  263 KB gzipped; lite takes it to 156 KB. Lite has the reads and writes this app needs and
  always reads from the server. It lacks real-time listeners (`onSnapshot`) and the offline
  cache; nothing here needs either yet. Switching to the full SDK is a one-line import change per
  module if that changes.
- **Why Firestore over localStorage:** profiles must follow the account across devices, and
  rules give real per-user isolation; localStorage would be per-browser only.
- **Rules:** deny by default, owner-only per path, field validation on writes, no permissive
  catch-all (Firestore ORs matching `allow`s, so a catch-all would cancel the validation). They
  are published by hand or with `firebase deploy --only firestore:rules`; the CI deploy account
  is deliberately limited to Hosting.
- **Local development:** `VITE_USE_FIREBASE_EMULATORS=true` (dev builds only) points Auth and
  Firestore at the Firebase emulators configured in `firebase.json`.
- **Cost:** +36 KB gzipped, one more service to set up (create the database, publish rules), and
  rules that must be kept in step with the TypeScript types (avatar ids, name length).

## Conventions

- Components: `PascalCase.tsx` with a sibling `PascalCase.css`.
- Each module starts with a short comment saying what it is for. Comments explain _why_, not
  _what_.
- Branches: `feature/0X-slice-name` as the intent. In practice the AI threads ran in a cloud
  environment that assigns branch names (`claude/project-thread-…`); each PR names its slice
  instead. Commits: imperative mood ("Add title rows").
- Every PR links its slice spec and must pass CI before merge.
