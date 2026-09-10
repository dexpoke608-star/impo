import Confetti from "../components/Confetti.jsx";
import { avatarColor, initials } from "../util";

const OUTCOME_COPY = {
  caught: { emoji: "🎉", title: "Caught! The group wins the round!" },
  wrong: { emoji: "😈", title: "Wrong guess — the Imposter got away!" },
  tie: { emoji: "🤷", title: "No agreement — the Imposter slips away!" },
};

export default function Results({ room, myPlayerId, isHost, onPlayAgain, onBackToLobby, onLeave }) {
  const { result } = room.round;
  const playerById = Object.fromEntries(room.players.map((p) => [p.id, p]));
  const imposter = playerById[result.imposterId];
  const outcome = OUTCOME_COPY[result.outcome];

  const maxVotes = Math.max(1, ...Object.values(result.voteCounts));
  const sortedByScore = [...room.players].sort((a, b) => b.score - a.score);
  const leaderScore = sortedByScore[0]?.score ?? 0;

  return (
    <div className="container">
      {result.outcome === "caught" && <Confetti />}

      <div className={`outcome-banner ${result.outcome}`}>
        <div className="big-emoji">{outcome.emoji}</div>
        <h2>{outcome.title}</h2>
        <p style={{ margin: "6px 0 0" }}>
          The Imposter was <strong>{imposter?.name || "?"}</strong>
        </p>
        <p style={{ color: "var(--text-dim)", margin: "4px 0 0" }}>
          The word was <strong style={{ color: "var(--text)" }}>{result.word}</strong> ({result.category})
        </p>
      </div>

      <div className="card">
        <div className="section-title">Votes</div>
        <div className="vote-tally" style={{ marginTop: 10 }}>
          {room.players.map((p) => {
            const count = result.voteCounts[p.id] || 0;
            return (
              <div className="tally-row" key={p.id}>
                <span style={{ width: 70, flexShrink: 0 }}>{p.name}</span>
                <div className="tally-bar-track">
                  <div className="tally-bar-fill" style={{ width: `${(count / maxVotes) * 100}%` }} />
                </div>
                <span style={{ width: 18, textAlign: "right", flexShrink: 0 }}>{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <div className="section-title">Scoreboard</div>
        <div className="player-list" style={{ marginTop: 10 }}>
          {sortedByScore.map((p) => {
            const gained = result.pointsAwarded[p.id] || 0;
            return (
              <div className="player-row" key={p.id}>
                <div className="avatar" style={{ background: avatarColor(p.id) }}>
                  {initials(p.name)}
                </div>
                <span className={`name ${p.id === myPlayerId ? "" : "dim"}`}>
                  {p.score === leaderScore && leaderScore > 0 && <span className="crown">👑</span>} {p.name}
                </span>
                <span className={`points-badge ${gained === 0 ? "zero" : gained < 0 ? "negative" : ""}`}>
                  {gained > 0 ? `+${gained}` : gained}
                </span>
                <span className="score-pill">{p.score}</span>
              </div>
            );
          })}
        </div>
      </div>

      {isHost ? (
        <>
          <button className="btn btn-primary btn-block" onClick={onPlayAgain}>
            🔁 Play Again (same category)
          </button>
          <button className="btn btn-ghost btn-block" onClick={onBackToLobby}>
            ⚙️ Change Players / Category
          </button>
        </>
      ) : (
        <p className="waiting-note">Waiting for the host to start the next round…</p>
      )}

      <div style={{ textAlign: "center" }}>
        <button className="link-btn" onClick={onLeave}>
          Leave room
        </button>
      </div>
    </div>
  );
}
