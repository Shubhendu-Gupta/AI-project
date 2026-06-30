import { describe, it, expect } from 'vitest';
import {
  createEmptyGrid,
  getEmptyCells,
  tilesToGrid,
  moveTiles,
  canMove,
  hasWon,
  initializeGame,
} from './gameLogic';
import { Tile } from '../types';

describe('gameLogic', () => {
  describe('createEmptyGrid', () => {
    it('should create a 4x4 grid filled with nulls', () => {
      const grid = createEmptyGrid();
      expect(grid).toHaveLength(4);
      expect(grid[0]).toHaveLength(4);
      expect(grid.flat().every((cell) => cell === null)).toBe(true);
    });
  });

  describe('getEmptyCells', () => {
    it('should return all cells when grid is empty', () => {
      const grid = createEmptyGrid();
      const emptyCells = getEmptyCells(grid);
      expect(emptyCells).toHaveLength(16);
    });

    it('should return only empty cells', () => {
      const tiles: Tile[] = [
        { id: '1', value: 2, position: { row: 0, col: 0 } },
        { id: '2', value: 4, position: { row: 1, col: 1 } },
      ];
      const grid = tilesToGrid(tiles);
      const emptyCells = getEmptyCells(grid);
      expect(emptyCells).toHaveLength(14);
    });
  });

  describe('moveTiles', () => {
    it('should move tiles up correctly', () => {
      const tiles: Tile[] = [
        { id: '1', value: 2, position: { row: 3, col: 0 } },
        { id: '2', value: 2, position: { row: 2, col: 0 } },
      ];
      const result = moveTiles(tiles, 'up');
      expect(result.moved).toBe(true);
      expect(result.tiles).toHaveLength(1);
      expect(result.tiles[0].value).toBe(4);
      expect(result.tiles[0].position).toEqual({ row: 0, col: 0 });
      expect(result.score).toBe(4);
    });

    it('should move tiles left correctly', () => {
      const tiles: Tile[] = [
        { id: '1', value: 2, position: { row: 0, col: 3 } },
        { id: '2', value: 2, position: { row: 0, col: 2 } },
      ];
      const result = moveTiles(tiles, 'left');
      expect(result.moved).toBe(true);
      expect(result.tiles).toHaveLength(1);
      expect(result.tiles[0].value).toBe(4);
      expect(result.tiles[0].position).toEqual({ row: 0, col: 0 });
    });

    it('should not move when no valid moves', () => {
      const tiles: Tile[] = [
        { id: '1', value: 2, position: { row: 0, col: 0 } },
        { id: '2', value: 4, position: { row: 0, col: 1 } },
      ];
      const result = moveTiles(tiles, 'left');
      expect(result.moved).toBe(false);
    });

    it('should merge only once per move', () => {
      const tiles: Tile[] = [
        { id: '1', value: 2, position: { row: 0, col: 0 } },
        { id: '2', value: 2, position: { row: 0, col: 1 } },
        { id: '3', value: 2, position: { row: 0, col: 2 } },
      ];
      const result = moveTiles(tiles, 'left');
      expect(result.tiles).toHaveLength(2);
      expect(result.tiles[0].value).toBe(4);
      expect(result.tiles[1].value).toBe(2);
    });
  });

  describe('canMove', () => {
    it('should return true when there are empty cells', () => {
      const tiles: Tile[] = [{ id: '1', value: 2, position: { row: 0, col: 0 } }];
      expect(canMove(tiles)).toBe(true);
    });

    it('should return true when adjacent tiles can merge', () => {
      const tiles: Tile[] = [];
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
          tiles.push({
            id: `${row}-${col}`,
            value: row === 0 && col <= 1 ? 2 : 4,
            position: { row, col },
          });
        }
      }
      expect(canMove(tiles)).toBe(true);
    });

    it('should return false when no moves available', () => {
      const tiles: Tile[] = [];
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
          tiles.push({
            id: `${row}-${col}`,
            value: (row + col) % 2 === 0 ? 2 : 4,
            position: { row, col },
          });
        }
      }
      expect(canMove(tiles)).toBe(false);
    });
  });

  describe('hasWon', () => {
    it('should return true when a tile has value 2048', () => {
      const tiles: Tile[] = [
        { id: '1', value: 2048, position: { row: 0, col: 0 } },
        { id: '2', value: 2, position: { row: 1, col: 1 } },
      ];
      expect(hasWon(tiles)).toBe(true);
    });

    it('should return false when no tile has value 2048', () => {
      const tiles: Tile[] = [
        { id: '1', value: 1024, position: { row: 0, col: 0 } },
        { id: '2', value: 512, position: { row: 1, col: 1 } },
      ];
      expect(hasWon(tiles)).toBe(false);
    });
  });

  describe('initializeGame', () => {
    it('should create initial game state with 2 tiles', () => {
      const gameState = initializeGame();
      expect(gameState.tiles).toHaveLength(2);
      expect(gameState.score).toBe(0);
      expect(gameState.gameOver).toBe(false);
      expect(gameState.won).toBe(false);
    });

    it('should create tiles with values 2 or 4', () => {
      const gameState = initializeGame();
      gameState.tiles.forEach((tile) => {
        expect([2, 4]).toContain(tile.value);
      });
    });
  });
});
