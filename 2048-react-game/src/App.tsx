import { useState } from 'react';
import { useGame } from './hooks/useGame';
import { GameHeader } from './components/GameHeader';
import { Grid } from './components/Grid';
import { GameOverlay } from './components/GameOverlay';
import { Leaderboard } from './components/Leaderboard';
import { LeaderboardButton } from './components/LeaderboardButton';
import './App.css';

const App = () => {
  const { gameState, bestScore, resetGame, continueGame } = useGame();
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);

  return (
    <div className="app">
      <div className="game-container">
        <GameHeader score={gameState.score} bestScore={bestScore} onRestart={resetGame} />
        <div className="game-board">
          <Grid tiles={gameState.tiles} />
          {gameState.won && <GameOverlay message="You Win!" onRestart={resetGame} onContinue={continueGame} />}
          {gameState.gameOver && <GameOverlay message="Game Over!" onRestart={resetGame} />}
        </div>
        <div className="instructions">
          <p>
            <strong>How to play:</strong> Use arrow keys or WASD to move tiles. Tiles with the same number merge into
            one when they touch. Add them up to reach 2048!
          </p>
        </div>
        <LeaderboardButton onClick={() => setIsLeaderboardOpen(true)} />
      </div>
      <Leaderboard
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        currentScore={gameState.gameOver ? gameState.score : undefined}
      />
    </div>
  );
};

export default App;
