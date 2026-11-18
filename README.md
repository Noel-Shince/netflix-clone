# Noelflix — a Netflix-style clone

**Live demo: [netflix-clone-b32df.web.app](https://netflix-clone-b32df.web.app)** (sign up with
any email; no verification is sent)

A Netflix-style streaming UI built with **React**, **Vite**, **Firebase Authentication** and the
**TMDB API**. Users can sign up, log in, browse real movie data in category rows, and watch
trailers.

> **Status:** v1 complete. All eight slices are merged and `main` deploys automatically to
> Firebase Hosting.

This is also a process experiment: the code is written by AI, directed and reviewed by a human who
owns scope, architecture and merge decisions. Every feature starts as a short written spec and
lands as one small pull request.

## Tech stack

React 19 · TypeScript · Vite 8 · React Router · Firebase Auth · Firestore · TMDB API · plain CSS · oxlint ·
Prettier · GitHub Actions · Firebase Hosting

## Getting started

**Requirements:** Node.js 20.19+ (22 recommended, see `.nvmrc`).

```bash
git clone https://github.com/Noel-Shince/netflix-clone.git
cd netflix-clone
npm install
cp .env.example .env.local   # then fill in your keys
npm run dev
```

You need your own:

- **TMDB API Read Access Token** — free at [themoviedb.org](https://www.themoviedb.org/settings/api).
- **Firebase project** with a Web app, Email/Password sign-in enabled, and a Firestore database
  with the rules in `firestore.rules` published (see
  [slice 11 setup](docs/slices/11-profiles.md#one-time-setup-owner)).

To develop without touching a real project, set `VITE_USE_FIREBASE_EMULATORS=true` in
`.env.local` and run `npx firebase-tools emulators:start --only auth,firestore` (needs Java)
alongside `npm run dev`.

## Scripts

| Command                | What it does                       |
| ---------------------- | ---------------------------------- |
| `npm run dev`          | Start the dev server               |
| `npm run build`        | Production build to `dist/`        |
| `npm run preview`      | Serve the production build locally |
| `npm run lint`         | Lint with oxlint                   |
| `npm run format`       | Format all files with Prettier     |
| `npm run format:check` | Check formatting (used in CI)      |
| `npm run type-check`   | Type-check without emitting        |

## Project structure

```
src/
  components/   Shared UI
  features/     auth · catalog · playback · profiles
  lib/          Env access, API clients
  styles/       Global CSS and design tokens
docs/           PRD, architecture decisions, slice specs
```

Details and rationale: [docs/01-ARCHITECTURE.md](docs/01-ARCHITECTURE.md).

## How this is built

1. **Plan:** [docs/00-PRD.md](docs/00-PRD.md) (what and why) and
   [docs/01-ARCHITECTURE.md](docs/01-ARCHITECTURE.md) (how, with tradeoffs).
2. **Slice:** each feature gets a spec in [docs/slices/](docs/slices/), a short-lived branch, and
   one PR against `main`.
3. **Review and merge:** CI must pass; `main` always builds.
4. **Ship:** every merge to `main` is deployed to Firebase Hosting by GitHub Actions.

## Deployment

`.github/workflows/deploy.yml` builds `main` with the env values stored as GitHub repository
secrets and deploys it to Firebase Hosting (`firebase.json` holds the routing and cache rules).
To deploy your own copy, follow the one-time setup in
[docs/slices/08-deploy.md](docs/slices/08-deploy.md#one-time-setup-owner). Manual fallback:

```bash
npm run build
npx firebase-tools login
npx firebase-tools deploy --only hosting
```

Note: every `VITE_` value, including the TMDB token, ends up in the public JS bundle. See
[ADR-4](docs/01-ARCHITECTURE.md#adr-4-secrets-and-api-keys) for why that is accepted here.

## Roadmap

Each slice has a spec in [docs/slices/](docs/slices/) and landed as one PR.

- [x] 01 [Home page UI](docs/slices/01-home-page.md)
- [x] 02 [Login page UI](docs/slices/02-login-page.md)
- [x] 03 [TMDB movie data](docs/slices/03-tmdb-data.md)
- [x] 04 [Video player page](docs/slices/04-video-player.md)
- [x] 05 [Firebase login/register](docs/slices/05-firebase-auth.md)
- [x] 06 [Login loading state](docs/slices/06-loading-animation.md)
- [x] 07 [Responsive pass](docs/slices/07-responsive-styling.md)
- [x] 08 [Deploy to Firebase Hosting](docs/slices/08-deploy.md)
- [x] 11 [Multiple profiles](docs/slices/11-profiles.md)

Possible follow-ups, not planned: a Cloud Function proxy to keep the TMDB token out of the
bundle (ADR-4), route-level code splitting, PR preview deploys, automated end-to-end tests.

## Credits and disclaimer

- Based on the tutorial
  ["Full Stack Netflix Clone using React JS & Firebase"](https://youtu.be/YQQD67N5pi0) by
  GreatStack, with deliberate changes listed in the [PRD](docs/00-PRD.md#5-how-this-project-differs-from-the-tutorial).
- This product uses the TMDB API but is not endorsed or certified by TMDB.
- Educational project. "Noelflix" is not affiliated with or endorsed by Netflix, Inc.
