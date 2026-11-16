# Netflix Clone

A Netflix-style streaming UI built with **React**, **Vite**, **Firebase Authentication** and the
**TMDB API**. Users can sign up, log in, browse real movie data in category rows, and watch
trailers.

> **Status:** scaffold only. Features are being built slice by slice; see [Roadmap](#roadmap).

This is also a process experiment: the code is written by AI, directed and reviewed by a human who
owns scope, architecture and merge decisions. Every feature starts as a short written spec and
lands as one small pull request.

## Tech stack

React 19 · Vite 8 · React Router · Firebase Auth · TMDB API · plain CSS · oxlint · Prettier ·
GitHub Actions

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
- **Firebase project** with a Web app and Email/Password sign-in enabled.

## Scripts

| Command                | What it does                       |
| ---------------------- | ---------------------------------- |
| `npm run dev`          | Start the dev server               |
| `npm run build`        | Production build to `dist/`        |
| `npm run preview`      | Serve the production build locally |
| `npm run lint`         | Lint with oxlint                   |
| `npm run format`       | Format all files with Prettier     |
| `npm run format:check` | Check formatting (used in CI)      |

## Project structure

```
src/
  components/   Shared UI
  features/     auth · catalog · playback
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

## Roadmap

- [ ] 01 Home page UI
- [ ] 02 Login page UI
- [ ] 03 TMDB movie data
- [ ] 04 Video player page
- [ ] 05 Firebase login/register
- [ ] 06 Login loading state
- [ ] 07 Responsive pass

## Credits and disclaimer

- Based on the tutorial
  ["Full Stack Netflix Clone using React JS & Firebase"](https://youtu.be/YQQD67N5pi0) by
  GreatStack, with deliberate changes listed in the [PRD](docs/00-PRD.md#5-how-this-project-differs-from-the-tutorial).
- This product uses the TMDB API but is not endorsed or certified by TMDB.
- Educational project. Not affiliated with or endorsed by Netflix, Inc.
