import type { Tile, Direction, GameState } from '../types';

const GRID_SIZE = 4;

export const createEmptyGrid = (): (Tile | null)[][] => {
  return Array(GRID_SIZE)
    .fill(null)
    .map(() => Array(GRID_SIZE).fill(null));
};

export const generateId = (): string => {
  return `${Date.now()}-${Math.random()}`;
};

export const getEmptyCells = (grid: (Tile | null)[][]): { row: number; col: number }[] => {
  const emptyCells: { row: number; col: number }[] = [];
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if (!grid[row][col]) {
        emptyCells.push({ row, col });
      }
    }
  }
  return emptyCells;
};

export const addRandomTile = (tiles: Tile[]): Tile[] => {
  const grid = tilesToGrid(tiles);
  const emptyCells = getEmptyCells(grid);

  if (emptyCells.length === 0) {
    return tiles;
  }

  const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
  const newTile: Tile = {
    id: generateId(),
    value: Math.random() < 0.9 ? 2 : 4,
    position: randomCell,
    isNew: true,
  };

  return [...tiles, newTile];
};

export const tilesToGrid = (tiles: Tile[]): (Tile | null)[][] => {
  const grid = createEmptyGrid();
  tiles.forEach((tile) => {
    grid[tile.position.row][tile.position.col] = tile;
  });
  return grid;
};

export const initializeGame = (): GameState => {
  let tiles: Tile[] = [];
  tiles = addRandomTile(tiles);
  tiles = addRandomTile(tiles);

  return {
    tiles,
    score: 0,
    gameOver: false,
    won: false,
  };
};

const traverseGrid = (direction: Direction): { row: number[]; col: number[] } => {
  const rows = [0, 1, 2, 3];
  const cols = [0, 1, 2, 3];

  if (direction === 'down') rows.reverse();
  if (direction === 'right') cols.reverse();

  return { row: rows, col: cols };
};

export const moveTiles = (tiles: Tile[], direction: Direction): { tiles: Tile[]; score: number; moved: boolean } => {
  const grid = tilesToGrid(tiles);
  const newGrid = createEmptyGrid();
  const merged: boolean[][] = Array(GRID_SIZE)
    .fill(null)
    .map(() => Array(GRID_SIZE).fill(false));
  let score = 0;
  let moved = false;

  const traverse = traverseGrid(direction);

  traverse.row.forEach((row) => {
    traverse.col.forEach((col) => {
      const tile = grid[row][col];
      if (!tile) return;

      let targetRow = row;
      let targetCol = col;

      while (true) {
        const next = getNextPosition({ row: targetRow, col: targetCol }, direction);
        if (!isWithinBounds(next)) break;

        const nextTile = newGrid[next.row][next.col];
        if (nextTile) {
          if (nextTile.value === tile.value && !merged[next.row][next.col]) {
            const mergedTile: Tile = {
              id: generateId(),
              value: tile.value * 2,
              position: { row: next.row, col: next.col },
              mergedFrom: [tile, nextTile],
            };
            newGrid[next.row][next.col] = mergedTile;
            merged[next.row][next.col] = true;
            score += mergedTile.value;
            moved = true;
            return;
          }
          break;
        }

        targetRow = next.row;
        targetCol = next.col;
      }

      if (targetRow !== row || targetCol !== col) {
        moved = true;
      }

      newGrid[targetRow][targetCol] = {
        ...tile,
        position: { row: targetRow, col: targetCol },
      };
    });
  });

  const newTiles: Tile[] = [];
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if (newGrid[row][col]) {
        newTiles.push(newGrid[row][col]!);
      }
    }
  }

  return { tiles: newTiles, score, moved };
};

const getNextPosition = (pos: { row: number; col: number }, direction: Direction): { row: number; col: number } => {
  const vectors: Record<Direction, { row: number; col: number }> = {
    up: { row: -1, col: 0 },
    down: { row: 1, col: 0 },
    left: { row: 0, col: -1 },
    right: { row: 0, col: 1 },
  };

  const vector = vectors[direction];
  return {
    row: pos.row + vector.row,
    col: pos.col + vector.col,
  };
};

const isWithinBounds = (pos: { row: number; col: number }): boolean => {
  return pos.row >= 0 && pos.row < GRID_SIZE && pos.col >= 0 && pos.col < GRID_SIZE;
};

export const canMove = (tiles: Tile[]): boolean => {
  const grid = tilesToGrid(tiles);

  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if (!grid[row][col]) return true;

      const tile = grid[row][col];
      if (!tile) continue;

      const neighbors = [
        { row: row - 1, col },
        { row: row + 1, col },
        { row, col: col - 1 },
        { row, col: col + 1 },
      ];

      for (const neighbor of neighbors) {
        if (isWithinBounds(neighbor) && grid[neighbor.row][neighbor.col]?.value === tile.value) {
          return true;
        }
      }
    }
  }

  return false;
};

export const hasWon = (tiles: Tile[]): boolean => {
  return tiles.some((tile) => tile.value === 2048);
};
