import './GameHeader.css';

type GameHeaderProps = {
  score: number;
  bestScore: number;
  onRestart: () => void;
};

export const GameHeader = ({ score, bestScore, onRestart }: GameHeaderProps) => {
  return (
    <div className="game-header">
      <h1 className="game-title">2048</h1>
      <div className="game-info">
        <div className="score-container">
          <div className="score-label">Score</div>
          <div className="score-value">{score}</div>
        </div>
        <div className="score-container">
          <div className="score-label">Best</div>
          <div className="score-value">{bestScore}</div>
        </div>
        <button className="restart-button" onClick={onRestart}>
          New Game
        </button>
      </div>
    </div>
  );
};
