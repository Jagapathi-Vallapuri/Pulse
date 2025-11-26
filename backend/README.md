# Pulse — Backend

This folder contains the backend REST API for the Pulse application (Express + MongoDB + GridFS + Redis). This README is a concise developer guide to get the backend running locally, explains the 2FA session flow, documents media storage (avatars, playlist covers, personal uploads) in GridFS, and the Jamendo integration with an audio streaming proxy.

## Quick start

- Copy or create a `.env` file in `backend/` (see Environment Variables).
- Install dependencies and start the local dev server:

```powershell
cd backend
npm install
npm run dev
```

The API mounts under `/api` and defaults to port `5000` (configurable via `PORT`).

## Environment Variables

Create a `.env` (or use environment secrets) containing at minimum:

```dotenv
MONGO_URL=<mongodb-uri>
JWT_SECRET=<strong-jwt-secret>
REDIS_URL=redis://localhost:6379
PORT=5000

# Email (2FA and notifications)
# SendGrid-first (recommended on PaaS), SMTP as fallback
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM="Pulse <no-reply@yourdomain.com>"

# SMTP fallback (optional; ports may be blocked on PaaS)
SMTP_HOST=smtp.example.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=you@example.com
SMTP_PASS=secret
SMTP_FROM="Pulse <no-reply@example.com>"

# CORS
FRONTEND_ORIGIN=http://localhost:5173

# Jamendo API
JAMENDO_CLIENT_ID=<your-jamendo-client-id>
```

Notes:
- The server validates required env vars at startup and will exit with a message if `MONGO_URL` or `JWT_SECRET` are missing.
- Prefer `REDIS_URL` for cloud providers (use `rediss://` for TLS).
- Email: Use SendGrid Web API with a Verified Sender or Domain for reliable delivery on cloud hosts. If SendGrid fails (e.g., 403 due to missing verification), the code will attempt SMTP as a fallback if configured.
- Proxy: `app.set('trust proxy', 1)` is enabled to honor `X-Forwarded-For` and related headers behind a load balancer or proxy (e.g., Render), fixing IP-based rate limiter issues.

## Running

- Development (auto-reload): `npm run dev`
- Production: `npm start`

Use `POST /api/auth/register` and `POST /api/auth/login` to exercise authentication flows.

## Media storage (GridFS)

Images (user avatars and playlist covers) and uploaded songs are stored in MongoDB using GridFS under the shared bucket name `uploads`.

- Avatars
	- Upload: `POST /api/users/me/avatar` (multipart form-data, field: `avatar`)
	- Stream current: `GET /api/users/me/avatar` (auth required) — streams from GridFS
	- Delete: `DELETE /api/users/me/avatar`
	- Avatars are always served from GridFS; the previous filesystem fallback has been removed.

- Playlist covers
	- Upload: `POST /api/users/playlists/:id/cover` (multipart form-data, field: `cover`)
	- Stream public: `GET /api/images/playlist/:id`
	- Old GridFS file is removed on update

- Personal songs
	- Upload: `POST /api/songs/upload` (multipart; fields: `song`, optional `cover`)
	- Stream audio: `GET /api/songs/stream/:filename`
	- Stream cover: `GET /api/songs/cover/:filename`
	- Delete: `DELETE /api/songs/:filename`
	- Metadata is stored in an independent `Song` collection (see `models/Song.js`) and references GridFS IDs; user documents no longer embed full song metadata.

All streaming endpoints support proper cleanup on client disconnect to avoid resource leaks.

## 2FA model (registration + password change)

Current design enforces email-based 2FA only for:

1. Initial registration (account activation)
2. Password changes (confirmation)

Login itself is a single step (JWT issued immediately) but only after the user has verified their email via the registration 2FA. A field `isVerified` on the `User` model gates access:

- `POST /api/auth/register` creates the user with `isVerified=false`, generates a `sessionId` + 6‑digit code, stores it in Redis at key `2fa:session:{sessionId}` with JSON payload `{ code, email, purpose: 'register' }` (TTL ~300s) and emails the code.
- Client calls `POST /api/auth/verify-2fa` with `{ email, code, type: 'register', sessionId }` to activate. On success: `isVerified` is set true and a JWT is returned.
- `POST /api/auth/login` returns 403 if `isVerified=false`.
- `POST /api/auth/change-password` sends a one-time 2FA code (stored at `2fa:{userId}`) and puts the hashed pending password at `pendingPassword:{userId}` until verified via `POST /api/auth/verify-2fa` with `type: 'password-change'`.

Security notes / future hardening:
- Consider hashing/HMAC’ing codes before storage (defense-in-depth if Redis compromised).
- Track attempt counts per session (`attempts:2fa:session:{sessionId}`) to lock after N failures.
- Consider adding optional time-based authenticator app support later (fallback to email only).
- Ensure SMTP rate limiting at provider level to deter abuse.

Client guidance:
- Persist `sessionId` (e.g., `sessionStorage`) during registration verification so refreshes don’t orphan the flow.
- On 403 login response with message `Account not verified`, redirect user to a resend/verification UX.

## Folder overview

Key folders and files:

- `controllers/` — Express route handlers (e.g., `authController.js`)
- `routes/` — Route wiring
- `services/` — Integrations: `cacheService.js` (Redis), `emailService.js`, `jamendoService.js`
- `models/` — Mongoose schemas (User, Playlist)
- `middleware/` — auth, validation, rate limiting, error handling
- `server.js` — app entrypoint

## API (high level)

Base path: `/api`

- Auth: `POST /auth/register`, `POST /auth/login`, `POST /auth/verify-2fa`, `POST /auth/change-password`
- Music
	- `GET /music/search`
	- `GET /music/track/:id`
	- `GET /music/popular`
	- `GET /music/albums`
	- `GET /music/albums/:id`
	- `GET /music/stream?src=<jamendo-audio-url>` — audio proxy with Range support and upstream abort on disconnect

- Users
	- Profile: `GET /users/me`, `PATCH /users/me` (about), `POST /users/me/avatar`, `GET /users/me/avatar`, `DELETE /users/me/avatar`
	- Favorites: `GET /users/favorites`, `POST /users/favorites` { trackId }, `DELETE /users/favorites` { trackId }
	- History: `POST /users/history` { trackId }, `GET /users/history`
	- Playlists: `GET /users/playlists`, `POST /users/playlists`, `GET /users/playlists/:id`, `PUT /users/playlists/:id`, `DELETE /users/playlists/:id`, `POST /users/playlists/:id/cover`

- Songs (personal uploads): `POST /songs/upload`, `GET /songs`, `GET /songs/stream/:filename`, `GET /songs/cover/:filename`, `DELETE /songs/:filename`

For full details of each route and payloads, inspect the `routes/` and `controllers/` files.

## Important operational notes

- Redis is used for caching and 2FA sessions; if Redis becomes unavailable the app falls back to a no-op cache for non-critical features, but authentication will fail if 2FA storage is unavailable.
- Keep `JWT_SECRET` strong and rotate it periodically if feasible.
- Do not commit `.env` to source control. Use a secrets manager for production deployments.
- Streaming stability: The audio proxy and GridFS streaming endpoints register `close`/`aborted`/`error` handlers to unpipe and destroy streams promptly when the client disconnects, and cancel upstream requests where applicable. This prevents file descriptor and memory leaks during partial downloads.
- Outbound SMTP: Many hosts block SMTP ports (25/465/587). Prefer SendGrid Web API on port 443. If you must use SMTP, ensure your provider permits it and that your environment can reach the SMTP host.

## Troubleshooting

- If the server exits on startup, check env var validation output for the missing variable.
- If email 2FA messages are not arriving, validate SMTP settings and check `emailService.js` logs.
- For Redis issues, verify `REDIS_URL` connectivity and that the Redis server supports EVAL commands (standard Redis does).
- SendGrid 403: Verify you created a Restricted API Key with "Mail Send" permission and have a Verified Sender or Domain in SendGrid. Also set `SENDGRID_FROM` to that verified address.
- CORS blocked: Ensure `FRONTEND_ORIGIN` includes your exact frontend origin(s). Multiple origins can be comma-separated.

## Deploying on Render

Backend (Web Service):
- Root: `backend`
- Build Command: `npm install`
- Start Command: `node server.js`
- Health Check Path: `/api/health`
- Environment Variables:
	- Required: `MONGO_URL`, `JWT_SECRET`, `JAMENDO_CLIENT_ID`
	- CORS: `FRONTEND_ORIGIN` (set to your Static Site URL)
	- Email: `SENDGRID_API_KEY`, `SENDGRID_FROM` (recommended), optional `SMTP_*` for fallback
- Notes:
	- Add Render egress IPs to MongoDB Atlas allowlist if Atlas is used.
	- Trust proxy is enabled; rate limiter uses forwarded IP.
	- SMTP may be blocked; prefer SendGrid.

Frontend (Static Site):
- Root: `frontend`
- Build Command: `npm install && npm run build`
- Publish Directory: `dist`
- Environment: `VITE_API_BASE_URL=https://<your-backend>.onrender.com/api`
- After deploy, set backend `FRONTEND_ORIGIN` to this Static Site origin.

## Jamendo API configuration and audio proxy

This backend uses the Jamendo API v3.0 for music discovery.

Add the following to your `.env`:

```dotenv
JAMENDO_CLIENT_ID=<your-jamendo-client-id>
```

Notes:
- You can create a Jamendo app to obtain a Client ID at https://devportal.jamendo.com/
- Endpoints used: `/tracks`, `/albums/tracks` with parameters for popularity ordering, `include=musicinfo`, and `audioformat=mp3` to ensure audio URLs are present.
- Audio playback is proxied by `GET /api/music/stream?src=<jamendo-audio-url>` to avoid CORS issues and support HTTP Range requests. The proxy whitelists Jamendo storage hosts to mitigate SSRF risks and forwards relevant headers (e.g., Range, Content-Type, Content-Length). Upstream requests are aborted if the client disconnects.
- Respect Jamendo’s licensing and usage policies; track audio is distributed under various Creative Commons licenses. Ensure your use complies with the specific license for each track.