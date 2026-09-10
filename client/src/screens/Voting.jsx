import { useState } from "react";
import { avatarColor, initials } from "../util";

export default function Voting({ room, myPlayerId, assignment, onVote }) {
  const [selected, setSelected] = useState(null);
  const isSpectating = assignment?.spectating;

  const participantIds = new Set(room.round.participantIds || room.players.map((p) => p.id));
  const playerById = Object.fromEntries(room.players.map((p) => [p.id, p]));
  const participants = room.players.filter((p) => participantIds.has(p.id));
  const candidates = participants.filter((p) => p.id !== myPlayerId);
  const liveVotes = room.round.liveVotes || {};

  const castVote = (playerId) => {
    setSelected(playerId);
    onVote(playerId);
  };

  const votesFor = {};
  for (const [voterId, votedForId] of Object.entries(liveVotes)) {
    (votesFor[votedForId] ||= []).push(voterId);
  }
  const maxVotes = Math.max(1, ...participants.map((p) => (votesFor[p.id] || []).length));
  const myVote = liveVotes[myPlayerId];

  return (
    <div className="container">
      <div className="brand" style={{ margin: 0 }}>
        <h1 style={{ fontSize: 24 }}>Who's the Imposter?</h1>
        <p>
          {isSpectating
            ? "Watch the votes roll in live."
            : "Cast your vote — you can change it until everyone's done. Votes are visible to everyone as they come in."}
        </p>
      </div>

      {!isSpectating && (
        <div className="vote-grid">
          {candidates.map((p) => (
            <button
              type="button"
              key={p.id}
              className={`vote-card ${(selected || myVote) === p.id ? "selected" : ""}`}
              onClick={() => castVote(p.id)}
            >
              <div className="avatar" style={{ background: avatarColor(p.id) }}>
                {initials(p.name)}
              </div>
              <span className="name">{p.name}</span>
            </button>
          ))}
        </div>
      )}

      <div className="card">
        <div className="section-title">Live Votes</div>
        <div className="vote-tally" style={{ marginTop: 10 }}>
          {participants.map((p) => {
            const voters = votesFor[p.id] || [];
            return (
              <div className="tally-row" key={p.id}>
                <span style={{ width: 70, flexShrink: 0 }}>{p.name}</span>
                <div className="tally-bar-track">
                  <div className="tally-bar-fill" style={{ width: `${(voters.length / maxVotes) * 100}%` }} />
                </div>
                <span style={{ width: 18, textAlign: "right", flexShrink: 0 }}>{voters.length}</span>
                <div className="voter-avatars">
                  {voters.map((voterId) => (
                    <div
                      key={voterId}
                      className="mini-avatar"
                      style={{ background: avatarColor(voterId) }}
                      title={playerById[voterId]?.name}
                    >
                      {initials(playerById[voterId]?.name)}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="waiting-note">
        {room.round.votedCount}/{room.round.totalCount} players have voted
      </p>
    </div>
  );
}
