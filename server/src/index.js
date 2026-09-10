const path = require("path");
const http = require("http");
const express = require("express");
const { Server } = require("socket.io");
const { randomUUID } = require("crypto");

const { RoomStore, MIN_PLAYERS, MAX_PLAYERS } = require("./rooms");
const { categoryList } = require("./wordBank");

const PORT = process.env.PORT || 3001;
const CLIENT_DIST = path.join(__dirname, "..", "..", "client", "dist");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const store = new RoomStore();

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use(express.static(CLIENT_DIST));
app.get(/^(?!\/api\/|\/socket\.io\/).*/, (_req, res) => {
  res.sendFile(path.join(CLIENT_DIST, "index.html"));
});

function broadcast(room) {
  io.to(room.code).emit("roomState", room.toPublicState());
}

function sendAssignments(room) {
  for (const playerId of room.activePlayerIds()) {
    const player = room.players.get(playerId);
    if (player?.socketId) {
      io.to(player.socketId).emit("yourAssignment", room.assignmentFor(playerId));
    }
  }
}

function scheduleDiscussionEnd(room) {
  if (room.discussionTimer) clearTimeout(room.discussionTimer);
  const msLeft = Math.max(0, room.round.discussionEndsAt - Date.now());
  room.discussionTimer = setTimeout(() => {
    if (room.phase === "discussion") {
      room.beginVoting();
      broadcast(room);
    }
  }, msLeft);
}

function fail(socket, message) {
  socket.emit("errorMessage", { message });
}

io.on("connection", (socket) => {
  socket.on("createRoom", ({ name }) => {
    const cleanName = String(name || "").trim().slice(0, 24);
    if (!cleanName) return fail(socket, "Enter your name first.");

    const room = store.create();
    const playerId = randomUUID();
    room.addPlayer(playerId, cleanName, socket.id);

    socket.data.roomCode = room.code;
    socket.data.playerId = playerId;
    socket.join(room.code);

    socket.emit("roomCreated", { roomCode: room.code, playerId });
    broadcast(room);
  });

  socket.on("joinRoom", ({ roomCode, name }) => {
    const cleanName = String(name || "").trim().slice(0, 24);
    if (!cleanName) return fail(socket, "Enter your name first.");

    const room = store.get(roomCode);
    if (!room) return fail(socket, "That room code doesn't exist.");
    if (room.players.size >= MAX_PLAYERS) return fail(socket, "This room is full.");

    const playerId = randomUUID();
    room.addPlayer(playerId, cleanName, socket.id);

    socket.data.roomCode = room.code;
    socket.data.playerId = playerId;
    socket.join(room.code);

    socket.emit("joined", { roomCode: room.code, playerId });
    // Joining mid-round: they're a spectator for this round (never sees the
    // word), so send that state right away instead of leaving them blank.
    if (room.phase !== "lobby") {
      socket.emit("yourAssignment", room.assignmentFor(playerId));
    }
    broadcast(room);
  });

  socket.on("rejoinRoom", ({ roomCode, playerId }) => {
    const room = store.get(roomCode);
    if (!room || !room.players.has(playerId)) {
      return fail(socket, "Couldn't reconnect you to that room.");
    }
    const player = room.players.get(playerId);
    player.socketId = socket.id;
    player.connected = true;

    socket.data.roomCode = room.code;
    socket.data.playerId = playerId;
    socket.join(room.code);

    socket.emit("joined", { roomCode: room.code, playerId });
    if (room.phase !== "lobby") {
      socket.emit("yourAssignment", room.assignmentFor(playerId));
    }
    broadcast(room);
  });

  socket.on("updateCategory", ({ category }) => {
    const room = store.get(socket.data.roomCode);
    if (!room || room.hostId !== socket.data.playerId) return;
    if (room.phase !== "lobby") return;
    room.category = category;
    room.touch();
    broadcast(room);
  });

  socket.on("startGame", async () => {
    const room = store.get(socket.data.roomCode);
    if (!room) return fail(socket, "Room not found.");
    if (room.hostId !== socket.data.playerId) return fail(socket, "Only the host can start the game.");
    if (room.phase !== "lobby") return;
    if (room.activePlayerIds().length < MIN_PLAYERS) {
      return fail(socket, `You need at least ${MIN_PLAYERS} players to start.`);
    }
    await room.startRound();
    broadcast(room);
    sendAssignments(room);
  });

  socket.on("ackReveal", () => {
    const room = store.get(socket.data.roomCode);
    if (!room || room.phase !== "reveal") return;
    room.ackReveal(socket.data.playerId);
    if (room.phase === "discussion") scheduleDiscussionEnd(room);
    broadcast(room);
  });

  socket.on("beginVoting", () => {
    const room = store.get(socket.data.roomCode);
    if (!room || room.hostId !== socket.data.playerId) return;
    if (room.phase !== "discussion") return;
    room.beginVoting();
    broadcast(room);
  });

  socket.on("castVote", ({ votedForId }) => {
    const room = store.get(socket.data.roomCode);
    if (!room || room.phase !== "voting") return;
    const voterId = socket.data.playerId;
    if (!voterId || voterId === votedForId) return;
    if (!room.players.has(votedForId)) return;
    room.castVote(voterId, votedForId);
    broadcast(room);
  });

  socket.on("nextRound", async () => {
    const room = store.get(socket.data.roomCode);
    if (!room || room.hostId !== socket.data.playerId) return;
    if (room.phase !== "results") return;
    if (room.activePlayerIds().length < MIN_PLAYERS) {
      return fail(socket, `You need at least ${MIN_PLAYERS} players to start.`);
    }
    await room.startRound();
    broadcast(room);
    sendAssignments(room);
  });

  socket.on("backToLobby", () => {
    const room = store.get(socket.data.roomCode);
    if (!room || room.hostId !== socket.data.playerId) return;
    if (room.phase !== "results") return;
    room.phase = "lobby";
    room.touch();
    broadcast(room);
  });

  socket.on("leaveRoom", () => {
    const room = store.get(socket.data.roomCode);
    if (!room) return;
    room.removePlayer(socket.data.playerId);
    socket.leave(room.code);
    if (room.players.size === 0) store.delete(room.code);
    else broadcast(room);
    socket.data.roomCode = null;
    socket.data.playerId = null;
  });

  socket.on("disconnect", () => {
    const room = store.get(socket.data.roomCode);
    if (!room) return;
    const player = room.players.get(socket.data.playerId);
    if (!player) return;

    if (room.phase === "lobby") {
      room.removePlayer(player.id);
      if (room.players.size === 0) store.delete(room.code);
      else broadcast(room);
    } else {
      room.markDisconnected(player.id);
      broadcast(room);
    }
  });
});

app.get("/api/categories", (_req, res) => res.json(categoryList()));

server.listen(PORT, () => {
  console.log(`Imposter Party server listening on port ${PORT}`);
});
