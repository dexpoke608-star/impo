import { useState } from "react";
import { avatarColor, initials } from "../util";

const CATEGORIES = [
  { id: "random", label: "🎲 Random Mix" },
  { id: "food", label: "🍕 Food" },
  { id: "animals", label: "🐘 Animals" },
  { id: "movies", label: "🎬 Movies" },
  { id: "sports", label: "🏀 Sports" },
  { id: "places", label: "🗺️ Places" },
  { id: "objects", label: "🎒 Objects" },
  { id: "professions", label: "🩺 Professions" },
];

export default function Lobby({ room, isHost, myPlayerId, onUpdateCategory, onStart, onLeave }) {
  const [copied, setCopied] = useState(false);
  const shareUrl = `${window.location.origin}/?room=${room.code}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable — the code is still shown below */
    }
  };

  const canStart = room.players.length >= 3;

  return (
    <div className="container">
      <div className="brand" style={{ margin: 0 }}>
        <h1 style={{ fontSize: 26 }}>Lobby</h1>
      </div>

      <div className="card">
        <div className="room-code-pill">
          <div>
            <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 2 }}>ROOM CODE</div>
            <div className="code">{room.code}</div>
          </div>
          <button className="copy-btn" onClick={copyLink}>
            {copied ? "✓ Copied" : "Copy Link"}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="section-title">Players ({room.players.length})</div>
        <div className="player-list" style={{ marginTop: 10 }}>
          {room.players.map((p) => (
            <div className="player-row" key={p.id}>
              <div className="avatar" style={{ background: avatarColor(p.id) }}>
                {initials(p.name)}
              </div>
              <span className={`name ${p.connected ? "" : "dim"}`}>
                {p.name} {p.id === myPlayerId && <span style={{ color: "var(--text-dim)" }}>(you)</span>}
                {!p.connected && <span style={{ color: "var(--text-dim)" }}> (offline)</span>}
              </span>
              {p.id === room.hostId && <span className="host-tag">HOST</span>}
            </div>
          ))}
        </div>
        {!canStart && (
          <p className="waiting-note" style={{ marginTop: 10 }}>
            Need at least 3 players to start ({3 - room.players.length} more to go).
          </p>
        )}
      </div>

      <div className="card">
        <div className="section-title">Category</div>
        {isHost ? (
          <div className="category-grid" style={{ marginTop: 10 }}>
            {CATEGORIES.map((c) => (
              <div
                key={c.id}
                className={`category-chip ${room.category === c.id ? "selected" : ""}`}
                onClick={() => onUpdateCategory(c.id)}
              >
                {c.label}
              </div>
            ))}
          </div>
        ) : (
          <p className="waiting-note" style={{ marginTop: 10 }}>
            {CATEGORIES.find((c) => c.id === room.category)?.label || room.category}
          </p>
        )}
      </div>

      {isHost ? (
        <button className="btn btn-primary btn-block" disabled={!canStart} onClick={onStart}>
          🚀 Start Game
        </button>
      ) : (
        <p className="waiting-note">Waiting for the host to start the game…</p>
      )}

      <div style={{ textAlign: "center" }}>
        <button className="link-btn" onClick={onLeave}>
          Leave room
        </button>
      </div>
    </div>
  );
}
