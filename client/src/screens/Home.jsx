import { useState } from "react";

export default function Home({ initialRoomCode, onCreate, onJoin }) {
  const [mode, setMode] = useState(initialRoomCode ? "join" : "create");
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState(initialRoomCode || "");

  const submit = () => {
    const cleanName = name.trim();
    if (!cleanName) return;
    if (mode === "create") onCreate(cleanName);
    else onJoin(roomCode.trim().toUpperCase(), cleanName);
  };

  return (
    <div className="container">
      <div className="brand">
        <span className="mask">🎭</span>
        <h1>Imposter Party</h1>
        <p>One of you doesn't know the word. Find them before they find you.</p>
      </div>

      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="tabs">
          <div className={`tab ${mode === "create" ? "active" : ""}`} onClick={() => setMode("create")}>
            Create Room
          </div>
          <div className={`tab ${mode === "join" ? "active" : ""}`} onClick={() => setMode("join")}>
            Join Room
          </div>
        </div>

        {mode === "join" && (
          <div>
            <label className="field-label">Room Code</label>
            <input
              className="text-input code-input"
              placeholder="ABCD"
              maxLength={4}
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            />
          </div>
        )}

        <div>
          <label className="field-label">Your Name</label>
          <input
            className="text-input"
            placeholder="e.g. Nagendra"
            maxLength={24}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </div>

        <button
          className="btn btn-primary btn-block"
          disabled={!name.trim() || (mode === "join" && roomCode.trim().length !== 4)}
          onClick={submit}
        >
          {mode === "create" ? "🎉 Create Room" : "🔑 Join Room"}
        </button>
      </div>

      <p className="footer-note">
        Play offline-style with friends on their own phones — one host creates a room,
        everyone else joins with the code or shared link.
      </p>
    </div>
  );
}
