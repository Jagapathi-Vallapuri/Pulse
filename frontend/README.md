# Pulse Frontend — Architecture & Concepts

React + Vite + Material UI single‑page application for Pulse. This README explains how the frontend works end‑to‑end: the stack, app structure, routing, global state via React Context, theming, the audio player, API wiring, and how to run/extend it.

## Quick start

```powershell
cd frontend
npm install
npm run dev
```

Optional build/preview:

- `npm run build` → production build to `dist/`
- `npm run preview` → preview the production build

Environment (create `frontend/.env.local` if needed):

```
VITE_API_BASE_URL=http://localhost:5000/api
```

If not set, the client defaults to `http://localhost:5000/api`.

## Tech stack

- Vite 7 for dev/build tooling
- React 19 (function components + hooks)
- React Router 7 for client‑side routing
- Material UI (MUI) 7 + Emotion for theming and components
- Axios for HTTP requests
- ESLint for linting

Relevant files:

- `vite.config.js` – Vite + React plugin
- `package.json` – scripts and deps
- `src/main.jsx` – app bootstrap and provider composition
- `src/App.jsx` – router and top‑level layout
- `client.js` – axios instance and API helpers

## Directory layout (frontend)

- `src/`
  - `main.jsx` – mounts the app and composes providers
  - `App.jsx` – routes and persistent UI (Header, PlayerBar)
  - `components/` – shared UI: `Header`, `PlayerBar`, `QueueDrawer`, `ProtectedRoute`, auth forms, cards
  - `context/` – global state via React Context
    - `AuthContext.jsx` – auth/session
    - `UIContext.jsx` – toasts + loading
    - `ThemeContext.jsx` – light/dark theme
    - `PlayerContext.jsx` – audio engine + queue
  - `pages/` – routed screens: `Login`, `Register`, `Home`, `Albums`, `Album`, `Playlists`, `PlaylistDetail`, `UploadSong`, `Search`, `UserProfile`, `ChangePassword`
  - `App.css`, `index.css` – styles
- `client.js` – axios, interceptors, endpoint helpers

## App bootstrap and providers

In `src/main.jsx`, the app composes cross‑cutting concerns using providers:

- `ThemeProvider` (custom) loads/saves theme mode and builds a custom MUI theme
- `UIProvider` exposes global loading (`withLoading`) and a queued Snackbar toast system
- `PlayerProvider` builds and owns a single `HTMLAudioElement`, queue, and playback state
- Inside `AppWrapper`, MUI’s `ThemeProvider` applies the generated theme and `CssBaseline`, and an `ErrorBoundary` guards the tree

This layering makes theme, notifications, player, and error handling available anywhere without prop drilling.

## Routing and navigation

`src/App.jsx` uses `BrowserRouter`, `Routes`, and `Route` to define pages. `Header` is always visible; `PlayerBar` renders only when authenticated.

Public routes:

- `/` – Login
- `/register` – Register

Protected routes (wrapped in `ProtectedRoute`):

- `/home` – Home
- `/albums` – Albums
- `/album/:id` – Album details
- `/search` – Search
- `/playlists` – Playlists
- `/playlists/:id` (also `/playlist/:id`) – Playlist detail
- `/upload` – Upload song
- `/profile` – User profile
- `/settings/password` – Change password

`ProtectedRoute` shows a centered spinner while auth is bootstrapping and redirects unauthenticated users back to `/`.

## Authentication: `AuthContext`

File: `src/context/AuthContext.jsx`

- State: `{ token, user, isAuthenticated, authLoading }`
- Bootstrap:
  - Reads token/user from `localStorage`
  - Decodes JWT `exp` to schedule auto‑logout at expiry
  - Validates token with `GET /auth/validate`; updates `user` if provided; clears state on 401/403
- Actions:
  - `login(token, user)` stores credentials and schedules expiry
  - `logout()` clears local/session storage and navigates to `/`
  - `updateUser(partial)` merges and persists profile changes
- Integration with axios: injects a logout handler so any 401 from the backend will trigger a single, debounced logout

Why: centralizes session logic, avoids prop drilling, and keeps route gating simple via `ProtectedRoute`.

## API client: `client.js`

- Axios instance with:
  - `baseURL` from `import.meta.env.VITE_API_BASE_URL` (fallback `http://localhost:5000/api`)
  - `withCredentials: true`
  - Request interceptor adds `Authorization: Bearer <token>` if present
  - Response interceptor triggers injected logout on 401
- Helper functions for backend endpoints: auth (`register`, `login`, `verify2FA`, `changePassword`), user (`getMe`, `updateAbout`, avatar ops, favorites/history), songs (`uploadUserSong`, `getMySongs`, `deleteMySong`)

Why: single place to manage auth headers, error handling, and endpoint helpers.

## Theming: `ThemeContext` + MUI theme

File: `src/context/ThemeContext.jsx`

- Custom theme factory with light/dark palettes, gradients, rounded shapes, typography, and component overrides (Paper, Button, OutlinedInput, AppBar, Card)
- Persists `themeMode` in `localStorage` and exposes `toggleTheme`
- MUI `ThemeProvider` in `main.jsx` applies the generated theme and `CssBaseline`

Why: consistent design system, accessible color modes, and centralized visual tweaks.

## Global UI feedback: `UIContext`

File: `src/context/UIContext.jsx`

- Loading counter with `startLoading`, `stopLoading`, and `withLoading(asyncFn)` helper
- Snackbar queue backed by MUI `Snackbar` + `Alert`
- Helpers: `toastSuccess`, `toastError`, `toastInfo`, `toastWarning`, and `showToast`

Why: a single, consistent toast API across the app and simple loading state management without external libs.

## Audio and player: `PlayerContext`

File: `src/context/PlayerContext.jsx`

- Owns a singleton `HTMLAudioElement` via `useRef`
- State: `{ current, playing, progress: { currentTime, duration }, queue, index, volume, muted }`
- Persistence: saves `queue`, `index`, `volume`, and `muted` to `localStorage` and restores on load (no autoplay)
- Track normalization: maps various track shapes to `{ id, title, artist, image, audioUrl, duration }`
- Jamendo proxy: rewrites Jamendo sources to the backend proxy `GET /music/stream?src=...` (CORS and Range support)
- Event wiring: updates progress on `timeupdate`, auto‑advances on `ended`, handles playback errors
- Public API:
  - Playback: `playTrack`, `playQueue(tracks, startIndex)`, `playNow`, `playAt(index)`, `togglePlay`, `pause`, `resume`, `seekTo`, `next`, `prev`
  - Queue: `enqueue`, `removeAt`, `move(from,to)`, `clearQueue`, `shuffleUpcoming`
  - Volume: `setVolume(0..1)`, `toggleMute`
- History: best‑effort logging via `addHistory(trackId)` when a track starts

Why: isolates all audio/queue logic in one place and exposes a declarative API for UI components like `PlayerBar` and pages to interact with playback.

### Player UI: `PlayerBar`

File: `src/components/PlayerBar.jsx`

- Fixed bottom `AppBar` with:
  - Current track info + avatar placeholder
  - Prev/Play‑Pause/Next, Shuffle Upcoming, Queue drawer button
  - Seek slider with time labels
  - Volume/mute slider
- Renders only when authenticated (controlled by `App.jsx` via `AuthedPlayer`)

## React concepts used and why

- Functional components + JSX: concise, hook‑friendly structure for all UI and providers
- Context API (`useContext`): global concerns (auth, theme, toasts, player) without prop drilling
- Hooks:
  - `useState` for local and context state
  - `useEffect` for side effects (auth bootstrap/validation, audio event listeners, persistence)
  - `useRef` for stable, non‑rendering instances (audio element, timers)
  - `useMemo`/`useCallback` to memoize derived values and stable callbacks, reducing re‑renders
  - `StrictMode` in dev to surface lifecycle pitfalls
- React Router: SPA navigation and route guarding via `ProtectedRoute`
- ErrorBoundary: keeps the app resilient to component errors

## Feature highlights

- Auth UI: Login, Register, 2FA verification
- Discovery: Home/Albums/Album details
- Player: queue management, shuffle, seek, prev/next, persisted volume/mute, history logging
- PlayerBar only appears for authenticated users

## Environment and configuration

Set the API base URL:

```
VITE_API_BASE_URL=http://localhost:5000/api
```

In production, set it to your backend URL (ending with `/api`). Ensure the backend CORS `FRONTEND_ORIGIN` matches your deployed frontend origin exactly.

## Extending the app

- Add a new page: create `src/pages/NewPage.jsx`, import in `App.jsx`, and add a `<Route>`. Wrap in `ProtectedRoute` if auth‑only.
- Use API client: add endpoint helpers in `client.js` to keep requests centralized.
- Use player: import `usePlayer()` to play/enqueue tracks from any component.
- Use toasts: `const { toastSuccess, toastError } = useUI()` to show feedback.
- Theme tweaks: adjust tokens/overrides in `ThemeContext.jsx`; expose UI to call `toggleTheme()`.

## Troubleshooting

- CORS errors: backend `FRONTEND_ORIGIN` must include your frontend origin exactly.
- Audio won’t play: ensure backend is running, the `/api/music/stream` proxy works, and Jamendo credentials are set on the backend.
- 401 loops: confirm tokens aren’t expired; `AuthContext` will auto‑logout on 401 and at `exp` time.
- Assets 404: check `index.html` and public assets configuration.

## Deploying a static build (example: Render Static Site)

- Root: `frontend`
- Build Command: `npm install && npm run build`
- Publish Directory: `dist`
- Environment variable: `VITE_API_BASE_URL=<your-backend>/api`
- Update backend CORS `FRONTEND_ORIGIN` to the static site’s origin

---

This document reflects the current codebase:

- Theme: `src/context/ThemeContext.jsx`
- UI: `src/context/UIContext.jsx`
- Auth: `src/context/AuthContext.jsx`
- Player: `src/context/PlayerContext.jsx`
- API client and helpers: `frontend/client.js`
- Routing and shell: `src/App.jsx`, `src/main.jsx`
