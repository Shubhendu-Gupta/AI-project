import './GameOverlay.css';

type GameOverlayProps = {
  message: string;
  onRestart: () => void;
  onContinue?: () => void;
};

export const GameOverlay = ({ message, onRestart, onContinue }: GameOverlayProps) => {
  return (
    <div className="game-overlay">
      <div className="overlay-content">
        <h2 className="overlay-message">{message}</h2>
        <div className="overlay-buttons">
          <button className="overlay-button" onClick={onRestart}>
            Try again
          </button>
          {onContinue && (
            <button className="overlay-button" onClick={onContinue}>
              Continue
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
