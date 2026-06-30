export interface Tile {
  id: string;
  value: number;
  position: { row: number; col: number };
  mergedFrom?: Tile[];
  isNew?: boolean;
}

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface GameState {
  tiles: Tile[];
  score: number;
  gameOver: boolean;
  won: boolean;
}
