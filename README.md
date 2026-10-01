# WHO? — Real-Time Multiplayer Musical Party Game

WHO? is a real-time multiplayer music deduction game built with TypeScript, React 18, Next.js 14 App Router, Node.js, Express, Socket.IO, and Redis.

Players join a room, secretly choose a song and a specific musical snippet, optionally predict how the room will react, and then compete to deduce who chose each song by betting chips.

---

## 1. Architecture Overview

This project is structured as a high-performance monorepo managed by Turborepo and pnpm:

- `packages/shared`: Universal domain types, Zod validation schemas, odds and pari-mutuel betting engines, risk evaluation algorithms, and track uniqueness utilities.
- `apps/server`: Authoritative game engine, state machine, timer sequencer, Redis persistence layer, YouTube Data API v3 integration, and WebSocket handlers via Socket.IO.
- `apps/web`: Responsive Next.js 14 frontend, Tailwind CSS, YouTube IFrame Player API integration, audio waveform scrubber, and real-time state synchronization.

---

## 2. Gameplay Mechanics and Rules

1. **Lobby**:
   - Host configures room parameters (player capacity, betting countdown, snippet duration, starting chips, and owner predictions).
   - Match requires at least 2 players, and all human players must toggle ready before the host can start.
   - Host can optionally add automated Bot players to fill empty seats.

2. **Secret Music Selection (Turn-Based)**:
   - Each player gets a server-authoritative turn to choose a secret song from YouTube or preview catalog.
   - Player selects the start time and snippet duration (15s, 20s, or 30s) using the timeline scrubber.
   - Clicking Confirmar Trecho saves a draft to the server to prevent data loss on turn timeout.
   - If enabled, the owner can place a secondary prediction (Player Count, More Than, Fewer Than, Specific Players) risking chips on the room's reaction.
   - Duplicate tracks in the same match are rejected by the authoritative server engine (`TRACK_ALREADY_SELECTED`).

3. **Anonymous Deduction and Betting**:
   - Total rounds strictly equals the number of submitted songs (1 round per participant).
   - The selected snippet plays anonymously without revealing the track owner.
   - Track owner enters spectator mode, observing live betting statuses without betting on themselves.
   - Guessers select a suspect from the other participants and wager chips within their available balance.
   - Balances and reserved chips are enforced by the server; over-betting is rejected.

4. **Multi-Stage Reveal and Settlement**:
   - Bets lock authoritatively when time expires or all players confirm.
   - Sequence reveals guesser wagers step-by-step, followed by the true track owner and secondary prediction outcome.
   - Pari-mutuel odds distribute chips to winners and deduct losses.
   - Host advances to the next round until all tracks are resolved, leading to the final scoreboard.

---

## 3. Security and Multiplayer Integrity

- **DevTools Zero-Leak Guarantee**:
  - The server emits player-specific sanitized state views (`getSanitizedRoomState`).
  - `player.selectedTrack` is stripped for all other participants.
  - Songs submitted during selection are masked to generic placeholders (`Faixa Secreta`) until their round begins.
  - Future round songs remain masked (`Faixa Futura`) during betting and reveal phases.
  - Guesser stakes and suspects remain hidden during open betting (`targetOwnerId: '', chipAmount: 0`).
  - Owner predictions remain private to the owner until the reveal stage.

- **Cryptographic Reconnection Tokens**:
  - When creating or joining a room, the server issues a unique UUID reconnection token stored in client `localStorage`.
  - Reconnection attempts validate this token before reassigning player identity and rotate the token upon completion.
  - Hijacking room sessions by guessing player IDs is prevented.

- **Strict Authorization Matrix**:
  - Only the host can modify settings, add bots, start the game, skip reveal steps, and resolve rounds.
  - Room settings and bot additions are restricted exclusively to the LOBBY phase.
  - Leaving a room strictly resolves the socket identity to prevent third-party kicking.
  - Chat and reaction messages derive sender nicknames from the authenticated socket player record.

---

## 4. Environment Configuration

Copy the example environment files:

```bash
cp .env.example .env
cp apps/server/.env.example apps/server/.env
```

Key environment variables:

| Variable | Description | Default |
|---|---|---|
| `PORT` | Backend server port | `4000` |
| `NODE_ENV` | Runtime environment (`development` / `production`) | `development` |
| `CLIENT_ORIGIN` | Allowed CORS origins (comma-separated if multiple) | `http://localhost:3000` |
| `REDIS_URL` | Redis connection URL for persistence | Optional (`redis://localhost:6379`) |
| `YOUTUBE_API_KEY` | Google YouTube Data API v3 key (server-side only) | Required for YouTube search |
| `NEXT_PUBLIC_SERVER_URL` | Backend URL for web client socket connection | `http://localhost:4000` |

---

## 5. Development and Testing

Install dependencies:
```bash
pnpm install
```

Start development servers (Next.js on `:3000`, Express/Socket.IO on `:4000`):
```bash
pnpm dev
```

Run TypeScript typechecking across all workspaces:
```bash
pnpm check-types
```

Run automated integration and unit test suite:
```bash
pnpm test
```

Create production builds:
```bash
pnpm build
```

---

## 6. Docker Deployment

Deploy the application and Redis persistence container via Docker Compose:

```bash
docker compose up -d --build
```

Access the web client at `http://localhost:3000` and the API healthcheck at `http://localhost:4000/health`.

---

## 7. Production Deployment on Railway

WHO? is designed to run on Railway in a single project architecture consisting of two services:
1. **WHO App Service**: A multi-stage Docker container running Next.js (port 3000) and Express/Socket.IO (port 4000) concurrently via Turborepo (`pnpm start`).
2. **Redis Service**: A private Railway Redis database providing persistent room state.

### Step 1: Create a Railway Project
1. Log into your [Railway dashboard](https://railway.com/).
2. Click **New Project** and choose **Deploy from GitHub repo**.
3. Select the `ScryLk/who` repository.

### Step 2: Provision the Redis Database
1. Inside your new Railway project, click **Create** > **Database** > **Add Redis**.
2. Railway will create a private Redis instance and expose the reference variable `${{Redis.REDIS_URL}}`.

### Step 3: Configure Build Arguments
Next.js inlines `NEXT_PUBLIC_*` environment variables during build time (`pnpm build`).
In your WHO App service settings:
1. Go to **Settings** > **Build**.
2. Under **Build Arguments**, add:
   - `NEXT_PUBLIC_SERVER_URL`: `https://<your-backend-domain>.up.railway.app`

### Step 4: Configure Runtime Environment Variables
In your WHO App service settings, navigate to **Variables** and configure:

| Variable | Recommended Value | Purpose |
|---|---|---|
| `NODE_ENV` | `production` | Enables production optimizations and security enforcement |
| `PORT` | `4000` | Port for Express & Socket.IO server |
| `CLIENT_ORIGIN` | `https://<your-frontend-domain>.up.railway.app` | Whitelists frontend origin for CORS and WebSockets |
| `REDIS_URL` | `${{Redis.REDIS_URL}}` | Connects server to the private Railway Redis service |
| `YOUTUBE_API_KEY` | `<your-google-api-key>` | Server secret for YouTube Data API v3 catalog searches |

### Step 5: Configure Port Routing and Public Domains
Railway allows exposing multiple ports from a single container via custom service domains:
1. Go to **Settings** > **Networking**.
2. **Frontend Domain (Port 3000)**:
   - Generate or attach a domain (e.g. `who-game.up.railway.app`).
   - Set the port to `3000` (Next.js web app).
3. **Backend Domain (Port 4000)**:
   - Generate or attach a secondary domain (e.g. `who-api.up.railway.app`).
   - Set the port to `4000` (Express / Socket.IO server).

### Step 6: Verify Deployment Health
1. Test backend healthcheck:
   ```bash
   curl -s https://who-api.up.railway.app/health
   # Expected response: {"status":"ok","game":"WHO","timestamp":"..."}
   ```
2. Open the frontend domain in your browser (`https://who-game.up.railway.app`).
3. Create a room and verify that the lobby connects to the WebSocket backend without CORS or connection errors in the browser console.

