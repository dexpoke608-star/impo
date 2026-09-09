# Imposter Party 🎭

A realtime multiplayer party game. One player hosts a room and shares a link;
everyone else joins from their own phone or laptop. All but one player get
the same secret word — the Imposter gets nothing and has to bluff. After a
round of discussion, everyone votes from their own device.

**Scoring house rule:**
- Group catches the real Imposter → every non-Imposter player gets **+1**, Imposter gets **0**.
- Group wrongly accuses an innocent player → that wrongly-accused player gets **+1**
  (they successfully threw suspicion off the Imposter), **and** the Imposter also
  gets **+1** (they escaped). Everyone else gets 0.
- Vote ends in a tie → the Imposter escapes and gets **+1**; nobody else scores.

## Project layout

```
server/   Node + Express + Socket.io backend (holds all game state, in-memory)
client/   React + Vite frontend (the UI everyone plays on)
```

The server is the only source of truth. Each player's word/imposter status
is sent privately to their own socket — no other player's browser ever
receives it.

## Run it locally

Requires Node.js 18+.

```bash
npm run install:all   # installs both server and client dependencies

# in one terminal:
npm run dev:server    # backend on http://localhost:3001

# in another terminal:
npm run dev:client    # frontend on http://localhost:5173 (proxies API/websocket to :3001)
```

Open http://localhost:5173, create a room, then open more browser tabs
(or an incognito window) to simulate other players joining.

### Testing with real friends on the same WiFi (no deployment needed)

1. Run `npm run install:all`, then `npm run build`, then `npm start` — this
   builds the client and serves everything from one server on port 3001.
2. Find your computer's local network IP (Windows: `ipconfig`, look for
   "IPv4 Address", e.g. `192.168.1.23`).
3. Have friends on the same WiFi open `http://192.168.1.23:3001` on their
   phones and join with the room code.

This only works while your computer is on and everyone is on the same
network. For a link that works from anywhere, deploy it (below).

## Deploying so anyone can join from anywhere

This is one Node service (it serves the built frontend itself), so any
free Node host works. **Render** is the easiest:

1. Push this project to a GitHub repo.
2. On [render.com](https://render.com), click **New → Web Service** and
   connect that repo.
3. Configure:
   - **Build Command:** `npm run build`
   - **Start Command:** `npm start`
4. Deploy. Render gives you a public URL like `https://imposter-party.onrender.com`
   — that's your permanent shareable link (create a room there, then share
   the room link Render gives you the same way).

Railway and Fly.io work the same way (one build command, one start
command, no separate services needed). Vercel is **not** a good fit here
since it doesn't run a persistent Socket.io server.

Note: on a free tier, the server may "sleep" after inactivity and take a
few seconds to wake up on the first request of the day — normal for free
hosting, not a bug.

## Notes / limitations

- Room state lives in server memory — if the server restarts, in-progress
  rooms are lost (fine for a casual party game; nobody needs games to
  survive a redeploy).
- Rooms are cleaned up automatically after 4 hours of inactivity.
- Minimum 3 players per room; up to 16.
