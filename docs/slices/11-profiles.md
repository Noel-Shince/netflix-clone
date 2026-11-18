# 11 — Multiple profiles

**Goal:** one account can hold up to five viewing profiles. After signing in, the user picks who is
watching, and can add, rename, re-avatar, delete and switch profiles.

Owner request, 2026-11-18. Data model and SDK choice: ADR-11.

## Acceptance criteria

- [x] After sign-in, every protected page (`/`, `/player/:id`) first shows **"Who's watching?"**
      (`/profiles`). Picking a profile continues to the page originally asked for (e.g. a deep link
      to `/player/550`).
- [x] The chosen profile survives a reload and new tabs. Signing out forgets it, so the next
      sign-in asks again.
- [x] A brand-new account gets one profile automatically, named after the sign-up name (falling
      back to the email's local part).
- [x] **Add profile:** name (1–20 characters, unique per account, case-insensitive) and one of 8
      built-in avatars. The add tile disappears at 5 profiles.
- [x] **Manage profiles** (`/profiles/manage`): every tile opens its editor (`/profiles/:id/edit`)
      to rename, change avatar, or delete. Delete asks for an inline confirmation and is hidden
      when only one profile is left.
- [x] **Navbar:** the account button shows the active profile's avatar; its menu lists the other
      profiles (one click switches), "Manage profiles" and "Sign out".
- [x] Firestore security rules: only the account owner can read or write its profiles; writes are
      validated (slot id, field names, name length, avatar id).
- [x] A failed profile load shows a message with Retry and Sign out instead of a blank page.
- [x] Watch history and the recommendation rows built from it (slice 09) are per profile:
      switching profile remounts the page and shows that profile's rows. Deleting a profile
      deletes its history, since slots are reused.
- [x] Works at phone width (375px) and with the keyboard (avatar picker is a radio group).

## Out of scope for this slice

- My List per profile: the My List slice (10) wires it in under each profile document.
- Moving watch history from localStorage to Firestore (it stays per browser for now).
- Kids profiles / maturity filtering, profile PINs, custom avatar uploads.
- Cascading deletes: Firestore does not delete subcollections with their parent, so once profiles
  own data, that feature must delete its own documents when a profile is deleted (noted in
  `deleteProfile`).

## Notes / decisions

- **Data:** `users/{uid}/profiles/{slot}` with `{ name, avatar, createdAt }`. The document id is a
  fixed slot (`p1`–`p5`) so the security rules can enforce the five-profile cap; a count cannot be
  checked in rules.
- **Avatars** are drawn inline SVG (colour + simple face) from a fixed list in
  `src/lib/profiles.ts`, stored by id. No image files or copyrighted artwork.
- **Where code lives:** Firestore calls in `src/lib/profiles.ts`; the context type and
  `useProfiles()` in `src/lib/profileContext.ts` (the shared Navbar and other features read it,
  ADR-2); provider, guard and screens in `src/features/profiles/`. `App` passes the signed-in
  account to the provider, because features may not import each other.
- **Remembered choice:** localStorage key `noelflix.activeProfile.<uid>`. Not a security
  boundary; it decides whether to show the picker, and `watchHistory.ts` reads it to pick the
  history key (`noelflix:watch-history:<uid>:<slot>`). History recorded before this slice, under
  the old per-account key, is no longer shown. Two tabs on different profiles share the most
  recent pick for history writes.

## One-time setup (owner)

The live site needs a Firestore database and these rules before profiles work there:

1. Firebase console → **Firestore Database** → **Create database** → production mode, any region
   close to your users.
2. Firestore → **Rules** → paste the contents of `firestore.rules` → **Publish**. (Or
   `npx firebase-tools deploy --only firestore:rules` from a logged-in laptop.)

The GitHub deploy workflow only deploys Hosting; its service account is not allowed to change
rules, on purpose. Re-publish the rules by hand whenever `firestore.rules` changes.

## How it was tested

No automated test suite exists yet (PRD §4), so this slice was checked end to end with Playwright
against the local Firebase emulators (`firebase emulators:start --only auth,firestore`, with
`VITE_USE_FIREBASE_EMULATORS=true`): sign up → default profile named after the user → add (with a
duplicate-name error) up to five → rename → delete → pick → switch from the navbar → reload keeps
the profile → sign out, deep link to `/player/550`, sign in → picker → lands on `/player/550`.
A failed load (Firestore unreachable) shows the error page, and Retry recovers. The rules were
checked against the emulator over REST: owner write/read allowed; slot `p6`, another user's read
or write, unauthenticated read, an unknown avatar, a 21-character name, an extra field and an
unmatched path are all denied.
