// Quick integration check: spins up the server, connects 5 fake players
// over real sockets, plays one full round (including a wrong-catch vote),
// and asserts the scoring rule landed correctly. Run with:
//   node test/simulate.js
const http = require("http");
const express = require("express");
const { Server } = require("socket.io");
const { io: ioClient } = require("socket.io-client");
const { randomUUID } = require("crypto");

// Re-require the same wiring as src/index.js but on an ephemeral port and
// without static-file serving, so this can run without a client build.
const { RoomStore, MIN_PLAYERS } = require("../src/rooms");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
const store = new RoomStore();

function broadcast(room) {
  io.to(room.code).emit("roomState", room.toPublicState());
}
function sendAssignments(room) {
  for (const playerId of room.activePlayerIds()) {
    const player = room.players.get(playerId);
    if (player?.socketId) io.to(player.socketId).emit("yourAssignment", room.assignmentFor(playerId));
  }
}

io.on("connection", (socket) => {
  socket.on("createRoom", ({ name }) => {
    const room = store.create();
    const playerId = randomUUID();
    room.addPlayer(playerId, name, socket.id);
    socket.data.roomCode = room.code;
    socket.data.playerId = playerId;
    socket.join(room.code);
    socket.emit("roomCreated", { roomCode: room.code, playerId });
    broadcast(room);
  });
  socket.on("joinRoom", ({ roomCode, name }) => {
    const room = store.get(roomCode);
    const playerId = randomUUID();
    room.addPlayer(playerId, name, socket.id);
    socket.data.roomCode = room.code;
    socket.data.playerId = playerId;
    socket.join(room.code);
    socket.emit("joined", { roomCode: room.code, playerId });
    broadcast(room);
  });
  socket.on("startGame", async () => {
    const room = store.get(socket.data.roomCode);
    room.category = "food";
    await room.startRound();
    broadcast(room);
    sendAssignments(room);
  });
  socket.on("ackReveal", () => {
    const room = store.get(socket.data.roomCode);
    room.ackReveal(socket.data.playerId);
    broadcast(room);
  });
  socket.on("beginVoting", () => {
    const room = store.get(socket.data.roomCode);
    room.beginVoting();
    broadcast(room);
  });
  socket.on("castVote", ({ votedForId }) => {
    const room = store.get(socket.data.roomCode);
    room.castVote(socket.data.playerId, votedForId);
    broadcast(room);
  });
});

function assert(cond, msg) {
  if (!cond) throw new Error("FAIL: " + msg);
  console.log("ok:", msg);
}

server.listen(0, async () => {
  const port = server.address().port;
  const url = `http://localhost:${port}`;
  const names = ["Alice", "Bob", "Carol", "Dave", "Erin"];
  const clients = names.map(() => ioClient(url));
  const state = {}; // name -> latest roomState
  const mine = {}; // name -> {playerId, assignment}

  clients.forEach((c, i) => {
    c.on("roomState", (s) => (state[names[i]] = s));
    c.on("yourAssignment", (a) => (mine[names[i]] = { ...(mine[names[i]] || {}), assignment: a }));
    c.on("roomCreated", ({ roomCode, playerId }) => (mine[names[i]] = { roomCode, playerId }));
    c.on("joined", ({ roomCode, playerId }) => (mine[names[i]] = { roomCode, playerId }));
  });

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  clients[0].emit("createRoom", { name: names[0] });
  await wait(300);
  const roomCode = mine.Alice.roomCode;
  assert(roomCode.length === 4, "room created with a 4-char code");

  for (let i = 1; i < clients.length; i++) {
    clients[i].emit("joinRoom", { roomCode, name: names[i] });
  }
  await wait(300);
  assert(state.Alice.players.length === 5, "all 5 players joined the room");

  clients[0].emit("startGame");
  await wait(6000); // startRound now does a best-effort image lookup (up to a 5s timeout)
  assert(state.Alice.phase === "reveal", "phase moved to reveal");

  const imposterName = names.find((n) => mine[n].assignment.isImposter);
  const civilianNames = names.filter((n) => n !== imposterName);
  assert(imposterName, "exactly one imposter assigned");
  assert(mine[imposterName].assignment.word === null, "imposter gets no word");
  civilianNames.forEach((n) => assert(typeof mine[n].assignment.word === "string", `${n} got a word`));

  clients.forEach((c) => c.emit("ackReveal"));
  await wait(300);
  assert(state.Alice.phase === "discussion", "phase moved to discussion after all acked");

  clients[0].emit("beginVoting");
  await wait(300);
  assert(state.Alice.phase === "voting", "phase moved to voting");

  // Everyone wrongly votes for the first civilian (a deliberate wrong catch).
  const wronglyAccused = civilianNames[0];
  const accusedIdx = names.indexOf(wronglyAccused);
  const accusedId = mine[wronglyAccused].playerId;
  clients.forEach((c) => c.emit("castVote", { votedForId: accusedId }));
  await wait(400);

  assert(state.Alice.phase === "results", "phase moved to results after all voted");
  const result = state.Alice.round.result;
  assert(result.outcome === "wrong", "outcome recorded as a wrong catch");
  assert(result.accusedId === accusedId, "accused matches who was voted for");

  const finalScores = Object.fromEntries(state.Alice.players.map((p) => [p.name, p.score]));
  assert(finalScores[wronglyAccused] === -1, `${wronglyAccused} (wrongly accused) scored -1`);
  assert(finalScores[imposterName] === 1, `${imposterName} (imposter, escaped) scored 1`);
  names
    .filter((n) => n !== wronglyAccused && n !== imposterName)
    .forEach((n) => assert(finalScores[n] === 0, `${n} scored 0`));

  console.log("\nAll simulation checks passed.");
  clients.forEach((c) => c.close());
  server.close();
  process.exit(0);
});
