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

`lib/firebase.ts` and `lib/tmdb.ts` do not exist yet; they are created by slices 05 and 03.
The compiled app is deployed to Firebase Hosting in slice 08 — see ADR-8.

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
| CI                      | GitHub Actions: lint, format check, type-check, build                       | —                   |
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

## Conventions

- Components: `PascalCase.tsx` with a sibling `PascalCase.css`.
- Each module starts with a short comment saying what it is for. Comments explain _why_, not
  _what_.
- Branches: `feature/0X-slice-name`. Commits: imperative mood ("Add title rows").
- Every PR links its slice spec and must pass CI before merge.
