const { pickWord } = require("./wordBank");
const { lookupImage } = require("./imageLookup");

const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I

function generateRoomCode(existingCodes, length = 4) {
  let code;
  do {
    code = Array.from(
      { length },
      () => ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)]
    ).join("");
  } while (existingCodes.has(code));
  return code;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Builds a new round: picks a word/category, an imposter, a shuffled
 * reveal order, and a best-effort image for the word. `playerIds` must have
 * at least 3 entries. `playerIds` also becomes the fixed set of round
 * participants — anyone who joins the room after this resolves spectates
 * until the next round instead of being folded into an in-progress one. */
async function buildRound(playerIds, category, usedWords, roundNumber) {
  const { word, wiki, category: chosenCategory } = pickWord(category, usedWords);
  const imposterId = playerIds[Math.floor(Math.random() * playerIds.length)];
  const imageUrl = await lookupImage(wiki || word);
  return {
    number: roundNumber,
    word,
    imageUrl,
    category: chosenCategory,
    imposterId,
    participantIds: new Set(playerIds),
    revealOrder: shuffle(playerIds),
    ackedReveal: new Set(),
    discussionEndsAt: null,
    votes: new Map(),
    result: null,
  };
}

/** Tallies votes (Map<voterId, votedForId>) into per-candidate counts and
 * decides who the group accused. Returns { counts, accusedId, tie }.
 * `accusedId` is null when there is a tie for the most votes, or when
 * nobody voted. */
function tallyVotes(votes) {
  const counts = new Map();
  for (const votedForId of votes.values()) {
    counts.set(votedForId, (counts.get(votedForId) || 0) + 1);
  }

  let maxVotes = 0;
  for (const count of counts.values()) maxVotes = Math.max(maxVotes, count);

  const topCandidates = [...counts.entries()]
    .filter(([, count]) => count === maxVotes)
    .map(([id]) => id);

  const tie = maxVotes === 0 || topCandidates.length !== 1;
  const accusedId = tie ? null : topCandidates[0];

  return { counts, accusedId, tie, maxVotes };
}

/**
 * Applies the house scoring rule:
 *  - Correct catch (accused === imposter): every non-imposter player +1,
 *    imposter -2 (caught red-handed).
 *  - Wrong catch (accused is an innocent player): the wrongly-accused
 *    player -1 (penalized for getting caught out) AND the imposter +1
 *    (they escaped detection). Everyone else +0.
 *  - Tie / no clear accusation: the imposter +1 (escaped by default),
 *    nobody else scores.
 * Returns { pointsAwarded: Map<playerId, number>, outcome }.
 */
function scoreRound({ playerIds, imposterId, accusedId, tie }) {
  const pointsAwarded = new Map(playerIds.map((id) => [id, 0]));
  let outcome;

  if (tie) {
    pointsAwarded.set(imposterId, (pointsAwarded.get(imposterId) || 0) + 1);
    outcome = "tie";
  } else if (accusedId === imposterId) {
    for (const id of playerIds) {
      if (id !== imposterId) pointsAwarded.set(id, (pointsAwarded.get(id) || 0) + 1);
    }
    pointsAwarded.set(imposterId, (pointsAwarded.get(imposterId) || 0) - 2);
    outcome = "caught";
  } else {
    pointsAwarded.set(accusedId, (pointsAwarded.get(accusedId) || 0) - 1);
    pointsAwarded.set(imposterId, (pointsAwarded.get(imposterId) || 0) + 1);
    outcome = "wrong";
  }

  return { pointsAwarded, outcome };
}

module.exports = { generateRoomCode, shuffle, buildRound, tallyVotes, scoreRound };
