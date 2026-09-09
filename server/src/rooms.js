const { generateRoomCode, buildRound, tallyVotes, scoreRound } = require("./gameLogic");

const MIN_PLAYERS = 3;
const MAX_PLAYERS = 16;
const DISCUSSION_MS = 3 * 60 * 1000;
const ROOM_IDLE_TTL_MS = 4 * 60 * 60 * 1000; // clean up abandoned rooms after 4h

class Room {
  constructor(code) {
    this.code = code;
    this.hostId = null;
    this.phase = "lobby"; // lobby | reveal | discussion | voting | results
    this.category = "random";
    this.players = new Map(); // id -> { id, name, score, socketId, connected }
    this.order = [];
    this.round = null;
    this.usedWords = {};
    this.lastActivity = Date.now();
    this.discussionTimer = null;
  }

  touch() {
    this.lastActivity = Date.now();
  }

  addPlayer(id, name, socketId) {
    this.players.set(id, { id, name, score: 0, socketId, connected: true });
    this.order.push(id);
    if (!this.hostId) this.hostId = id;
    this.touch();
  }

  removePlayer(id) {
    this.players.delete(id);
    this.order = this.order.filter((pid) => pid !== id);
    if (this.hostId === id) this.hostId = this.order[0] || null;
    this.touch();
  }

  activePlayerIds() {
    return this.order.filter((id) => this.players.has(id));
  }

  startRound() {
    const ids = this.activePlayerIds();
    const roundNumber = this.round ? this.round.number + 1 : 1;
    this.round = buildRound(ids, this.category, this.usedWords, roundNumber);
    this.phase = "reveal";
    this.touch();
  }

  ackReveal(playerId) {
    if (!this.round) return;
    this.round.ackedReveal.add(playerId);
    const allAcked = this.activePlayerIds().every((id) => this.round.ackedReveal.has(id));
    if (allAcked) {
      this.phase = "discussion";
      this.round.discussionEndsAt = Date.now() + DISCUSSION_MS;
    }
    this.touch();
  }

  beginVoting() {
    if (this.discussionTimer) {
      clearTimeout(this.discussionTimer);
      this.discussionTimer = null;
    }
    this.phase = "voting";
    this.touch();
  }

  castVote(voterId, votedForId) {
    if (!this.round) return;
    this.round.votes.set(voterId, votedForId);
    const allVoted = this.activePlayerIds().every((id) => this.round.votes.has(id));
    if (allVoted) this.finishVoting();
    this.touch();
  }

  finishVoting() {
    const ids = this.activePlayerIds();
    const { counts, accusedId, tie } = tallyVotes(this.round.votes);
    const { pointsAwarded, outcome } = scoreRound({
      playerIds: ids,
      imposterId: this.round.imposterId,
      accusedId,
      tie,
    });

    for (const [playerId, points] of pointsAwarded.entries()) {
      const player = this.players.get(playerId);
      if (player) player.score += points;
    }

    this.round.result = {
      imposterId: this.round.imposterId,
      word: this.round.word,
      category: this.round.category,
      accusedId,
      tie,
      outcome,
      voteCounts: Object.fromEntries(counts),
      votes: Object.fromEntries(this.round.votes),
      pointsAwarded: Object.fromEntries(pointsAwarded),
    };
    this.phase = "results";
    this.touch();
  }

  /** Public snapshot broadcast to every viewer — never contains the
   * word or imposter identity outside of the `result` block, which is
   * only populated once the phase is "results". */
  toPublicState() {
    return {
      code: this.code,
      hostId: this.hostId,
      phase: this.phase,
      category: this.category,
      players: this.activePlayerIds().map((id) => {
        const p = this.players.get(id);
        return { id: p.id, name: p.name, score: p.score, connected: p.connected };
      }),
      round: this.round
        ? {
            number: this.round.number,
            ackedCount: this.round.ackedReveal.size,
            totalCount: this.activePlayerIds().length,
            discussionEndsAt: this.round.discussionEndsAt,
            votedCount: this.round.votes.size,
            result: this.round.result,
          }
        : null,
    };
  }

  /** Private payload for exactly one player: their word (or imposter
   * status) for the current round. */
  assignmentFor(playerId) {
    if (!this.round) return null;
    const isImposter = this.round.imposterId === playerId;
    return {
      isImposter,
      word: isImposter ? null : this.round.word,
      category: this.round.category,
    };
  }
}

class RoomStore {
  constructor() {
    this.rooms = new Map();
    setInterval(() => this.reap(), 30 * 60 * 1000).unref();
  }

  create() {
    const code = generateRoomCode(this.rooms);
    const room = new Room(code);
    this.rooms.set(code, room);
    return room;
  }

  get(code) {
    return this.rooms.get((code || "").toUpperCase());
  }

  delete(code) {
    this.rooms.delete(code);
  }

  reap() {
    const now = Date.now();
    for (const [code, room] of this.rooms.entries()) {
      if (now - room.lastActivity > ROOM_IDLE_TTL_MS) this.rooms.delete(code);
    }
  }
}

module.exports = { RoomStore, MIN_PLAYERS, MAX_PLAYERS, DISCUSSION_MS };
