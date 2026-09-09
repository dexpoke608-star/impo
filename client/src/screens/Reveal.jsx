import { useState } from "react";
import FlipCard from "../components/FlipCard.jsx";

export default function Reveal({ room, assignment, onAck }) {
  const [flipped, setFlipped] = useState(false);
  const [acked, setAcked] = useState(false);

  if (!assignment) {
    return (
      <div className="container">
        <p className="waiting-note">Getting your card ready…</p>
      </div>
    );
  }

  const isImposter = assignment.isImposter;

  const handleAck = () => {
    setAcked(true);
    onAck();
  };

  if (acked) {
    return (
      <div className="container">
        <div className="card" style={{ textAlign: "center" }}>
          <div className="pulse-icon">🤫</div>
          <h2 style={{ margin: "10px 0 4px" }}>Card hidden</h2>
          <p className="waiting-note">
            Waiting for everyone to see their word… {room.round.ackedCount}/{room.round.totalCount} ready
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="brand" style={{ margin: 0 }}>
        <h1 style={{ fontSize: 24 }}>Round {room.round.number}</h1>
        <p>Tap the card to reveal — don't let anyone else peek!</p>
      </div>

      <FlipCard
        flipped={flipped}
        onClick={() => setFlipped(true)}
        backClassName={isImposter ? "imposter" : ""}
        front={
          <>
            <div className="pulse-icon">🎴</div>
            <p style={{ color: "var(--text-dim)" }}>Tap to reveal your card</p>
          </>
        }
        back={
          isImposter ? (
            <>
              <div style={{ fontSize: 54 }}>🕵️</div>
              <div className="imposter-text">YOU ARE THE IMPOSTER</div>
              <p style={{ color: "var(--text-dim)", fontSize: 13 }}>
                You don't know the word — blend in and bluff!
              </p>
            </>
          ) : (
            <>
              <div className="category-tag">{room.category}</div>
              <div className="secret-word">{assignment.word}</div>
              <p style={{ color: "var(--text-dim)", fontSize: 13 }}>
                Remember it, but don't say it out loud!
              </p>
            </>
          )
        }
      />

      {flipped && (
        <button className="btn btn-primary btn-block" onClick={handleAck}>
          Got it, hide my card
        </button>
      )}
    </div>
  );
}
