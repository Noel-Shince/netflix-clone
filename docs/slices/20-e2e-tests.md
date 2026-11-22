# 20 — E2E tests and a real deploy gate

**Goal:** no deploy goes out blind. A Playwright smoke suite covers the core journey
(sign in → browse → open a title → sign out) against a real build, and Deploy only runs once
that suite — and the rest of CI — has actually passed for the commit on `main`.

Not in the tutorial; added by owner request ("no tests exist right now, so deploys go out
blind").

## What changed

- **`e2e/`** (new): Playwright specs.
  - `helpers.ts` — `signIn`/`signOut` and the shared `TEST_USER_EMAIL`/`TEST_USER_PASSWORD`
    credentials. Signing in lands on the home page directly, or on "Who's watching?" first
    (`ProfileProvider` always gives an account at least one profile, so the picker — when it
    shows — always has a tile to click); `signIn` handles both.
  - `auth.spec.ts` — wrong password shows "Incorrect email or password." and stays on
    `/login`; correct credentials reach the home page, and sign-out (navbar account menu)
    returns to `/login`.
  - `journey.spec.ts` — signs in, waits for a real TMDB row to render, opens its first title,
    and checks the player reaches a legitimate end state: either the `vidsrc.sh` iframe (slice 18) with the title's own heading, or the player's own "couldn't load this title" notice —
    never a crash.
- **`playwright.config.ts`** (new): one worker, no parallelism — every spec shares the one test
  account's session/profile pick, so two specs picking a profile at once would race. Runs
  against `vite preview` (a real production build, `VITE_*` baked in the same way the live
  deploy is), not `vite dev`.
- **`package.json`**: `@playwright/test` devDependency, `npm run test:e2e`.
- **`.github/workflows/ci.yml`**: new `e2e` job (needs `check`) — builds with the real
  `VITE_FIREBASE_*`/`VITE_TMDB_READ_TOKEN` secrets (same ones `deploy.yml` already uses) and a
  dedicated Firebase test account, then runs the suite. Skipped, not failed, until
  `TEST_USER_EMAIL`/`TEST_USER_PASSWORD` exist (see below) — same pattern `deploy.yml` already
  uses for its own missing-secret case.
- **`.github/workflows/deploy.yml`**: now triggers on the `CI` workflow's `completion`
  (`workflow_run`) instead of directly on `push`, and only deploys when that run's conclusion
  was `success` on `main` — so a lint/type-check/build/E2E failure on `main` blocks the deploy
  that would otherwise have followed it. `workflow_dispatch` (the manual "Run workflow" button)
  is unaffected, for a deploy that genuinely needs to bypass CI (e.g. redeploying after a
  secrets-only change).

## Why a dedicated test account, not mocked Firebase

Slice 06 verified login by mocking `identitytoolkit.googleapis.com` from a sandbox with no
network access to real Firebase. This suite runs in GitHub Actions, which does have real
internet access, and a real account exercises the real Firestore rules, the real TMDB
responses, and the real `auth/invalid-credential` wording — which is what actually ships. The
cost is one owner step (below) and a few seconds of real API calls per CI run.

## One-time setup (owner)

1. **Create the test account.** Firebase console → project `netflix-clone-b32df` → Authentication
   → Users → _Add user_. Any email/password works; nothing else needs to be true about this
   account (My List, watch history etc. are left alone by the suite, aside from its one profile).
2. **Add two repository secrets** (Settings → Secrets and variables → Actions, same place as
   `FIREBASE_SERVICE_ACCOUNT`): `TEST_USER_EMAIL`, `TEST_USER_PASSWORD`.
3. That's it — the next push/PR runs `e2e` for real, and Deploy starts waiting on `CI`'s result.

Until step 2 is done, `e2e` logs a warning and does nothing else, and Deploy still follows `CI`
(which still passes, since lint/format/type-check/build run regardless) — so this PR cannot
break the live site on merge, but it also does not yet gate on E2E results until the secrets
exist.

## Acceptance criteria

- [x] `npm run test:e2e` runs the three specs against a local `vite preview` build.
- [x] `ci.yml` has a job that installs Playwright, builds with real secrets, and runs the suite;
      skips cleanly without `TEST_USER_EMAIL`/`TEST_USER_PASSWORD`.
- [x] `deploy.yml` only deploys after `CI` reports success for the same commit on `main`
      (`workflow_run`), or via manual dispatch.
- [ ] Owner has added `TEST_USER_EMAIL`/`TEST_USER_PASSWORD` and watched one real CI run exercise
      `e2e` (not just skip it).

## Out of scope for this slice

- **Branch protection ("require status checks to merge").** That's a repository setting, not a
  workflow file — not something this PR can turn on. Worth doing separately so a human can't
  merge past a red CI either; today only the Deploy gate is automatic.
- Testing the second profile/"Manage profiles" flows, search, My List, or any nav page beyond
  Home — the brief asked for the core journey, not full coverage. Easy to extend `e2e/` later.
- Visual regression testing.

## Notes / decisions

- `deploy.yml`'s existing `concurrency: deploy-live` and per-secret skip pattern are unchanged;
  this slice only changes _when_ the job starts and adds `ref: head_sha` so it deploys the
  commit CI actually checked, not whatever `main` has moved to by the time Deploy runs.
