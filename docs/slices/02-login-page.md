# 02 — Login page UI

**Goal:** a visitor opening `/login` sees a Netflix-style sign-in card that toggles to a sign-up
form, with fields that behave like a real form (typing, validation hints, submit) but do not
authenticate anyone yet, so slice 05 only has to plug Firebase into one submit handler.

## Acceptance criteria

- [ ] `/login` renders the login page. It is a public route with no navbar (logged-out users
      should not see the browse chrome); it shows the wordmark top-left linking to `/`.
- [ ] **Sign in mode** (default): heading "Sign In", email and password fields, a "Sign In" submit
      button, a "Remember me" checkbox, a "Need help?" link, and a "New to Netflix? Sign up now"
      switch.
- [ ] **Sign up mode**: heading "Sign Up", adds a "Your name" field above email, submit button
      reads "Sign Up", and the switch reads "Already have an account? Sign in now".
- [ ] Switching modes keeps what was typed into email and password, and moves focus to the first
      field so keyboard users are not stranded.
- [ ] Form state lives in local component state (controlled inputs, typed). Submitting runs
      browser-native validation (`required`, `type="email"`, `minLength` 6 for password, which is
      Firebase's minimum) and then calls a single `onSubmit` placeholder that shows an inline
      notice saying authentication arrives in a later slice. No network calls.
- [ ] Every field has a visible `<label>` (floating-label style) and correct `autocomplete`
      (`email`, `current-password` / `new-password`, `name`), so password managers work later.
- [ ] Background: full-viewport dark backdrop with a gradient overlay; the card is translucent
      black on desktop. Below 600px the card goes edge-to-edge on a plain dark background, as
      Netflix's own mobile login does.
- [ ] Nothing overflows horizontally at 360px wide.
- [ ] `npm run lint`, `format:check`, `type-check` and `build` pass in CI.

## Out of scope for this slice

- Firebase or any real sign-in / sign-up / sign-out (slice 05).
- Loading spinner, disabled button while submitting, Firebase error messages (slice 06).
- Redirecting logged-out users to `/login`, or logged-in users away from it (slice 05).
- Password reset ("Need help?" is visual only), "Remember me" persistence, social login,
  email verification — out of scope for v1 (PRD §4).

## Notes / decisions

- **No copyrighted image.** The tutorial uses a Netflix background still from its asset pack. This
  slice uses a CSS-generated backdrop (gradient + a tiled grid of placeholder "posters"), same
  policy as slice 01. A real image is a one-line CSS change if branding (PRD Q3) is settled.
- **Deliberate deviation — one form, typed mode.** The tutorial tracks the mode as a string
  (`"Sign In"` / `"Sign Up"`) and reuses it as display text. Here mode is a union type
  (`'signIn' | 'signUp'`) with copy looked up from it, so a typo is a compile error and the
  displayed text can change without touching logic.
- **Deliberate deviation — native validation now.** The tutorial adds no validation. Adding
  `required` / `type="email"` / `minLength` costs nothing and means slice 05 never sends Firebase
  an obviously invalid request.
- The submit placeholder is the seam for slice 05: `handleSubmit` receives a typed
  `LoginFormValues` and is the only function that changes when auth is wired.
