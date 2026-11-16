# Features

Each folder owns one product area end to end: its pages, feature-specific
components, hooks, API calls and styles. Code shared by two or more features
moves up to `src/components` (UI) or `src/lib` (non-UI).

| Folder      | Owns                                                 | Slice(s)   |
| ----------- | ---------------------------------------------------- | ---------- |
| `auth/`     | Login/register page, Firebase auth logic, auth state | 02, 05, 06 |
| `catalog/`  | Home page, hero banner, TMDB title rows              | 01, 03     |
| `playback/` | Player page (trailer embed for a selected title)     | 04         |

Rule: a feature may import from `components/` and `lib/`, but not from
another feature's internals. If two features need the same thing, promote it.
