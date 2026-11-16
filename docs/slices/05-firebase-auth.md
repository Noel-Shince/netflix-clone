# 05 — Firebase authentication

**Goal:** a visitor can create an account, sign in and sign out with email and password through
Firebase Authentication, and only signed-in users can see the catalog and the player.

## Acceptance criteria

- [ ] **Firebase client:** `src/lib/firebase.ts` initialises the Firebase app once from the
      `VITE_FIREBASE_*` variables (read through `requireEnv`, ADR-4) and exports typed
      `signUp`, `signIn`, `logOut` and `subscribeToAuth` functions. No component imports
      `firebase/*` directly.
- [ ] **Sign up:** submitting the sign-up form creates a Firebase user with the email and
      password, saves the "Your name" value as the user's `displayName`, and lands on `/`.
- [ ] **Sign in:** submitting the sign-in form signs the user in and lands on the page they
      originally asked for (e.g. a `/player/:id` link), or `/` if they came straight to `/login`.
- [ ] **Remember me:** checked keeps the session across browser restarts (local persistence);
      unchecked ends it when the tab/browser session ends (session persistence).
- [ ] **Sign out:** the "Sign out" item in the navbar account menu is enabled, signs the user out,
      and they end up on `/login`.
- [ ] **Protected routes:** `/` and `/player/:id` require a signed-in user. A logged-out visitor is
      redirected to `/login` (with `replace`, so Back does not loop). The 404 page stays public.
- [ ] **Login is for logged-out users only:** a signed-in user opening `/login` is redirected to `/`.
- [ ] **No flash on reload:** while Firebase restores the saved session on page load, guarded
      routes render a plain dark screen instead of briefly showing the login page or the catalog.
- [ ] **Friendly errors:** Firebase error codes are never shown raw. They are mapped to plain
      messages shown inline under the submit button (`role="alert"`), for example:
  - wrong password / unknown email → "Incorrect email or password."
  - email already registered → "An account with this email already exists. Sign in instead."
  - too many attempts → "Too many attempts. Please wait a few minutes and try again."
  - offline → "Can't reach the server. Check your connection and try again."
  - anything unexpected → "Something went wrong. Please try again." (the raw error is logged to
    the console for debugging).
- [ ] The error clears when the user switches between sign-in and sign-up.
- [ ] `npm run lint`, `format:check`, `type-check` and `build` pass in CI.

## Out of scope for this slice

- Loading spinner and disabled submit button while a request is in flight (slice 06).
- Password reset, email verification, social login (PRD §4). "Need help?" stays visual.
- Firestore or any database. The tutorial writes a `users` document on sign-up; here the name is
  stored on the Firebase Auth profile instead (see notes).
- Showing the user's name or avatar in the navbar.
- Firebase Analytics (`measurementId`) — not used.
- Automated tests (no test runner yet; same as slices 03–04).

## Notes / decisions

- **Tutorial comparison.** The tutorial puts the Firebase config inline in `firebase.js`, stores
  each new user in a Firestore `users` collection (`uid`, `name`, `authProvider`, `email`), shows
  errors with `react-toastify` by turning the raw code into words
  (`auth/invalid-credential` → "invalid credential"), and redirects from an `onAuthStateChanged`
  effect in `App`. Deviations here, each deliberate:
  - **Config from `.env.local`** per ADR-4 / PRD §5.4, not hard-coded.
  - **No Firestore.** The only extra data is the name, and the Auth profile's `displayName` holds
    it with no database, no security rules and no extra SDK. PRD scope is auth only.
  - **Inline, hand-written messages instead of toasts of raw codes.** "invalid credential" is not
    a message a user can act on, and a toast library is an extra dependency for one form.
  - **Route guards instead of an effect that navigates.** A guard decides before rendering, so a
    logged-out user never sees a flash of the catalog, and deep links survive sign-in.
- **Error messages moved from slice 06 to slice 05.** The PRD originally listed "readable error
  messages" under slice 06. Wiring real auth without them would ship raw Firebase codes to
  `main`, so they land here; slice 06 is now just the loading state.
- **Email enumeration protection.** New Firebase projects return one generic
  `auth/invalid-credential` for both "no such user" and "wrong password", so the app cannot (and
  should not) tell the user which one it was. Hence one combined message.
- **Where auth state lives.** `features/auth` owns an `AuthProvider` (React context fed by
  `onAuthStateChanged`) and the two route guards; `App` composes them. The shared navbar only
  needs to sign out, so it calls `logOut()` from `src/lib/firebase.ts` and lets the guard handle
  the redirect, keeping `components/` free of feature imports (ADR-2).
- **Firebase web config is public by design** (ADR-4): it identifies the project; protection
  comes from Auth and, later, the authorised-domains list in the Firebase console. Slice 08 must
  add the Hosting domain there (Firebase adds `*.web.app` / `*.firebaseapp.com` automatically).
