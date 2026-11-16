# 06 — Login loading state

**Goal:** while a sign-in or sign-up request is in flight, the user sees that something is
happening and cannot fire it twice, and a new account's name is saved before the app moves on.

## Acceptance criteria

- [ ] **Spinner:** a shared `Spinner` component lives in `src/components/Spinner` (ADR-2 already
      lists it there). It is CSS-only (no GIF, no dependency), sized by a prop, and inherits the
      text colour so it works on the red button.
- [ ] **Busy button:** from the moment the form is submitted until the request finishes, the
      submit button shows the spinner instead of its label, keeps its size (no layout jump), is
      `disabled`, and has `aria-busy="true"`. Screen readers hear "Signing in…" / "Creating
      account…" instead of a silent spinner.
- [ ] **No double submit:** pressing Enter or clicking again while busy does nothing. The
      "Sign up now / Sign in now" switch is disabled too, so the mode cannot change mid-request.
      The inputs stay editable-looking but read-only, so the values being sent cannot drift.
- [ ] **Busy until navigation:** on success the button stays busy until the app has navigated
      away (no flash of the re-enabled button). On failure it returns to normal and the slice 05
      error message appears.
- [ ] **Display-name ordering gap closed:** after sign-up the app does not leave `/login` until
      `updateProfile(displayName)` has finished (successfully or not). Reloading the home page
      right after landing on it can no longer lose the name.
- [ ] **Reduced motion:** with `prefers-reduced-motion: reduce` the spinner turns slower instead
      of stopping, so it still reads as "working".
- [ ] `npm run lint`, `format:check`, `type-check` and `build` pass in CI.

## Out of scope for this slice

- Full-screen spinner while Firebase restores a saved session on page load. Slice 05's blank
  screen stays; it usually lasts well under a second and a spinner that flashes for 200 ms looks
  worse than nothing.
- Loading states for TMDB rows and the player (they already have skeletons / placeholder from
  slices 03–04).
- Request timeouts or cancel buttons. Firebase surfaces network failures itself, and slice 05
  already maps them to "Can't reach the server…".
- Automated tests (still no test runner).

## Notes / decisions

- **Tutorial comparison.** The tutorial sets a `loading` flag and replaces the whole login page
  with a centred Netflix spinner GIF. Deviations, each deliberate:
  - **Spinner inside the button, not a full-page swap.** The form stays on screen, so on failure
    the user sees the error next to what they typed instead of the page blinking back in.
  - **CSS ring instead of the Netflix GIF.** No copyrighted asset (same rule as the text logo in
    slice 01), no image request, and it scales and recolours with CSS.
- **Why the redirect has to wait, not just the button.** Firebase announces the new user (via
  `onAuthStateChanged`) as soon as the account is created, before the name is saved. The
  `RedirectIfAuthed` guard reacts to that announcement, so making `handleSubmit` await the
  name would still navigate early. Instead `AuthProvider` exposes `runAuthAction(fn)`, which
  marks an auth action as in flight; the guard holds its redirect until that flag clears. The
  same flag drives the button's busy state, so there is one source of truth.
- **Sign-in uses the same path.** It has no follow-up write, but holding the redirect until the
  call resolves is what keeps the button from flashing back to "Sign In" before navigation.
