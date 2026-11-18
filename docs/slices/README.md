# Slice specs

One file per vertical slice, written and approved before its branch is opened.
Name: `0X-slice-name.md`, matching branch `feature/0X-slice-name` where the environment allows
(see the branch note in `../01-ARCHITECTURE.md`, Conventions).

| #   | Spec                                           |
| --- | ---------------------------------------------- |
| 01  | [Home page UI](01-home-page.md)                |
| 02  | [Login page UI](02-login-page.md)              |
| 03  | [TMDB movie data](03-tmdb-data.md)             |
| 04  | [Video player page](04-video-player.md)        |
| 05  | [Firebase login/register](05-firebase-auth.md) |
| 06  | [Login loading state](06-loading-animation.md) |
| 07  | [Responsive pass](07-responsive-styling.md)    |
| 08  | [Deploy to Firebase Hosting](08-deploy.md)     |
| 09  | [Multiple profiles](09-profiles.md)            |

Template:

```md
# 0X — Slice name

**Goal:** one sentence on what the user can do after this merges.

## Acceptance criteria

- [ ] ...

## Out of scope for this slice

- ...

## Notes / decisions

- ...
```
