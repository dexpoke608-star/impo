export default function FlipCard({ flipped, onClick, front, back, backClassName = "" }) {
  return (
    <div className="flip-scene" onClick={onClick}>
      <div className={`flip-card ${flipped ? "flipped" : ""}`}>
        <div className="flip-face front">{front}</div>
        <div className={`flip-face back ${backClassName}`}>{back}</div>
      </div>
    </div>
  );
}
