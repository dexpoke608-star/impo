import { useEffect, useRef, useState } from "react";
import { socket } from "./socket.js";
import AnimatedBackground from "./components/AnimatedBackground.jsx";
import Home from "./screens/Home.jsx";
import Lobby from "./screens/Lobby.jsx";
import Reveal from "./screens/Reveal.jsx";
import Discussion from "./screens/Discussion.jsx";
import Voting from "./screens/Voting.jsx";
import Results from "./screens/Results.jsx";

const STORAGE_KEY = "imposterPartyIdentity";

function readStoredIdentity() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function storeIdentity(identity) {
  try {
    if (identity) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* sessionStorage unavailable (private mode) — identity just won't survive a refresh */
  }
}

const urlRoomCode = new URLSearchParams(window.location.search).get("room");

export default function App() {
  const [identity, setIdentity] = useState(readStoredIdentity);
  const [roomState, setRoomState] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [error, setError] = useState(null);
  const lastRoundNumber = useRef(null);

  useEffect(() => {
    const onConnect = () => {
      const stored = readStoredIdentity();
      if (stored) socket.emit("rejoinRoom", stored);
    };
    const onRoomCreated = ({ roomCode, playerId }) => {
      const next = { roomCode, playerId };
      setIdentity(next);
      storeIdentity(next);
    };
    const onJoined = ({ roomCode, playerId }) => {
      const next = { roomCode, playerId };
      setIdentity(next);
      storeIdentity(next);
    };
    const onRoomState = (state) => {
      const num = state?.round?.number ?? null;
      if (num !== lastRoundNumber.current) {
        lastRoundNumber.current = num;
        setAssignment(null);
      }
      setRoomState(state);
    };
    const onAssignment = (a) => setAssignment(a);
    const onError = ({ message }) => {
      setError(message);
      setTimeout(() => setError(null), 3500);
      // A rejoin that fails (room gone, or this player no longer in it) means
      // the saved session is stale — clear it so the next load shows a clean
      // Home screen instead of retrying a dead room forever.
      if (message === "Couldn't reconnect you to that room.") {
        storeIdentity(null);
        setIdentity(null);
      }
    };

    socket.on("connect", onConnect);
    socket.on("roomCreated", onRoomCreated);
    socket.on("joined", onJoined);
    socket.on("roomState", onRoomState);
    socket.on("yourAssignment", onAssignment);
    socket.on("errorMessage", onError);

    if (socket.connected) onConnect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("roomCreated", onRoomCreated);
      socket.off("joined", onJoined);
      socket.off("roomState", onRoomState);
      socket.off("yourAssignment", onAssignment);
      socket.off("errorMessage", onError);
    };
  }, []);

  const handleCreate = (name) => socket.emit("createRoom", { name });
  const handleJoin = (roomCode, name) => socket.emit("joinRoom", { roomCode, name });
  const handleUpdateCategory = (category) => socket.emit("updateCategory", { category });
  const handleStart = () => socket.emit("startGame");
  const handleAck = () => socket.emit("ackReveal");
  const handleBeginVoting = () => socket.emit("beginVoting");
  const handleVote = (votedForId) => socket.emit("castVote", { votedForId });
  const handlePlayAgain = () => socket.emit("nextRound");
  const handleBackToLobby = () => socket.emit("backToLobby");
  const handleLeaveRoom = () => {
    socket.emit("leaveRoom");
    storeIdentity(null);
    setIdentity(null);
    setRoomState(null);
    setAssignment(null);
  };

  const isHost = !!(identity && roomState && roomState.hostId === identity.playerId);

  let screen;
  if (!identity || !roomState) {
    screen = <Home initialRoomCode={urlRoomCode} onCreate={handleCreate} onJoin={handleJoin} />;
  } else {
    switch (roomState.phase) {
      case "lobby":
        screen = (
          <Lobby
            room={roomState}
            isHost={isHost}
            myPlayerId={identity.playerId}
            onUpdateCategory={handleUpdateCategory}
            onStart={handleStart}
            onLeave={handleLeaveRoom}
          />
        );
        break;
      case "reveal":
        screen = <Reveal room={roomState} assignment={assignment} onAck={handleAck} />;
        break;
      case "discussion":
        screen = <Discussion room={roomState} isHost={isHost} onBeginVoting={handleBeginVoting} />;
        break;
      case "voting":
        screen = <Voting room={roomState} myPlayerId={identity.playerId} onVote={handleVote} />;
        break;
      case "results":
        screen = (
          <Results
            room={roomState}
            myPlayerId={identity.playerId}
            isHost={isHost}
            onPlayAgain={handlePlayAgain}
            onBackToLobby={handleBackToLobby}
            onLeave={handleLeaveRoom}
          />
        );
        break;
      default:
        screen = <p className="waiting-note">Loading…</p>;
    }
  }

  return (
    <div className="app-shell">
      <AnimatedBackground />
      {error && (
        <div style={{ position: "fixed", top: 16, left: 16, right: 16, zIndex: 40 }}>
          <div className="error-banner">{error}</div>
        </div>
      )}
      {screen}
    </div>
  );
}
