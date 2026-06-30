import { useState, useCallback, useEffect, useRef } from 'react';
import type { GameState, Direction } from '../types';
import { initializeGame, moveTiles, addRandomTile, canMove, hasWon } from '../utils/gameLogic';
import { addLeaderboardEntry } from '../utils/leaderboardStorage';

export const useGame = () => {
  const [gameState, setGameState] = useState<GameState>(initializeGame);
  const [bestScore, setBestScore] = useState<number>(() => {
    const saved = localStorage.getItem('bestScore');
    return saved ? parseInt(saved, 10) : 0;
  });
  const gameOverSavedRef = useRef(false);

  useEffect(() => {
    if (gameState.score > bestScore) {
      setBestScore(gameState.score);
      localStorage.setItem('bestScore', gameState.score.toString());
    }
  }, [gameState.score, bestScore]);

  useEffect(() => {
    if (gameState.gameOver && !gameOverSavedRef.current && gameState.score > 0) {
      const maxTile = Math.max(...gameState.tiles.map((tile) => tile.value));
      addLeaderboardEntry(gameState.score, maxTile);
      gameOverSavedRef.current = true;
    }

    if (!gameState.gameOver) {
      gameOverSavedRef.current = false;
    }
  }, [gameState.gameOver, gameState.score, gameState.tiles]);

  const move = useCallback(
    (direction: Direction) => {
      if (gameState.gameOver) return;

      const result = moveTiles(gameState.tiles, direction);

      if (!result.moved) return;

      const newTiles = addRandomTile(result.tiles);
      const won = !gameState.won && hasWon(newTiles);
      const gameOver = !canMove(newTiles);

      setGameState({
        tiles: newTiles,
        score: gameState.score + result.score,
        gameOver,
        won: gameState.won || won,
      });
    },
    [gameState]
  );

  const resetGame = useCallback(() => {
    setGameState(initializeGame());
  }, []);

  const continueGame = useCallback(() => {
    setGameState((prev) => ({ ...prev, won: false }));
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const keyMap: Record<string, Direction> = {
        ArrowUp: 'up',
        ArrowDown: 'down',
        ArrowLeft: 'left',
        ArrowRight: 'right',
        w: 'up',
        s: 'down',
        a: 'left',
        d: 'right',
      };

      const direction = keyMap[event.key];
      if (direction) {
        event.preventDefault();
        move(direction);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [move]);

  return {
    gameState,
    bestScore,
    move,
    resetGame,
    continueGame,
  };
};
