# 13 — Security hardening

**Goal:** the live site keeps its HTTPS-only transport and gains a browser-enforced allow-list of
where code, data, images and frames may come from, with least-privilege CI and no known
vulnerabilities in shipped dependencies.

## Audit findings (2026-11-18, before this slice)

| Area                  | Finding                                                                                                                                                                                                                                                                                                            | Status          |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------- |
| Transport             | Live site is HTTPS only. Firebase Hosting already sends `Strict-Transport-Security: …; preload`, and `.app` is an HSTS-preloaded TLD, so browsers refuse plain HTTP outright. No mixed content.                                                                                                                    | Already fine    |
| Firebase web config   | `VITE_FIREBASE_*` values are in the bundle by design. They identify the project; they are not credentials. No service-account key or private key appears in the repo history or the live bundle (checked both).                                                                                                    | Already fine    |
| Firestore rules       | `firestore.rules` (slice 11, profiles and My List) already default-deny, scope every path to `request.auth.uid`, and validate each field on write — good as written. But `deploy.yml` never ran `firebase deploy --only firestore:rules`, so the file existed in the repo without ever reaching the live database. | Fixed here      |
| TMDB read token       | Bundled client-side (ADR-4). It is read-only, so the worst case is quota abuse, not data loss. Real fix is a server-side proxy; see "Out of scope".                                                                                                                                                                | Accepted risk   |
| Response headers      | Had `nosniff`, `Referrer-Policy`, `X-Frame-Options`. Missing: Content-Security-Policy, Permissions-Policy, COOP.                                                                                                                                                                                                   | Fixed here      |
| CI token scope        | Workflows ran with the repo's default `GITHUB_TOKEN` permissions.                                                                                                                                                                                                                                                  | Fixed here      |
| Shipped dependencies  | `npm audit --omit=dev` reported 4 high advisories, all from `@grpc/grpc-js@1.9` pulled in by the Firebase SDK's Firestore package. Server-side issues, not used or bundled by this app, but they show up in every audit report.                                                                                    | Fixed here      |
| Dev-only dependencies | `picomatch` ReDoS advisory via Vite's glob matching. Build-time only, needs attacker-controlled globs, no upstream fix yet.                                                                                                                                                                                        | Accepted, watch |

## Changes

- `firebase.json` adds, on every response:
  - **Content-Security-Policy:** `default-src 'self'`; scripts only from the app and the Google
    hosts Firebase Auth may load; `connect-src` limited to TMDB and the Firebase Auth endpoints;
    images from the app and `image.tmdb.org`; frames only `youtube-nocookie.com`, the Firebase auth
    domain and Google (reCAPTCHA); `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`,
    `frame-ancestors 'none'`, `upgrade-insecure-requests`. Inline `<script>` is blocked.
    `style-src` allows `'unsafe-inline'` because poster/placeholder backgrounds are inline styles;
    style injection is far lower risk than script injection.
  - **Strict-Transport-Security** `max-age=63072000; includeSubDomains; preload` (2 years,
    explicit in config rather than relying on the platform default).
  - **Permissions-Policy** denying camera, microphone, geolocation, payment, USB.
  - **Cross-Origin-Opener-Policy** `same-origin-allow-popups` (isolates the window but keeps
    Firebase popup sign-in working if it is added later).
- `ci.yml`: `permissions: contents: read`. `deploy.yml`: `contents: read`, `checks: write`.
- `package.json` `overrides` pins `@grpc/grpc-js` to `^1.14.7`; production audit is now clean.
- `deploy.yml` gains a step that runs `firebase deploy --only firestore:rules` after the hosting
  deploy, so `firestore.rules` actually reaches the live database on every push to `main` instead
  of sitting unused in the repo. Needs the deploy service account to hold a role that can write
  rules (e.g. "Firebase Rules Admin"); flagged for the owner below since "Firebase Hosting Admin"
  alone does not include it, and the step will fail the job if the role is missing.
- `connect-src` in the CSP adds `https://firestore.googleapis.com`, since Firestore Lite (slice 11)
  talks to Firestore over REST, which the original policy did not account for.

## Acceptance criteria

- [x] Built app served with these headers: login, sign-in attempt, home and player routes load
      with zero CSP violations (Playwright, local server applying `firebase.json` headers).
- [x] Negative check: fetch, image and iframe to an unlisted host, and an injected inline script,
      are all blocked by the CSP.
- [x] `npm audit --omit=dev` reports 0 vulnerabilities; lint, format, type-check, build pass.
- [ ] After deploy, owner checks the live site still signs in and plays a trailer.

## Owner actions outside the repo (cannot be done from code)

1. **Confirm the leaked deploy key is deleted.** Google Cloud console → IAM & Admin → Service
   accounts → `github-deploy` → Keys. Key id starting `c103cb…` must not be listed. If it is,
   delete it, create a new JSON key, paste it into the `FIREBASE_SERVICE_ACCOUNT` GitHub secret.
2. **Restrict the Firebase browser API key.** Google Cloud console → APIs & Services →
   Credentials → "Browser key (auto created by Firebase)": application restriction "Websites"
   with `netflix-clone-b32df.web.app/*`, `netflix-clone-b32df.firebaseapp.com/*`,
   `localhost:5173/*`; API restriction to Identity Toolkit API and Token Service API.
3. **Firebase Auth settings:** keep only the domains above under Authorized domains, and make sure
   email enumeration protection is on (Authentication → Settings → User actions).

## Out of scope for this slice

- TMDB proxy (Cloud Function or Worker) to take the token out of the bundle. Needs the Firebase
  Blaze plan or a separate free Worker account; owner decision.
- Firebase App Check, rate limiting, account lockout beyond Firebase defaults.
