import { useState } from "react";
import { avatarColor, initials } from "../util";

export default function Voting({ room, myPlayerId, onVote }) {
  const [selected, setSelected] = useState(null);

  const castVote = (playerId) => {
    setSelected(playerId);
    onVote(playerId);
  };

  const others = room.players.filter((p) => p.id !== myPlayerId);

  return (
    <div className="container">
      <div className="brand" style={{ margin: 0 }}>
        <h1 style={{ fontSize: 24 }}>Who's the Imposter?</h1>
        <p>Cast your vote — you can change it until everyone's done.</p>
      </div>

      <div className="vote-grid">
        {others.map((p) => (
          <div
            key={p.id}
            className={`vote-card ${selected === p.id ? "selected" : ""}`}
            onClick={() => castVote(p.id)}
          >
            <div className="avatar" style={{ background: avatarColor(p.id) }}>
              {initials(p.name)}
            </div>
            <span className="name">{p.name}</span>
          </div>
        ))}
      </div>

      <p className="waiting-note">
        {room.round.votedCount}/{room.round.totalCount} players have voted
      </p>
    </div>
  );
}
