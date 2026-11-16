# 08 — Deploy to Firebase Hosting

**Goal:** anyone with the link can open the live demo, sign up, browse real TMDB data and play a
trailer, and every merge to `main` redeploys it automatically.

Not in the tutorial; added by owner decision (PRD §6, Q2). Hosting decision and tradeoffs:
ADR-8.

## What is deployed, and how

- **What:** the static output of `npm run build` (`dist/`: `index.html`, hashed JS/CSS under
  `assets/`, the favicon). No server code, no Cloud Functions.
- **Where:** Firebase Hosting, live channel of project `netflix-clone-b32df`, the same project
  that already provides Auth (slice 05). URLs: `https://netflix-clone-b32df.web.app` and
  `https://netflix-clone-b32df.firebaseapp.com`.
- **How:** `.github/workflows/deploy.yml` runs on every push to `main` (and by hand from the
  Actions tab): `npm ci` → `npm run build` with the env values from repository secrets →
  `FirebaseExtended/action-hosting-deploy` to the `live` channel. CI (`ci.yml`) still gates the
  PR before merge; the deploy job does not repeat lint/format checks.
- **Config files:** `firebase.json` (hosting rules, below) and `.firebaserc` (default project),
  so `npx firebase-tools deploy --only hosting` from a laptop also works as a fallback.

### Hosting rules (`firebase.json`)

| Rule                                                    | Why                                                                                                                                                                            |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Rewrite every path except `/assets/**` to `/index.html` | Client-side routing: a refresh or shared link on `/player/550` or `/login` must load the app, not a Hosting 404. The app's own 404 page handles unknown routes.                |
| `/assets/**` → 404 when missing                         | A stale or wrong asset URL fails as a real 404 instead of returning HTML with a long cache header, which would show as a confusing MIME-type error.                            |
| `/assets/**` → `Cache-Control: max-age=1y, immutable`   | Vite puts a content hash in these file names, so a new build always means a new URL.                                                                                           |
| Everything else → `Cache-Control: no-cache`             | `index.html` must be revalidated on each visit; otherwise a returning visitor can keep an old `index.html` (Hosting's default is 1 h) pointing at assets that no longer exist. |
| `nosniff`, `Referrer-Policy`, `X-Frame-Options: DENY`   | Cheap baseline security headers. Framing is denied because a login page should not be embeddable. The YouTube player is embedded _by_ us, so it is unaffected.                 |

These were checked against the Firebase Hosting emulator (`firebase emulators:start --only
hosting`) with `curl`: `/`, `/login`, `/player/123` and an unknown path return `index.html` with
`no-cache`; the hashed JS returns `immutable`; a missing `/assets/*.js` returns 404.

### Production configuration

- **Environment variables.** Firebase Hosting serves static files and has no runtime
  environment, so the `VITE_` values are baked in **at build time** by GitHub Actions from
  repository secrets with the same names as `.env.example`. They are stored as secrets to keep
  them out of logs and forks, not because they stay secret: they are in the public JS bundle
  (ADR-4).
- **Deploy credential.** `FIREBASE_SERVICE_ACCOUNT` holds the JSON key of a Google Cloud service
  account limited to Hosting (roles below). This is the only real secret in the setup. Until it
  exists, the deploy job is skipped with a notice instead of failing, so merging this PR never
  turns `main` red.
- **Auth authorised domains.** Firebase adds `<project>.web.app` and `<project>.firebaseapp.com`
  to Authentication → Settings → Authorized domains automatically. If they are missing, sign-in
  on the live site fails with `auth/unauthorized-domain`.
- **Branding.** The app is renamed "Noelflix" (PRD §6, Q3) before going public. A public page
  with a "NETFLIX" wordmark and an email/password form is the pattern phishing filters (Google
  Safe Browsing, Firebase abuse reports) look for, and a "Deceptive site ahead" warning would
  defeat the point of a demo link. The "not affiliated with Netflix" disclaimer stays.

## One-time setup (owner)

Only the owner can do these; they need the Google account that owns the Firebase project.

1. **Turn on Hosting.** Firebase console → project → Build → Hosting → _Get started_, click
   through (skip the CLI steps it shows). This creates the default site.
2. **Create the deploy service account.** Google Cloud console → IAM & Admin → Service accounts
   (project `netflix-clone-b32df`) → _Create service account_, name `github-deploy`, roles:
   **Firebase Hosting Admin**, **API Keys Viewer**, **Cloud Run Viewer** (the same set
   `firebase init hosting:github` grants, minus Auth admin). Then _Keys_ → _Add key_ → JSON.
3. **Add repository secrets.** GitHub repo → Settings → Secrets and variables → Actions → _New
   repository secret_:
   - `FIREBASE_SERVICE_ACCOUNT`: the whole JSON file's contents.
   - `VITE_TMDB_READ_TOKEN`, `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`,
     `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`,
     `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`: the values from `.env.local`.
4. **Delete the downloaded JSON key** from your computer.
5. **Deploy.** Merge the slice 08 PR (or Actions → Deploy → _Run workflow_ on `main`). The job
   log ends with the live URL.

## Acceptance criteria

- [x] `firebase.json` and `.firebaserc` committed; SPA rewrites and cache headers verified on the
      Hosting emulator.
- [x] Deploy workflow builds with secrets and deploys `main` to the live channel; skips cleanly
      when the deploy secret is absent.
- [x] App rebranded to "Noelflix" (wordmark, page title, login copy, hero row, footer).
- [ ] On the live URL: the home page loads real TMDB rows and hero.
- [ ] On the live URL: sign up, sign out, sign in all work (no `auth/unauthorized-domain`).
- [ ] On the live URL: a title opens `/player/:id` and the trailer plays; refreshing that page
      still loads it.
- [x] README links the live demo.

## Out of scope for this slice

- **PR preview channels.** `action-hosting-deploy` can publish each PR to a temporary URL, but
  preview domains are not Auth-authorised domains, so sign-in fails there unless each one is
  added by hand. Not worth it for a solo project; easy to add later.
- **Keyless auth (Workload Identity Federation).** Google's recommended alternative to a JSON
  key. More setup for one repo; the key is scoped to Hosting and lives only in GitHub secrets.
- **Hiding the TMDB token** behind a Cloud Function proxy (ADR-4) and route-level code
  splitting (ADR-10). Both remain possible follow-ups.
- A custom domain.

## Notes / decisions

- **Auto-deploy over manual CLI deploys** (owner decision, 2026-11-16): `main` is what is live,
  which is the trunk-based rule taken to its end, and no credential is pasted into a chat or
  kept on a laptop.
- Earlier slice specs (01–07) describe the app as it was when they merged, including the
  "Netflix" wordmark and copy; they are left unchanged as a record.
