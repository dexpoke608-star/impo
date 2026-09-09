import { useEffect, useState } from "react";

const TOTAL_MS = 3 * 60 * 1000;
const RADIUS = 60;
const CIRC = 2 * Math.PI * RADIUS;

export default function Discussion({ room, isHost, onBeginVoting }) {
  const [remainingMs, setRemainingMs] = useState(() =>
    Math.max(0, (room.round.discussionEndsAt || Date.now()) - Date.now())
  );

  useEffect(() => {
    const id = setInterval(() => {
      setRemainingMs(Math.max(0, (room.round.discussionEndsAt || Date.now()) - Date.now()));
    }, 250);
    return () => clearInterval(id);
  }, [room.round.discussionEndsAt]);

  const seconds = Math.ceil(remainingMs / 1000);
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  const progress = Math.max(0, Math.min(1, remainingMs / TOTAL_MS));

  return (
    <div className="container">
      <div className="brand" style={{ margin: 0 }}>
        <h1 style={{ fontSize: 24 }}>Discuss!</h1>
        <p>Talk it out — who doesn't seem to know the word?</p>
      </div>

      <div className="card" style={{ textAlign: "center" }}>
        <div className="timer-ring">
          <svg viewBox="0 0 140 140">
            <circle className="track" cx="70" cy="70" r={RADIUS} />
            <circle
              className="progress"
              cx="70"
              cy="70"
              r={RADIUS}
              strokeDasharray={CIRC}
              strokeDashoffset={CIRC * (1 - progress)}
            />
          </svg>
          <div className="timer-label">
            {mm}:{ss}
          </div>
        </div>
        <p className="waiting-note">Category: {room.category}</p>
      </div>

      {isHost && (
        <button className="btn btn-danger btn-block" onClick={onBeginVoting}>
          🗳️ Start Voting Now
        </button>
      )}
    </div>
  );
}
